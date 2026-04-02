-- ================================================================
-- AZURE KEYS CRM — LEAD GEN SYSTEM MIGRATION
-- Run AFTER the main schema and caribbean modules migrations.
-- Fully idempotent — safe to run multiple times.
-- ================================================================

-- ── 1. EXTEND CONTACTS TABLE WITH FINANCIAL QUALIFICATION FIELDS ─
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS financial_status TEXT
    CHECK (financial_status IN ('cash_buyer','pre_approved','needs_approval','needs_to_sell_first','exploring_financing','just_browsing')),
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email'
    CHECK (preferred_contact_method IN ('email','phone','whatsapp','sms')),
  ADD COLUMN IF NOT EXISTS is_first_time_buyer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_investor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_relocating BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS citizenship TEXT,
  ADD COLUMN IF NOT EXISTS country_of_residence TEXT,
  ADD COLUMN IF NOT EXISTS contact_role TEXT DEFAULT 'buyer'
    CHECK (contact_role IN ('buyer','seller','both','vendor')),
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS lead_tier TEXT
    CHECK (lead_tier IN ('hot','warm','cold','unqualified')),
  ADD COLUMN IF NOT EXISTS timeline TEXT
    CHECK (timeline IN ('1_3_months','3_6_months','6_plus_months','just_curious')),
  ADD COLUMN IF NOT EXISTS must_have_features JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER;

-- ── 2. SELLER LEADS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Contact info
  contact_id            UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  whatsapp_number       TEXT,
  preferred_contact_method TEXT DEFAULT 'phone',

  -- Property details
  property_address      TEXT,
  property_type         TEXT,
  bedrooms              INTEGER,
  bathrooms             NUMERIC,
  square_feet           INTEGER,
  lot_size              INTEGER,
  year_built            INTEGER,
  condition             TEXT CHECK (condition IN ('excellent','good','average','needs_work')),
  recent_upgrades       JSONB DEFAULT '[]'::jsonb,

  -- Valuation
  estimated_value_min   NUMERIC,
  estimated_value_max   NUMERIC,
  ai_estimate_generated BOOLEAN DEFAULT false,
  cma_sent_at           TIMESTAMPTZ,
  cma_document_url      TEXT,

  -- Motivation & timeline
  motivation            TEXT CHECK (motivation IN ('relocating','upgrading','downsizing','investment_liquidation','estate_inheritance','financial','just_curious','other')),
  timeline              TEXT CHECK (timeline IN ('asap','3_6_months','6_plus_months','if_price_right')),
  ownership_type        TEXT CHECK (ownership_type IN ('sole_owner','joint_ownership','estate_inheritance','complicated')),

  -- Pipeline stage
  status                TEXT DEFAULT 'new'
    CHECK (status IN ('new','contacted','walkthrough_scheduled','walkthrough_completed','cma_sent','listed','under_contract','closed','lost')),
  walkthrough_scheduled_at TIMESTAMPTZ,
  walkthrough_completed_at TIMESTAMPTZ,
  listed_at             TIMESTAMPTZ,

  -- Scoring
  lead_score            INTEGER DEFAULT 0,
  lead_tier             TEXT CHECK (lead_tier IN ('hot','warm','cold','unqualified')),

  -- Attribution
  source                TEXT DEFAULT 'website',
  utm_source            TEXT,
  utm_medium            TEXT,
  utm_campaign          TEXT,
  utm_ad_id             TEXT,

  -- Assignment
  assigned_agent_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes                 TEXT,

  -- Nurture
  nurture_sequence      TEXT,
  nurture_day           INTEGER DEFAULT 0,
  last_contacted_at     TIMESTAMPTZ
);

ALTER TABLE public.seller_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage seller_leads" ON public.seller_leads;
CREATE POLICY "Authenticated can manage seller_leads"
  ON public.seller_leads FOR ALL
  USING (auth.role() = 'authenticated');

