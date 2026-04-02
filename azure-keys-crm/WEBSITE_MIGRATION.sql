-- ================================================================
-- AZURE KEYS — WEBSITE MIGRATION
-- Run this in your Supabase SQL Editor (dashboard.supabase.com)
-- It is fully idempotent — safe to run multiple times
-- ================================================================

-- ── 0. PATCH PROPERTY TYPE CONSTRAINT (extend allowed values) ───
-- The original schema may not include cottage or land.
-- We drop and recreate the check constraint to add them.
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_property_type_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_property_type_check
  CHECK (property_type IN (
    'villa','estate','penthouse','condo','townhouse',
    'cottage','land','apartment'
  ));

-- ── 1. ADD IMAGES COLUMN TO PROPERTIES ──────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS subtitle TEXT;

-- ── 2. RLS: ALLOW ANON TO READ ACTIVE PROPERTIES ────────────────
-- (Properties are public listings — safe to expose)
DROP POLICY IF EXISTS "Website: anon can read active properties" ON public.properties;
CREATE POLICY "Website: anon can read active properties"
  ON public.properties FOR SELECT
  USING (status IN ('active', 'under_contract'));

-- ── 3. CREATE WEBSITE ENQUIRIES TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS public.website_enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  message         TEXT,
  property_id     UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_name   TEXT,
  market          TEXT,
  source          TEXT DEFAULT 'website',  -- 'website_property' | 'website_contact' | 'buyer_form' | 'seller_form'
  form_data       JSONB DEFAULT '{}'::jsonb,   -- full form answers for buyer/seller forms
  lead_score      INTEGER,                     -- AI score from buyer form
  lead_tier       TEXT,                        -- Premium / High / Qualified / Nurture
  status          TEXT DEFAULT 'new'           -- new | contacted | qualified | converted
);

-- RLS: anon can insert (website submits enquiries), only auth can read
ALTER TABLE public.website_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Website: anon can submit enquiries" ON public.website_enquiries;
CREATE POLICY "Website: anon can submit enquiries"
  ON public.website_enquiries FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff: authenticated can read enquiries" ON public.website_enquiries;
CREATE POLICY "Staff: authenticated can read enquiries"
  ON public.website_enquiries FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff: authenticated can update enquiries" ON public.website_enquiries;
CREATE POLICY "Staff: authenticated can update enquiries"
  ON public.website_enquiries FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ── 4. CLEAR MLS NUMBERS BEFORE UPSERT ─────────────────────────
-- Null out mls_number on ALL rows that share our 30 UUIDs so the
-- upsert can set them without hitting the unique constraint.
-- Also delete any OTHER rows that happen to hold our target MLS numbers.

-- Step A: clear mls_number on our own rows (avoids self-conflict)
UPDATE public.properties
SET mls_number = NULL
WHERE id IN (
  'a1000001-0000-0000-0000-000000000001','a1000001-0000-0000-0000-000000000002',
  'a1000001-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000004',
  'a1000001-0000-0000-0000-000000000005','a1000001-0000-0000-0000-000000000006',
  'a1000001-0000-0000-0000-000000000007','a1000001-0000-0000-0000-000000000008',
  'a1000001-0000-0000-0000-000000000009','a1000001-0000-0000-0000-000000000010',
  'a1000001-0000-0000-0000-000000000011','a1000001-0000-0000-0000-000000000012',
  'a1000001-0000-0000-0000-000000000013','a1000001-0000-0000-0000-000000000014',
  'a1000001-0000-0000-0000-000000000015','a1000001-0000-0000-0000-000000000016',
  'a1000001-0000-0000-0000-000000000017','a1000001-0000-0000-0000-000000000018',
  'a1000001-0000-0000-0000-000000000019','a1000001-0000-0000-0000-000000000020',
  'a1000001-0000-0000-0000-000000000021','a1000001-0000-0000-0000-000000000022',
  'a1000001-0000-0000-0000-000000000023','a1000001-0000-0000-0000-000000000024',
  'a1000001-0000-0000-0000-000000000025','a1000001-0000-0000-0000-000000000026',
  'a1000001-0000-0000-0000-000000000027','a1000001-0000-0000-0000-000000000028',
  'a1000001-0000-0000-0000-000000000029','a1000001-0000-0000-0000-000000000030'
);

-- Step B: delete any OTHER rows that hold our target MLS numbers
DELETE FROM public.properties
WHERE mls_number IN (
  'AK-KY-2025-001','AK-KY-2025-002','AK-KY-2025-003','AK-KY-2025-004',
  'AK-KY-2025-005','AK-KY-2025-006','AK-KY-2025-007','AK-KY-2025-008',
  'AK-KY-2025-009','AK-KY-2025-010','AK-KY-2025-011',
  'AK-BS-2025-012','AK-BS-2025-013','AK-BS-2025-014','AK-BS-2025-015',
  'AK-BS-2025-016','AK-BS-2025-017','AK-BS-2025-018','AK-BS-2025-019',
  'AK-BS-2025-020','AK-BS-2025-021',
  'AK-JM-2025-022','AK-JM-2025-023','AK-JM-2025-024','AK-JM-2025-025',
  'AK-JM-2025-026','AK-JM-2025-027','AK-JM-2025-028','AK-JM-2025-029',
  'AK-JM-2025-030'
);

