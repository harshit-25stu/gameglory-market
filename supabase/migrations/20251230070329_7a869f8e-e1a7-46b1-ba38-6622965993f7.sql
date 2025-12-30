-- Add NOT NULL constraints to identity columns for RLS enforcement
ALTER TABLE hub_members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE hub_posts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE physical_games ALTER COLUMN seller_id SET NOT NULL;
ALTER TABLE user_game_libraries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE digital_items ALTER COLUMN seller_id SET NOT NULL;