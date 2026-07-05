// Parses Elan Greens landmark mentions out of plant interesting_fact (IF) text.
// Pure function — no API calls, no imports. Runs server-side in map/page.tsx.
//
// Scoring model:
//   Block name (Caldra, Sesna…)        → 0.93  (most specific)
//   Full block number (1A, Block 1A)   → 0.90
//   Block + circle type (outer/inner)  → 0.88  (entry coords used)
//   Single unique letter (B C D…)      → 0.78
//   Single ambiguous "A"               → 0.62  (could be 1A or 2A)
//   Amenity name (pool, badminton…)    → 0.92
//   Gate name (entry gate, back gate…) → 0.91
//   Generic circle ref only            → 0.35  (too vague, skipped)

export interface ApproxLocation {
  landmarkName: string
  lat: number
  lng: number
  confidence: number     // 0–1
  matchedKeyword: string // the phrase that caused the match (for popup display)
  locationType: 'block_centroid' | 'block_outer_entry' | 'block_inner_entry' | 'gate' | 'amenity'
}

// ── Full coordinate dataset ────────────────────────────────────────────────────

const BLOCK_CENTROIDS: Record<string, { lat: number; lng: number; name: string; sub: string }> = {
  '1A': { lat: 12.91783433084684, lng: 77.6726333387974, name: 'Block 1A',  sub: 'Caldra'  },
  '1B': { lat: 12.91823040103564, lng: 77.6728251167359, name: 'Block 1B',  sub: 'Clayton' },
  '1C': { lat: 12.91820621854118, lng: 77.6732703634155, name: 'Block 1C',  sub: 'Senswe'  },
  '1D': { lat: 12.91798400099841, lng: 77.6736767180608, name: 'Block 1D',  sub: 'Sesna'   },
  '1E': { lat: 12.91766766745733, lng: 77.6740133352728, name: 'Block 1E',  sub: 'Pratle'  },
  '1F': { lat: 12.91731081136661, lng: 77.6738497205344, name: 'Block 1F',  sub: 'Raxton'  },
  '1G': { lat: 12.91841928576080, lng: 77.6730973609282, name: 'Block 1G',  sub: 'Dyna'    },
  '1H': { lat: 12.91789903541721, lng: 77.6739811487665, name: 'Block 1H',  sub: ''        },
  '2A': { lat: 12.91748205006520, lng: 77.6731751449919, name: 'Block 2A',  sub: 'Sanster' },
}

const BLOCK_OUTER_ENTRIES: Record<string, { lat: number; lng: number }> = {
  '1B': { lat: 12.91850817265170, lng: 77.6729565449811 },
  '1C': { lat: 12.91836307786928, lng: 77.6735131033198 },
  '1D': { lat: 12.91818268964391, lng: 77.6738980002914 },
  '1E': { lat: 12.91783629159167, lng: 77.6742748506468 },
  '1H': { lat: 12.91789772826099, lng: 77.6742064543209 },
  '2A': { lat: 12.91741669179787, lng: 77.6731510051181 },
}

const BLOCK_INNER_ENTRIES: Record<string, { lat: number; lng: number }> = {
  '1A': { lat: 12.91780393929684, lng: 77.6729277112043 },
  '1B': { lat: 12.91819151298275, lng: 77.6731241183015 },
  '2A': { lat: 12.91763270081749, lng: 77.6733763106606 },
}

const GATE_COORDS = {
  entry: { lat: 12.91749316097813, lng: 77.6727339216401, name: 'Entry Gate' },
  exit:  { lat: 12.91742910987837, lng: 77.6728532799345, name: 'Exit Gate'  },
  back:  { lat: 12.91859967382031, lng: 77.6729015596631, name: 'Back Gate'  },
}

