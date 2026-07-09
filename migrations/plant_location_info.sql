-- =============================================================================
-- plant_location_info — property-scoped plant location descriptions
--
-- Separates "where does this plant grow at Elan?" from the global
-- interesting_fact field (now a pure botanical curiosity).
--
-- Run steps:
--   1. Execute the CREATE TABLE + RLS + INSERT block below.
--   2. Verify the data in the Supabase table editor.
--   3. Uncomment and run the UPDATE block to clear interesting_fact.
-- =============================================================================

CREATE TABLE IF NOT EXISTS plant_location_info (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id  uuid        NOT NULL REFERENCES plant_species(id) ON DELETE CASCADE,
  property_id text        NOT NULL DEFAULT 'elan',
  location_info text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species_id, property_id)
);

ALTER TABLE plant_location_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_location_info_public_read"
  ON plant_location_info FOR SELECT
  USING (true);

CREATE POLICY "plant_location_info_auth_write"
  ON plant_location_info FOR ALL
  USING (auth.role() = 'authenticated');

-- Migrate current interesting_fact values → plant_location_info for Elan property.
-- ON CONFLICT DO NOTHING so re-running this is safe.
INSERT INTO plant_location_info (species_id, property_id, location_info)
SELECT id, 'elan', interesting_fact
FROM plant_species
WHERE interesting_fact IS NOT NULL
  AND trim(interesting_fact) != ''
ON CONFLICT (species_id, property_id) DO NOTHING;

-- ── Step 3: clear interesting_fact after verifying the migration above ─────────
-- Run this separately once you confirm plant_location_info looks correct.
--
-- UPDATE plant_species
-- SET interesting_fact = NULL
-- WHERE id IN (
--   SELECT species_id FROM plant_location_info WHERE property_id = 'elan'
-- );