-- ── 5. UPSERT ALL 30 PROPERTIES WITH IMAGES & METADATA ──────────
-- Images are curated Unsplash URLs matched to each property's character.
-- gallery[0] is always the hero/card image.

INSERT INTO public.properties (
  id, title, description, property_type, status, listing_type,
  price, address, city, country, island,
  bedrooms, bathrooms, square_feet, lot_size, year_built,
  features, amenities, mls_number, days_on_market, views_count,
  listed_at, created_at, updated_at,
  images, featured, badge, subtitle
) VALUES

-- ═══════════════════════════════════════════════════════════════
-- GRAND CAYMAN (11 properties)
-- ═══════════════════════════════════════════════════════════════

('a1000001-0000-0000-0000-000000000001',
 'Horizon Cove',
 'The crown jewel of Seven Mile Beach. This landmark estate commands 120 feet of pristine white sand with uninterrupted turquoise views from every room. Six en-suite bedrooms, gourmet chef''s kitchen, home cinema, private infinity pool with beach entry, and fully staffed quarters. One of the most coveted off-market opportunities in the Caribbean.',
 'estate','active','sale',
 12500000,'47 Seven Mile Beach Road','Seven Mile Beach','Cayman Islands','Grand Cayman',
 6,7.0,8400,37026,2008,
 ARRAY['infinity pool','home cinema','smart home','wine cellar','outdoor kitchen','helipad','gym'],
 ARRAY['120ft private beach','staff quarters','boat dock','generator','security gate','concierge'],
 'AK-KY-2025-001',12,487,NOW()-INTERVAL'12 days',NOW()-INTERVAL'12 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1400&q=85","https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1400&q=85","https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1400&q=85","https://images.unsplash.com/photo-1615571022219-eb45cf7faa9d?w=1400&q=85"]'::jsonb,
 true,'Off-Market','Seven Mile Beach Beachfront Estate'),

('a1000001-0000-0000-0000-000000000002',
 'Coral Ridge Penthouse',
 'An architectural statement at the heart of Camana Bay. Triple-level penthouse delivering 270-degree views across the North Sound and Caribbean Sea. Curated interiors by a Miami-based designer, rooftop plunge pool terrace, and private elevator from the secure garage lobby.',
 'penthouse','active','sale',
 4200000,'18 Camana Bay Terrace','Camana Bay','Cayman Islands','Grand Cayman',
 3,4.0,3800,NULL,2019,
 ARRAY['rooftop plunge pool','private elevator','smart home','floor-to-ceiling glass','designer interiors'],
 ARRAY['concierge','secure parking','building gym','marina views','town centre access'],
 'AK-KY-2025-002',8,312,NOW()-INTERVAL'8 days',NOW()-INTERVAL'8 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1400&q=85","https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1400&q=85","https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1400&q=85","https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1400&q=85"]'::jsonb,
 true,'New Listing','Camana Bay Luxury Penthouse'),

('a1000001-0000-0000-0000-000000000003',
 'Rum Point Villa',
 'A serene escape on Cayman''s untouched north coast. This villa occupies a generous waterfront lot on the calm North Sound — ideal for kayaking, paddleboarding, and offshore diving. Five bedrooms across two pavilions, large wraparound verandah, and a private dock.',
 'villa','active','sale',
 3750000,'12 North Sound Drive','Rum Point','Cayman Islands','Grand Cayman',
 5,5.0,4900,21780,2014,
 ARRAY['private dock','wraparound verandah','outdoor kitchen','pool','kayak storage'],
 ARRAY['waterfront access','north sound views','private beach','generator','gated'],
 'AK-KY-2025-003',21,198,NOW()-INTERVAL'21 days',NOW()-INTERVAL'21 days',NOW()-INTERVAL'2 days',
 '["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1400&q=85","https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1400&q=85","https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&q=85","https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=1400&q=85"]'::jsonb,
 false,NULL,'North Sound Waterfront Retreat'),

('a1000001-0000-0000-0000-000000000004',
 'Harbour House',
 'Elegant townhouse in the heart of George Town, steps from the financial district and waterfront. Exceptional rental yield history. Three bedrooms, private rooftop terrace, and a dedicated concierge service. Ideal lock-and-leave investment.',
 'condo','active','sale',
 1850000,'9 Harbour Drive','George Town','Cayman Islands','Grand Cayman',
 3,3.5,2200,NULL,2016,
 ARRAY['rooftop terrace','smart home','private parking','city and harbour views'],
 ARRAY['concierge','gym','pool','near financial district','rental history'],
 'AK-KY-2025-004',34,167,NOW()-INTERVAL'34 days',NOW()-INTERVAL'34 days',NOW()-INTERVAL'3 days',
 '["https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1400&q=85","https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1400&q=85","https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1400&q=85"]'::jsonb,
 false,NULL,'George Town Harbour Townhouse'),

