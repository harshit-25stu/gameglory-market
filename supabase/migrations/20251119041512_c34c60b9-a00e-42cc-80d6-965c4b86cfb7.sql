-- Create hangout rooms table
CREATE TABLE IF NOT EXISTS public.hangout_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID REFERENCES public.game_hubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_participants INTEGER DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  game_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hangout participants table with presence tracking
CREATE TABLE IF NOT EXISTS public.hangout_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.hangout_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_speaking BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create hangout messages table for text chat
CREATE TABLE IF NOT EXISTS public.hangout_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.hangout_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hangout_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hangout_rooms
CREATE POLICY "Hangout rooms are viewable by everyone"
  ON public.hangout_rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create hangout rooms"
  ON public.hangout_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their hangout rooms"
  ON public.hangout_rooms FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their hangout rooms"
  ON public.hangout_rooms FOR DELETE
  USING (auth.uid() = host_id);

-- RLS Policies for hangout_participants
CREATE POLICY "Participants are viewable by everyone"
  ON public.hangout_participants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join hangouts"
  ON public.hangout_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant status"
  ON public.hangout_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave hangouts"
  ON public.hangout_participants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for hangout_messages
CREATE POLICY "Messages are viewable by room participants"
  ON public.hangout_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hangout_participants
      WHERE room_id = hangout_messages.room_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.hangout_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.hangout_participants
      WHERE room_id = hangout_messages.room_id
      AND user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_messages;