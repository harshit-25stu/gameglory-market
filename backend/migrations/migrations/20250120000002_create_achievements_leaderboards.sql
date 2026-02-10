-- Create achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  points INTEGER DEFAULT 0,
  requirements JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user achievements table
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create leaderboards table
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  period VARCHAR(20) DEFAULT 'all_time' CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  metric VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  max_entries INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leaderboard entries table
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score DECIMAL(10,2) DEFAULT 0,
  rank INTEGER,
  metadata JSONB DEFAULT '{}',
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(leaderboard_id, user_id, period_start)
);

-- Create user reputation/levels system
CREATE TABLE user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  current_level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  title VARCHAR(100),
  prestige_level INTEGER DEFAULT 0,
  last_level_up TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create XP events table for tracking XP gains
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  xp_amount INTEGER NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, rarity, points, requirements) VALUES
('First Sale', 'Complete your first successful sale', 'shopping-bag', 'trading', 'common', 100,
 '{"type": "sales_count", "value": 1}'),
('Trading Champion', 'Complete 50 successful trades', 'trophy', 'trading', 'epic', 500,
 '{"type": "sales_count", "value": 50}'),
('Trusted Seller', 'Maintain a 4.8+ rating with 20+ reviews', 'star', 'reputation', 'rare', 300,
 '{"type": "rating_threshold", "rating": 4.8, "reviews": 20}'),
('Community Builder', 'Join 10 different game hubs', 'users', 'social', 'rare', 250,
 '{"type": "hub_memberships", "value": 10}'),
('Early Bird', 'Be one of the first 100 users on the platform', 'zap', 'special', 'legendary', 1000,
 '{"type": "user_rank", "value": 100}'),
('Quality Trader', 'Receive 25 5-star reviews', 'award', 'reputation', 'epic', 400,
 '{"type": "five_star_reviews", "value": 25}'),
('Hub Moderator', 'Help moderate a game hub for 30 days', 'shield', 'community', 'rare', 350,
 '{"type": "moderation_days", "value": 30}'),
('Stream Star', 'Host 10 successful live streams', 'video', 'streaming', 'epic', 450,
 '{"type": "streams_hosted", "value": 10}'),
('Trade Master', 'Successfully trade items worth over $1000', 'trending-up', 'trading', 'legendary', 750,
 '{"type": "trade_value", "value": 1000}'),
('Helper Extraordinaire', 'Help 50 users in hangout rooms', 'heart', 'social', 'rare', 200,
 '{"type": "users_helped", "value": 50}');

-- Insert default leaderboards
INSERT INTO leaderboards (name, description, category, period, metric, max_entries) VALUES
('Top Traders', 'Users with the highest total sales value', 'trading', 'monthly', 'total_sales_value', 50),
('Most Active', 'Users with the highest trading activity', 'activity', 'weekly', 'trades_completed', 50),
('Rising Stars', 'New users making their mark', 'growth', 'monthly', 'account_age_months', 50),
('Community Champions', 'Most active community contributors', 'social', 'weekly', 'hub_posts', 50),
('Stream Masters', 'Top live stream hosts by viewership', 'streaming', 'monthly', 'stream_views', 50),
('Trusted Traders', 'Highest rated sellers', 'reputation', 'all_time', 'average_rating', 50);

-- Create function to award XP
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_xp_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
  old_level INTEGER;
  new_level INTEGER;
  xp_needed INTEGER;
  leveled_up BOOLEAN := FALSE;
BEGIN
  -- Insert XP event
  INSERT INTO xp_events (user_id, event_type, xp_amount, description, metadata)
  VALUES (p_user_id, p_event_type, p_xp_amount, p_description, p_metadata);

  -- Update user levels
  UPDATE user_levels
  SET total_xp = total_xp + p_xp_amount,
      current_xp = current_xp + p_xp_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING current_level INTO old_level;

  -- Check if level up occurred
  SELECT current_level INTO new_level
  FROM user_levels
  WHERE user_id = p_user_id;

  -- Calculate XP needed for next level (simple exponential growth)
  xp_needed := new_level * 1000;

  IF (SELECT current_xp FROM user_levels WHERE user_id = p_user_id) >= xp_needed THEN
    UPDATE user_levels
    SET current_level = current_level + 1,
        current_xp = current_xp - xp_needed,
        last_level_up = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    leveled_up := TRUE;
  END IF;

  -- Update profiles table for backward compatibility
  UPDATE profiles
  SET trader_xp = (SELECT total_xp FROM user_levels WHERE user_id = p_user_id),
      trader_level = (SELECT current_level FROM user_levels WHERE user_id = p_user_id),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN CASE WHEN leveled_up THEN new_level + 1 ELSE new_level END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievement_progress(p_user_id UUID) RETURNS TABLE(
  achievement_id UUID,
  achievement_name VARCHAR(100),
  completed BOOLEAN,
  progress INTEGER,
  requirement_value INTEGER
) AS $$
DECLARE
  achievement_record RECORD;
  user_stat INTEGER;
  requirement_value INTEGER;