const AMENITY_COORDS = {
  pool:      { lat: 12.91771108038718, lng: 77.6737209744996, name: 'Swimming Pool'  },
  badminton: { lat: 12.91737094099992, lng: 77.6735332198749, name: 'Badminton Court' },
  cricket:   { lat: 12.91763629551157, lng: 77.6730517633802, name: 'Cricket Area'   },
  clubhouse: { lat: 12.91795066836152, lng: 77.6735506542425, name: 'Clubhouse'      },
  grocery:   { lat: 12.91773367924865, lng: 77.6734393425718, name: 'Grocery Store'  },
  helperswc: { lat: 12.91703499917045, lng: 77.6740334518334, name: "Helper's WC"   },
}

// ── Block number → letter mapping ─────────────────────────────────────────────
// Single unique letters B–H map to the only block with that letter.
// "A" alone is ambiguous (1A vs 2A); handled with lower confidence.
const LETTER_TO_BLOCK: Record<string, string> = {
  b: '1B', c: '1C', d: '1D', e: '1E', f: '1F', g: '1G', h: '1H',
}

// ── Helper: detect circle type in text ───────────────────────────────────────
function circleType(t: string): 'outer' | 'inner' | null {
  if (/outer\s*(circle|road|ring)/.test(t) || /\bouter\b/.test(t)) return 'outer'
  if (/inner\s*(circle|road|ring)/.test(t) || /\binner\b/.test(t)) return 'inner'
  return null
}

