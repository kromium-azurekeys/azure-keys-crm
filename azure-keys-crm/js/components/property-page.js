/* ============================================================
   COMPONENT — PROPERTY PAGE
   Reads ?id= from URL, fetches from Supabase via PropertiesStore,
   falls back to static LISTINGS_DATA if offline.
============================================================ */

(async function () {

  // ── 1. Resolve property from URL ──────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const pid    = params.get('id');

  let prop = null;
  if (window.PropertiesStore) {
    prop = await window.PropertiesStore.getById(pid);
  } else {
    prop = (window.LISTINGS_DATA || []).find(p => p.id === pid) || null;
  }

  if (!prop) {
    document.body.innerHTML = '<div style="padding:8rem 2rem;text-align:center;font-family:serif;font-size:1.5rem;color:#9a8f80;">Property not found. <a href="../index.html" style="color:#c9a96e;">Return home →</a></div>';
    return;
  }

  // Update <title>
  document.title = `${prop.name} — Azure Keys`;

  // ── 2. Breadcrumb & meta ──────────────────────────────────────
  _set('propBreadcrumbName', prop.name);
  _set('sidebarMarket', _marketLabel(prop.market));
  _set('sidebarMarket', _marketLabel(prop.market));

  // Sidebar market label (in agent card)
  const sidebarMarketEl = document.getElementById('sidebarMarket');
  if (sidebarMarketEl) sidebarMarketEl.textContent = _marketLabel(prop.market);

  // Update agent phone by market
  const agentTel = document.querySelector('.prop-agent__tel');
  if (agentTel) {
    const phones = { cayman: '+1 (345) 123-4567', bahamas: '+1 (242) 123-4567', jamaica: '+1 (876) 123-4567' };
    agentTel.href = 'tel:' + (phones[prop.market] || '+18761234567');
  }

  // ── 3. Hero Gallery ──────────────────────────────────────────
  const galleryEl = document.getElementById('propGallery');
  if (galleryEl) {
    const imgs = (prop.gallery && prop.gallery.length) ? prop.gallery.slice(0, 4) : [prop.image];
    const count = imgs.length;

    // Apply grid class based on image count
    if (count >= 4) galleryEl.classList.add('gallery--4');
    else if (count === 3) galleryEl.classList.add('gallery--3');
    else if (count === 2) galleryEl.classList.add('gallery--2');

    galleryEl.innerHTML = imgs.map((src, i) => `
      <div class="gallery-thumb" data-index="${i}">
        <img
          src="${src}"
          alt=""
          loading="${i === 0 ? 'eager' : 'lazy'}"
          onerror="this.closest('.gallery-thumb').style.display='none'"
        />
      </div>
    `).join('');

    galleryEl.querySelectorAll('.gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => openGalleryModal(+thumb.dataset.index));
    });
  }

  // "View All Photos" button
  const galleryBtn = document.getElementById('galleryBtn');
  if (galleryBtn) galleryBtn.addEventListener('click', () => openGalleryModal(0));

  // ── 4. Gallery Modal ──────────────────────────────────────────
  const modal       = document.getElementById('galleryModal');
  const modalImg    = document.getElementById('galleryModalImg');
  const modalCtr    = document.getElementById('galleryModalCounter');
  const modalThumbs = document.getElementById('galleryModalThumbs');
  const modalClose  = document.getElementById('galleryModalClose');
  const modalPrev   = document.getElementById('galleryModalPrev');
  const modalNext   = document.getElementById('galleryModalNext');

  const allImgs = prop.gallery && prop.gallery.length ? prop.gallery : [prop.image];
  let modalIdx  = 0;

  // Render thumbnails
  if (modalThumbs) {
    modalThumbs.innerHTML = allImgs.map((src, i) => `
      <img src="${src}" alt="Photo ${i+1}" class="gallery-modal__thumb" data-index="${i}" loading="lazy" />
    `).join('');
    modalThumbs.querySelectorAll('.gallery-modal__thumb').forEach(t => {
      t.addEventListener('click', () => showModalImg(+t.dataset.index));
    });
  }

  function openGalleryModal(idx) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    showModalImg(idx);
  }

  function closeGalleryModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showModalImg(idx) {
    modalIdx = (idx + allImgs.length) % allImgs.length;
    if (modalImg) { modalImg.src = allImgs[modalIdx]; modalImg.alt = `${prop.name} — photo ${modalIdx + 1}`; }
    if (modalCtr) modalCtr.textContent = `${modalIdx + 1} / ${allImgs.length}`;
    modalThumbs && modalThumbs.querySelectorAll('.gallery-modal__thumb').forEach((t, i) => {
      t.classList.toggle('active', i === modalIdx);
    });
  }

  if (modalClose) modalClose.addEventListener('click', closeGalleryModal);
  if (modalPrev)  modalPrev.addEventListener('click', () => showModalImg(modalIdx - 1));
  if (modalNext)  modalNext.addEventListener('click', () => showModalImg(modalIdx + 1));
  if (modal)      modal.addEventListener('click', e => { if (e.target === modal) closeGalleryModal(); });

  document.addEventListener('keydown', e => {
    if (!modal || !modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeGalleryModal();
    if (e.key === 'ArrowLeft') showModalImg(modalIdx - 1);
    if (e.key === 'ArrowRight') showModalImg(modalIdx + 1);
  });

  // ── 5. Header ────────────────────────────────────────────────
  const badgeEl = document.getElementById('propBadge');
  if (badgeEl && prop.badge) { badgeEl.textContent = prop.badge; badgeEl.style.display = ''; }

  const marketEl = document.getElementById('propMarket');
  if (marketEl) marketEl.textContent = _marketLabel(prop.market);

  const mlsEl = document.getElementById('propMls');
  if (mlsEl) mlsEl.textContent = `MLS: ${prop.mls || '—'}`;

  _set('propTitle', prop.name);
  _set('propSubtitle', prop.subtitle || '');
  _set('propLocationText', prop.location);
  _set('propPrice', prop.price);
  _set('sidebarPrice', prop.price);

  // Enquire btn scroll
  const enquireBtn = document.getElementById('propEnquireBtn');
  if (enquireBtn) {
    enquireBtn.addEventListener('click', () => {
      document.getElementById('eq-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Share button
  const shareBtn = document.getElementById('propShareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: prop.name, url: window.location.href });
      } else {
        navigator.clipboard.writeText(window.location.href);
        shareBtn.title = 'Link copied!';
        setTimeout(() => shareBtn.title = 'Share', 2000);
      }
    });
  }

  // ── 6. Stats Strip ───────────────────────────────────────────
  const statsEl = document.getElementById('propStats');
  if (statsEl) {
    const stats = [
      { icon: bedIcon(),  value: prop.beds,         label: 'Bedrooms' },
      { icon: bathIcon(), value: prop.baths,         label: 'Bathrooms' },
      { icon: sizeIcon(), value: prop.sqft + ' ft²', label: 'Interior' },
      { icon: lotIcon(),  value: prop.lotSqft ? prop.lotSqft + ' ft²' : '—', label: 'Lot Size' },
      { icon: calIcon(),  value: prop.yearBuilt || '—', label: 'Year Built' },
    ];
    statsEl.innerHTML = stats.map(s => `
      <div class="prop-stat">
        <span class="prop-stat__icon">${s.icon}</span>
        <span class="prop-stat__value">${s.value}</span>
        <span class="prop-stat__label">${s.label}</span>
      </div>
    `).join('');
  }

  // ── 7. Description ───────────────────────────────────────────
  _set('propDescription', prop.description || '');

  // ── 8. Features & Amenities ──────────────────────────────────
  const featuresEl = document.getElementById('propFeaturesGrid');
  if (featuresEl) {
    const all = [...(prop.features || []), ...(prop.amenities || [])];
    featuresEl.innerHTML = all.map(f => `
      <div class="prop-feature-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        ${f}
      </div>
    `).join('');
  }

  // ── 9. Details Table ─────────────────────────────────────────
  const detailsEl = document.getElementById('propDetailsTable');
  if (detailsEl) {
    const rows = [
      ['Property Type', prop.type || '—'],
      ['Status', _capitalize(prop.status || 'Active')],
      ['MLS Number', prop.mls || '—'],
      ['Bedrooms', prop.beds],
      ['Bathrooms', prop.baths],
      ['Interior Size', prop.sqft ? prop.sqft + ' sq ft' : '—'],
      ['Lot Size', prop.lotSqft ? prop.lotSqft + ' sq ft' : '—'],
      ['Year Built', prop.yearBuilt || '—'],
      ['Island Market', _marketLabel(prop.market)],
      ['Listing Price', prop.price],
    ];
    detailsEl.innerHTML = rows.map(([label, val]) => `
      <div class="prop-detail-row">
        <div class="prop-detail-row__label">${label}</div>
        <div class="prop-detail-row__value">${val}</div>
      </div>
    `).join('');
  }

  // ── 10. Investment Snapshot ───────────────────────────────────
  const investEl = document.getElementById('propInvestGrid');
  if (investEl && prop.priceRaw) {
    const price       = prop.priceRaw;
    const annualYield = 0.08;                                    // 8% gross yield
    const annualRent  = Math.round(price * annualYield / 1000) * 1000;
    const weeklyRent  = Math.round(annualRent / 26 / 100) * 100; // 26 peak weeks
    const apprecVal   = Math.round(price * 1.10 / 1000) * 1000; // 10% appreciation

    investEl.innerHTML = `
      <div class="prop-invest-item">
        <div class="prop-invest-item__value">~$${_shortNum(weeklyRent)}</div>
        <div class="prop-invest-item__label">Est. Weekly Peak Rental</div>
      </div>
      <div class="prop-invest-item">
        <div class="prop-invest-item__value">8–12%</div>
        <div class="prop-invest-item__label">Gross Rental Yield</div>
      </div>
      <div class="prop-invest-item">
        <div class="prop-invest-item__value">~$${_shortNum(apprecVal)}</div>
        <div class="prop-invest-item__label">Projected Value (1yr)</div>
      </div>
    `;
  }

  // ── 11. Map placeholder ──────────────────────────────────────
  _set('propMapLabel', prop.location);

  // ── 12. Mortgage Calculator init ─────────────────────────────
  if (window.MortgageCalculator) {
    window.MortgageCalculator.init('calcEmbed', prop.priceRaw || 0);
  }

  // ── 13. Enquiry Form ─────────────────────────────────────────
  const enquiryForm    = document.getElementById('propEnquiryForm');
  const enquirySuccess = document.getElementById('propEnquirySuccess');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', async e => {
      e.preventDefault();
      const nameEl  = enquiryForm.querySelector('#eq-name');
      const emailEl = enquiryForm.querySelector('#eq-email');
      const phoneEl = enquiryForm.querySelector('#eq-phone');
      const msgEl   = enquiryForm.querySelector('#eq-message');

      let valid = true;
      if (!nameEl.value.trim()) { nameEl.classList.add('error'); valid = false; }
      if (!emailEl.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { emailEl.classList.add('error'); valid = false; }
      if (!valid) return;

      // Show success immediately — don't wait for network
      enquiryForm.style.display = 'none';
      if (enquirySuccess) enquirySuccess.style.display = 'flex';

      // Submit to Supabase in background
      if (window.EnquirySubmit) {
        window.EnquirySubmit.submitPropertyEnquiry({
          name:         nameEl.value.trim(),
          email:        emailEl.value.trim(),
          phone:        phoneEl ? phoneEl.value.trim() : '',
          message:      msgEl   ? msgEl.value.trim()   : '',
          propertyId:   prop.id,
          propertyName: prop.name,
          market:       prop.market,
        });
      }
    });
    enquiryForm.querySelectorAll('input,textarea').forEach(el => {
      el.addEventListener('input', () => el.classList.remove('error'));
    });
  }

  // ── 14. Related Properties ───────────────────────────────────
  const relatedEl = document.getElementById('relatedPropsGrid');
  if (relatedEl && window.LISTINGS_DATA) {
    const related = window.LISTINGS_DATA
      .filter(p => p.id !== pid && p.market === prop.market)
      .slice(0, 3);
    const fallback = related.length < 3
      ? window.LISTINGS_DATA.filter(p => p.id !== pid).slice(0, 3 - related.length)
      : [];

    [...related, ...fallback].forEach(p => {
      const card = document.createElement('a');
      card.href = `property.html?id=${p.id}`;
      card.className = 'property-card';
      card.innerHTML = `
        <div class="property-card__image-wrap">
          <img src="${p.image}" alt="${p.alt}" loading="lazy" />
          ${p.badge ? `<span class="property-card__badge">${p.badge}</span>` : ''}
          <span class="property-card__market">${_marketLabel(p.market)}</span>
        </div>
        <div class="property-card__body">
          <p class="property-card__price">${p.price}</p>
          <h3 class="property-card__name">${p.name}</h3>
          <p class="property-card__location">${p.location}</p>
          <div class="property-card__features">
            <span class="property-card__feature">${bedIcon(12)} ${p.beds} Bed</span>
            <span class="property-card__feature">${bathIcon(12)} ${p.baths} Bath</span>
            <span class="property-card__feature">${sizeIcon(12)} ${p.sqft} ft²</span>
          </div>
        </div>
      `;
      relatedEl.appendChild(card);
    });
  }

  // Nav scroll behaviour
  const nav = document.getElementById('mainNav');
  if (nav) {
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }

  // Mobile drawer (reuse from nav.js — already loaded)

  // ── Helpers ──────────────────────────────────────────────────
  function _set(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function _marketLabel(k) {
    return { cayman: 'Cayman Islands', bahamas: 'Bahamas', jamaica: 'Jamaica' }[k] || k;
  }

  function _capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function _shortNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000)    return Math.round(n / 1000) + 'K';
    return n;
  }

  function bedIcon(s = 14) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9v11h7v-7h4v7h7V9L12 3z"/></svg>`; }
  function bathIcon(s = 14) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M4 12a8 8 0 0 1 16 0M4 12v6h16v-6"/></svg>`; }
  function sizeIcon(s = 14) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`; }
  function lotIcon(s = 14)  { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>`; }
  function calIcon(s = 14)  { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`; }

})();
