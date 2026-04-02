/* ============================================================
   SUPABASE DATA LOADER
   Fetches properties live from Supabase.
   Falls back to window.LISTINGS_DATA (static) if fetch fails.
   Normalises Supabase rows → same shape as LISTINGS_DATA so
   all existing components work without changes.
============================================================ */

window.PropertiesStore = (function () {

  const URL  = window.SUPABASE_URL;
  const KEY  = window.SUPABASE_ANON;
  let _cache = null;         // in-memory cache for this page load
  let _loading = null;       // dedupes concurrent calls

  /* ── Public API ─────────────────────────────────────────── */

  async function getAll() {
    if (_cache) return _cache;
    if (_loading) return _loading;

    _loading = _fetchFromSupabase()
      .then(rows => {
        if (rows && rows.length > 0) {
          _cache = rows.map(_normalise);
          // Keep static data in sync so legacy code still works
          window.LISTINGS_DATA = _cache;
          return _cache;
        }
        // Supabase returned empty — use static fallback
        console.warn('[PropertiesStore] Supabase returned no rows — using static fallback');
        _cache = window.LISTINGS_DATA || [];
        return _cache;
      })
      .catch(err => {
        console.warn('[PropertiesStore] Supabase fetch failed — using static fallback', err);
        _cache = window.LISTINGS_DATA || [];
        return _cache;
      });

    return _loading;
  }

  async function getById(id) {
    const all = await getAll();
    return all.find(p => p.id === id) || null;
  }

  async function getFeatured(limit = 6) {
    const all = await getAll();
    const active = all.filter(p => p.status === 'active' || p.status === 'under_contract');
    const featured = active.filter(p => p.featured).slice(0, limit);
    if (featured.length >= limit) return featured;
    // pad with non-featured active properties if needed
    const rest = active.filter(p => !p.featured);
    return [...featured, ...rest].slice(0, limit);
  }

  /* ── Supabase REST fetch ─────────────────────────────────── */

  async function _fetchFromSupabase() {
    if (!URL || !KEY) throw new Error('Supabase config missing');

    const res = await fetch(
      `${URL}/rest/v1/properties?select=*&status=in.(active,under_contract)&order=featured.desc,views_count.desc`,
      {
        headers: {
          'apikey': KEY,
          'Authorization': `Bearer ${KEY}`,
          'Accept': 'application/json',
        }
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${res.status}: ${text}`);
    }

    return res.json();
  }

  /* ── Normalise Supabase row → website shape ─────────────── */

  function _normalise(row) {
    const imgs   = Array.isArray(row.images) ? row.images
                 : (typeof row.images === 'string' ? JSON.parse(row.images) : []);

    const market = _islandToMarket(row.island);

    return {
      // IDs & routing
      id:          row.id,
      mls:         row.mls_number,

      // Display
      name:        row.title,
      subtitle:    row.subtitle || '',
      description: row.description || '',
      location:    [row.city, _countryShort(row.country)].filter(Boolean).join(', '),
      market,
      type:        _propertyTypeLabel(row.property_type),
      status:      row.status,
      badge:       row.badge || null,
      featured:    row.featured || false,

      // Price
      price:    row.price ? '$' + Number(row.price).toLocaleString('en-US') : 'POA',
      priceRaw: row.price || 0,

      // Specs
      beds:      row.bedrooms,
      baths:     row.bathrooms,
      sqft:      row.square_feet ? Number(row.square_feet).toLocaleString('en-US') : null,
      lotSqft:   row.lot_size    ? Number(row.lot_size).toLocaleString('en-US')    : null,
      yearBuilt: row.year_built,

      // Features
      features:  row.features  || [],
      amenities: row.amenities || [],

      // Images — gallery[0] is hero/card image
      image:   imgs[0] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',
      gallery: imgs.length ? imgs : [],
      alt:     `${row.title} — ${row.city}, ${row.country}`,

      // Meta
      daysOnMarket: row.days_on_market,
      views:        row.views_count,
    };
  }

  function _islandToMarket(island) {
    if (!island) return 'unknown';
    const i = island.toLowerCase();
    if (i.includes('cayman')) return 'cayman';
    if (i.includes('nassau') || i.includes('bahama') || i.includes('exuma') ||
        i.includes('eleuthera') || i.includes('bimini') || i.includes('harbour island')) return 'bahamas';
    if (i.includes('jamaica')) return 'jamaica';
    return 'unknown';
  }

  function _countryShort(country) {
    if (!country) return '';
    if (country.includes('Cayman')) return 'Cayman Islands';
    if (country.includes('Bahamas') || country === 'Bahamas') return 'Bahamas';
    if (country === 'Jamaica') return 'Jamaica';
    return country;
  }

  function _propertyTypeLabel(t) {
    const map = {
      estate: 'Estate', villa: 'Villa', penthouse: 'Penthouse',
      cottage: 'Cottage', condo: 'Apartment', apartment: 'Apartment',
      land: 'Land Parcel', townhouse: 'Townhouse'
    };
    return map[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Property');
  }

  return { getAll, getById, getFeatured };

})();