('a1000001-0000-0000-0000-000000000005',
 'Starfish Point Cottage',
 'A rare north coast gem with direct access to the famous Starfish Point beach. This charming three-bedroom cottage sits on an elevated plot with panoramic views over the North Sound. Recently fully renovated to a high specification.',
 'cottage','active','sale',
 2100000,'Starfish Point Road','North Side','Cayman Islands','Grand Cayman',
 3,3.0,1900,12000,2005,
 ARRAY['pool','outdoor kitchen','renovated 2023','panoramic views','beach access'],
 ARRAY['starfish point access','privacy','gated','generator'],
 'AK-KY-2025-005',45,134,NOW()-INTERVAL'45 days',NOW()-INTERVAL'45 days',NOW()-INTERVAL'4 days',
 '["https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1400&q=85","https://images.unsplash.com/photo-1584132905271-512c958d674a?w=1400&q=85","https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1400&q=85"]'::jsonb,
 false,'Price Reduced','North Side Beachfront Cottage'),

('a1000001-0000-0000-0000-000000000006',
 'Cayman Kai Estate',
 'Exceptional 5-bedroom estate in the exclusive Cayman Kai community on the tranquil north coast. Direct beach access, boat dock, and a stunning infinity pool overlooking the reef. Adjacent to Rum Point Club facilities.',
 'estate','active','sale',
 5800000,'Cayman Kai Road','Cayman Kai','Cayman Islands','Grand Cayman',
 5,6.0,6200,32000,2012,
 ARRAY['infinity pool','boat dock','outdoor kitchen','gym','wine cellar','smart home'],
 ARRAY['direct beach access','rum point club access','staff quarters','generator','security'],
 'AK-KY-2025-006',18,289,NOW()-INTERVAL'18 days',NOW()-INTERVAL'18 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&q=85","https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1400&q=85","https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1400&q=85"]'::jsonb,
 true,'Exclusive','Cayman Kai Beachfront Estate'),

('a1000001-0000-0000-0000-000000000007',
 'Crystal Cove Penthouse',
 'Ultra-modern beachfront penthouse at the acclaimed Crystal Cove development on Seven Mile Beach. Three bedrooms, full hotel services, and a 55-foot private terrace with direct beach access. Strong rental track record.',
 'penthouse','active','sale',
 3400000,'Crystal Cove Boulevard','Seven Mile Beach','Cayman Islands','Grand Cayman',
 3,3.5,2900,NULL,2021,
 ARRAY['55ft terrace','beach access','hotel services','smart home','private pool plunge'],
 ARRAY['spa','restaurant','gym','valet','concierge','beach club'],
 'AK-KY-2025-007',29,241,NOW()-INTERVAL'29 days',NOW()-INTERVAL'29 days',NOW()-INTERVAL'2 days',
 '["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1400&q=85","https://images.unsplash.com/photo-1439130490301-25e322d88054?w=1400&q=85","https://images.unsplash.com/photo-1561501878-aabd62634533?w=1400&q=85"]'::jsonb,
 false,NULL,'Seven Mile Beach Resort Penthouse'),

('a1000001-0000-0000-0000-000000000008',
 'North Sound Land Parcel',
 'A rare opportunity to acquire a freehold coastal land parcel on Grand Cayman''s tranquil north coast. 1.2 acres with approved planning permission for a 6-bedroom luxury villa. Utilities to boundary. Scarce coastal land.',
 'land','active','sale',
 2100000,'North Sound Road','North Side','Cayman Islands','Grand Cayman',
 NULL,NULL,NULL,52000,NULL,
 ARRAY['approved planning permission','utilities to boundary','ocean views','paved road access'],
 ARRAY['elevated position','beachfront','privacy','360 views'],
 'AK-KY-2025-008',58,149,NOW()-INTERVAL'58 days',NOW()-INTERVAL'58 days',NOW()-INTERVAL'4 days',
 '["https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1400&q=85","https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85"]'::jsonb,
 false,'Development Land','1.2 Acre Coastal Land Parcel'),

('a1000001-0000-0000-0000-000000000009',
 'West Bay Beachfront Villa',
 'A beautifully maintained 4-bedroom villa on the quieter northern stretch of Seven Mile Beach. Unobstructed ocean views, private beach, and a mature tropical garden. Excellent rental yield with established management.',
 'villa','under_contract','sale',
 4100000,'West Bay Road','West Bay','Cayman Islands','Grand Cayman',
 4,4.5,4400,18000,2007,
 ARRAY['private beach','pool','outdoor kitchen','rental programme','tropical garden'],
 ARRAY['beachfront','staff suite','generator','security cameras'],
 'AK-KY-2025-009',62,378,NOW()-INTERVAL'62 days',NOW()-INTERVAL'62 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1400&q=85","https://images.unsplash.com/photo-1602002418082-dd4a8f7b2587?w=1400&q=85","https://images.unsplash.com/photo-1596436889106-be35e843f974?w=1400&q=85"]'::jsonb,
 false,'Under Offer','West Bay Oceanfront Villa'),

('a1000001-0000-0000-0000-000000000010',
 'Cayman Club Residences — Unit 7',
 'Boutique branded residence within the prestigious Cayman Club resort. Top-floor unit with direct pool-terrace access, full hotel services, and a proven rental programme generating consistent returns.',
 'condo','active','sale',
 1890000,'Cayman Club Drive','George Town','Cayman Islands','Grand Cayman',
 3,3.5,2400,NULL,2020,
 ARRAY['resort services','private terrace','pool access','fully furnished','rental programme'],
 ARRAY['spa','restaurant','concierge','gym','valet','beach club'],
 'AK-KY-2025-010',14,412,NOW()-INTERVAL'14 days',NOW()-INTERVAL'14 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1400&q=85","https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1400&q=85","https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1400&q=85"]'::jsonb,
 false,NULL,'Cayman Club Branded Residence'),

