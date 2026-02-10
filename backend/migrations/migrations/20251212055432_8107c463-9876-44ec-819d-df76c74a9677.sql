-- Phase 3: Advanced Trading Tables

-- Trade-in requests table
CREATE TABLE public.trade_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_title TEXT NOT NULL,
  platform public.game_platform NOT NULL,
  condition public.game_condition NOT NULL,
  includes_box BOOLEAN DEFAULT true,
  includes_manual BOOLEAN DEFAULT true,
  images TEXT[],
  description TEXT,
  ai_estimated_price NUMERIC,
  ai_price_reasoning TEXT,
  final_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, quoted, accepted, rejected, completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Digital items marketplace
CREATE TABLE public.digital_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL, -- game_key, in_game_item, currency, dlc
  platform public.game_platform NOT NULL,
  game_title TEXT,
  price NUMERIC NOT NULL,
  key_code TEXT, -- encrypted/hidden until purchase
  is_available BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders and delivery tracking
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- physical_game, digital_item, trade_in
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, shipped, in_transit, delivered, completed, cancelled
  tracking_number TEXT,
  carrier TEXT,
  shipping_address TEXT,
  delivery_notes TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Trade-ins policies
CREATE POLICY "Users can view own trade-ins" ON public.trade_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create trade-ins" ON public.trade_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trade-ins" ON public.trade_ins
  FOR UPDATE USING (auth.uid() = user_id);

-- Digital items policies
CREATE POLICY "Digital items viewable by everyone" ON public.digital_items
  FOR SELECT USING (true);

CREATE POLICY "Sellers can create digital listings" ON public.digital_items
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own digital listings" ON public.digital_items
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own digital listings" ON public.digital_items
  FOR DELETE USING (auth.uid() = seller_id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update orders" ON public.orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Triggers for updated_at
CREATE TRIGGER update_trade_ins_updated_at
  BEFORE UPDATE ON public.trade_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_digital_items_updated_at
  BEFORE UPDATE ON public.digital_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();