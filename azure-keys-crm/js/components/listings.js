/* ============================================================
   COMPONENT — HOMEPAGE LISTINGS
   Fetches ALL properties from PropertiesStore (up to 30).
   Shows 6 on load. Island filter tabs filter the FULL set —
   so Jamaica/Bahamas/Cayman each show their correct count,
   not a filtered subset of 6.
============================================================ */

(async function () {
  const grid       = document.getElementById('listingsGrid');
  const filterBtns = document.querySelectorAll('.listings__filter');
  const countEl    = document.getElementById('listingsTotalCount');
  if (!grid) return;

  let allProperties  = [];   // full dataset from Supabase (all 30)
  let currentFilter  = 'all';
  const SHOW_DEFAULT = 6;    // cards shown on "All" before filtering

  // ── Skeleton while loading ───────────────────────────────────
  grid.innerHTML = Array(SHOW_DEFAULT).fill(`
    <div class="property-card" style="pointer-events:none;">
      <div style="aspect-ratio:4/3;background:linear-gradient(90deg,#131820 25%,rgba(255,255,255,0.04) 50%,#131820 75%);background-size:800px 100%;animation:shimmer 1.4s infinite;"></div>
      <div style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem;">
        <div style="height:14px;width:40%;border-radius:2px;background:#1c2230;"></div>
        <div style="height:22px;width:75%;border-radius:2px;background:#1c2230;"></div>
        <div style="height:12px;width:55%;border-radius:2px;background:#1c2230;"></div>
      </div>
    </div>
  `).join('');

  // ── Fetch ALL properties (not just 6) ───────────────────────
  if (window.PropertiesStore) {
    allProperties = await window.PropertiesStore.getAll();
  } else {
    allProperties = window.LISTINGS_DATA || [];
  }

  // Sort: featured first, then by views
  allProperties.sort((a, b) => {
    if (b.featured && !a.featured) return 1;
    if (a.featured && !b.featured) return -1;
    return (b.views || 0) - (a.views || 0);
  });

  // Update the "View All X Properties" link count if present
  if (countEl) countEl.textContent = allProperties.length;

  // Initial render: first 6
  renderCards(_forFilter('all'));
  bindFilters();

  // ── Filter logic ─────────────────────────────────────────────
  function _forFilter(filter) {
    if (filter === 'all') {
      // Show first 6 (featured-first) when no market selected
      return allProperties.slice(0, SHOW_DEFAULT);
    }
    // When a specific island is selected, show ALL properties
    // for that island (not capped at 6) so counts are accurate
    return allProperties.filter(p => p.market === filter);
  }

  function renderCards(properties) {
    if (!properties.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem 2rem;color:rgba(232,224,208,0.4);">
          <p style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:300;margin-bottom:0.5rem;">No listings in this market yet</p>
          <p style="font-size:0.875rem;">Check back soon or explore another island</p>
        </div>`;
      return;
    }
    grid.innerHTML = properties.map(buildCard).join('');
    initReveal();
  }

  function bindFilters() {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;

        filterBtns.forEach(b => {
          b.classList.toggle('active', b.dataset.filter === currentFilter);
          b.setAttribute('aria-selected', b.dataset.filter === currentFilter ? 'true' : 'false');
        });

        renderCards(_forFilter(currentFilter));
      });
    });
  }

  // ── Card builder ──────────────────────────────────────────────
  function buildCard(p) {
    const badge = p.badge
      ? `<span class="property-card__badge">${p.badge}</span>`
      : '';
    const statusPill = p.status === 'under_contract'
      ? `<span class="property-card__badge property-card__badge--status">Under Offer</span>`
      : '';
    return `
      <a href="properties/property.html?id=${p.id}" class="property-card reveal"
         data-market="${p.market}" style="text-decoration:none;">
        <div class="property-card__image-wrap">
          <img src="${p.image}" alt="${p.alt}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=75'" />
          ${badge}${statusPill}
          <span class="property-card__market">${_marketLabel(p.market)}</span>
        </div>
        <div class="property-card__body">
          <p class="property-card__price">${p.price}</p>
          <h3 class="property-card__name">${p.name}</h3>
          <p class="property-card__location">${p.location}</p>
          <p class="property-card__type-pill">${p.type || 'Property'}</p>
          <div class="property-card__features">
            ${p.beds ? `<span class="property-card__feature">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9v11h7v-7h4v7h7V9L12 3z"/></svg>
              ${p.beds} Bed</span>` : ''}
            ${p.baths ? `<span class="property-card__feature">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M4 12a8 8 0 0 1 16 0M4 12v6h16v-6"/></svg>
              ${p.baths} Bath</span>` : ''}
            ${p.sqft ? `<span class="property-card__feature">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              ${p.sqft} ft²</span>` : ''}
          </div>
          <div class="property-card__cta">View Property →</div>
        </div>
      </a>
    `;
  }

  function initReveal() {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.08 }
    );
    grid.querySelectorAll('.property-card.reveal').forEach(el => obs.observe(el));
  }

  function _marketLabel(k) {
    return { cayman: 'Cayman Islands', bahamas: 'Bahamas', jamaica: 'Jamaica' }[k] || k;
  }

})();
