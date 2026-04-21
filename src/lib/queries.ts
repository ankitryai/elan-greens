// All read-only DB queries for the public app.
// Uses the anon client — RLS restricts results to active, non-deleted rows only.

import { createPublicClient } from '@/lib/supabase'
import type { PlantSpecies, PlantInstance, StaffMember } from '@/types'

export async function getAllSpecies(): Promise<PlantSpecies[]> {
  try {
    const db = createPublicClient()
    const { data, error } = await db
      .from('plant_species')
      .select('*')
      .is('deleted_at', null)
      .eq('active', true)
      .order('common_name')
    if (error) return []
    return data as PlantSpecies[]
  } catch {
    return []
  }
}

export async function getSpeciesById(id: string): Promise<PlantSpecies | null> {
  try {
    const db = createPublicClient()
    const { data } = await db
      .from('plant_species')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .maybeSingle()
    return data as PlantSpecies | null
  } catch {
    return null
  }
}

export async function getInstancesBySpecies(speciesId: string): Promise<PlantInstance[]> {
  try {
    const db = createPublicClient()
    const { data, error } = await db
      .from('plant_instances')
      .select('*')
      .eq('species_id', speciesId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('created_at')
    if (error) return []
    return data as PlantInstance[]
  } catch {
    return []
  }
}

export async function getAllInstances(): Promise<PlantInstance[]> {
  try {
    const db = createPublicClient()
    const { data, error } = await db
      .from('plant_instances')
      .select('*')
      .is('deleted_at', null)
      .eq('active', true)
    if (error) return []
    return data as PlantInstance[]
  } catch {
    return []
  }
}

export async function getAllStaff(): Promise<StaffMember[]> {
  try {
    const db = createPublicClient()
    const { data, error } = await db
      .from('staff_data')
      .select('*')
      .is('deleted_at', null)
      .eq('active', true)
      .order('name')
    if (error) return []
    return data as StaffMember[]
  } catch {
    return []
  }
}

export async function getSiteCounts(): Promise<{ species: number; instances: number }> {
  try {
    const db = createPublicClient()
    const [s, i] = await Promise.all([
      db.from('plant_species').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('active', true),
      db.from('plant_instances').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('active', true),
    ])
    return { species: s.count ?? 0, instances: i.count ?? 0 }
  } catch {
    return { species: 0, instances: 0 }
  }
}

export async function getLastUpdated(): Promise<string | null> {
  try {
    const db = createPublicClient()
    const [s, i] = await Promise.all([
      db.from('plant_species').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      db.from('plant_instances').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
    ])
    const timestamps = [s.data?.updated_at, i.data?.updated_at].filter(Boolean) as string[]
    return timestamps.length ? timestamps.sort().reverse()[0] : null
  } catch {
    return null
  }
}
