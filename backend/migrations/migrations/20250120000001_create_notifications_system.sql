-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Create notification preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  trade_notifications BOOLEAN DEFAULT TRUE,
  social_notifications BOOLEAN DEFAULT TRUE,
  marketing_notifications BOOLEAN DEFAULT FALSE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification templates table for system notifications
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  expires_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default notification templates
INSERT INTO notification_templates (name, type, title_template, message_template, priority) VALUES
('trade_offer_received', 'trade', 'New Trade Offer!', 'You received a trade offer for {{item_title}} from {{seller_name}}', 'high'),
('trade_offer_accepted', 'trade', 'Trade Offer Accepted!', '{{buyer_name}} accepted your trade offer for {{item_title}}', 'high'),
('order_placed', 'order', 'New Order Received!', 'Someone purchased your {{item_title}} for ${{price}}', 'high'),
('order_shipped', 'order', 'Order Shipped!', 'Your order for {{item_title}} has been shipped', 'normal'),
('payment_received', 'payment', 'Payment Received!', 'You received ${{amount}} from your sale of {{item_title}}', 'high'),
('new_follower', 'social', 'New Follower!', '{{follower_name}} started following you', 'normal'),
('hub_invitation', 'social', 'Hub Invitation', 'You''ve been invited to join {{hub_name}}', 'normal'),
('achievement_unlocked', 'gamification', 'Achievement Unlocked!', 'Congratulations! You unlocked {{achievement_name}}', 'high'),
('price_alert', 'market', 'Price Alert', 'The price of {{item_title}} changed by {{percentage}}%', 'normal');

-- Create function to send notification
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_expires_hours INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration if specified
  IF p_expires_hours IS NOT NULL THEN
    expires_at := NOW() + INTERVAL '1 hour' * p_expires_hours;
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, data, priority, expires_at)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_priority, expires_at)
  RETURNING id INTO notification_id;

  -- Clean up expired notifications
  DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW();

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send notification using template
CREATE OR REPLACE FUNCTION send_notification_from_template(
  p_user_id UUID,
  p_template_name VARCHAR(100),
  p_template_vars JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  template_record RECORD;
  title_text TEXT;
  message_text TEXT;
  notification_id UUID;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM notification_templates
  WHERE name = p_template_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification template % not found', p_template_name;
  END IF;

  -- Replace variables in templates
  title_text := replace_template_vars(template_record.title_template, p_template_vars);
  message_text := replace_template_vars(template_record.message_template, p_template_vars);

  -- Send notification
  SELECT send_notification(
    p_user_id,
    template_record.type,
    title_text,
    message_text,
    p_template_vars,
    template_record.priority,
    template_record.expires_hours
  ) INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to replace template variables
CREATE OR REPLACE FUNCTION replace_template_vars(
  template_text TEXT,
  vars JSONB
) RETURNS TEXT AS $$
DECLARE
  key TEXT;
  result TEXT := template_text;
BEGIN
  FOR key IN SELECT jsonb_object_keys(vars) LOOP
    result := replace(result, '{{' || key || '}}', vars->>key);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Notification templates are readable by all" ON notification_templates
  FOR SELECT USING (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();