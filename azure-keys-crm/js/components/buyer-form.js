/* ============================================================
   COMPONENT — MULTI-STEP BUYER LEAD CAPTURE FORM
   5 Steps: Property Type → Preferences → Features → Timeline → Contact
   AI scoring via Claude API on final step
============================================================ */

(function () {
  const mount = document.getElementById('buyerFormMount');
  if (!mount) return;

  // ── State ──────────────────────────────────────────────────
  const state = {
    step: 1,
    total: 5,
    answers: {
      propertyType: [],
      markets: [],
      budget: '',
      bedrooms: '',
      features: [],
      timeline: '',
      readiness: '',
      preApproved: '',
      name: '',
      email: '',
      phone: '',
      message: ''
    }
  };

  // ── Step Definitions ──────────────────────────────────────
  const steps = [
    {
      id: 1,
      title: "What type of property are you seeking?",
      subtitle: "Select all that apply",
      type: 'multi',
      field: 'propertyType',
      options: [
        { value: 'villa',       label: 'Luxury Villa',          icon: '🏡' },
        { value: 'estate',      label: 'Private Estate',        icon: '🏰' },
        { value: 'penthouse',   label: 'Penthouse',             icon: '🏙️' },
        { value: 'cottage',     label: 'Beach Cottage',         icon: '🌴' },
        { value: 'investment',  label: 'Investment Property',   icon: '📈' },
        { value: 'resort',      label: 'Resort Residence',      icon: '🌊' },
      ]
    },
    {
      id: 2,
      title: "Which island markets interest you?",
      subtitle: "Select all that apply",
      type: 'multi',
      field: 'markets',
      options: [
        { value: 'cayman',  label: 'Cayman Islands', icon: '🇰🇾' },
        { value: 'bahamas', label: 'Bahamas',         icon: '🇧🇸' },
        { value: 'jamaica', label: 'Jamaica',         icon: '🇯🇲' },
        { value: 'open',    label: 'Open to All',     icon: '🌎' },
      ],
      extras: [
        { type: 'select', field: 'budget', label: 'Budget Range (USD)', options: [
          { value: '',         label: 'Select your budget…' },
          { value: '1m-3m',    label: '$1M – $3M' },
          { value: '3m-5m',    label: '$3M – $5M' },
          { value: '5m-10m',   label: '$5M – $10M' },
          { value: '10m-20m',  label: '$10M – $20M' },
          { value: '20m+',     label: '$20M+' },
        ]},
        { type: 'select', field: 'bedrooms', label: 'Minimum Bedrooms', options: [
          { value: '',   label: 'Select…' },
          { value: '2',  label: '2+' },
          { value: '3',  label: '3+' },
          { value: '4',  label: '4+' },
          { value: '5',  label: '5+' },
          { value: '7',  label: '7+' },
        ]},
      ]
    },
    {
      id: 3,
      title: "Which features are most important to you?",
      subtitle: "Choose up to 6",
      type: 'multi',
      field: 'features',
      maxSelect: 6,
      options: [
        { value: 'beachfront',   label: 'Beachfront / Waterfront' },
        { value: 'pool',         label: 'Private Pool' },
        { value: 'privacy',      label: 'Complete Privacy' },
        { value: 'staff',        label: 'Staff Quarters' },
        { value: 'dock',         label: 'Boat Dock / Marina Access' },
        { value: 'tennis',       label: 'Tennis Court' },
        { value: 'cinema',       label: 'Home Cinema' },
        { value: 'smart',        label: 'Smart Home' },
        { value: 'gym',          label: 'Private Gym' },
        { value: 'helipad',      label: 'Helipad' },
        { value: 'rental',       label: 'Rental Income Potential' },
        { value: 'cbi',          label: 'CBI/Residency Eligible' },
      ]
    },
    {
      id: 4,
      title: "What is your purchasing timeline?",
      subtitle: "This helps us prioritise your search",
      type: 'single',
      field: 'timeline',
      options: [
        { value: 'immediate',  label: 'Immediately — ready to move' },
        { value: '3months',    label: 'Within 3 months' },
        { value: '6months',    label: 'Within 6 months' },
        { value: '12months',   label: 'Within 12 months' },
        { value: 'exploring',  label: 'Exploring options — no firm timeline' },
      ],
      extras: [
        { type: 'single', field: 'readiness', label: 'Have you purchased Caribbean real estate before?', options: [
          { value: 'yes',     label: 'Yes — experienced buyer' },
          { value: 'no',      label: 'No — first Caribbean purchase' },
          { value: 'looking', label: 'Currently searching' },
        ]},
        { type: 'single', field: 'preApproved', label: 'Are you pre-approved / self-funded?', options: [
          { value: 'cash',       label: 'Cash buyer' },
          { value: 'approved',   label: 'Pre-approved mortgage' },
          { value: 'exploring',  label: 'Exploring financing' },
        ]},
      ]
    },
    {
      id: 5,
      title: "Almost done — tell us how to reach you",
      subtitle: "Your details are handled in complete confidence",
      type: 'contact',
    }
  ];

  // ── Render shell ───────────────────────────────────────────
  mount.innerHTML = `
    <div class="msf" id="buyerMsf">
      <div class="msf__progress" id="msfProgress">
        ${steps.map((s, i) => `<div class="msf__progress-step${i === 0 ? ' active' : ''}" data-step="${s.id}"></div>`).join('')}
      </div>
      <div class="msf__step-label" id="msfStepLabel">Step 1 of 5</div>
      <div class="msf__content" id="msfContent"></div>
      <div class="msf__nav" id="msfNav"></div>
    </div>
    <div class="msf-result" id="buyerResult" style="display:none"></div>
  `;

  renderStep(1);

  // ── Render Step ────────────────────────────────────────────
  function renderStep(n) {
    state.step = n;
    const step = steps[n - 1];
    const content = document.getElementById('msfContent');
    const nav     = document.getElementById('msfNav');
    const label   = document.getElementById('msfStepLabel');
    const prog    = document.querySelectorAll('.msf__progress-step');

    label.textContent = `Step ${n} of ${state.total}`;

    prog.forEach((el, i) => {
      el.classList.toggle('active',    i + 1 === n);
      el.classList.toggle('complete',  i + 1 < n);
    });

    let html = `
      <h3 class="msf__title">${step.title}</h3>
      <p class="msf__subtitle">${step.subtitle || ''}</p>
    `;

    if (step.type === 'multi' || step.type === 'single') {
      const selected = state.answers[step.field] || (step.type === 'multi' ? [] : '');
      html += `<div class="msf__options msf__options--${step.type}" id="msfOptions">`;
      step.options.forEach(opt => {
        const isSel = step.type === 'multi'
          ? selected.includes(opt.value)
          : selected === opt.value;
        html += `
          <button class="msf__option${isSel ? ' selected' : ''}"
                  data-field="${step.field}"
                  data-value="${opt.value}"
                  data-type="${step.type}">
            ${opt.icon ? `<span class="msf__option-icon">${opt.icon}</span>` : ''}
            <span class="msf__option-label">${opt.label}</span>
            <span class="msf__option-check">✓</span>
          </button>
        `;
      });
      html += `</div>`;

      if (step.extras) {
        html += `<div class="msf__extras">`;
        step.extras.forEach(extra => {
          if (extra.type === 'select') {
            html += `
              <div class="form__group">
                <label>${extra.label}</label>
                <select id="extra-${extra.field}" data-field="${extra.field}">
                  ${extra.options.map(o => `<option value="${o.value}"${state.answers[extra.field] === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
                </select>
              </div>
            `;
          } else {
            const extSel = state.answers[extra.field] || '';
            html += `<p class="msf__extra-label">${extra.label}</p><div class="msf__options msf__options--single msf__options--compact">`;
            extra.options.forEach(opt => {
              html += `
                <button class="msf__option${extSel === opt.value ? ' selected' : ''} msf__option--sm"
                        data-field="${extra.field}"
                        data-value="${opt.value}"
                        data-type="single">
                  <span class="msf__option-label">${opt.label}</span>
                  <span class="msf__option-check">✓</span>
                </button>
              `;
            });
            html += `</div>`;
          }
        });
        html += `</div>`;
      }
    }

    if (step.type === 'contact') {
      html += `
        <div class="msf__contact-grid">
          <div class="form__group">
            <label for="msf-name">Full Name *</label>
            <input type="text" id="msf-name" placeholder="Your full name" value="${state.answers.name}" required />
          </div>
          <div class="form__group">
            <label for="msf-email">Email Address *</label>
            <input type="email" id="msf-email" placeholder="your@email.com" value="${state.answers.email}" required />
          </div>
          <div class="form__group">
            <label for="msf-phone">Phone Number</label>
            <input type="tel" id="msf-phone" placeholder="+1 (000) 000-0000" value="${state.answers.phone}" />
          </div>
          <div class="form__group msf__contact-grid--full">
            <label for="msf-message">Anything else we should know?</label>
            <textarea id="msf-message" rows="3" placeholder="Tell us more about your search…">${state.answers.message}</textarea>
          </div>
        </div>
      `;
    }

    content.innerHTML = html;

    // Bind option clicks
    content.querySelectorAll('.msf__option').forEach(btn => {
      btn.addEventListener('click', () => toggleOption(btn));
    });

    // Bind select extras
    content.querySelectorAll('select[data-field]').forEach(sel => {
      sel.addEventListener('change', () => { state.answers[sel.dataset.field] = sel.value; });
    });

    // Nav buttons
    const isLast = n === state.total;
    nav.innerHTML = `
      ${n > 1 ? `<button class="btn btn--outline-light msf__btn-back" id="msfBack">← Back</button>` : '<span></span>'}
      <button class="btn btn--primary msf__btn-next" id="msfNext">
        ${isLast ? 'Submit & Get Your Match →' : 'Continue →'}
      </button>
    `;

    document.getElementById('msfNext').addEventListener('click', handleNext);
    const backBtn = document.getElementById('msfBack');
    if (backBtn) backBtn.addEventListener('click', () => renderStep(n - 1));
  }

  function toggleOption(btn) {
    const field = btn.dataset.field;
    const value = btn.dataset.value;
    const type  = btn.dataset.type;

    if (type === 'multi') {
      let arr = state.answers[field] || [];
      const step = steps[state.step - 1];
      const max  = step && step.field === field && step.maxSelect ? step.maxSelect : 99;
      if (arr.includes(value)) {
        state.answers[field] = arr.filter(v => v !== value);
        btn.classList.remove('selected');
      } else {
        if (arr.length >= max) return;
        state.answers[field] = [...arr, value];
        btn.classList.add('selected');
      }
    } else {
      // single — deselect siblings in same field
      document.querySelectorAll(`.msf__option[data-field="${field}"][data-type="single"]`).forEach(b => b.classList.remove('selected'));
      state.answers[field] = value;
      btn.classList.add('selected');
    }
  }

  function handleNext() {
    const n = state.step;

    // Collect contact fields on last step
    if (n === state.total) {
      const nameEl  = document.getElementById('msf-name');
      const emailEl = document.getElementById('msf-email');
      const phoneEl = document.getElementById('msf-phone');
      const msgEl   = document.getElementById('msf-message');
      state.answers.name    = nameEl?.value.trim() || '';
      state.answers.email   = emailEl?.value.trim() || '';
      state.answers.phone   = phoneEl?.value.trim() || '';
      state.answers.message = msgEl?.value.trim() || '';

      if (!state.answers.name || !state.answers.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        if (nameEl && !state.answers.name) nameEl.classList.add('error');
        if (emailEl && !state.answers.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) emailEl.classList.add('error');
        return;
      }
      submitAndScore();
      return;
    }

    renderStep(n + 1);
  }

  // ── AI Scoring ──────────────────────────────────────────────
  async function submitAndScore() {
    const form   = document.getElementById('buyerMsf');
    const result = document.getElementById('buyerResult');

    form.innerHTML = `
      <div class="msf-loading">
        <div class="msf-loading__spinner"></div>
        <p>Analysing your preferences…</p>
      </div>
    `;

    const prompt = buildScoringPrompt(state.answers);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a luxury Caribbean real estate advisor for Azure Keys. 
Analyse buyer lead data and return ONLY a valid JSON object — no preamble, no markdown, no backticks.
JSON structure:
{
  "score": <number 0-100>,
  "tier": "<Premium | High | Qualified | Nurture>",
  "summary": "<2 sentence personalised summary of what this buyer is looking for>",
  "topMatches": ["<property name>", "<property name>", "<property name>"],
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "nextStep": "<recommended next action for this buyer>",
  "urgency": "<High | Medium | Low>"
}
Scoring guide:
- Score 80-100: Immediate buyer, cash/approved, clear brief, specific timeline
- Score 60-79: Motivated buyer, clear preferences, 3-6 month timeline  
- Score 40-59: Qualified prospect, longer timeline or exploring
- Score 0-39: Early stage, nurture required
Available listings: Horizon Cove (Cayman $12.5M estate), Coral Ridge Penthouse (Cayman $4.2M), Rum Point Villa (Cayman $3.75M), Seven Palms Estate (Cayman $7.9M), Lyford Cay Ocean Manor (Nassau $9.8M), Palmetto Point Estate (Nassau $4.75M), Harbour Island Cottage (Bahamas $2.2M), Ocean Walk Residence (Exuma $5.9M), Trident Point Manor (Jamaica $8.5M), Blue Lagoon Retreat (Jamaica $3.1M), Round Hill Villa (Jamaica $4.1M).`,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const scored = JSON.parse(clean);
      _saveToSupabase(scored);
      renderResult(scored);
    } catch (err) {
      const fallback = fallbackScore(state.answers);
      _saveToSupabase(fallback);
      renderResult(fallback);
    }
  }

  function _saveToSupabase(scored) {
    if (!window.EnquirySubmit) return;
    window.EnquirySubmit.submitBuyerForm({
      name:      state.answers.name,
      email:     state.answers.email,
      phone:     state.answers.phone,
      answers:   state.answers,
      score:     scored.score,
      tier:      scored.tier,
      topMatches: scored.topMatches,
    });
  }

  function buildScoringPrompt(a) {
    return `Buyer profile:
- Property types sought: ${(a.propertyType || []).join(', ') || 'not specified'}
- Island markets: ${(a.markets || []).join(', ') || 'not specified'}
- Budget range: ${a.budget || 'not specified'}
- Min bedrooms: ${a.bedrooms || 'not specified'}
- Key features: ${(a.features || []).join(', ') || 'not specified'}
- Purchase timeline: ${a.timeline || 'not specified'}
- Caribbean buying experience: ${a.readiness || 'not specified'}
- Financing status: ${a.preApproved || 'not specified'}
- Name: ${a.name}
- Additional notes: ${a.message || 'none'}`;
  }

  function fallbackScore(a) {
    let score = 30;
    if (a.preApproved === 'cash')     score += 25;
    if (a.preApproved === 'approved') score += 15;
    if (a.timeline === 'immediate')   score += 20;
    if (a.timeline === '3months')     score += 12;
    if (a.budget && a.budget !== '')  score += 10;
    if ((a.features || []).length > 3) score += 5;
    score = Math.min(score, 100);
    const tier = score >= 80 ? 'Premium' : score >= 60 ? 'High' : score >= 40 ? 'Qualified' : 'Nurture';
    return {
      score, tier,
      summary: `Thank you ${a.name}. Based on your preferences, our advisors will prepare a curated shortlist of matching properties.`,
      topMatches: ['Horizon Cove', 'Palmetto Point Estate', 'Blue Lagoon Retreat'],
      keyInsights: ['Preferences recorded', 'Shortlist being prepared', 'Advisor will follow up within 24 hours'],
      nextStep: 'A senior advisor will contact you within 24 hours with curated property matches.',
      urgency: score >= 70 ? 'High' : 'Medium'
    };
  }

  function renderResult(scored) {
    const form   = document.getElementById('buyerMsf');
    const result = document.getElementById('buyerResult');

    form.style.display = 'none';
    result.style.display = 'block';

    const tierColour = { Premium: '#c9a96e', High: '#8fbc8f', Qualified: '#6ea8c9', Nurture: '#9a9a9a' };
    const colour     = tierColour[scored.tier] || '#c9a96e';

    result.innerHTML = `
      <div class="msf-result__inner">
        <div class="msf-result__header">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <h3>Thank you, ${state.answers.name.split(' ')[0]}!</h3>
          <p>Your property brief has been received. Here's what we found.</p>
        </div>

        <div class="msf-result__score-card">
          <div class="msf-result__score-ring">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(201,169,110,0.15)" stroke-width="7"/>
              <circle cx="40" cy="40" r="34" fill="none" stroke="${colour}" stroke-width="7"
                stroke-dasharray="${2 * Math.PI * 34}"
                stroke-dashoffset="${2 * Math.PI * 34 * (1 - scored.score / 100)}"
                stroke-linecap="round"
                transform="rotate(-90 40 40)"/>
            </svg>
            <span class="msf-result__score-number">${scored.score}</span>
          </div>
          <div class="msf-result__score-info">
            <span class="msf-result__tier" style="background:${colour}20;color:${colour}">${scored.tier} Lead</span>
            <p class="msf-result__summary">${scored.summary}</p>
          </div>
        </div>

        <div class="msf-result__matches">
          <h4>Your Top Property Matches</h4>
          <div class="msf-result__match-list">
            ${(scored.topMatches || []).map(m => `
              <div class="msf-result__match-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ${m}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="msf-result__insights">
          <h4>Key Insights</h4>
          <ul>
            ${(scored.keyInsights || []).map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>

        <div class="msf-result__next">
          <strong>Next Step</strong>
          <p>${scored.nextStep}</p>
        </div>

        <div class="msf-result__actions">
          <a href="#listings" class="btn btn--primary">Browse Matching Listings</a>
          <a href="#contact" class="btn btn--outline-light">Speak to an Advisor</a>
        </div>
      </div>
    `;
  }

})();
