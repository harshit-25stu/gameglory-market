-- Create watch parties table
CREATE TABLE IF NOT EXISTS public.watch_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID REFERENCES public.game_hubs(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  current_video_time NUMERIC DEFAULT 0,
  is_playing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create watch party participants table
CREATE TABLE IF NOT EXISTS public.watch_party_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);

-- Create watch party messages table
CREATE TABLE IF NOT EXISTS public.watch_party_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create watch party events table for sync
CREATE TABLE IF NOT EXISTS public.watch_party_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'seek')),
  video_time NUMERIC NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watch_parties
CREATE POLICY "Watch parties are viewable by everyone"
  ON public.watch_parties FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create watch parties"
  ON public.watch_parties FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their watch parties"
  ON public.watch_parties FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their watch parties"
  ON public.watch_parties FOR DELETE
  USING (auth.uid() = host_id);

-- RLS Policies for watch_party_participants
CREATE POLICY "Participants are viewable by everyone"
  ON public.watch_party_participants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join watch parties"
  ON public.watch_party_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave watch parties"
  ON public.watch_party_participants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for watch_party_messages
CREATE POLICY "Messages are viewable by party participants"
  ON public.watch_party_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.watch_party_participants
      WHERE party_id = watch_party_messages.party_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.watch_party_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.watch_party_participants
      WHERE party_id = watch_party_messages.party_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for watch_party_events
CREATE POLICY "Events are viewable by party participants"
  ON public.watch_party_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.watch_party_participants
      WHERE party_id = watch_party_events.party_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create sync events"
  ON public.watch_party_events FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.watch_parties
      WHERE id = watch_party_events.party_id
      AND host_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_events;