-- Feedback table — community submissions from the consumer app
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS feedback (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ  DEFAULT now() NOT NULL,
  property_id     TEXT         DEFAULT 'ELAN_HOMES' NOT NULL,
  topic           TEXT         NOT NULL,          -- species_correction | missing_species | location_fix | landmark_issue | general
  subtopic        TEXT         NOT NULL,
  reference_name  TEXT,                           -- which plant or landmark the user is referring to
  details         TEXT         NOT NULL,
  contact_email   TEXT,                           -- optional — for follow-up
  status          TEXT         DEFAULT 'unread' NOT NULL,  -- unread | actioned | dismissed
  ip_hash         TEXT                            -- SHA-256 of IP for rate-limiting; never the raw IP
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can insert — this is how public feedback submissions work
CREATE POLICY "public_insert_feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- No anon SELECT policy — only service role can read feedback (admin only)

-- Index for admin queries
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_status_idx     ON feedback (status);
CREATE INDEX IF NOT EXISTS feedback_property_idx   ON feedback (property_id);
