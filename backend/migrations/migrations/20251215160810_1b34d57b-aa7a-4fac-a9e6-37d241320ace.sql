-- Create live streams table
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES public.game_hubs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  stream_url TEXT NOT NULL,
  stream_platform TEXT NOT NULL DEFAULT 'twitch',
  viewer_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live stream messages table for chat
CREATE TABLE public.live_stream_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_streams
CREATE POLICY "Live streams are viewable by everyone"
  ON public.live_streams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create streams"
  ON public.live_streams FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their streams"
  ON public.live_streams FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their streams"
  ON public.live_streams FOR DELETE
  USING (auth.uid() = host_id);

-- RLS policies for live_stream_messages
CREATE POLICY "Stream messages are viewable by everyone"
  ON public.live_stream_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON public.live_stream_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_messages;