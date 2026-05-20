-- ============================================================================
-- Elan Greens — News feature migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================================

-- ── 1. news_sources — whitelist of positive platforms (admin-managed) ────────
CREATE TABLE IF NOT EXISTS news_sources (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain     text        UNIQUE NOT NULL,   -- e.g. "thebetterindia.com"
  label      text        NOT NULL,          -- e.g. "The Better India"
  enabled    boolean     NOT NULL DEFAULT true,
  priority   integer     NOT NULL DEFAULT 5, -- higher = preferred in scoring
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 2. app_settings — generic key-value config store ────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key         text        PRIMARY KEY,
  value       text        NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 3. RLS — public read, service-role write ─────────────────────────────────
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow the public app (anon key) to read both tables
CREATE POLICY "news_sources_public_read"
  ON news_sources FOR SELECT USING (true);

CREATE POLICY "app_settings_public_read"
  ON app_settings FOR SELECT USING (true);

-- ── 4. Seed: default positive-platform whitelist ─────────────────────────────
INSERT INTO news_sources (domain, label, priority) VALUES
  ('thebetterindia.com',    'The Better India',   10),
  ('downtoearth.org.in',    'Down To Earth',       9),
  ('india.mongabay.com',    'Mongabay India',      9),
  ('sanctuaryasia.com',     'Sanctuary Asia',      8),
  ('deccanherald.com',      'Deccan Herald',       8),
  ('thehindu.com',          'The Hindu',           7),
  ('newindianexpress.com',  'New Indian Express',  6),
  ('indianexpress.com',     'The Indian Express',  6)
ON CONFLICT (domain) DO NOTHING;

-- ── 5. Seed: default news tuneable settings ───────────────────────────────────
INSERT INTO app_settings (key, value, description) VALUES
  ('news_max_articles',   '10', 'Maximum news articles shown on the News page'),
  ('news_max_plant_tags', '3',  'Maximum plant name tags shown per article'),
  ('news_max_plants',     '20', 'Top N plants to query (by global observation count)'),
  ('news_max_per_plant',  '2',  'Maximum articles per plant to prevent monopolisation')
ON CONFLICT (key) DO NOTHING;
