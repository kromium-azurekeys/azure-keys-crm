-- Azure Keys CRM Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS / PROFILES (extends Supabase auth)
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  role text check (role in ('admin', 'manager', 'agent', 'viewer')) default 'agent',
  avatar_url text,
  bio text,
  license_number text,
  commission_rate numeric(5,2) default 3.00,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CONTACTS (Lead / Client / Prospect)
-- ============================================
create table public.contacts (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  secondary_phone text,
  type text check (type in ('lead', 'prospect', 'client', 'past_client', 'vendor')) default 'lead',
  status text check (status in ('active', 'inactive', 'nurturing', 'closed_won', 'closed_lost')) default 'active',
  source text check (source in ('website', 'referral', 'social_media', 'email_campaign', 'walk_in', 'phone', 'listing_portal', 'other')) default 'website',
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  preferred_locations text[],
  property_types text[],
  bedrooms_min int,
  bedrooms_max int,
  notes text,
  tags text[],
  assigned_agent_id uuid references public.profiles(id),
  lifecycle_stage text check (lifecycle_stage in ('prospect', 'qualified', 'active_buyer', 'under_contract', 'closed', 'retention')) default 'prospect',
  lead_score int default 0,
  gdpr_consent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PROPERTIES
-- ============================================
create table public.properties (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  property_type text check (property_type in ('villa', 'condo', 'townhouse', 'land', 'commercial', 'estate', 'penthouse')) default 'villa',
  status text check (status in ('active', 'pending', 'under_contract', 'sold', 'withdrawn', 'coming_soon')) default 'active',
  listing_type text check (listing_type in ('sale', 'rent', 'lease_option')) default 'sale',
  price numeric(14,2),
  price_per_sqft numeric(10,2),
  address text,
  city text,
  country text default 'Barbados',
  island text,
  coordinates jsonb,
  bedrooms int,
  bathrooms numeric(4,1),
  half_bathrooms int default 0,
  square_feet numeric(10,2),
  lot_size numeric(12,2),
  year_built int,
  features text[],
  amenities text[],
  images jsonb default '[]',
  documents jsonb default '[]',
  mls_number text unique,
  days_on_market int default 0,
  views_count int default 0,
  assigned_agent_id uuid references public.profiles(id),
  seller_contact_id uuid references public.contacts(id),
  listed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PIPELINE / DEALS
-- ============================================
create table public.deals (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  contact_id uuid references public.contacts(id),
  property_id uuid references public.properties(id),
  agent_id uuid references public.profiles(id),
  stage text check (stage in ('new_lead', 'qualified', 'viewing_scheduled', 'offer_made', 'negotiation', 'under_contract', 'due_diligence', 'closed_won', 'closed_lost')) default 'new_lead',
  deal_type text check (deal_type in ('buyer', 'seller', 'rental', 'both')) default 'buyer',
  expected_value numeric(14,2),
  actual_value numeric(14,2),
  commission_amount numeric(12,2),
  commission_paid boolean default false,
  probability int default 20,
  expected_close_date date,
  actual_close_date date,
  lost_reason text,
  notes text,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- VIEWINGS / APPOINTMENTS
-- ============================================
create table public.viewings (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id),
  contact_id uuid references public.contacts(id),
  agent_id uuid references public.profiles(id),
  deal_id uuid references public.deals(id),
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  status text check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')) default 'scheduled',
  location_type text check (location_type in ('in_person', 'virtual')) default 'in_person',
  virtual_link text,
  feedback text,
  rating int check (rating between 1 and 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- OFFERS / TRANSACTIONS
-- ============================================
create table public.offers (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id),
  property_id uuid references public.properties(id),
  buyer_contact_id uuid references public.contacts(id),
  offer_amount numeric(14,2) not null,
  deposit_amount numeric(12,2),
  status text check (status in ('draft', 'submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired')) default 'draft',
  offer_date date default current_date,
  expiry_date date,
  closing_date date,
  contingencies text[],
  conditions text,
  counter_amount numeric(14,2),
  accepted_amount numeric(14,2),
  notes text,
  documents jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TASKS
-- ============================================
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  type text check (type in ('call', 'email', 'meeting', 'viewing', 'follow_up', 'document', 'other')) default 'other',
  status text check (status in ('pending', 'in_progress', 'completed', 'cancelled')) default 'pending',
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  contact_id uuid references public.contacts(id),
  deal_id uuid references public.deals(id),
  property_id uuid references public.properties(id),
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ACTIVITIES / NOTES (Timeline)
-- ============================================
create table public.activities (
  id uuid default uuid_generate_v4() primary key,
  type text check (type in ('note', 'call', 'email', 'meeting', 'stage_change', 'document', 'offer', 'viewing', 'system')) default 'note',
  title text,
  description text not null,
  contact_id uuid references public.contacts(id),
  deal_id uuid references public.deals(id),
  property_id uuid references public.properties(id),
  created_by uuid references public.profiles(id),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================
-- CAMPAIGNS / EMAIL SMS
-- ============================================
create table public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text check (type in ('email', 'sms', 'drip', 'newsletter')) default 'email',
  status text check (status in ('draft', 'scheduled', 'active', 'paused', 'completed')) default 'draft',
  subject text,
  content text,
  target_audience jsonb default '{}',
  scheduled_at timestamptz,
  sent_at timestamptz,
  stats jsonb default '{"sent": 0, "opened": 0, "clicked": 0, "unsubscribed": 0}',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- DOCUMENTS
-- ============================================
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  file_path text,
  file_size bigint,
  mime_type text,
  category text check (category in ('contract', 'agreement', 'report', 'identity', 'financial', 'legal', 'marketing', 'other')) default 'other',
  contact_id uuid references public.contacts(id),
  deal_id uuid references public.deals(id),
  property_id uuid references public.properties(id),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ============================================
-- Row Level Security
-- ============================================
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.properties enable row level security;
alter table public.deals enable row level security;
alter table public.viewings enable row level security;
alter table public.offers enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.campaigns enable row level security;
alter table public.documents enable row level security;

-- Profiles: users can read all, update own
create policy "Profiles are viewable by authenticated users" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- All authenticated users can CRUD contacts, deals, properties, tasks, activities
create policy "Contacts: authenticated full access" on public.contacts for all using (auth.role() = 'authenticated');
create policy "Properties: authenticated full access" on public.properties for all using (auth.role() = 'authenticated');
create policy "Deals: authenticated full access" on public.deals for all using (auth.role() = 'authenticated');
create policy "Viewings: authenticated full access" on public.viewings for all using (auth.role() = 'authenticated');
create policy "Offers: authenticated full access" on public.offers for all using (auth.role() = 'authenticated');
create policy "Tasks: authenticated full access" on public.tasks for all using (auth.role() = 'authenticated');
create policy "Activities: authenticated full access" on public.activities for all using (auth.role() = 'authenticated');
create policy "Campaigns: authenticated full access" on public.campaigns for all using (auth.role() = 'authenticated');
create policy "Documents: authenticated full access" on public.documents for all using (auth.role() = 'authenticated');

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_contacts_updated_at before update on public.contacts for each row execute procedure public.handle_updated_at();
create trigger handle_properties_updated_at before update on public.properties for each row execute procedure public.handle_updated_at();
create trigger handle_deals_updated_at before update on public.deals for each row execute procedure public.handle_updated_at();
create trigger handle_viewings_updated_at before update on public.viewings for each row execute procedure public.handle_updated_at();
create trigger handle_offers_updated_at before update on public.offers for each row execute procedure public.handle_updated_at();
create trigger handle_tasks_updated_at before update on public.tasks for each row execute procedure public.handle_updated_at();

-- Sample data for demo
insert into public.properties (title, description, property_type, status, listing_type, price, address, city, country, island, bedrooms, bathrooms, square_feet, features, amenities) values
('Ocean Crest Villa', 'Stunning clifftop villa with panoramic ocean views', 'villa', 'active', 'sale', 4500000, 'Gibbs Bay Road', 'Saint Peter', 'Barbados', 'Barbados', 5, 5.5, 6800, ARRAY['infinity pool', 'home theater', 'smart home'], ARRAY['private beach access', 'gym', 'staff quarters']),
('Sandy Lane Estate', 'Prestigious estate in Sandy Lane', 'estate', 'active', 'sale', 8900000, 'Sandy Lane', 'Saint James', 'Barbados', 'Barbados', 7, 8, 12000, ARRAY['multiple pools', 'tennis court', 'wine cellar'], ARRAY['concierge service', 'security', 'beach club']),
('Coral Ridge Penthouse', 'Ultra-modern penthouse with 360 views', 'penthouse', 'active', 'sale', 2200000, 'Coral Ridge', 'Christ Church', 'Barbados', 'Barbados', 3, 3.5, 3200, ARRAY['rooftop terrace', 'private elevator'], ARRAY['building pool', 'gym', 'concierge']);
