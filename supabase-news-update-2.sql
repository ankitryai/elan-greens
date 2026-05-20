-- ============================================================================
-- Elan Greens — News update #2: Topic Queries
-- Run in Supabase SQL Editor after supabase-news-update-1.sql
-- ============================================================================

-- 1. New table: admin-configurable topic queries
CREATE TABLE IF NOT EXISTS news_topic_queries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text  text        NOT NULL,         -- e.g. "Bengaluru landscaping"
  chip_label  text        NOT NULL,         -- e.g. "Green Bengaluru"
  chip_icon   text        NOT NULL DEFAULT '🌳',
  enabled     boolean     NOT NULL DEFAULT true,
  priority    integer     NOT NULL DEFAULT 5,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS — public read (anon key), service-role write
ALTER TABLE news_topic_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_topic_queries_public_read"
  ON news_topic_queries FOR SELECT USING (true);

-- 3. Seed initial topic queries
INSERT INTO news_topic_queries (query_text, chip_label, chip_icon, priority) VALUES
  ('Bengaluru landscaping',          'Green Bengaluru', '🌳', 10),
  ('"apartment garden" Bangalore',   'Community',       '🏘️', 9),
  ('"urban greening" Bengaluru',     'Green Bengaluru', '🌳', 9),
  ('"terrace garden" Bengaluru',     'Community',       '🏘️', 8),
  ('"native plants" Bangalore',      'Native Plants',   '🌱', 8),
  ('Lalbagh Bengaluru',              'Green Bengaluru', '🌳', 7),
  ('"Cubbon Park" Bengaluru',        'Green Bengaluru', '🌳', 7),
  ('"green building" Karnataka',     'Green Bengaluru', '🌳', 6)
ON CONFLICT DO NOTHING;

-- 4. Add Bangalore Mirror — hyper-local paper, covers society green drives
INSERT INTO news_sources (domain, label, priority)
VALUES ('bangaloremirror.indiatimes.com', 'Bangalore Mirror', 6)
ON CONFLICT (domain) DO NOTHING;
