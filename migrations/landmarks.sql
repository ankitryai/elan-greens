-- ============================================================
-- Elan Greens — Landmarks architecture
-- Run once in Supabase SQL Editor
-- ============================================================

-- 1. Landmarks table (property-scoped, admin-managed)
CREATE TABLE IF NOT EXISTS landmarks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL DEFAULT 'elan',
  name        text NOT NULL,
  sub_label   text,                -- tower name for Block category (e.g. Caldra, Sanster)
  icon        text,                -- emoji shown on map
  lat         numeric(12,10) NOT NULL,
  lng         numeric(12,10) NOT NULL,
  category    text NOT NULL CHECK (category IN ('Block','Gate','Sports','Amenity','Infrastructure','Green Space')),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Plant → Landmark tags (species level, many-to-many)
CREATE TABLE IF NOT EXISTS plant_landmark_tags (
  species_id  uuid NOT NULL REFERENCES plant_species(id) ON DELETE CASCADE,
  landmark_id uuid NOT NULL REFERENCES landmarks(id) ON DELETE CASCADE,
  PRIMARY KEY (species_id, landmark_id)
);

-- 3. property_id on plant_instances (future multi-residence scoping)
ALTER TABLE plant_instances
  ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT 'elan';

-- 4. RLS — public read only (writes need service role)
ALTER TABLE landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_landmark_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landmarks_public_read"          ON landmarks;
DROP POLICY IF EXISTS "plant_landmark_tags_public_read" ON plant_landmark_tags;

CREATE POLICY "landmarks_public_read"
  ON landmarks FOR SELECT USING (active = true);

CREATE POLICY "plant_landmark_tags_public_read"
  ON plant_landmark_tags FOR SELECT USING (true);

-- 5. Seed all existing landmarks (safe to re-run — ON CONFLICT DO NOTHING)
INSERT INTO landmarks (property_id, name, sub_label, icon, lat, lng, category) VALUES
  -- Blocks
  ('elan', 'Block 1A', 'Caldra',  null, 12.91783433084684,  77.6726333387974,  'Block'),
  ('elan', 'Block 1B', 'Clayton', null, 12.91823040103564,  77.6728251167359,  'Block'),
  ('elan', 'Block 1C', 'Senswe',  null, 12.91820621854118,  77.6732703634155,  'Block'),
  ('elan', 'Block 1D', 'Sesna',   null, 12.91798400099841,  77.6736767180608,  'Block'),
  ('elan', 'Block 1E', 'Pratle',  null, 12.91766766745733,  77.6740133352728,  'Block'),
  ('elan', 'Block 1F', 'Raxton',  null, 12.91731081136661,  77.6738497205344,  'Block'),
  ('elan', 'Block 1G', 'Dyna',    null, 12.91841928576080,  77.6730973609282,  'Block'),
  ('elan', 'Block 1H', null,      null, 12.91789903541721,  77.6739811487665,  'Block'),
  ('elan', 'Block 2A', 'Sanster', null, 12.91748205006520,  77.6731751449919,  'Block'),
  -- Gates
  ('elan', 'Entry Gate', null, '🚪', 12.91749316097813,  77.6727339216401,  'Gate'),
  ('elan', 'Exit Gate',  null, '🚪', 12.91742910987837,  77.6728532799345,  'Gate'),
  ('elan', 'Back Gate',  null, '🚪', 12.91859967382031,  77.6729015596631,  'Gate'),
  -- Sports
  ('elan', 'Badminton Court', null, '🏸', 12.91737094099992,  77.6735332198749,  'Sports'),
  ('elan', 'Cricket Area',    null, '🏏', 12.91763629551157,  77.6730517633802,  'Sports'),
  ('elan', 'Open Air Gym',    null, '🏋', 12.918296579148617, 77.67391279240621, 'Sports'),
  -- Amenities
  ('elan', 'Swimming Pool',      null, '🏊', 12.91771108038718,  77.6737209744996,  'Amenity'),
  ('elan', 'Clubhouse',          null, '🏠', 12.91795066836152,  77.6735506542425,  'Amenity'),
  ('elan', 'Grocery Store',      null, '🛒', 12.91773367924865,  77.6734393425718,  'Amenity'),
  ('elan', 'Sitting Gazebo',     null, '⛺', 12.917379930849277, 77.6736874868455,  'Amenity'),
  ('elan', 'Pool Overflow Area', null, '🌊', 12.917580580710785, 77.67382226784446, 'Amenity'),
  ('elan', 'Amphitheatre',       null, '🎭', 12.917940375313487, 77.67322212636206, 'Amenity'),
  -- Infrastructure
  ('elan', 'Helper''s WC',         null, '🚻', 12.91703499917045,  77.6740334518334,  'Infrastructure'),
  ('elan', 'Genset Cage',          null, '⚡', 12.917548061905524, 77.6743432469792,  'Infrastructure'),
  ('elan', 'STP',                  null, '💧', 12.917033038420447, 77.67396371442065, 'Infrastructure'),
  ('elan', '1E Parking Ramp',      null, '🚗', 12.918103548095322, 77.67404445281441, 'Infrastructure'),
  ('elan', '1F Parking Ramp',      null, '🚗', 12.917383359083345, 77.67417963222587, 'Infrastructure'),
  ('elan', '2A Parking Ramp',      null, '🚗', 12.917321922288737, 77.67333607752764, 'Infrastructure'),
  ('elan', 'Workers Bike Parking', null, '🏍', 12.917814396612606, 77.67245228966084, 'Infrastructure'),
  ('elan', 'EV Charging Station',  null, '🔋', 12.917490694834264, 77.6743131313502,  'Infrastructure'),
  ('elan', 'Guard Dining Room',    null, '🍽', 12.917746917361551, 77.67239600324899, 'Infrastructure'),
  ('elan', 'Composting Room',      null, '♻️', 12.918534482328027, 77.67283588550282, 'Infrastructure'),
  -- Green Space
  ('elan', 'Elan Nursery Garden',  null, '🌱', 12.917812275543776, 77.67449349063475, 'Green Space')
ON CONFLICT DO NOTHING;
