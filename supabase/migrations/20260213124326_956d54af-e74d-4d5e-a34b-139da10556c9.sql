
-- ============================================
-- FIX 1: Protect profiles financial data
-- Create a public view excluding sensitive fields
-- ============================================

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, username, display_name, avatar_url, bio, trader_level, trader_xp, created_at, updated_at
FROM public.profiles;

-- Replace the public SELECT policy with owner-only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Grant access on the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ============================================
-- FIX 2: Hide key_code from digital_items public view
-- ============================================

CREATE VIEW public.digital_items_public
WITH (security_invoker = on) AS
SELECT id, seller_id, platform, price, is_available, views_count, created_at, updated_at,
       title, description, item_type, game_title
FROM public.digital_items;

-- Replace public SELECT with restricted policy
DROP POLICY IF EXISTS "Digital items viewable by everyone" ON public.digital_items;

-- Sellers can see their own items (including key_code)
CREATE POLICY "Sellers can view own digital items"
  ON public.digital_items FOR SELECT
  USING (auth.uid() = seller_id);

-- Grant access on the public view (no key_code)
GRANT SELECT ON public.digital_items_public TO anon, authenticated;

-- ============================================
-- FIX 3: Remove direct INSERT on wallet_transactions
-- ============================================

DROP POLICY IF EXISTS "Users can create transactions" ON public.wallet_transactions;

-- Add wallet balance non-negative constraint
ALTER TABLE public.profiles ADD CONSTRAINT wallet_balance_non_negative
  CHECK (wallet_balance >= 0);

-- ============================================
-- FIX 4: Secure escrow functions with auth checks and search_path
-- ============================================

CREATE OR REPLACE FUNCTION public.release_escrow_funds(
  p_escrow_id UUID,
  p_released_by UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escrow_record RECORD;
  caller_id UUID;
BEGIN
  caller_id := COALESCE(p_released_by, auth.uid());
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO escrow_record
  FROM escrow_accounts
  WHERE id = p_escrow_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow not found';
  END IF;

  -- Only buyer can release funds to seller
  IF caller_id != escrow_record.buyer_id THEN
    RAISE EXCEPTION 'Only buyer can release escrow funds';
  END IF;

  IF escrow_record.status != 'held' THEN
    RAISE EXCEPTION 'Escrow is not in held status';
  END IF;

  -- Release funds to seller
  UPDATE profiles
  SET wallet_balance = wallet_balance + escrow_record.seller_amount,
      total_earnings = total_earnings + escrow_record.seller_amount,
      total_sales = total_sales + 1
  WHERE id = escrow_record.seller_id;

  -- Update escrow status
  UPDATE escrow_accounts
  SET status = 'released',
      released_at = now(),
      released_by = caller_id,
      updated_at = now()
  WHERE id = p_escrow_id;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, amount, type, description, reference_id, status)
  VALUES (escrow_record.seller_id, escrow_record.seller_amount, 'escrow_release', 'Escrow funds released', p_escrow_id, 'completed');

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_escrow_funds(
  p_escrow_id UUID,
  p_refunded_by UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escrow_record RECORD;
  caller_id UUID;
BEGIN
  caller_id := COALESCE(p_refunded_by, auth.uid());
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO escrow_record
  FROM escrow_accounts
  WHERE id = p_escrow_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow not found';
  END IF;

  -- Only seller can refund, or buyer can request refund
  IF caller_id != escrow_record.seller_id AND caller_id != escrow_record.buyer_id THEN
    RAISE EXCEPTION 'Only buyer or seller can refund escrow';
  END IF;

  IF escrow_record.status != 'held' THEN
    RAISE EXCEPTION 'Escrow is not in held status';
  END IF;

  -- Refund to buyer
  UPDATE profiles
  SET wallet_balance = wallet_balance + escrow_record.total_amount
  WHERE id = escrow_record.buyer_id;

  -- Update escrow status
  UPDATE escrow_accounts
  SET status = 'refunded',
      updated_at = now()
  WHERE id = p_escrow_id;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, amount, type, description, reference_id, status)
  VALUES (escrow_record.buyer_id, escrow_record.total_amount, 'escrow_refund', 'Escrow funds refunded', p_escrow_id, 'completed');

  RETURN TRUE;
END;
$$;
