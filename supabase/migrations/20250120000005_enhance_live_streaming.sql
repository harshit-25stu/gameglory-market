-- Enhance live streaming features
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS stream_quality VARCHAR(20) DEFAULT '720p' CHECK (stream_quality IN ('480p', '720p', '1080p', '4k'));
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS is_recording BOOLEAN DEFAULT FALSE;
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS stream_key VARCHAR(255);
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS rtmp_url TEXT;

-- Create stream interactions table
CREATE TABLE stream_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'like', 'follow', 'subscribe', 'donation', 'raid')),
  amount DECIMAL(10,2),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stream moderation table
CREATE TABLE stream_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('ban_user', 'timeout_user', 'delete_message', 'warn_user')),
  target_user_id UUID REFERENCES profiles(id),
  target_message_id UUID,
  reason TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stream goals/rewards
CREATE TABLE stream_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('follower', 'viewer', 'donation', 'subscriber')),
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reward_description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stream_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Stream interactions are readable by all" ON stream_interactions FOR SELECT USING (true);
CREATE POLICY "Users can create their own interactions" ON stream_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Stream moderation is readable by stream host and moderators" ON stream_moderation FOR SELECT USING (
  auth.uid() IN (
    SELECT host_id FROM live_streams WHERE live_streams.id = stream_moderation.stream_id
  )
);
CREATE POLICY "Stream host can manage moderation" ON stream_moderation FOR ALL USING (
  auth.uid() IN (
    SELECT host_id FROM live_streams WHERE live_streams.id = stream_moderation.stream_id
  )
);
CREATE POLICY "Stream goals are readable by all" ON stream_goals FOR SELECT USING (true);
CREATE POLICY "Stream host can manage goals" ON stream_goals FOR ALL USING (
  auth.uid() IN (
    SELECT host_id FROM live_streams WHERE live_streams.id = stream_goals.stream_id
  )
);

-- Create indexes
CREATE INDEX idx_stream_interactions_stream ON stream_interactions(stream_id, created_at DESC);
CREATE INDEX idx_stream_moderation_stream ON stream_moderation(stream_id);
CREATE INDEX idx_stream_goals_stream ON stream_goals(stream_id, is_completed);