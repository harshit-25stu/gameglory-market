-- Create payment methods table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'paypal', 'bank_account')),
  provider VARCHAR(20) NOT NULL DEFAULT 'stripe',
  provider_payment_method_id VARCHAR(255),
  last_four VARCHAR(4),
  brand VARCHAR(50),
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),
  payment_method_id UUID REFERENCES payment_methods(id),
  provider VARCHAR(20) DEFAULT 'stripe',
  provider_payment_intent_id VARCHAR(255),
  provider_charge_id VARCHAR(255),
  fee_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create escrow accounts table
CREATE TABLE escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  seller_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'held' CHECK (status IN ('held', 'released', 'disputed', 'refunded')),
  payment_id UUID REFERENCES payments(id),
  released_at TIMESTAMP WITH TIME ZONE,
  dispute_reason TEXT,
  dispute_resolved_at TIMESTAMP WITH TIME ZONE,
  dispute_resolution TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet transactions table (extends existing one)
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES escrow_accounts(id);

-- Create payment settings table
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_percentage DECIMAL(5,2) DEFAULT 5.00,
  minimum_payout DECIMAL(10,2) DEFAULT 10.00,
  maximum_daily_transactions INTEGER DEFAULT 100,
  supported_currencies TEXT[] DEFAULT ARRAY['USD', 'EUR', 'GBP'],
  stripe_publishable_key VARCHAR(255),
  stripe_secret_key VARCHAR(255), -- This should be in environment variables
  paypal_client_id VARCHAR(255),
  paypal_client_secret VARCHAR(255), -- This should be in environment variables
  escrow_hold_period_days INTEGER DEFAULT 7,
  dispute_window_days INTEGER DEFAULT 30,
  is_sandbox BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default payment settings
INSERT INTO payment_settings (platform_fee_percentage, minimum_payout, escrow_hold_period_days) VALUES (5.00, 10.00, 7);

-- Create payment disputes table
CREATE TABLE payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_accounts(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'escalated')),
  resolution VARCHAR(20) CHECK (resolution IN ('buyer_refunded', 'seller_paid', 'split_payment', 'dismissed')),
  resolution_amount DECIMAL(10,2),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payout requests table
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider_payout_id VARCHAR(255),
  fee_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payment methods" ON payment_methods
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view payments for their orders" ON payments
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.buyer_id = auth.uid())
  );

CREATE POLICY "Users can view escrow for their orders" ON escrow_accounts
  FOR SELECT USING (auth.uid() IN (buyer_id, seller_id));

CREATE POLICY "Users can create disputes for their escrows" ON payment_disputes
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT buyer_id FROM escrow_accounts WHERE escrow_accounts.id = payment_disputes.escrow_id) OR
    auth.uid() = (SELECT seller_id FROM escrow_accounts WHERE escrow_accounts.id = payment_disputes.escrow_id)
  );

CREATE POLICY "Users can view disputes for their escrows" ON payment_disputes
  FOR SELECT USING (
    auth.uid() = initiated_by OR
    auth.uid() IN (
      SELECT buyer_id FROM escrow_accounts WHERE escrow_accounts.id = payment_disputes.escrow_id
      UNION
      SELECT seller_id FROM escrow_accounts WHERE escrow_accounts.id = payment_disputes.escrow_id
    )
  );

CREATE POLICY "Users can manage their own payout requests" ON payout_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Payment settings are readable by all" ON payment_settings
  FOR SELECT USING (true);

-- Functions for payment processing

-- Function to calculate platform fees
CREATE OR REPLACE FUNCTION calculate_platform_fee(order_amount DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
  fee_percentage DECIMAL;
BEGIN
  SELECT platform_fee_percentage INTO fee_percentage
  FROM payment_settings LIMIT 1;

  RETURN ROUND(order_amount * (fee_percentage / 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Function to release escrow funds
CREATE OR REPLACE FUNCTION release_escrow_funds(
  p_escrow_id UUID,
  p_released_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  escrow_record RECORD;
BEGIN
  -- Get escrow details
  SELECT * INTO escrow_record FROM escrow_accounts WHERE id = p_escrow_id;

  IF escrow_record.status != 'held' THEN
    RAISE EXCEPTION 'Escrow funds already released or disputed';
  END IF;

  -- Update escrow status
  UPDATE escrow_accounts
  SET status = 'released',
      released_at = NOW(),
      updated_at = NOW()
  WHERE id = p_escrow_id;

  -- Create wallet transaction for seller
  INSERT INTO wallet_transactions (
    user_id,
    amount,
    type,
    description,
    escrow_id
  ) VALUES (
    escrow_record.seller_id,
    escrow_record.seller_amount,
    'credit',
    'Escrow funds released from order #' || escrow_record.order_id,
    p_escrow_id
  );

  -- Update seller's wallet balance
  UPDATE profiles
  SET wallet_balance = wallet_balance + escrow_record.seller_amount,
      total_earnings = total_earnings + escrow_record.seller_amount,
      updated_at = NOW()
  WHERE id = escrow_record.seller_id;

  -- Award XP for successful sale
  PERFORM award_xp(escrow_record.seller_id, 'successful_sale', 50,
    'Successfully completed sale with escrow release');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initiate refund
CREATE OR REPLACE FUNCTION refund_escrow_funds(
  p_escrow_id UUID,
  p_refunded_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  escrow_record RECORD;
BEGIN
  -- Get escrow details
  SELECT * INTO escrow_record FROM escrow_accounts WHERE id = p_escrow_id;

  IF escrow_record.status != 'held' THEN
    RAISE EXCEPTION 'Escrow funds already processed';
  END IF;

  -- Update escrow status
  UPDATE escrow_accounts
  SET status = 'refunded',
      updated_at = NOW()
  WHERE id = p_escrow_id;

  -- Refund buyer
  INSERT INTO wallet_transactions (
    user_id,
    amount,
    type,
    description,
    escrow_id
  ) VALUES (
    escrow_record.buyer_id,
    escrow_record.total_amount,
    'credit',
    'Escrow refund for order #' || escrow_record.order_id,
    p_escrow_id
  );

  -- Update buyer's wallet balance
  UPDATE profiles
  SET wallet_balance = wallet_balance + escrow_record.total_amount,
      updated_at = NOW()
  WHERE id = escrow_record.buyer_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_escrow_accounts_order_id ON escrow_accounts(order_id);
CREATE INDEX idx_escrow_accounts_buyer_id ON escrow_accounts(buyer_id);
CREATE INDEX idx_escrow_accounts_seller_id ON escrow_accounts(seller_id);
CREATE INDEX idx_payment_disputes_escrow_id ON payment_disputes(escrow_id);
CREATE INDEX idx_payout_requests_user_id ON payout_requests(user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_accounts_updated_at
  BEFORE UPDATE ON escrow_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_disputes_updated_at
  BEFORE UPDATE ON payment_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON payment_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();