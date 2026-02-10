-- Create price history table
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('digital_item', 'physical_game', 'game_skin')),
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(20) DEFAULT 'platform' CHECK (source IN ('platform', 'external', 'estimated'))
);

-- Create market trends table
CREATE TABLE market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_title VARCHAR(255) NOT NULL,
  platform VARCHAR(50),
  item_type VARCHAR(20) NOT NULL,
  average_price DECIMAL(10,2),
  median_price DECIMAL(10,2),
  lowest_price DECIMAL(10,2),
  highest_price DECIMAL(10,2),
  volume INTEGER DEFAULT 0,
  price_change_24h DECIMAL(5,2),
  price_change_7d DECIMAL(5,2),
  price_change_30d DECIMAL(5,2),
  trend_direction VARCHAR(10) CHECK (trend_direction IN ('up', 'down', 'stable')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_title, platform, item_type)
);

-- Create price alerts table
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_title VARCHAR(255) NOT NULL,
  platform VARCHAR(50),
  target_price DECIMAL(10,2) NOT NULL,
  alert_type VARCHAR(20) DEFAULT 'below' CHECK (alert_type IN ('below', 'above', 'change')),
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create market insights table
CREATE TABLE market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  data JSONB,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Price history is readable by all" ON price_history FOR SELECT USING (true);
CREATE POLICY "Market trends are readable by all" ON market_trends FOR SELECT USING (true);
CREATE POLICY "Users can manage their own price alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Market insights are readable by all" ON market_insights FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX idx_price_history_item ON price_history(item_id, item_type);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at DESC);
CREATE INDEX idx_market_trends_game ON market_trends(game_title, platform);
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id, is_active);
CREATE INDEX idx_market_insights_type ON market_insights(insight_type, is_active);