('a1000001-0000-0000-0000-000000000011',
 'Seven Palms Estate',
 'A walled private compound in prestigious West Bay, walking distance to Cayman Kai and the northern beaches. The main residence and two guest villas sit within 1.2 acres of landscaped tropical grounds. Multigenerational living at its finest — staff cottage, tennis court, and a 25-metre lap pool.',
 'estate','active','sale',
 7900000,'Seven Palms Drive','West Bay','Cayman Islands','Grand Cayman',
 7,8.0,9800,52272,2011,
 ARRAY['25m lap pool','tennis court','staff cottage','two guest villas','wine cellar','home gym','cinema room'],
 ARRAY['1.2 acre grounds','gated and walled','near cayman kai','staff accommodation','solar panels'],
 'AK-KY-2025-011',6,523,NOW()-INTERVAL'6 days',NOW()-INTERVAL'6 days',NOW(),
 '["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&q=85","https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1400&q=85","https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1400&q=85","https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1400&q=85"]'::jsonb,
 true,'Exclusive','West Bay Private Compound'),

-- ═══════════════════════════════════════════════════════════════
-- NASSAU & BAHAMAS (10 properties)
-- ═══════════════════════════════════════════════════════════════

('a1000001-0000-0000-0000-000000000012',
 'Lyford Cay Ocean Manor',
 'Set within the exclusive gated community of Lyford Cay, this grand ocean manor represents the pinnacle of Bahamian luxury. Seven bedrooms, a chef''s kitchen with twin islands, an art gallery corridor, and a 60-foot pool terrace facing Nassau Harbour. Full staff of seven included in the sale.',
 'estate','active','sale',
 9800000,'14 Lyford Cay Drive','Nassau','Bahamas','Nassau',
 7,8.0,10200,43560,2006,
 ARRAY['60ft pool terrace','art gallery corridor','chef''s kitchen','wine cellar','staff of seven','home cinema','smart home'],
 ARRAY['lyford cay club access','gated community','harbour views','marina access','security','concierge'],
 'AK-BS-2025-012',11,509,NOW()-INTERVAL'11 days',NOW()-INTERVAL'11 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&q=85","https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=1400&q=85","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85","https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1400&q=85"]'::jsonb,
 true,'Off-Market','Nassau''s Most Prestigious Address'),

('a1000001-0000-0000-0000-000000000013',
 'Palmetto Point Estate',
 'A private beachfront sanctuary occupying one of the last undeveloped stretches of Nassau''s northern coast. Five bedroom villa with direct beach access, a lagoon-style pool, and an outdoor entertainment pavilion. 90-day rental yield projections exceed $380,000 annually.',
 'villa','active','sale',
 4750000,'Palmetto Point Road','Nassau','Bahamas','Nassau',
 5,6.0,6200,26136,2012,
 ARRAY['lagoon pool','outdoor pavilion','beach bar','outdoor shower','dock access'],
 ARRAY['direct beach access','200ft frontage','generator','staff suite','golf cart included'],
 'AK-BS-2025-013',28,267,NOW()-INTERVAL'28 days',NOW()-INTERVAL'28 days',NOW()-INTERVAL'2 days',
 '["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85","https://images.unsplash.com/photo-1540541338537-41943b56f9e1?w=1400&q=85","https://images.unsplash.com/photo-1602002418082-dd4a8f7b2587?w=1400&q=85","https://images.unsplash.com/photo-1561501878-aabd62634533?w=1400&q=85"]'::jsonb,
 false,NULL,'Nassau Beachfront Sanctuary'),

('a1000001-0000-0000-0000-000000000014',
 'Harbour Island Cottage',
 'A beautifully restored colonial cottage steps from Harbour Island''s legendary pink sand beach. Whitewashed wooden interiors, wraparound porch, tropical garden with freshwater plunge pool. Accessible from Nassau in 35 minutes by charter — the quintessential Bahamian escape.',
 'cottage','active','sale',
 2200000,'Dunmore Street','Harbour Island','Bahamas','Eleuthera',
 3,3.0,2400,8712,1998,
 ARRAY['plunge pool','wraparound porch','tropical garden','restored colonial architecture'],
 ARRAY['3 min walk to pink sand beach','golf cart','near dunmore town','fully furnished'],
 'AK-BS-2025-014',44,183,NOW()-INTERVAL'44 days',NOW()-INTERVAL'44 days',NOW()-INTERVAL'3 days',
 '["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1400&q=85","https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1400&q=85","https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1400&q=85","https://images.unsplash.com/photo-1584132905271-512c958d674a?w=1400&q=85"]'::jsonb,
 false,'Price Reduced','Pink Sand Beach Retreat'),