-- ── 3. PROPERTY INTERESTS TABLE (buyer engagement per listing) ───
CREATE TABLE IF NOT EXISTS public.property_interests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  contact_id          UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  property_id         UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  interest_level      TEXT DEFAULT 'medium'
    CHECK (interest_level IN ('high','medium','low','not_interested')),
  viewed_at           TIMESTAMPTZ DEFAULT NOW(),
  time_on_page_secs   INTEGER,
  viewed_photos       BOOLEAN DEFAULT false,
  viewed_virtual_tour BOOLEAN DEFAULT false,
  used_calculator     BOOLEAN DEFAULT false,
  saved_to_favourites BOOLEAN DEFAULT false,
  requested_viewing   BOOLEAN DEFAULT false,
  viewing_scheduled_at TIMESTAMPTZ,
  viewed_in_person    BOOLEAN DEFAULT false,
  feedback_notes      TEXT,
  UNIQUE(contact_id, property_id)
);

ALTER TABLE public.property_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage property_interests" ON public.property_interests;
CREATE POLICY "Authenticated can manage property_interests"
  ON public.property_interests FOR ALL
  USING (auth.role() = 'authenticated');

-- ── 4. AD CAMPAIGNS / ATTRIBUTION TABLE ─────────────────────────
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  name            TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('google','meta','instagram','linkedin','email','referral','organic','other')),
  campaign_id_ext TEXT,           -- external ID from Google/Meta
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','draft')),
  objective       TEXT,           -- e.g. "Luxury Buyer Leads", "Seller Valuations"
  target_market   TEXT,           -- e.g. "cayman", "bahamas", "jamaica"
  target_audience TEXT,           -- e.g. "US HNW buyers", "Local sellers"
  daily_budget    NUMERIC,
  total_spend     NUMERIC DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  -- Aggregated metrics (updated periodically)
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  leads           INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  showings        INTEGER DEFAULT 0,
  offers          INTEGER DEFAULT 0,
  closed_deals    INTEGER DEFAULT 0,
  revenue_attributed NUMERIC DEFAULT 0,
  commission_attributed NUMERIC DEFAULT 0,
  notes           TEXT
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage ad_campaigns" ON public.ad_campaigns;
CREATE POLICY "Authenticated can manage ad_campaigns"
  ON public.ad_campaigns FOR ALL
  USING (auth.role() = 'authenticated');

-- ── 5. REVENUE ATTRIBUTION TABLE ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.revenue_attribution (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  deal_id             UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id          UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  ad_campaign_id      UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  -- Attribution details
  first_touch_source  TEXT,       -- which channel first brought the lead
  first_touch_campaign TEXT,
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  utm_ad_id           TEXT,
  -- Financial
  sale_price          NUMERIC,
  commission_rate     NUMERIC DEFAULT 0.05,
  commission_amount   NUMERIC,
  ad_spend_allocated  NUMERIC,    -- portion of campaign spend attributed to this deal
  roi                 NUMERIC,    -- (commission - spend) / spend * 100
  -- Timeline
  lead_created_at     TIMESTAMPTZ,
  first_contact_at    TIMESTAMPTZ,
  showing_at          TIMESTAMPTZ,
  offer_at            TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  days_to_close       INTEGER,
  -- Agent
  agent_id            UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.revenue_attribution ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage revenue_attribution" ON public.revenue_attribution;
CREATE POLICY "Authenticated can manage revenue_attribution"
  ON public.revenue_attribution FOR ALL
  USING (auth.role() = 'authenticated');

-- ── 6. NURTURE SEQUENCES TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nurture_sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  contact_id      UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  seller_lead_id  UUID REFERENCES public.seller_leads(id) ON DELETE CASCADE,
  sequence_name   TEXT NOT NULL,  -- e.g. 'hot_buyer_7day', 'warm_seller_60day'
  lead_type       TEXT NOT NULL CHECK (lead_type IN ('buyer','seller')),
  lead_tier       TEXT NOT NULL CHECK (lead_tier IN ('hot','warm','cold')),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','exited')),
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  current_day     INTEGER DEFAULT 0,
  next_touch_at   TIMESTAMPTZ,
  last_touch_at   TIMESTAMPTZ,
  last_touch_type TEXT,           -- 'email', 'sms', 'whatsapp', 'call'
  completed_steps JSONB DEFAULT '[]'::jsonb,
  -- Upgraded from lower tier
  upgraded_from   TEXT,
  upgraded_at     TIMESTAMPTZ,
  -- Exit condition
  exit_reason     TEXT,           -- 'converted', 'unsubscribed', 'upgraded', 'manual'
  exited_at       TIMESTAMPTZ
);