BEGIN
  FOR achievement_record IN SELECT * FROM achievements WHERE is_active = TRUE LOOP
    -- Check different requirement types
    CASE (achievement_record.requirements->>'type')
      WHEN 'sales_count' THEN
        SELECT COUNT(*) INTO user_stat
        FROM orders WHERE seller_id = p_user_id AND status = 'completed';
        requirement_value := (achievement_record.requirements->>'value')::INTEGER;

      WHEN 'hub_memberships' THEN
        SELECT COUNT(*) INTO user_stat
        FROM hub_members WHERE user_id = p_user_id;
        requirement_value := (achievement_record.requirements->>'value')::INTEGER;

      WHEN 'five_star_reviews' THEN
        SELECT COUNT(*) INTO user_stat
        FROM seller_ratings WHERE seller_id = p_user_id AND rating = 5;
        requirement_value := (achievement_record.requirements->>'value')::INTEGER;

      WHEN 'streams_hosted' THEN
        SELECT COUNT(*) INTO user_stat
        FROM live_streams WHERE host_id = p_user_id AND ended_at IS NOT NULL;
        requirement_value := (achievement_record.requirements->>'value')::INTEGER;

      WHEN 'trade_value' THEN
        SELECT COALESCE(SUM(total_price), 0) INTO user_stat
        FROM orders WHERE seller_id = p_user_id AND status = 'completed';
        requirement_value := (achievement_record.requirements->>'value')::INTEGER;

      ELSE
        CONTINUE;
    END CASE;

    -- Update or insert user achievement progress
    INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
    VALUES (p_user_id, achievement_record.id, user_stat, user_stat >= requirement_value,
            CASE WHEN user_stat >= requirement_value THEN NOW() ELSE NULL END)
    ON CONFLICT (user_id, achievement_id)
    DO UPDATE SET
      progress = EXCLUDED.progress,
      completed = EXCLUDED.completed,
      completed_at = EXCLUDED.completed_at;

    -- Return result
    RETURN QUERY SELECT
      achievement_record.id,
      achievement_record.name,
      user_stat >= requirement_value,
      user_stat,
      requirement_value;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update leaderboards
CREATE OR REPLACE FUNCTION update_leaderboards() RETURNS VOID AS $$
DECLARE
  leaderboard_record RECORD;
  user_record RECORD;
  user_score DECIMAL(10,2);
BEGIN
  FOR leaderboard_record IN SELECT * FROM leaderboards WHERE is_active = TRUE LOOP
    -- Clear old entries for this leaderboard and period
    DELETE FROM leaderboard_entries
    WHERE leaderboard_id = leaderboard_record.id
      AND period_start <= NOW()
      AND (period_end IS NULL OR period_end >= NOW());

    -- Calculate scores for each user
    FOR user_record IN SELECT id FROM profiles LOOP
      CASE leaderboard_record.metric
        WHEN 'total_sales_value' THEN
          SELECT COALESCE(SUM(total_price), 0) INTO user_score
          FROM orders WHERE seller_id = user_record.id AND status = 'completed';

        WHEN 'trades_completed' THEN
          SELECT COUNT(*) INTO user_score
          FROM orders WHERE seller_id = user_record.id AND status = 'completed';

        WHEN 'account_age_months' THEN
          SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 2592000 INTO user_score
          FROM profiles WHERE id = user_record.id;

        WHEN 'hub_posts' THEN
          SELECT COUNT(*) INTO user_score
          FROM hub_posts WHERE user_id = user_record.id;

        WHEN 'stream_views' THEN
          SELECT COALESCE(SUM(viewer_count), 0) INTO user_score
          FROM live_streams WHERE host_id = user_record.id;

        WHEN 'average_rating' THEN
          SELECT COALESCE(AVG(rating), 0) INTO user_score
          FROM seller_ratings WHERE seller_id = user_record.id;

        ELSE
          user_score := 0;
      END CASE;

      -- Insert leaderboard entry if score > 0
      IF user_score > 0 THEN
        INSERT INTO leaderboard_entries (
          leaderboard_id, user_id, score, period_start, period_end
        ) VALUES (
          leaderboard_record.id,
          user_record.id,
          user_score,
          CASE leaderboard_record.period
            WHEN 'daily' THEN DATE_TRUNC('day', NOW())
            WHEN 'weekly' THEN DATE_TRUNC('week', NOW())
            WHEN 'monthly' THEN DATE_TRUNC('month', NOW())
            ELSE NULL
          END,
          CASE leaderboard_record.period
            WHEN 'daily' THEN DATE_TRUNC('day', NOW() + INTERVAL '1 day')
            WHEN 'weekly' THEN DATE_TRUNC('week', NOW() + INTERVAL '1 week')
            WHEN 'monthly' THEN DATE_TRUNC('month', NOW() + INTERVAL '1 month')
            ELSE NULL
          END
        );
      END IF;
    END LOOP;

    -- Update ranks
    UPDATE leaderboard_entries
    SET rank = sub.rank
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY leaderboard_id
               ORDER BY score DESC
             ) as rank
      FROM leaderboard_entries
      WHERE leaderboard_id = leaderboard_record.id
    ) sub
    WHERE leaderboard_entries.id = sub.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Achievements are readable by all" ON achievements FOR SELECT USING (true);
CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Leaderboards are readable by all" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "Leaderboard entries are readable by all" ON leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "Users can manage their own levels" ON user_levels FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own XP events" ON xp_events FOR SELECT USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_leaderboards_updated_at
  BEFORE UPDATE ON leaderboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_entries_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_levels_updated_at
  BEFORE UPDATE ON user_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();