('a1000001-0000-0000-0000-000000000015',
 'Old Fort Bay Villa',
 'Prestigious Old Fort Bay address — one of Nassau''s most private gated communities. This spectacular 6-bedroom villa commands sweeping ocean views from every principal room. Architect-designed with resort-grade interiors and a 40-metre beachfront.',
 'villa','active','sale',
 6400000,'Old Fort Bay','Nassau','Bahamas','Nassau',
 6,7.0,7800,34000,2014,
 ARRAY['40m beachfront','infinity pool','gym','cinema','wine cellar','outdoor kitchen'],
 ARRAY['old fort bay club','gated community','security','concierge','staff quarters','generator'],
 'AK-BS-2025-015',19,341,NOW()-INTERVAL'19 days',NOW()-INTERVAL'19 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1400&q=85","https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1400&q=85","https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1400&q=85"]'::jsonb,
 true,'Exclusive','Old Fort Bay Gated Estate'),

('a1000001-0000-0000-0000-000000000016',
 'Paradise Island Penthouse',
 'Commanding the top floor of Paradise Island''s most acclaimed residence, this 4-bedroom penthouse delivers unmatched views of Nassau Harbour and the Atlantic. Full concierge services, two private terraces, and direct access to the resort''s beach club.',
 'penthouse','active','sale',
 3200000,'Paradise Island Bridge Road','Nassau','Bahamas','Nassau',
 4,4.5,3600,NULL,2018,
 ARRAY['dual terraces','harbour views','smart home','wine cellar','private lift'],
 ARRAY['beach club access','concierge','spa','restaurant','gym','valet'],
 'AK-BS-2025-016',36,224,NOW()-INTERVAL'36 days',NOW()-INTERVAL'36 days',NOW()-INTERVAL'2 days',
 '["https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1400&q=85","https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1400&q=85","https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1400&q=85"]'::jsonb,
 false,NULL,'Paradise Island Harbour Penthouse'),

('a1000001-0000-0000-0000-000000000017',
 'Exuma Cays Private Island',
 'An extraordinary private island in the Exuma Cays chain, with a fully appointed 4-bedroom main villa, guest cottage, and boat dock. Crystal-clear turquoise water on all sides. Your own island — 8.4 acres of pristine Bahamian paradise.',
 'estate','active','sale',
 8900000,'Exuma Cays','Great Exuma','Bahamas','Exuma',
 4,4.0,3800,NULL,2015,
 ARRAY['private island','boat dock','helipad','solar powered','water desalination','guest cottage'],
 ARRAY['360 water views','full caretaker','boats included','diving equipment','absolute privacy'],
 'AK-BS-2025-017',7,612,NOW()-INTERVAL'7 days',NOW()-INTERVAL'7 days',NOW(),
 '["https://images.unsplash.com/photo-1439130490301-25e322d88054?w=1400&q=85","https://images.unsplash.com/photo-1596436889106-be35e843f974?w=1400&q=85","https://images.unsplash.com/photo-1600585157088-7d83f50fc76b?w=1400&q=85"]'::jsonb,
 true,'Unique','8.4 Acre Private Island'),

('a1000001-0000-0000-0000-000000000018',
 'Cable Beach Residences',
 'Contemporary beachfront apartments in the newly developed Cable Beach corridor. Two-bedroom units with floor-to-ceiling ocean views, resort-grade finishes, and access to world-class amenities. Strong off-plan capital appreciation projected.',
 'condo','active','sale',
 1450000,'Cable Beach Boulevard','Nassau','Bahamas','Nassau',
 2,2.5,1800,NULL,2024,
 ARRAY['ocean views','floor-to-ceiling glass','resort finishes','private balcony'],
 ARRAY['beach access','pool','gym','concierge','restaurant','off-plan'],
 'AK-BS-2025-018',52,176,NOW()-INTERVAL'52 days',NOW()-INTERVAL'52 days',NOW()-INTERVAL'4 days',
 '["https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1400&q=85","https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1400&q=85"]'::jsonb,
 false,'New Development','Cable Beach Ocean Apartment'),

('a1000001-0000-0000-0000-000000000019',
 'Eleuthera Cliffside Estate',
 'Dramatic clifftop estate on Eleuthera''s Atlantic coast, with the famous Glass Window Bridge visible from the property. The pink sand of Harbour Island is 15 minutes by boat. A truly extraordinary natural setting for a discerning buyer.',
 'estate','active','sale',
 3800000,'Queens Highway','Gregory Town','Bahamas','Eleuthera',
 5,5.0,5100,44000,2010,
 ARRAY['cliff top pool','outdoor kitchen','panoramic atlantic views','boat dock'],
 ARRAY['private beach access','generator','solar panels','caretaker on site'],
 'AK-BS-2025-019',67,198,NOW()-INTERVAL'67 days',NOW()-INTERVAL'67 days',NOW()-INTERVAL'5 days',
 '["https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=1400&q=85","https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1400&q=85","https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1400&q=85"]'::jsonb,
 false,NULL,'Eleuthera Atlantic Clifftop Estate'),

('a1000001-0000-0000-0000-000000000020',
 'Bimini Bay Villa',
 'Exceptional waterfront villa in Bimini — 50 miles from Miami, steeped in Hemingway lore. This 4-bedroom retreat sits directly on the bay with a private boat slip, world-class sportfishing on the doorstep.',
 'villa','active','sale',
 2900000,'King''s Highway','Alice Town','Bahamas','Bimini',
 4,4.0,3400,16000,2013,
 ARRAY['boat slip','fishing equipment','pool','outdoor kitchen','dock'],
 ARRAY['bimini bay','close to miami','world class fishing','caretaker','generator'],
 'AK-BS-2025-020',41,156,NOW()-INTERVAL'41 days',NOW()-INTERVAL'41 days',NOW()-INTERVAL'3 days',
 '["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1400&q=85","https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=1400&q=85","https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=1400&q=85"]'::jsonb,
 false,NULL,'Bimini Waterfront Sportfishing Villa'),