ALTER TABLE public.nurture_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage nurture_sequences" ON public.nurture_sequences;
CREATE POLICY "Authenticated can manage nurture_sequences"
  ON public.nurture_sequences FOR ALL
  USING (auth.role() = 'authenticated');

-- ── 7. SEED AD CAMPAIGNS (demo data) ────────────────────────────
INSERT INTO public.ad_campaigns (
  name, platform, status, objective, target_market, target_audience,
  daily_budget, total_spend, start_date,
  impressions, clicks, leads, qualified_leads, showings, offers, closed_deals,
  revenue_attributed, commission_attributed
) VALUES
('Luxury Beachfront — Seven Mile', 'google', 'active', 'Luxury Buyer Leads', 'cayman', 'US/UK HNW buyers $2M+',
 350, 8400, CURRENT_DATE - 24,
 48200, 1240, 32, 24, 14, 6, 3,
 28500000, 712500),
('Cayman Investment Properties', 'meta', 'active', 'Investor Buyer Leads', 'cayman', 'Investors 35-55, $500K-2M',
 200, 4800, CURRENT_DATE - 24,
 62400, 1860, 48, 31, 19, 9, 4,
 7600000, 228000),
('Nassau Luxury Listings — Instagram', 'instagram', 'active', 'Luxury Buyer Leads', 'bahamas', 'Luxury lifestyle audience',
 250, 6000, CURRENT_DATE - 24,
 91500, 2740, 38, 22, 11, 4, 2,
 11750000, 352500),
('Jamaica Villas — Google Search', 'google', 'active', 'Buyer Leads', 'jamaica', 'Property searchers Jamaica',
 150, 3600, CURRENT_DATE - 24,
 31800, 960, 28, 16, 8, 3, 1,
 3100000, 93000),
('Seller Valuations — All Markets', 'google', 'active', 'Seller Lead Capture', null, 'Property owners Caribbean',
 180, 4320, CURRENT_DATE - 24,
 27600, 830, 21, 14, 9, 5, 3,
 18500000, 555000),
('Past Client Re-engagement', 'email', 'completed', 'Retention', null, 'Past clients 2022-2024',
 0, 0, CURRENT_DATE - 60,
 0, 0, 8, 6, 4, 2, 2,
 3400000, 102000),
('Bahamas Investment — Meta', 'meta', 'paused', 'Investor Leads', 'bahamas', 'HNW investors US/Canada',
 220, 2640, CURRENT_DATE - 40,
 38700, 1160, 18, 10, 5, 2, 0,
 0, 0)
ON CONFLICT DO NOTHING;

-- ── 8. SEED SELLER LEADS (demo data) ────────────────────────────
INSERT INTO public.seller_leads (
  first_name, last_name, email, phone,
  property_address, property_type, bedrooms, bathrooms, square_feet, year_built,
  condition, recent_upgrades,
  estimated_value_min, estimated_value_max, ai_estimate_generated,
  motivation, timeline, ownership_type,
  status, lead_score, lead_tier,
  source, utm_source, utm_campaign,
  created_at
) VALUES
('Victoria', 'Ashworth-Caine', 'v.ashworth@priv.ky', '+1 345 522 8841',
 '14 Sundowner Ridge, West Bay, Grand Cayman', 'estate', 5, 5.5, 6800, 2011,
 'excellent', '["New chef kitchen 2022","Solar panels 2023","Pool resurfaced 2024"]',
 4800000, 5400000, true,
 'relocating', 'asap', 'sole_owner',
 'walkthrough_scheduled', 88, 'hot',
 'referral', null, null,
 NOW() - INTERVAL '3 days'),