-- Function to record price history
CREATE OR REPLACE FUNCTION record_price_history(
  p_item_id UUID,
  p_item_type VARCHAR(20),
  p_price DECIMAL(10,2),
  p_source VARCHAR(20) DEFAULT 'platform'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO price_history (item_id, item_type, price, source)
  VALUES (p_item_id, p_item_type, p_price, p_source);
END;
$$ LANGUAGE plpgsql;

-- Function to update market trends
CREATE OR REPLACE FUNCTION update_market_trends() RETURNS VOID AS $$
DECLARE
  trend_record RECORD;
  price_stats RECORD;
BEGIN
  -- Clear old trends (older than 30 days)
  DELETE FROM market_trends WHERE last_updated < NOW() - INTERVAL '30 days';

  -- Update trends for active items
  FOR trend_record IN
    SELECT DISTINCT game_title, platform, item_type
    FROM (
      SELECT game_title, platform, 'digital_item' as item_type FROM digital_items WHERE is_available = true
      UNION
      SELECT title as game_title, platform, 'physical_game' as item_type FROM physical_games WHERE is_available = true
      UNION
      SELECT game, NULL as platform, 'game_skin' as item_type FROM game_skins WHERE is_available = true
    ) items
  LOOP
    -- Calculate price statistics
    SELECT
      AVG(price) as avg_price,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as volume
    INTO price_stats
    FROM (
      SELECT price FROM digital_items
      WHERE game_title = trend_record.game_title
        AND (trend_record.platform IS NULL OR platform = trend_record.platform)
        AND is_available = true
      UNION ALL
      SELECT price FROM physical_games
      WHERE title = trend_record.game_title
        AND (trend_record.platform IS NULL OR platform = trend_record.platform)
        AND is_available = true
      UNION ALL
      SELECT price FROM game_skins
      WHERE game = trend_record.game_title
        AND is_available = true
    ) prices;

    -- Calculate price changes
    WITH recent_prices AS (
      SELECT
        AVG(CASE WHEN recorded_at >= NOW() - INTERVAL '1 day' THEN price END) as price_24h_ago,
        AVG(CASE WHEN recorded_at >= NOW() - INTERVAL '7 days' THEN price END) as price_7d_ago,
        AVG(CASE WHEN recorded_at >= NOW() - INTERVAL '30 days' THEN price END) as price_30d_ago
      FROM price_history
      WHERE item_type = trend_record.item_type
        AND recorded_at >= NOW() - INTERVAL '30 days'
    )
    SELECT
      CASE
        WHEN price_24h_ago > 0 THEN ((price_stats.avg_price - price_24h_ago) / price_24h_ago * 100)
        ELSE 0
      END as change_24h,
      CASE
        WHEN price_7d_ago > 0 THEN ((price_stats.avg_price - price_7d_ago) / price_7d_ago * 100)
        ELSE 0
      END as change_7d,
      CASE
        WHEN price_30d_ago > 0 THEN ((price_stats.avg_price - price_30d_ago) / price_30d_ago * 100)
        ELSE 0
      END as change_30d
    INTO price_stats
    FROM recent_prices;

    -- Determine trend direction
    DECLARE trend_direction VARCHAR(10);
    BEGIN
      IF price_stats.change_7d > 5 THEN
        trend_direction := 'up';
      ELSIF price_stats.change_7d < -5 THEN
        trend_direction := 'down';
      ELSE
        trend_direction := 'stable';
      END IF;
    END;

    -- Insert or update market trend
    INSERT INTO market_trends (
      game_title, platform, item_type, average_price, median_price,
      lowest_price, highest_price, volume, price_change_24h,
      price_change_7d, price_change_30d, trend_direction, last_updated
    ) VALUES (
      trend_record.game_title, trend_record.platform, trend_record.item_type,
      price_stats.avg_price, price_stats.median_price, price_stats.min_price,
      price_stats.max_price, price_stats.volume, price_stats.change_24h,
      price_stats.change_7d, price_stats.change_30d, trend_direction, NOW()
    )
    ON CONFLICT (game_title, platform, item_type)
    DO UPDATE SET
      average_price = EXCLUDED.average_price,
      median_price = EXCLUDED.median_price,
      lowest_price = EXCLUDED.lowest_price,
      highest_price = EXCLUDED.highest_price,
      volume = EXCLUDED.volume,
      price_change_24h = EXCLUDED.price_change_24h,
      price_change_7d = EXCLUDED.price_change_7d,
      price_change_30d = EXCLUDED.price_change_30d,
      trend_direction = EXCLUDED.trend_direction,
      last_updated = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check and trigger price alerts
CREATE OR REPLACE FUNCTION check_price_alerts() RETURNS VOID AS $$
DECLARE
  alert_record RECORD;
  current_price DECIMAL(10,2);
  should_trigger BOOLEAN;
BEGIN
  FOR alert_record IN SELECT * FROM price_alerts WHERE is_active = true LOOP
    -- Get current market price
    SELECT average_price INTO current_price
    FROM market_trends
    WHERE game_title = alert_record.game_title
      AND (platform = alert_record.platform OR platform IS NULL)
    LIMIT 1;

    IF current_price IS NOT NULL THEN
      -- Check if alert should trigger
      should_trigger := FALSE;

      CASE alert_record.alert_type
        WHEN 'below' THEN
          IF current_price <= alert_record.target_price THEN
            should_trigger := TRUE;
          END IF;
        WHEN 'above' THEN
          IF current_price >= alert_record.target_price THEN
            should_trigger := TRUE;
          END IF;
        WHEN 'change' THEN
          -- For change alerts, trigger if price changed significantly
          should_trigger := TRUE;
      END CASE;

      IF should_trigger THEN
        -- Send notification
        PERFORM send_notification(
          alert_record.user_id,
          'market',
          'Price Alert Triggered!',
          format('Price alert for %s: Current price $%s (Target: $%s)',
                 alert_record.game_title, current_price, alert_record.target_price),
          jsonb_build_object('game_title', alert_record.game_title, 'current_price', current_price),
          'normal'
        );

        -- Update last triggered
        UPDATE price_alerts
        SET last_triggered = NOW(), updated_at = NOW()
        WHERE id = alert_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically record price history when items are updated
CREATE OR REPLACE FUNCTION trigger_price_history() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.price != NEW.price)) THEN
    -- Determine item type
    DECLARE item_type VARCHAR(20);
    BEGIN
      CASE TG_TABLE_NAME
        WHEN 'digital_items' THEN item_type := 'digital_item';
        WHEN 'physical_games' THEN item_type := 'physical_game';
        WHEN 'game_skins' THEN item_type := 'game_skin';
        ELSE item_type := 'unknown';
      END CASE;

      -- Record price history
      PERFORM record_price_history(NEW.id, item_type, NEW.price, 'platform');
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to item tables
CREATE TRIGGER digital_items_price_history
  AFTER INSERT OR UPDATE ON digital_items
  FOR EACH ROW EXECUTE FUNCTION trigger_price_history();

CREATE TRIGGER physical_games_price_history
  AFTER INSERT OR UPDATE ON physical_games
  FOR EACH ROW EXECUTE FUNCTION trigger_price_history();

CREATE TRIGGER game_skins_price_history
  AFTER INSERT OR UPDATE ON game_skins
  FOR EACH ROW EXECUTE FUNCTION trigger_price_history();