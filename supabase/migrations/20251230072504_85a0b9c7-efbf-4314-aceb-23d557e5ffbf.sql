-- Create game_skins table for marketplace items
CREATE TABLE public.game_skins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  condition TEXT NOT NULL DEFAULT 'factory_new',
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_skins ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_skins
CREATE POLICY "Game skins viewable by everyone" ON public.game_skins
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create skins" ON public.game_skins
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own skins" ON public.game_skins
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own skins" ON public.game_skins
  FOR DELETE USING (auth.uid() = seller_id);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet_transactions
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create seller_ratings table
CREATE TABLE public.seller_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_ratings
CREATE POLICY "Ratings viewable by everyone" ON public.seller_ratings
  FOR SELECT USING (true);

CREATE POLICY "Buyers can create ratings" ON public.seller_ratings
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update own ratings" ON public.seller_ratings
  FOR UPDATE USING (auth.uid() = buyer_id);

-- Create user_inventory table
CREATE TABLE public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skin_id UUID REFERENCES public.game_skins(id) ON DELETE CASCADE,
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acquisition_type TEXT NOT NULL DEFAULT 'purchase'
);

-- Enable RLS
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_inventory
CREATE POLICY "Users can view own inventory" ON public.user_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own inventory" ON public.user_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add wallet_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;

-- Create trigger for updated_at on game_skins
CREATE TRIGGER update_game_skins_updated_at
  BEFORE UPDATE ON public.game_skins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();