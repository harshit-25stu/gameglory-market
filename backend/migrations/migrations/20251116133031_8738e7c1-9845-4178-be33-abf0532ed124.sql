-- Create enum for game platforms
CREATE TYPE game_platform AS ENUM ('ps5', 'ps4', 'xbox_series', 'xbox_one', 'switch', 'pc', 'other');

-- Create enum for game condition
CREATE TYPE game_condition AS ENUM ('mint', 'excellent', 'good', 'fair', 'poor');

-- Create enum for shipping methods
CREATE TYPE shipping_method AS ENUM ('local_pickup', 'courier', 'both');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  trader_level INTEGER DEFAULT 1,
  trader_xp INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create game hubs table
CREATE TABLE public.game_hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_url TEXT,
  icon_url TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hub members table (who follows which hubs)
CREATE TABLE public.hub_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID REFERENCES public.game_hubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hub_id, user_id)
);

-- Create hub posts table
CREATE TABLE public.hub_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID REFERENCES public.game_hubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create physical games table
CREATE TABLE public.physical_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform game_platform NOT NULL,
  condition game_condition NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  images TEXT[], -- Array of image URLs
  includes_box BOOLEAN DEFAULT true,
  includes_manual BOOLEAN DEFAULT true,
  is_sealed BOOLEAN DEFAULT false,
  location TEXT, -- City/area for local pickup
  shipping_method shipping_method DEFAULT 'both',
  is_available BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user game library table
CREATE TABLE public.user_game_libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_title TEXT NOT NULL,
  platform game_platform NOT NULL,
  for_sale BOOLEAN DEFAULT false,
  for_trade BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_libraries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for game hubs
CREATE POLICY "Game hubs are viewable by everyone"
  ON public.game_hubs FOR SELECT
  USING (true);

-- RLS Policies for hub members
CREATE POLICY "Hub members viewable by everyone"
  ON public.hub_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join hubs"
  ON public.hub_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave hubs"
  ON public.hub_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for hub posts
CREATE POLICY "Hub posts viewable by everyone"
  ON public.hub_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.hub_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.hub_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.hub_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for physical games
CREATE POLICY "Physical games viewable by everyone"
  ON public.physical_games FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create listings"
  ON public.physical_games FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own listings"
  ON public.physical_games FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own listings"
  ON public.physical_games FOR DELETE
  USING (auth.uid() = seller_id);

-- RLS Policies for user game libraries
CREATE POLICY "Users can view own library"
  ON public.user_game_libraries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own library"
  ON public.user_game_libraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own library"
  ON public.user_game_libraries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own library"
  ON public.user_game_libraries FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_physical_games_updated_at
  BEFORE UPDATE ON public.physical_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Gamer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();