// ── Helper: resolve block + circle → coordinates + type ──────────────────────
function resolveBlock(
  blockKey: string,
  circle: 'outer' | 'inner' | null,
): { lat: number; lng: number; locationType: ApproxLocation['locationType']; landmarkName: string } {
  if (circle === 'outer' && BLOCK_OUTER_ENTRIES[blockKey]) {
    const e = BLOCK_OUTER_ENTRIES[blockKey]
    const b = BLOCK_CENTROIDS[blockKey]
    return { ...e, locationType: 'block_outer_entry', landmarkName: `${b.name} – Outer Entry` }
  }
  if (circle === 'inner' && BLOCK_INNER_ENTRIES[blockKey]) {
    const e = BLOCK_INNER_ENTRIES[blockKey]
    const b = BLOCK_CENTROIDS[blockKey]
    return { ...e, locationType: 'block_inner_entry', landmarkName: `${b.name} – Inner Entry` }
  }
  const b = BLOCK_CENTROIDS[blockKey]
  return { lat: b.lat, lng: b.lng, locationType: 'block_centroid', landmarkName: `${b.name} (${b.sub})`.replace(' ()', '') }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parseLocationFromIF(raw: string): ApproxLocation | null {
  if (!raw || raw.trim().length < 4) return null

  const t = raw.toLowerCase()
  const circle = circleType(t)
  const candidates: ApproxLocation[] = []

  // ── 1. Block sub-names (most specific) ─────────────────────────────────────
  const subNames: [string, string, number][] = [
    ['caldra',  '1A', 0.93],
    ['clayton', '1B', 0.93],
    ['senswe',  '1C', 0.93],
    ['sesna',   '1D', 0.93],
    ['pratle',  '1E', 0.93],
    ['raxton',  '1F', 0.93],
    ['dyna',    '1G', 0.93],
    ['sanster', '2A', 0.93],
  ]
  for (const [keyword, blockKey, baseConf] of subNames) {
    if (t.includes(keyword)) {
      const resolved = resolveBlock(blockKey, circle)
      candidates.push({ ...resolved, confidence: baseConf, matchedKeyword: keyword })
    }
  }

  // ── 2. Explicit "2A" / "block 2a" (before single "A" rule) ────────────────
  if (/\b2\s*a\b/.test(t) || /block\s+2a/.test(t)) {
    const resolved = resolveBlock('2A', circle)
    candidates.push({ ...resolved, confidence: 0.90, matchedKeyword: '2A' })
  }

  // ── 3. Full block numbers "1A" … "1H" ─────────────────────────────────────
  const fullBlockRe = /\b1\s*([a-h])\b/g
  let m: RegExpExecArray | null
  while ((m = fullBlockRe.exec(t)) !== null) {
    const blockKey = `1${m[1].toUpperCase()}`
    if (BLOCK_CENTROIDS[blockKey]) {
      const resolved = resolveBlock(blockKey, circle)
      candidates.push({ ...resolved, confidence: 0.90, matchedKeyword: `1${m[1]}` })
    }
  }

  // ── 4. Single unique letters B–H (e.g. "B block", "block B") ──────────────
  // Require a word-boundary context word (block / wing / tower / lobby / entry / near / at / by)
  const ctxRe = /(?:block|wing|tower|lobby|entry|entrance|near|at|by)\s+([b-h])\b|\b([b-h])\s+(?:block|wing|tower|lobby|entry|entrance)/g
  while ((m = ctxRe.exec(t)) !== null) {
    const letter = (m[1] ?? m[2]).toLowerCase()
    const blockKey = LETTER_TO_BLOCK[letter]
    if (blockKey) {
      const resolved = resolveBlock(blockKey, circle)
      candidates.push({ ...resolved, confidence: 0.78, matchedKeyword: letter.toUpperCase() + ' block' })
    }
  }

  // ── 5. Ambiguous single "A" (context word required) ───────────────────────
  if (/(?:block|wing|tower|lobby|entry|entrance|near|at|by)\s+a\b|\ba\s+(?:block|wing|tower|lobby|entry|entrance)/.test(t)
    && !t.includes('2a') && !t.includes('caldra')) {
    // Default to 1A, lower confidence
    const resolved = resolveBlock('1A', circle)
    candidates.push({ ...resolved, confidence: 0.62, matchedKeyword: 'A block (ambiguous)' })
  }

  // ── 6. Amenities ───────────────────────────────────────────────────────────
  const amenityRules: [string | RegExp, keyof typeof AMENITY_COORDS, number, string][] = [
    [/swimming\s*pool|pool\s*area|\bpool\b/, 'pool',      0.92, 'swimming pool'],
    [/badminton|indoor\s*court/,             'badminton', 0.92, 'badminton court'],
    [/cricket|net\s*area|cricket\s*ground/,  'cricket',   0.92, 'cricket area'],
    [/club\s*house|clubhouse/,               'clubhouse', 0.92, 'clubhouse'],
    [/grocery|grocery\s*store/,              'grocery',   0.91, 'grocery store'],
    [/helper.*toilet|helper.*wc|wc.*outer/,  'helperswc', 0.88, "helper's WC"],
  ]
  for (const [pattern, key, conf, label] of amenityRules) {
    const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    if (re.test(t)) {
      const a = AMENITY_COORDS[key]
      candidates.push({
        landmarkName: a.name,
        lat: a.lat, lng: a.lng,
        confidence: conf,
        matchedKeyword: label,
        locationType: 'amenity',
      })
    }
  }

  // ── 7. Gates ───────────────────────────────────────────────────────────────
  if (/entry\s*gate|main\s*gate|entrance\s*gate/.test(t)) {
    candidates.push({ ...GATE_COORDS.entry, confidence: 0.91, matchedKeyword: 'entry gate', locationType: 'gate' })
  }
  if (/exit\s*gate/.test(t)) {
    candidates.push({ ...GATE_COORDS.exit, confidence: 0.91, matchedKeyword: 'exit gate', locationType: 'gate' })
  }
  if (/back\s*gate|rear\s*gate/.test(t)) {
    candidates.push({ ...GATE_COORDS.back, confidence: 0.91, matchedKeyword: 'back gate', locationType: 'gate' })
  }

  if (candidates.length === 0) return null

  // Return the highest-confidence match; tiebreak by locationType specificity
  const typeRank: Record<ApproxLocation['locationType'], number> = {
    amenity: 5, gate: 4,
    block_inner_entry: 3, block_outer_entry: 3, block_centroid: 2,
  }
  candidates.sort((a, b) =>
    b.confidence !== a.confidence
      ? b.confidence - a.confidence
      : (typeRank[b.locationType] - typeRank[a.locationType])
  )
  return candidates[0]
}
