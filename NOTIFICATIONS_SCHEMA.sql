-- Notifications and Connections schema for OneSignal integration
-- Run in Supabase SQL editor

-- Add OneSignal player ID to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Create connections table for friend requests
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique connections
  UNIQUE (requester_id, recipient_id)
);

-- Create notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('team_invitation', 'meeting_reminder', 'connection_request', 'connection_accepted', 'connection_declined', 'team_update', 'meeting_update')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY "Connections read" ON connections
  FOR SELECT
  USING (
    requester_id = auth.uid()
    OR recipient_id = auth.uid()
  );

CREATE POLICY "Connections insert" ON connections
  FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
  );

CREATE POLICY "Connections update" ON connections
  FOR UPDATE
  USING (
    requester_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- Notifications policies
CREATE POLICY "Notifications read" ON notifications
  FOR SELECT
  USING (
    recipient_id = auth.uid()
    OR sender_id = auth.uid()
  );

CREATE POLICY "Notifications insert" ON notifications
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connections_requester_id ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient_id ON connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_requested_at ON connections(requested_at);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Function to send notification (for use in triggers)
CREATE OR REPLACE FUNCTION send_notification(
  p_recipient_id uuid,
  p_sender_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  -- Insert notification record
  INSERT INTO notifications (recipient_id, sender_id, type, title, body, data)
  VALUES (p_recipient_id, p_sender_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO notification_id;
  
  -- Here you would typically call an external service to send the actual push notification
  -- For now, we just log it
  RAISE LOG 'Notification sent: % to %', p_title, p_recipient_id;
  
  RETURN notification_id;
END;
$$;