('Marcus', 'Fontaine-DuBois', 'm.fontaine@wealth.bb', '+1 246 434 7712',
 '8 Coral Ridge Drive, Sandy Lane, Barbados', 'villa', 4, 4.0, 5200, 2007,
 'good', '["Bathrooms renovated 2021","New HVAC 2022"]',
 2800000, 3200000, true,
 'upgrading', '3_6_months', 'sole_owner',
 'cma_sent', 74, 'warm',
 'website', 'google', 'Seller Valuations — All Markets',
 NOW() - INTERVAL '8 days'),
('Ingrid', 'Johansson-Clarke', 'ingrid.jc@outlook.com', '+46 70 221 4498',
 '22 Harbour View, Nassau, Bahamas', 'condo', 3, 3.0, 2400, 2018,
 'excellent', '["Furnished to hotel standard","Smart home system"]',
 1600000, 1900000, true,
 'investment_liquidation', 'if_price_right', 'sole_owner',
 'contacted', 61, 'warm',
 'website', 'meta', 'Bahamas Investment — Meta',
 NOW() - INTERVAL '14 days'),
('Desmond', 'Whittaker-Brown', 'd.whittaker@jm-law.com', '+1 876 927 3341',
 '3 Blue Mountain Road, Kingston, Jamaica', 'estate', 6, 6.0, 8200, 2005,
 'average', '["Roof replaced 2019"]',
 3400000, 3900000, true,
 'estate_inheritance', '6_plus_months', 'estate_inheritance',
 'new', 52, 'warm',
 'website', null, null,
 NOW() - INTERVAL '1 day'),
('Celeste', 'Marchetti', 'c.marchetti@gmail.com', '+39 335 771 2290',
 '45 Lime Tree Bay, Little Cayman', 'cottage', 3, 2.0, 1800, 1998,
 'good', '["Hurricane upgrades 2020"]',
 1100000, 1300000, true,
 'just_curious', 'if_price_right', 'joint_ownership',
 'new', 38, 'cold',
 'website', 'instagram', 'Nassau Luxury Listings — Instagram',
 NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ── 9. SEED PROPERTY INTERESTS (demo data) ───────────────────────
-- Link a few contacts to properties with interest levels
-- Uses subqueries to get IDs rather than hardcoding
INSERT INTO public.property_interests (
  contact_id, property_id, interest_level, viewed_at,
  time_on_page_secs, viewed_photos, viewed_virtual_tour, used_calculator,
  saved_to_favourites, requested_viewing, viewed_in_person, feedback_notes
)
SELECT
  c.id, p.id, 'high',
  NOW() - INTERVAL '2 days',
  342, true, true, true, true, true, false,
  'Very interested in the master suite and pool deck. Wants to see it before flying back.'
FROM public.contacts c, public.properties p
WHERE c.email ILIKE '%fontaine%' AND p.title ILIKE '%Horizon%'
LIMIT 1
ON CONFLICT (contact_id, property_id) DO NOTHING;

INSERT INTO public.property_interests (
  contact_id, property_id, interest_level, viewed_at,
  time_on_page_secs, viewed_photos, viewed_virtual_tour
)
SELECT
  c.id, p.id, 'medium',
  NOW() - INTERVAL '5 days',
  187, true, false
FROM public.contacts c, public.properties p
WHERE c.email ILIKE '%berg%' AND p.title ILIKE '%Coral%'
LIMIT 1
ON CONFLICT (contact_id, property_id) DO NOTHING;

-- ── 10. VERIFY ───────────────────────────────────────────────────
SELECT 'contacts new columns' AS check,
  COUNT(*) FILTER (WHERE financial_status IS NOT NULL) AS with_financial_status,
  COUNT(*) FILTER (WHERE lead_tier IS NOT NULL) AS with_tier
FROM public.contacts;

SELECT 'seller_leads' AS check, COUNT(*) as total,
  COUNT(*) FILTER (WHERE lead_tier = 'hot') AS hot,
  COUNT(*) FILTER (WHERE lead_tier = 'warm') AS warm
FROM public.seller_leads;

SELECT 'ad_campaigns' AS check, COUNT(*) as total,
  SUM(leads) AS total_leads,
  SUM(commission_attributed) AS total_commission
FROM public.ad_campaigns;
