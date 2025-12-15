-- Esports Events table
CREATE TABLE public.esports_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID REFERENCES public.game_hubs(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  game_title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'tournament',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  stream_url TEXT,
  prize_pool TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Esports matches/brackets table
CREATE TABLE public.esports_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.esports_events(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  match_number INTEGER NOT NULL DEFAULT 1,
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  team_a_score INTEGER DEFAULT 0,
  team_b_score INTEGER DEFAULT 0,
  winner TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stream polls for interactive viewing
CREATE TABLE public.stream_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.esports_events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Poll votes
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.stream_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Stream predictions
CREATE TABLE public.stream_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.esports_events(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.esports_matches(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  winning_option TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Prediction entries
CREATE TABLE public.prediction_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES public.stream_predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  points_wagered INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prediction_id, user_id)
);

-- Stream reactions
CREATE TABLE public.stream_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.esports_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.esports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esports_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for esports_events
CREATE POLICY "Events are viewable by everyone" ON public.esports_events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON public.esports_events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their events" ON public.esports_events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their events" ON public.esports_events FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for esports_matches
CREATE POLICY "Matches are viewable by everyone" ON public.esports_matches FOR SELECT USING (true);
CREATE POLICY "Event creators can manage matches" ON public.esports_matches FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.esports_events WHERE id = event_id AND created_by = auth.uid()));
CREATE POLICY "Event creators can update matches" ON public.esports_matches FOR UPDATE USING (EXISTS (SELECT 1 FROM public.esports_events WHERE id = event_id AND created_by = auth.uid()));
CREATE POLICY "Event creators can delete matches" ON public.esports_matches FOR DELETE USING (EXISTS (SELECT 1 FROM public.esports_events WHERE id = event_id AND created_by = auth.uid()));

-- RLS Policies for stream_polls
CREATE POLICY "Polls are viewable by everyone" ON public.stream_polls FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create polls" ON public.stream_polls FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their polls" ON public.stream_polls FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for poll_votes
CREATE POLICY "Votes are viewable by everyone" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stream_predictions
CREATE POLICY "Predictions are viewable by everyone" ON public.stream_predictions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create predictions" ON public.stream_predictions FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update predictions" ON public.stream_predictions FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for prediction_entries
CREATE POLICY "Entries are viewable by everyone" ON public.prediction_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can enter predictions" ON public.prediction_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stream_reactions
CREATE POLICY "Reactions are viewable by everyone" ON public.stream_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON public.stream_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for interactive features
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.esports_matches;