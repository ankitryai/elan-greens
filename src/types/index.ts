// Types mirror the Supabase DB schema exactly — same as admin app.
// Main app only reads these; no write operations.

export type PlantCategory =
  | 'Tree' | 'Palm' | 'Shrub' | 'Herb'
  | 'Creeper' | 'Climber' | 'Hedge' | 'Grass'

export type HeightCategory = 'Short' | 'Medium' | 'Tall'
export type FloweringType = 'Flowering' | 'Non-Flowering'
export type StaffRole = 'Head Gardener' | 'Assistant Gardener' | 'Maintenance Staff'

export interface PlantSpecies {
  id: string
  plant_id: string
  common_name: string
  botanical_name: string | null
  hindi_name: string | null
  kannada_name: string | null
  tamil_name: string | null
  category: PlantCategory
  height_category: HeightCategory | null
  flowering_type: FloweringType | null
  flowering_season: string | null
  description: string | null
  medicinal_properties: string | null
  plant_family: string | null
  toxicity: string | null
  edible_parts: string | null
  native_region: string | null
  sunlight_needs: string | null
  watering_needs: string | null
  interesting_fact: string | null
  life_span_description: string | null
  not_applicable_parts: string | null
  tentative: boolean
  active: boolean
  img_main_url: string | null
  img_main_attr: string | null
  img_flower_1_url: string | null; img_flower_1_attr: string | null
  img_flower_2_url: string | null; img_flower_2_attr: string | null
  img_fruit_1_url: string | null;  img_fruit_1_attr: string | null
  img_fruit_2_url: string | null;  img_fruit_2_attr: string | null
  img_leaf_1_url: string | null;   img_leaf_1_attr: string | null
  img_leaf_2_url: string | null;   img_leaf_2_attr: string | null
  img_bark_1_url: string | null;   img_bark_1_attr: string | null
  img_bark_2_url: string | null;   img_bark_2_attr: string | null
  img_root_1_url: string | null;   img_root_1_attr: string | null
  img_root_2_url: string | null;   img_root_2_attr: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PlantInstance {
  id: string
  species_id: string
  internal_identification_no: number | null
  lat: number | null
  lng: number | null
  custom_location_desc: string | null
  date_of_plantation: string | null
  active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface StaffMember {
  id: string
  staff_id: string
  name: string
  role: StaffRole
  date_of_joining: string | null
  speciality: string | null
  photo_url: string | null
  tribute_note: string | null
  active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}
