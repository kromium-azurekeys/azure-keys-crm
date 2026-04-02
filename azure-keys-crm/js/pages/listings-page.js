/* ============================================================
   LISTINGS PAGE — js/pages/listings-page.js
   Fetches all properties from Supabase via PropertiesStore,
   applies filters/sort client-side, renders paginated grid.
============================================================ */

(async function () {

  // ── State ────────────────────────────────────────────────────
  const state = {
    all:      [],   // full unfiltered dataset
    filtered: [],   // after filters applied
    island:   'all',
    type:     'all',
    price:    'all',
    sort:     'featured',
    page:     1,
    perPage:  9,
  };

  const grid      = document.getElementById('listingsPageGrid');
  const skeleton  = document.getElementById('listingsSkeleton');
  const emptyEl   = document.getElementById('listingsEmpty');
  const countEl   = document.getElementById('resultsCount');
  const totalEl   = document.getElementById('listingsCount');

  // ── 1. Check URL params for pre-filters (e.g. ?island=cayman) ─
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('island')) state.island = urlParams.get('island');

  // ── 2. Load data ─────────────────────────────────────────────
  const properties = await window.PropertiesStore.getAll();
  state.all = properties;
  if (totalEl) totalEl.textContent = properties.length;

  // Pre-select island tab from URL param
  if (state.island !== 'all') {
    document.querySelectorAll('.filter-pill[data-filter="island"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.island);
      btn.setAttribute('aria-selected', btn.dataset.value === state.island ? 'true' : 'false');
    });
  }

  applyFiltersAndRender();
  hideSkeleton();

  // ── 3. Filter pill clicks ─────────────────────────────────────
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      const value  = btn.dataset.value;

      if (filter === 'island') {
        document.querySelectorAll('.filter-pill[data-filter="island"]').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.island = value;
      }

      state.page = 1;
      applyFiltersAndRender();
    });
  });

  // ── 4. Select filters ─────────────────────────────────────────
  document.getElementById('filterType')?.addEventListener('change', e => {
    state.type = e.target.value;
    state.page = 1;
    applyFiltersAndRender();
  });

  document.getElementById('filterPrice')?.addEventListener('change', e => {
    state.price = e.target.value;
    state.page = 1;
    applyFiltersAndRender();
  });

  document.getElementById('filterSort')?.addEventListener('change', e => {
    state.sort = e.target.value;
    state.page = 1;
    applyFiltersAndRender();
  });

  // Clear all filters
  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
    state.island = 'all';
    state.type   = 'all';
    state.price  = 'all';
    state.sort   = 'featured';
    state.page   = 1;

    document.querySelectorAll('.filter-pill').forEach(b => {
      const isAll = b.dataset.value === 'all';
      b.classList.toggle('active', isAll);
      b.setAttribute('aria-selected', isAll ? 'true' : 'false');
    });
    document.getElementById('filterType').value  = 'all';
    document.getElementById('filterPrice').value = 'all';
    document.getElementById('filterSort').value  = 'featured';

    applyFiltersAndRender();
  });

  // ── 5. Core filter + sort + render ───────────────────────────
  function applyFiltersAndRender() {
    let results = [...state.all];

    // Island
    if (state.island !== 'all') {
      results = results.filter(p => p.market === state.island);
    }

    // Type
    if (state.type !== 'all') {
      results = results.filter(p => {
        const t = (p.type || '').toLowerCase();
        if (state.type === 'condo') return t === 'apartment' || t === 'condo';
        return t === state.type;
      });
    }

    // Price
    if (state.price !== 'all') {
      results = results.filter(p => {
        const pr = p.priceRaw || 0;
        if (state.price === '0-2m')   return pr < 2000000;
        if (state.price === '2m-5m')  return pr >= 2000000 && pr < 5000000;
        if (state.price === '5m-10m') return pr >= 5000000 && pr < 10000000;
        if (state.price === '10m+')   return pr >= 10000000;
        return true;
      });
    }

    // Sort
    results.sort((a, b) => {
      if (state.sort === 'featured')   return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      if (state.sort === 'price-asc')  return (a.priceRaw || 0) - (b.priceRaw || 0);
      if (state.sort === 'price-desc') return (b.priceRaw || 0) - (a.priceRaw || 0);
      if (state.sort === 'newest')     return (b.daysOnMarket || 999) - (a.daysOnMarket || 999);
      if (state.sort === 'beds-desc')  return (b.beds || 0) - (a.beds || 0);
      return 0;
    });

    state.filtered = results;
    if (countEl) countEl.textContent = results.length;

    renderGrid();
    renderPagination();
  }

  function renderGrid() {
    const start = (state.page - 1) * state.perPage;
    const page  = state.filtered.slice(start, start + state.perPage);

    if (state.filtered.length === 0) {
      grid.style.display   = 'none';
      emptyEl.style.display = 'flex';
      document.getElementById('paginationEl')?.remove();
      return;
    }

    emptyEl.style.display = 'none';
    grid.style.display    = 'grid';

    grid.innerHTML = page.map(buildCard).join('');

    // Scroll to top of grid on page change
    if (state.page > 1) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function buildCard(p) {
    const badge = p.badge
      ? `<span class="property-card__badge">${p.badge}</span>`
      : '';
    const statusPill = p.status === 'under_contract'
      ? `<span class="property-card__badge property-card__badge--status">Under Offer</span>`
      : '';

    return `
      <a href="properties/property.html?id=${p.id}" class="property-card reveal" style="text-decoration:none;">
        <div class="property-card__image-wrap">
          <img src="${p.image}" alt="${p.alt}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=75'" />
          ${badge}${statusPill}
          <span class="property-card__market">${_marketLabel(p.market)}</span>
        </div>
        <div class="property-card__body">
          <p class="property-card__price">${p.price}</p>
          <h2 class="property-card__name">${p.name}</h2>
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

  function renderPagination() {
    const existing = document.getElementById('paginationEl');
    if (existing) existing.remove();

    const totalPages = Math.ceil(state.filtered.length / state.perPage);
    if (totalPages <= 1) return;

    const pag = document.createElement('div');
    pag.id = 'paginationEl';
    pag.className = 'listings-pagination';

    let html = '';
    if (state.page > 1) {
      html += `<button class="pag-btn pag-btn--prev" data-page="${state.page - 1}">← Prev</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - state.page) <= 1) {
        html += `<button class="pag-btn${i === state.page ? ' active' : ''}" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - state.page) === 2) {
        html += `<span class="pag-ellipsis">…</span>`;
      }
    }

    if (state.page < totalPages) {
      html += `<button class="pag-btn pag-btn--next" data-page="${state.page + 1}">Next →</button>`;
    }

    pag.innerHTML = html;
    document.querySelector('.listings-main .container').appendChild(pag);

    pag.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.page = +btn.dataset.page;
        renderGrid();
        renderPagination();
      });
    });
  }

  function hideSkeleton() {
    if (skeleton) skeleton.style.display = 'none';
  }

  function _marketLabel(k) {
    return { cayman: 'Cayman Islands', bahamas: 'Bahamas', jamaica: 'Jamaica' }[k] || k;
  }

  // Scroll reveal for cards
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }),
    { threshold: 0.08 }
  );
  new MutationObserver(() => {
    document.querySelectorAll('.property-card.reveal:not(.visible)').forEach(el => obs.observe(el));
  }).observe(grid, { childList: true });

})();