('a1000001-0000-0000-0000-000000000021',
 'Ocean Walk Residence',
 'Positioned on a private peninsula in the Exuma Cays with 360-degree water views, this exceptional residence offers unrivalled seclusion. Private boat basin, bespoke interiors, and direct access to some of the clearest water in the world. A helicopter pad and full island caretaker complete the offering.',
 'villa','active','sale',
 5900000,'Exuma Cays','Exuma','Bahamas','Exuma',
 6,7.0,8100,34848,2016,
 ARRAY['private boat basin','helipad','infinity pool','outdoor kitchen','sundeck','island caretaker'],
 ARRAY['360 water views','private peninsula','helicopter pad','boat basin','fully staffed'],
 'AK-BS-2025-021',3,721,NOW()-INTERVAL'3 days',NOW()-INTERVAL'3 days',NOW(),
 '["https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1400&q=85","https://images.unsplash.com/photo-1439130490301-25e322d88054?w=1400&q=85","https://images.unsplash.com/photo-1596436889106-be35e843f974?w=1400&q=85","https://images.unsplash.com/photo-1600585157088-7d83f50fc76b?w=1400&q=85"]'::jsonb,
 true,'Exclusive','Exuma Private Waterfront'),

-- ═══════════════════════════════════════════════════════════════
-- JAMAICA (9 properties)
-- ═══════════════════════════════════════════════════════════════

('a1000001-0000-0000-0000-000000000022',
 'Trident Point Manor',
 'A legendary private estate perched above the cobalt waters of the Blue Lagoon in Port Antonio — arguably the most beautiful location in all of Jamaica. Eight bedrooms across the main house and two guest pavilions. Preferred by visiting royalty, heads of state, and the world''s most discerning travellers.',
 'estate','active','sale',
 8500000,'Trident Point','Port Antonio','Jamaica','Jamaica',
 8,9.0,11200,87120,2003,
 ARRAY['main house + 2 pavilions','clifftop infinity pool','private dock','home cinema','staff of ten','helipad','tennis court'],
 ARRAY['blue lagoon access','2 acres tropical grounds','private cove','dive equipment','fully staffed year-round'],
 'AK-JM-2025-022',4,687,NOW()-INTERVAL'4 days',NOW()-INTERVAL'4 days',NOW(),
 '["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=85","https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=1400&q=85","https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1400&q=85","https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1400&q=85"]'::jsonb,
 true,'Off-Market','Port Antonio Clifftop Estate'),

('a1000001-0000-0000-0000-000000000023',
 'Blue Lagoon Retreat',
 'A contemporary oceanfront villa on Montego Bay''s prestigious Sandy Bay corridor, offering immediate Tryall Club membership eligibility. Wide open-plan living spaces open to a vast covered terrace and beach-entry pool. Four en-suite bedrooms, gourmet kitchen, and a separate self-contained guest cottage.',
 'villa','active','sale',
 3100000,'Sandy Bay Road','Montego Bay','Jamaica','Jamaica',
 4,5.0,4900,17424,2017,
 ARRAY['beach-entry pool','guest cottage','covered terrace','chef''s kitchen','smart home'],
 ARRAY['tryall club eligibility','direct beach access','staff suite','generator','security cameras'],
 'AK-JM-2025-023',33,267,NOW()-INTERVAL'33 days',NOW()-INTERVAL'33 days',NOW()-INTERVAL'2 days',
 '["https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=1400&q=85","https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=1400&q=85","https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=1400&q=85","https://images.unsplash.com/photo-1613553507747-5f8d62ad5904?w=1400&q=85"]'::jsonb,
 false,NULL,'Montego Bay Oceanfront Villa'),

('a1000001-0000-0000-0000-000000000024',
 'GoldenEye Cove',
 'Inspired by the legendary Ian Fleming retreat, this oceanfront property occupies a prime position on Jamaica''s north coast between Oracabessa and Port Maria. The four-bedroom villa has a private beach cove, lap pool, and is eligible for Ian Fleming Oracabessa Bay Fish Sanctuary membership.',
 'villa','active','sale',
 4800000,'Oracabessa Bay Road','Oracabessa','Jamaica','Jamaica',
 4,5.0,5200,28000,2008,
 ARRAY['private beach cove','lap pool','outdoor cinema','boat dock','solar system'],
 ARRAY['fish sanctuary access','full staff','generator','caretaker','golden eye proximity'],
 'AK-JM-2025-024',22,312,NOW()-INTERVAL'22 days',NOW()-INTERVAL'22 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1400&q=85","https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1400&q=85","https://images.unsplash.com/photo-1490122417551-6ee9691429d0?w=1400&q=85"]'::jsonb,
 false,'Exclusive','North Coast Private Cove Villa'),

