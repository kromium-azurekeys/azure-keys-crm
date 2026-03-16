-- ============================================================
-- Azure Keys CRM — Caribbean Intelligence Modules Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. CBI / SERP Applications
CREATE TABLE IF NOT EXISTS cbi_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  program TEXT NOT NULL,
  island TEXT,
  stage TEXT DEFAULT 'Initial Inquiry',
  min_investment TEXT,
  hold_period TEXT,
  dd_status TEXT, -- pending | in_review | complete
  authorized_agent TEXT,
  application_date DATE,
  expected_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Concierge Records (post-sale relationship)
CREATE TABLE IF NOT EXISTS concierge_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  milestone TEXT,
  next_checkin DATE,
  closing_date DATE,
  rental_setup TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Developer Projects (pre-construction pipeline)
CREATE TABLE IF NOT EXISTS developer_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  island TEXT,
  status TEXT DEFAULT 'on_track', -- on_track | ahead | delayed | paused
  current_milestone TEXT,
  units_total INTEGER DEFAULT 0,
  units_reserved INTEGER DEFAULT 0,
  units_available INTEGER DEFAULT 0,
  total_value NUMERIC,
  expected_completion DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Referral Sources
CREATE TABLE IF NOT EXISTS referral_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  referrer_type TEXT,
  contact_name TEXT,
  fee_percentage NUMERIC,
  fee_status TEXT DEFAULT 'pending', -- pending | partial | paid
  total_referrals INTEGER DEFAULT 0,
  total_fees_paid NUMERIC DEFAULT 0,
  pending_fees NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE cbi_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE concierge_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_sources ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated users can do everything)
CREATE POLICY "auth_all" ON cbi_applications FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all" ON concierge_records FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all" ON developer_projects FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all" ON referral_sources FOR ALL TO authenticated USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cbi_applications_updated_at BEFORE UPDATE ON cbi_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_concierge_records_updated_at BEFORE UPDATE ON concierge_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_developer_projects_updated_at BEFORE UPDATE ON developer_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_referral_sources_updated_at BEFORE UPDATE ON referral_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
