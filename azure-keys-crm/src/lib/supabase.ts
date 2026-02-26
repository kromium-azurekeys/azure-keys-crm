import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile>
        Update: Partial<Profile>
      }
      contacts: {
        Row: Contact
        Insert: Partial<Contact>
        Update: Partial<Contact>
      }
      properties: {
        Row: Property
        Insert: Partial<Property>
        Update: Partial<Property>
      }
      deals: {
        Row: Deal
        Insert: Partial<Deal>
        Update: Partial<Deal>
      }
      viewings: {
        Row: Viewing
        Insert: Partial<Viewing>
        Update: Partial<Viewing>
      }
      offers: {
        Row: Offer
        Insert: Partial<Offer>
        Update: Partial<Offer>
      }
      tasks: {
        Row: Task
        Insert: Partial<Task>
        Update: Partial<Task>
      }
      activities: {
        Row: Activity
        Insert: Partial<Activity>
        Update: Partial<Activity>
      }
      campaigns: {
        Row: Campaign
        Insert: Partial<Campaign>
        Update: Partial<Campaign>
      }
    }
  }
}

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: 'admin' | 'manager' | 'agent' | 'viewer'
  avatar_url: string | null
  bio: string | null
  license_number: string | null
  commission_rate: number
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  secondary_phone: string | null
  type: 'lead' | 'prospect' | 'client' | 'past_client' | 'vendor'
  status: 'active' | 'inactive' | 'nurturing' | 'closed_won' | 'closed_lost'
  source: string
  budget_min: number | null
  budget_max: number | null
  preferred_locations: string[]
  property_types: string[]
  bedrooms_min: number | null
  bedrooms_max: number | null
  notes: string | null
  tags: string[]
  assigned_agent_id: string | null
  lifecycle_stage: string
  lead_score: number
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Property {
  id: string
  title: string
  description: string | null
  property_type: string
  status: string
  listing_type: string
  price: number | null
  address: string | null
  city: string | null
  country: string
  island: string | null
  bedrooms: number | null
  bathrooms: number | null
  square_feet: number | null
  lot_size: number | null
  year_built: number | null
  features: string[]
  amenities: string[]
  images: any[]
  mls_number: string | null
  days_on_market: number
  views_count: number
  assigned_agent_id: string | null
  seller_contact_id: string | null
  listed_at: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Deal {
  id: string
  title: string
  contact_id: string | null
  property_id: string | null
  agent_id: string | null
  stage: string
  deal_type: string
  expected_value: number | null
  actual_value: number | null
  commission_amount: number | null
  commission_paid: boolean
  probability: number
  expected_close_date: string | null
  actual_close_date: string | null
  lost_reason: string | null
  notes: string | null
  priority: string
  created_at: string
  updated_at: string
  contacts?: Contact
  properties?: Property
  profiles?: Profile
}

export interface Viewing {
  id: string
  property_id: string | null
  contact_id: string | null
  agent_id: string | null
  deal_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: string
  location_type: string
  virtual_link: string | null
  feedback: string | null
  rating: number | null
  notes: string | null
  created_at: string
  updated_at: string
  properties?: Property
  contacts?: Contact
  profiles?: Profile
}

export interface Offer {
  id: string
  deal_id: string | null
  property_id: string | null
  buyer_contact_id: string | null
  offer_amount: number
  deposit_amount: number | null
  status: string
  offer_date: string
  expiry_date: string | null
  closing_date: string | null
  contingencies: string[]
  conditions: string | null
  counter_amount: number | null
  accepted_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
  properties?: Property
  contacts?: Contact
}

export interface Task {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  assigned_to: string | null
  created_by: string | null
  contact_id: string | null
  deal_id: string | null
  property_id: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  contacts?: Contact
}

export interface Activity {
  id: string
  type: string
  title: string | null
  description: string
  contact_id: string | null
  deal_id: string | null
  property_id: string | null
  created_by: string | null
  metadata: any
  created_at: string
  profiles?: Profile
}

export interface Campaign {
  id: string
  name: string
  type: string
  status: string
  subject: string | null
  content: string | null
  target_audience: any
  scheduled_at: string | null
  sent_at: string | null
  stats: any
  created_by: string | null
  created_at: string
  updated_at: string
}
