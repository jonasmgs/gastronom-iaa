-- Create table for push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Function to get VAPID public key
CREATE OR REPLACE FUNCTION get_vapid_public_key()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.settings.VAPID_PUBLIC_KEY', true),
    'BIsGrgamd1ZhYgVBmzCJa4cvxyHBZFns5ffUsUwXTDC+clYyB1bxuOf6+IXg3PYMp3W4UPjptSBHWEgkOubet8U='
  );
END;
$$ LANGUAGE plpgsql;
