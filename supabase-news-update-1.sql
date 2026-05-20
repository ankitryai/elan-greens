-- ============================================================================
-- Elan Greens — News settings update #1
-- Run in Supabase SQL Editor after the initial news migration.
-- ============================================================================

-- 1. Change cache from 1 hour to 24 hours
UPDATE app_settings
SET value = '24', updated_at = now()
WHERE key = 'news_cache_hours';

-- 2. Add max-age setting (how many days back to look for articles)
INSERT INTO app_settings (key, value, description)
VALUES ('news_max_age_days', '365', 'Maximum article age in days — older articles are excluded from the feed')
ON CONFLICT (key) DO NOTHING;

-- 3. Add The Wire Science — best English-language source for Indian research
--    (covers IISc, WII, NCF and other institution research regularly)
INSERT INTO news_sources (domain, label, priority)
VALUES ('science.thewire.in', 'The Wire Science', 9)
ON CONFLICT (domain) DO NOTHING;
