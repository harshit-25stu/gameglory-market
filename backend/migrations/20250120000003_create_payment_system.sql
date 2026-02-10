-- Create escrow transactions table
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(255) NOT NULL UNIQUE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'confirmed', 'released', 'partially_released', 'refunded', 'disputed')),
  stripe_payment_intent_id VARCHAR(255),
  platform_fee DECIMAL(10,2) DEFAULT 0,
  released_amount DECIMAL(10,2) DEFAULT 0,
  refunded_amount DECIMAL(10,2) DEFAULT 0,
  held_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment methods table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  last4 VARCHAR(4),
  brand VARCHAR(50),
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet transactions table (extension of existing wallet_transactions)
-- This extends the existing table with more detailed payment tracking

-- Create disputes table
CREATE TABLE payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(255) NOT NULL REFERENCES escrow_transactions(order_id),
  initiator_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'escalated')),
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payout schedules table
CREATE TABLE payout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frequency VARCHAR(20) DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  minimum_amount DECIMAL(10,2) DEFAULT 50,
  next_payout_date DATE,
  stripe_account_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_escrow_transactions_order_id ON escrow_transactions(order_id);
CREATE INDEX idx_escrow_transactions_buyer_id ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_transactions_seller_id ON escrow_transactions(seller_id);
CREATE INDEX idx_escrow_transactions_status ON escrow_transactions(status);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_disputes_order_id ON payment_disputes(order_id);
CREATE INDEX idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX idx_payout_schedules_seller_id ON payout_schedules(seller_id);

-- Enable RLS
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own escrow transactions" ON escrow_transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can manage their payment methods" ON payment_methods
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view disputes for their orders" ON payment_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM escrow_transactions et
      WHERE et.order_id = payment_disputes.order_id
      AND (et.buyer_id = auth.uid() OR et.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can create disputes for their orders" ON payment_disputes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM escrow_transactions et
      WHERE et.order_id = payment_disputes.order_id
      AND (et.buyer_id = auth.uid() OR et.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their payout schedules" ON payout_schedules
  FOR ALL USING (auth.uid() = seller_id);

-- Functions for wallet management
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL(10,2),
  p_type VARCHAR(10),
  p_description TEXT DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  new_balance DECIMAL(10,2);
BEGIN
  -- Update wallet balance
  UPDATE profiles
  SET wallet_balance = CASE
    WHEN p_type = 'credit' THEN COALESCE(wallet_balance, 0) + p_amount
    WHEN p_type = 'debit' THEN COALESCE(wallet_balance, 0) - p_amount
    ELSE wallet_balance
  END,
  updated_at = NOW()
  WHERE id = p_user_id
  RETURNING wallet_balance INTO new_balance;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process automatic payouts
CREATE OR REPLACE FUNCTION process_automatic_payouts() RETURNS VOID AS $$
DECLARE
  payout_record RECORD;
  available_balance DECIMAL(10,2);
BEGIN
  FOR payout_record IN
    SELECT ps.*, p.wallet_balance
    FROM payout_schedules ps
    JOIN profiles p ON p.id = ps.seller_id
    WHERE ps.is_active = TRUE
      AND ps.next_payout_date <= CURRENT_DATE
      AND p.wallet_balance >= ps.minimum_amount
  LOOP
    -- Calculate available balance (excluding held funds in escrow)
    SELECT COALESCE(payout_record.wallet_balance, 0) - COALESCE(SUM(amount - released_amount), 0)
    INTO available_balance
    FROM escrow_transactions
    WHERE seller_id = payout_record.seller_id
      AND status IN ('confirmed', 'partially_released');

    IF available_balance >= payout_record.minimum_amount THEN
      -- Create Stripe payout (this would integrate with Stripe Connect)
      -- For now, we'll just log it
      INSERT INTO payout_logs (seller_id, amount, method, status)
      VALUES (payout_record.seller_id, available_balance, 'stripe', 'scheduled');

      -- Update next payout date
      UPDATE payout_schedules
      SET next_payout_date = CASE
        WHEN frequency = 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
        WHEN frequency = 'weekly' THEN CURRENT_DATE + INTERVAL '1 week'
        WHEN frequency = 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
      END
      WHERE id = payout_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create payout logs table
CREATE TABLE payout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) DEFAULT 'stripe',
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
  stripe_payout_id VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for payout logs
CREATE INDEX idx_payout_logs_seller_id ON payout_logs(seller_id);
CREATE INDEX idx_payout_logs_status ON payout_logs(status);

-- Enable RLS for payout logs
ALTER TABLE payout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payout logs" ON payout_logs
  FOR SELECT USING (auth.uid() = seller_id);

-- Trigger to update updated_at columns
CREATE TRIGGER update_escrow_transactions_updated_at
  BEFORE UPDATE ON escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_disputes_updated_at
  BEFORE UPDATE ON payment_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_schedules_updated_at
  BEFORE UPDATE ON payout_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();