('a1000001-0000-0000-0000-000000000025',
 'Tryall Estate Villa',
 'An exceptional villa within the world-renowned Tryall Club — one of the Caribbean''s most celebrated golf and beach resorts. Seven bedrooms with butler, chef, and housekeeping included. Enrolled in Tryall''s villa rental programme. Stunning views across the club''s championship course to the sea.',
 'villa','active','sale',
 6200000,'Tryall Club','Sandy Bay','Jamaica','Jamaica',
 7,8.0,8400,52000,2005,
 ARRAY['tryall club membership','championship golf views','pool','tennis','chef and butler'],
 ARRAY['tryall resort services','beach club','spa','restaurant','full staff','golf buggy'],
 'AK-JM-2025-025',14,489,NOW()-INTERVAL'14 days',NOW()-INTERVAL'14 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1400&q=85","https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1400&q=85","https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1400&q=85"]'::jsonb,
 true,'Resort Managed','Tryall Club Championship Estate'),

('a1000001-0000-0000-0000-000000000026',
 'Negril Cliff Villa',
 'A dramatic clifftop villa on Negril''s legendary West End cliffs, with direct ladder access to the Caribbean Sea for swimming and snorkelling. The three-bedroom villa has been fully renovated and benefits from established rental demand in one of Jamaica''s most sought-after locations.',
 'villa','active','sale',
 1900000,'West End Road','Negril','Jamaica','Jamaica',
 3,3.0,2600,14000,1995,
 ARRAY['cliff top pool','sea ladder access','outdoor kitchen','renovated 2022','sunset views'],
 ARRAY['west end location','rental history','generator','security'],
 'AK-JM-2025-026',51,178,NOW()-INTERVAL'51 days',NOW()-INTERVAL'51 days',NOW()-INTERVAL'4 days',
 '["https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=1400&q=85","https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=1400&q=85","https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1400&q=85"]'::jsonb,
 false,'Price Reduced','Negril West End Cliffside Villa'),

('a1000001-0000-0000-0000-000000000027',
 'Strawberry Hill Retreat',
 'A remarkable mountain retreat in the Blue Mountains above Kingston, built in the style of the great plantation great houses. Five bedrooms with panoramic views across Kingston and the Caribbean Sea 3,100 feet below. Cool mountain air year-round.',
 'estate','active','sale',
 2800000,'Irish Town Road','Irish Town','Jamaica','Jamaica',
 5,5.0,4200,22000,2001,
 ARRAY['mountain views','pool','outdoor fire pit','coffee plantation access','cool climate'],
 ARRAY['blue mountains location','full staff','generator','caretaker','helicopter access'],
 'AK-JM-2025-027',38,143,NOW()-INTERVAL'38 days',NOW()-INTERVAL'38 days',NOW()-INTERVAL'3 days',
 '["https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1400&q=85","https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=1400&q=85","https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1400&q=85"]'::jsonb,
 false,NULL,'Blue Mountains Estate Retreat'),

('a1000001-0000-0000-0000-000000000028',
 'Montego Bay Marina Penthouse',
 'Ultra-modern penthouse directly above Montego Bay''s prestigious marina. Three bedrooms, full-length terrace with marina and sea views, and private lift access. Walking distance to the best restaurants and clubs in MoBay. Strong short-term rental yield.',
 'penthouse','active','sale',
 1750000,'Marina Drive','Montego Bay','Jamaica','Jamaica',
 3,3.5,2400,NULL,2020,
 ARRAY['marina views','private terrace','smart home','private lift','designer interiors'],
 ARRAY['marina access','concierge','gym','near downtown MoBay','rental history'],
 'AK-JM-2025-028',26,198,NOW()-INTERVAL'26 days',NOW()-INTERVAL'26 days',NOW()-INTERVAL'2 days',
 '["https://images.unsplash.com/photo-1613553507747-5f8d62ad5904?w=1400&q=85","https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=1400&q=85","https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1400&q=85"]'::jsonb,
 false,NULL,'Montego Bay Marina Penthouse'),

('a1000001-0000-0000-0000-000000000029',
 'Round Hill Villa',
 'An elegant hillside villa within the legendary Round Hill Hotel & Villas resort — Jamaica''s most storied luxury address, once host to Noel Coward, Ralph Lauren, and the Kennedy family. Enrolled in Round Hill''s fully-managed rental programme. Commanding panoramic bay views from every principal room.',
 'villa','active','sale',
 4100000,'Round Hill Road','Montego Bay','Jamaica','Jamaica',
 5,6.0,5600,28314,2009,
 ARRAY['round hill rental programme','panoramic bay views','pool','covered verandah','tropical gardens'],
 ARRAY['round hill hotel services','beach club access','spa access','restaurant','concierge','security'],
 'AK-JM-2025-029',16,434,NOW()-INTERVAL'16 days',NOW()-INTERVAL'16 days',NOW()-INTERVAL'1 day',
 '["https://images.unsplash.com/photo-1551882547-ff40c4cef375?w=1400&q=85","https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1400&q=85","https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1400&q=85","https://images.unsplash.com/photo-1490122417551-6ee9691429d0?w=1400&q=85"]'::jsonb,
 true,'Resort Managed','Round Hill Resort Residence'),

