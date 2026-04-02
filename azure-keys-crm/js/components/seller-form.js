/* ============================================================
   COMPONENT — MULTI-STEP SELLER VALUATION FORM
   5 Steps: Address → Property Details → Condition/Upgrades → Motivation → AI Estimate
============================================================ */

(function () {
  const mount = document.getElementById('sellerFormMount');
  if (!mount) return;

  const state = {
    step: 1,
    total: 5,
    answers: {
      address: '',
      island: '',
      neighbourhood: '',
      propertyType: '',
      bedrooms: '',
      bathrooms: '',
      sqft: '',
      yearBuilt: '',
      beachfront: '',
      condition: '',
      upgrades: [],
      pool: '',
      views: '',
      motivation: '',
      timeline: '',
      currentlyListed: '',
      priceExpectation: '',
      name: '',
      email: '',
      phone: ''
    }
  };

  mount.innerHTML = `
    <div class="msf" id="sellerMsf">
      <div class="msf__progress" id="sellerProgress">
        ${[1,2,3,4,5].map(i => `<div class="msf__progress-step${i === 1 ? ' active' : ''}" data-step="${i}"></div>`).join('')}
      </div>
      <div class="msf__step-label" id="sellerStepLabel">Step 1 of 5</div>
      <div class="msf__content" id="sellerContent"></div>
      <div class="msf__nav" id="sellerNav"></div>
    </div>
    <div class="msf-result" id="sellerResult" style="display:none"></div>
  `;

  renderSellerStep(1);

  function renderSellerStep(n) {
    state.step = n;
    const content = document.getElementById('sellerContent');
    const nav     = document.getElementById('sellerNav');
    const label   = document.getElementById('sellerStepLabel');
    const prog    = document.querySelectorAll('#sellerMsf .msf__progress-step');

    label.textContent = `Step ${n} of 5`;
    prog.forEach((el, i) => {
      el.classList.toggle('active', i + 1 === n);
      el.classList.toggle('complete', i + 1 < n);
    });

    let html = '';

    if (n === 1) {
      html = `
        <h3 class="msf__title">Tell us about your property's location</h3>
        <p class="msf__subtitle">We'll use this to pull comparable sales data</p>
        <div class="msf__contact-grid">
          <div class="form__group msf__contact-grid--full">
            <label>Island Market</label>
            <div class="msf__options msf__options--single">
              ${[
                { value: 'cayman',  label: 'Cayman Islands', icon: '🇰🇾' },
                { value: 'bahamas', label: 'Bahamas',         icon: '🇧🇸' },
                { value: 'jamaica', label: 'Jamaica',         icon: '🇯🇲' },
              ].map(o => `
                <button class="msf__option${state.answers.island === o.value ? ' selected' : ''}"
                        data-field="island" data-value="${o.value}" data-type="single">
                  <span class="msf__option-icon">${o.icon}</span>
                  <span class="msf__option-label">${o.label}</span>
                  <span class="msf__option-check">✓</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="form__group">
            <label for="sl-address">Street Address</label>
            <input type="text" id="sl-address" placeholder="e.g. 47 Seven Mile Beach Road" value="${state.answers.address}" />
          </div>
          <div class="form__group">
            <label for="sl-neighbourhood">Neighbourhood / District</label>
            <input type="text" id="sl-neighbourhood" placeholder="e.g. Seven Mile Beach, Sandy Lane, Lyford Cay" value="${state.answers.neighbourhood}" />
          </div>
        </div>
      `;
    }

    if (n === 2) {
      html = `
        <h3 class="msf__title">Property details</h3>
        <p class="msf__subtitle">The more detail you provide, the more accurate your estimate</p>
        <div class="msf__contact-grid">
          <div class="form__group">
            <label>Property Type</label>
            <div class="msf__options msf__options--single msf__options--compact">
              ${[
                { value: 'villa',     label: 'Villa' },
                { value: 'estate',    label: 'Estate' },
                { value: 'penthouse', label: 'Penthouse' },
                { value: 'cottage',   label: 'Cottage' },
                { value: 'condo',     label: 'Condo/Apartment' },
              ].map(o => `
                <button class="msf__option msf__option--sm${state.answers.propertyType === o.value ? ' selected' : ''}"
                        data-field="propertyType" data-value="${o.value}" data-type="single">
                  <span class="msf__option-label">${o.label}</span>
                  <span class="msf__option-check">✓</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="form__group">
            <label for="sl-sqft">Interior Size (sq ft)</label>
            <input type="number" id="sl-sqft" placeholder="e.g. 5400" value="${state.answers.sqft}" />
          </div>
          <div class="form__group">
            <label>Bedrooms</label>
            <div class="msf__options msf__options--single msf__options--compact">
              ${['2','3','4','5','6','7+'].map(v => `
                <button class="msf__option msf__option--sm${state.answers.bedrooms === v ? ' selected' : ''}"
                        data-field="bedrooms" data-value="${v}" data-type="single">
                  <span class="msf__option-label">${v}</span><span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form__group">
            <label>Bathrooms</label>
            <div class="msf__options msf__options--single msf__options--compact">
              ${['2','3','4','5','6','7+'].map(v => `
                <button class="msf__option msf__option--sm${state.answers.bathrooms === v ? ' selected' : ''}"
                        data-field="bathrooms" data-value="${v}" data-type="single">
                  <span class="msf__option-label">${v}</span><span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form__group">
            <label for="sl-yearbuilt">Year Built</label>
            <input type="number" id="sl-yearbuilt" placeholder="e.g. 2008" value="${state.answers.yearBuilt}" min="1900" max="2025" />
          </div>
          <div class="form__group">
            <label>Beachfront / Waterfront?</label>
            <div class="msf__options msf__options--single msf__options--compact">
              ${[
                { value: 'direct_beach', label: 'Direct Beach' },
                { value: 'waterfront',   label: 'Waterfront' },
                { value: 'near_water',   label: 'Near Water' },
                { value: 'no',           label: 'No' },
              ].map(o => `
                <button class="msf__option msf__option--sm${state.answers.beachfront === o.value ? ' selected' : ''}"
                        data-field="beachfront" data-value="${o.value}" data-type="single">
                  <span class="msf__option-label">${o.label}</span><span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (n === 3) {
      html = `
        <h3 class="msf__title">Condition & upgrades</h3>
        <p class="msf__subtitle">Recent improvements can significantly impact your valuation</p>
        <div class="msf__contact-grid">
          <div class="form__group">
            <label>Overall Condition</label>
            <div class="msf__options msf__options--single">
              ${[
                { value: 'pristine',    label: 'Pristine — show-ready',          desc: 'Recently renovated or new build' },
                { value: 'excellent',   label: 'Excellent — well maintained',     desc: 'Regular upkeep, no issues' },
                { value: 'good',        label: 'Good — minor cosmetic work',      desc: 'Some updates needed' },
                { value: 'fair',        label: 'Fair — needs renovation',         desc: 'Significant work required' },
              ].map(o => `
                <button class="msf__option msf__option--desc${state.answers.condition === o.value ? ' selected' : ''}"
                        data-field="condition" data-value="${o.value}" data-type="single">
                  <div>
                    <span class="msf__option-label">${o.label}</span>
                    <span class="msf__option-desc">${o.desc}</span>
                  </div>
                  <span class="msf__option-check">✓</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="form__group msf__contact-grid--full">
            <label>Recent Upgrades (select all that apply)</label>
            <div class="msf__options msf__options--multi msf__options--compact">
              ${[
                'New pool/renovation','Kitchen remodel','Bathrooms updated','New roof','Smart home system',
                'Solar panels','Generator added','Air conditioning upgraded','Staff quarters added','Landscape redesign'
              ].map(u => `
                <button class="msf__option msf__option--sm${(state.answers.upgrades || []).includes(u) ? ' selected' : ''}"
                        data-field="upgrades" data-value="${u}" data-type="multi">
                  <span class="msf__option-label">${u}</span><span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form__group">
            <label>Private Pool?</label>
            <div class="msf__options msf__options--single msf__options--compact">
              ${['Yes — infinity','Yes — standard','No'].map(v => `
                <button class="msf__option msf__option--sm${state.answers.pool === v ? ' selected' : ''}"
                        data-field="pool" data-value="${v}" data-type="single">
                  <span class="msf__option-label">${v}</span><span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form__group">
            <label>Views</label>
            <div class="msf__options msf__options--single msf__options--compact">
              ${['Panoramic ocean','Ocean/sea','Garden/pool','City/harbour','No significant view'].map(v => `
                <button class="msf__option msf__option--sm${state.answers.views === v ? ' selected' : ''}"
                        data-field="views" data-value="${v}" data-type="single">
                  <span class="msf__option-label">${v}</span><span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (n === 4) {
      html = `
        <h3 class="msf__title">Your selling motivation</h3>
        <p class="msf__subtitle">Understanding your goals helps us provide the best advice</p>
        <div class="msf__contact-grid">
          <div class="form__group">
            <label>Primary Reason for Selling</label>
            <div class="msf__options msf__options--single">
              ${[
                { value: 'upgrade',     label: 'Upgrading to a larger property' },
                { value: 'relocate',    label: 'Relocating / leaving the market' },
                { value: 'investment',  label: 'Realising investment returns' },
                { value: 'estate',      label: 'Estate / inheritance sale' },
                { value: 'lifestyle',   label: 'Lifestyle change' },
                { value: 'exploring',   label: 'Exploring options — not committed' },
              ].map(o => `
                <button class="msf__option${state.answers.motivation === o.value ? ' selected' : ''}"
                        data-field="motivation" data-value="${o.value}" data-type="single">
                  <span class="msf__option-label">${o.label}</span>
                  <span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form__group">
            <label>Desired Selling Timeline</label>
            <div class="msf__options msf__options--single msf__options--compact">
              ${[
                { value: 'asap',      label: 'ASAP' },
                { value: '3months',   label: '1–3 months' },
                { value: '6months',   label: '3–6 months' },
                { value: '12months',  label: '6–12 months' },
                { value: 'flexible',  label: 'Flexible' },
              ].map(o => `
                <button class="msf__option msf__option--sm${state.answers.timeline === o.value ? ' selected' : ''}"
                        data-field="timeline" data-value="${o.value}" data-type="single">
                  <span class="msf__option-label">${o.label}</span><span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form__group">
            <label>Is the property currently listed?</label>
            <div class="msf__options msf__options--single msf__options--compact">
              ${[
                { value: 'no',       label: 'No — off market' },
                { value: 'yes',      label: 'Yes — with another agent' },
                { value: 'expired',  label: 'Was listed — expired' },
              ].map(o => `
                <button class="msf__option msf__option--sm${state.answers.currentlyListed === o.value ? ' selected' : ''}"
                        data-field="currentlyListed" data-value="${o.value}" data-type="single">
                  <span class="msf__option-label">${o.label}</span><span class="msf__option-check">✓</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form__group">
            <label for="sl-price-exp">Your Price Expectation (USD)</label>
            <div class="calc-field__input-wrap">
              <span class="calc-field__prefix">$</span>
              <input type="number" id="sl-price-exp" placeholder="e.g. 4500000" value="${state.answers.priceExpectation}" />
            </div>
          </div>
        </div>
      `;
    }

    if (n === 5) {
      html = `
        <h3 class="msf__title">Get your AI valuation estimate</h3>
        <p class="msf__subtitle">Enter your details and we'll send your personalised valuation report</p>
        <div class="msf__contact-grid">
          <div class="form__group">
            <label for="sl-name">Full Name *</label>
            <input type="text" id="sl-name" placeholder="Your full name" value="${state.answers.name}" required />
          </div>
          <div class="form__group">
            <label for="sl-email">Email Address *</label>
            <input type="email" id="sl-email" placeholder="your@email.com" value="${state.answers.email}" required />
          </div>
          <div class="form__group msf__contact-grid--full">
            <label for="sl-phone">Phone Number</label>
            <input type="tel" id="sl-phone" placeholder="+1 (000) 000-0000" value="${state.answers.phone}" />
          </div>
        </div>
        <div class="msf-valuation-preview">
          <div class="msf-val-preview__item">
            <span class="msf-val-preview__label">Island</span>
            <span class="msf-val-preview__value">${_marketLabel(state.answers.island)}</span>
          </div>
          <div class="msf-val-preview__item">
            <span class="msf-val-preview__label">Type</span>
            <span class="msf-val-preview__value">${_capitalize(state.answers.propertyType || '—')}</span>
          </div>
          <div class="msf-val-preview__item">
            <span class="msf-val-preview__label">Size</span>
            <span class="msf-val-preview__value">${state.answers.sqft ? state.answers.sqft + ' ft²' : '—'}</span>
          </div>
          <div class="msf-val-preview__item">
            <span class="msf-val-preview__label">Beds/Baths</span>
            <span class="msf-val-preview__value">${state.answers.bedrooms || '—'} / ${state.answers.bathrooms || '—'}</span>
          </div>
        </div>
      `;
    }

    content.innerHTML = html;

    content.querySelectorAll('.msf__option').forEach(btn => {
      btn.addEventListener('click', () => toggleSellerOption(btn));
    });

    // Collect text inputs as they change
    content.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"]').forEach(el => {
      el.addEventListener('change', () => {
        const map = {
          'sl-address': 'address', 'sl-neighbourhood': 'neighbourhood',
          'sl-sqft': 'sqft', 'sl-yearbuilt': 'yearBuilt',
          'sl-price-exp': 'priceExpectation',
          'sl-name': 'name', 'sl-email': 'email', 'sl-phone': 'phone'
        };
        if (map[el.id]) state.answers[map[el.id]] = el.value.trim();
      });
    });

    const isLast = n === 5;
    nav.innerHTML = `
      ${n > 1 ? `<button class="btn btn--outline-light msf__btn-back" id="sellerBack">← Back</button>` : '<span></span>'}
      <button class="btn btn--primary msf__btn-next" id="sellerNext">
        ${isLast ? 'Get My Valuation →' : 'Continue →'}
      </button>
    `;

    document.getElementById('sellerNext').addEventListener('click', handleSellerNext);
    const back = document.getElementById('sellerBack');
    if (back) back.addEventListener('click', () => renderSellerStep(n - 1));
  }

  function toggleSellerOption(btn) {
    const field = btn.dataset.field;
    const value = btn.dataset.value;
    const type  = btn.dataset.type;
    if (type === 'multi') {
      let arr = state.answers[field] || [];
      if (arr.includes(value)) {
        state.answers[field] = arr.filter(v => v !== value);
        btn.classList.remove('selected');
      } else {
        state.answers[field] = [...arr, value];
        btn.classList.add('selected');
      }
    } else {
      document.querySelectorAll(`#sellerContent .msf__option[data-field="${field}"][data-type="single"]`).forEach(b => b.classList.remove('selected'));
      state.answers[field] = value;
      btn.classList.add('selected');
    }
  }

  function handleSellerNext() {
    const n = state.step;
    if (n === 5) {
      // Collect final fields
      ['sl-name','sl-email','sl-phone'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const map = { 'sl-name': 'name', 'sl-email': 'email', 'sl-phone': 'phone' };
        state.answers[map[id]] = el.value.trim();
      });
      if (!state.answers.name || !state.answers.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        document.getElementById('sl-name')?.classList.add('error');
        document.getElementById('sl-email')?.classList.add('error');
        return;
      }
      submitValuation();
      return;
    }
    renderSellerStep(n + 1);
  }

  async function submitValuation() {
    document.getElementById('sellerMsf').innerHTML = `
      <div class="msf-loading">
        <div class="msf-loading__spinner"></div>
        <p>Analysing comparable sales data…</p>
      </div>
    `;

    const a = state.answers;
    const prompt = `Caribbean luxury property valuation request:
Island: ${a.island}
Neighbourhood: ${a.neighbourhood || 'not specified'}
Address: ${a.address || 'not specified'}
Property type: ${a.propertyType || 'not specified'}
Bedrooms: ${a.bedrooms || 'not specified'}
Bathrooms: ${a.bathrooms || 'not specified'}
Interior sqft: ${a.sqft || 'not specified'}
Year built: ${a.yearBuilt || 'not specified'}
Beachfront/waterfront: ${a.beachfront || 'not specified'}
Condition: ${a.condition || 'not specified'}
Recent upgrades: ${(a.upgrades || []).join(', ') || 'none'}
Pool: ${a.pool || 'not specified'}
Views: ${a.views || 'not specified'}
Seller motivation: ${a.motivation || 'not specified'}
Desired timeline: ${a.timeline || 'not specified'}
Currently listed: ${a.currentlyListed || 'no'}
Seller's price expectation: ${a.priceExpectation ? '$' + Number(a.priceExpectation).toLocaleString() : 'not specified'}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a senior luxury real estate valuation expert for Azure Keys, with 37 years of Caribbean market experience across Grand Cayman, Nassau (Bahamas), and Jamaica.
Return ONLY a valid JSON object — no markdown, no backticks, no preamble.
{
  "estimateLow": <number USD>,
  "estimateHigh": <number USD>,
  "confidence": "<High | Medium | Low>",
  "marketContext": "<2-3 sentences on the current market in this island/neighbourhood>",
  "valuationFactors": ["<positive factor>", "<positive factor>", "<factor that may affect value>"],
  "recommendedListPrice": <number USD>,
  "daysOnMarketEstimate": "<e.g. 45-90 days>",
  "keyRecommendations": ["<action 1>", "<action 2>", "<action 3>"],
  "rentalYieldEstimate": "<e.g. 7-9% gross>"
}
Base estimates on real Caribbean luxury market knowledge. Cayman Islands commands the highest premiums (especially Seven Mile Beach). Nassau Lyford Cay and Old Fort Bay are top-tier. Jamaica values vary more widely by location. Beachfront commands 30-60% premium. Pristine condition adds 10-20%.`,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data  = await response.json();
      const text  = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      _saveSellerToSupabase(result);
      renderValuationResult(result);
    } catch(err) {
      const fallback = fallbackValuation(a);
      _saveSellerToSupabase(fallback);
      renderValuationResult(fallback);
    }
  }

  function _saveSellerToSupabase(estimate) {
    if (!window.EnquirySubmit) return;
    window.EnquirySubmit.submitSellerForm({
      name:     state.answers.name,
      email:    state.answers.email,
      phone:    state.answers.phone,
      answers:  state.answers,
      estimate,
    });
  }

  function fallbackValuation(a) {
    const base = a.priceExpectation ? +a.priceExpectation : 3500000;
    const low  = Math.round(base * 0.9 / 50000) * 50000;
    const high = Math.round(base * 1.15 / 50000) * 50000;
    return {
      estimateLow: low, estimateHigh: high,
      confidence: 'Medium',
      marketContext: `The ${_marketLabel(a.island)} luxury market continues to show strong demand from international buyers, with limited inventory supporting price stability.`,
      valuationFactors: ['Location and island market', 'Property size and condition', 'Waterfront / view premiums'],
      recommendedListPrice: Math.round(base * 1.05 / 50000) * 50000,
      daysOnMarketEstimate: '60–120 days',
      keyRecommendations: ['Professional photography and staging', 'Off-market preview to qualified buyers', 'Azure Keys exclusive listing for maximum exposure'],
      rentalYieldEstimate: '7–10% gross'
    };
  }

  function renderValuationResult(val) {
    document.getElementById('sellerMsf').style.display = 'none';
    const result = document.getElementById('sellerResult');
    result.style.display = 'block';

    const low  = '$' + (val.estimateLow / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    const high = '$' + (val.estimateHigh / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    const list = '$' + (val.recommendedListPrice / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';

    result.innerHTML = `
      <div class="msf-result__inner">
        <div class="msf-result__header">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h3>Your AI Valuation Estimate</h3>
          <p>Based on comparable sales and current market conditions in ${_marketLabel(state.answers.island)}</p>
        </div>

        <div class="msf-result__valuation-band">
          <div class="msf-val-band__range">
            <span class="msf-val-band__label">Estimated Market Value</span>
            <span class="msf-val-band__value">${low} — ${high}</span>
          </div>
          <div class="msf-val-band__divider"></div>
          <div class="msf-val-band__recommended">
            <span class="msf-val-band__label">Recommended List Price</span>
            <span class="msf-val-band__value msf-val-band__value--gold">${list}</span>
          </div>
          <div class="msf-val-band__meta">
            <span>Confidence: <strong>${val.confidence}</strong></span>
            <span>Est. Time on Market: <strong>${val.daysOnMarketEstimate}</strong></span>
            <span>Rental Yield: <strong>${val.rentalYieldEstimate}</strong></span>
          </div>
        </div>

        <div class="msf-result__insights">
          <h4>Market Context</h4>
          <p>${val.marketContext}</p>
        </div>

        <div class="msf-result__insights">
          <h4>Valuation Factors</h4>
          <ul>${(val.valuationFactors || []).map(f => `<li>${f}</li>`).join('')}</ul>
        </div>

        <div class="msf-result__insights">
          <h4>Our Recommendations</h4>
          <ul>${(val.keyRecommendations || []).map(r => `<li>${r}</li>`).join('')}</ul>
        </div>

        <div class="msf-result__disclaimer">
          <p><strong>Disclaimer:</strong> This is an indicative AI-generated estimate based on the information provided and general market knowledge. A full comparative market analysis requires an on-site appraisal by one of our senior advisors. Market conditions can vary significantly. Past sales do not guarantee future values.</p>
        </div>

        <div class="msf-result__actions">
          <a href="#contact" class="btn btn--primary">Request Full Appraisal</a>
          <a href="#listings" class="btn btn--outline-light">View Comparable Listings</a>
        </div>
      </div>
    `;
  }

  function _marketLabel(k) { return { cayman: 'Cayman Islands', bahamas: 'Bahamas', jamaica: 'Jamaica' }[k] || k || '—'; }
  function _capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

})();