('a1000001-0000-0000-0000-000000000030',
 'Port Antonio Blue Hole Villa',
 'A lush, secluded villa in the hills above Port Antonio, overlooking the famous Blue Hole lagoon. Ringed by tropical rainforest, this property offers the most dramatic natural setting in Jamaica. Three bedrooms, infinity pool, and private access to the Blue Hole for swimming.',
 'villa','active','sale',
 2400000,'Blue Hole Road','Port Antonio','Jamaica','Jamaica',
 3,3.0,2800,18000,2011,
 ARRAY['blue hole access','infinity pool','jungle setting','outdoor kitchen','solar powered'],
 ARRAY['private blue hole access','caretaker','generator','remote location','complete privacy'],
 'AK-JM-2025-030',47,223,NOW()-INTERVAL'47 days',NOW()-INTERVAL'47 days',NOW()-INTERVAL'3 days',
 '["https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1400&q=85","https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=1400&q=85","https://images.unsplash.com/photo-1613553507747-5f8d62ad5904?w=1400&q=85"]'::jsonb,
 false,NULL,'Port Antonio Blue Hole Jungle Villa')

ON CONFLICT (id) DO UPDATE SET
  title         = EXCLUDED.title,
  description   = EXCLUDED.description,
  property_type = EXCLUDED.property_type,
  status        = EXCLUDED.status,
  price         = EXCLUDED.price,
  address       = EXCLUDED.address,
  city          = EXCLUDED.city,
  bedrooms      = EXCLUDED.bedrooms,
  bathrooms     = EXCLUDED.bathrooms,
  square_feet   = EXCLUDED.square_feet,
  lot_size      = EXCLUDED.lot_size,
  year_built    = EXCLUDED.year_built,
  features      = EXCLUDED.features,
  amenities     = EXCLUDED.amenities,
  mls_number    = EXCLUDED.mls_number,
  images        = EXCLUDED.images,
  featured      = EXCLUDED.featured,
  badge         = EXCLUDED.badge,
  subtitle      = EXCLUDED.subtitle,
  updated_at    = NOW();

-- Handle any remaining mls_number conflicts not caught by the DELETE above
-- (e.g. rows with our exact UUIDs that already have a conflicting mls_number
--  from a different run — update them in place)
UPDATE public.properties p
SET mls_number = w.mls_number
FROM (VALUES
  ('a1000001-0000-0000-0000-000000000001','AK-KY-2025-001'),
  ('a1000001-0000-0000-0000-000000000002','AK-KY-2025-002'),
  ('a1000001-0000-0000-0000-000000000003','AK-KY-2025-003'),
  ('a1000001-0000-0000-0000-000000000004','AK-KY-2025-004'),
  ('a1000001-0000-0000-0000-000000000005','AK-KY-2025-005'),
  ('a1000001-0000-0000-0000-000000000006','AK-KY-2025-006'),
  ('a1000001-0000-0000-0000-000000000007','AK-KY-2025-007'),
  ('a1000001-0000-0000-0000-000000000008','AK-KY-2025-008'),
  ('a1000001-0000-0000-0000-000000000009','AK-KY-2025-009'),
  ('a1000001-0000-0000-0000-000000000010','AK-KY-2025-010'),
  ('a1000001-0000-0000-0000-000000000011','AK-KY-2025-011'),
  ('a1000001-0000-0000-0000-000000000012','AK-BS-2025-012'),
  ('a1000001-0000-0000-0000-000000000013','AK-BS-2025-013'),
  ('a1000001-0000-0000-0000-000000000014','AK-BS-2025-014'),
  ('a1000001-0000-0000-0000-000000000015','AK-BS-2025-015'),
  ('a1000001-0000-0000-0000-000000000016','AK-BS-2025-016'),
  ('a1000001-0000-0000-0000-000000000017','AK-BS-2025-017'),
  ('a1000001-0000-0000-0000-000000000018','AK-BS-2025-018'),
  ('a1000001-0000-0000-0000-000000000019','AK-BS-2025-019'),
  ('a1000001-0000-0000-0000-000000000020','AK-BS-2025-020'),
  ('a1000001-0000-0000-0000-000000000021','AK-BS-2025-021'),
  ('a1000001-0000-0000-0000-000000000022','AK-JM-2025-022'),
  ('a1000001-0000-0000-0000-000000000023','AK-JM-2025-023'),
  ('a1000001-0000-0000-0000-000000000024','AK-JM-2025-024'),
  ('a1000001-0000-0000-0000-000000000025','AK-JM-2025-025'),
  ('a1000001-0000-0000-0000-000000000026','AK-JM-2025-026'),
  ('a1000001-0000-0000-0000-000000000027','AK-JM-2025-027'),
  ('a1000001-0000-0000-0000-000000000028','AK-JM-2025-028'),
  ('a1000001-0000-0000-0000-000000000029','AK-JM-2025-029'),
  ('a1000001-0000-0000-0000-000000000030','AK-JM-2025-030')
) AS w(id, mls_number)
WHERE p.id = w.id::uuid
  AND p.mls_number IS DISTINCT FROM w.mls_number;

-- ── 5. VERIFY ────────────────────────────────────────────────────
SELECT
  island,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'active') AS active,
  COUNT(*) FILTER (WHERE featured = true) AS featured,
  COUNT(*) FILTER (WHERE images != '[]'::jsonb) AS with_images
FROM public.properties
GROUP BY island
ORDER BY island;
