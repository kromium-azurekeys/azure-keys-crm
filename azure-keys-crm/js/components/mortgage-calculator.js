/* ============================================================
   COMPONENT — MORTGAGE CALCULATOR
   Can be mounted as a standalone section OR embedded inline
   Usage:
     Standalone: place <div id="mortgageCalculator"></div> in HTML
     Embedded:   MortgageCalculator.init('containerID', priceUSD)
============================================================ */

(function () {

  // ── Standalone mount on index page ──────────────────────────
  const standalonEl = document.getElementById('mortgageCalculator');
  if (standalonEl) renderStandalone(standalonEl);

  // ── Public API for embedded use (property pages) ─────────────
  window.MortgageCalculator = { init: renderEmbedded };

  /* ---------------------------------------------------------- */

  function renderStandalone(container) {
    container.innerHTML = `
      <div class="calc-wrap">
        <div class="calc-inputs-panel">
          <div class="calc-field">
            <label for="calc-price">Property Price (USD)</label>
            <div class="calc-field__input-wrap">
              <span class="calc-field__prefix">$</span>
              <input type="number" id="calc-price" value="4000000" min="100000" step="50000" />
            </div>
          </div>
          <div class="calc-field">
            <label for="calc-down">Down Payment</label>
            <div class="calc-field__row">
              <div class="calc-field__input-wrap">
                <span class="calc-field__prefix">$</span>
                <input type="number" id="calc-down" value="800000" min="0" step="50000" />
              </div>
              <span class="calc-field__pct" id="calc-down-pct">20%</span>
            </div>
            <input type="range" class="calc-range" id="calc-down-range" min="5" max="80" value="20" step="1" />
          </div>
          <div class="calc-field">
            <label for="calc-rate">Interest Rate (%)</label>
            <div class="calc-field__row">
              <div class="calc-field__input-wrap">
                <input type="number" id="calc-rate" value="7.25" min="1" max="20" step="0.05" />
                <span class="calc-field__suffix">%</span>
              </div>
            </div>
            <input type="range" class="calc-range" id="calc-rate-range" min="1" max="15" value="7.25" step="0.05" />
          </div>
          <div class="calc-field">
            <label for="calc-term">Loan Term</label>
            <div class="calc-field__tabs" id="calc-term-tabs">
              <button class="calc-tab" data-years="10">10 yr</button>
              <button class="calc-tab active" data-years="20">20 yr</button>
              <button class="calc-tab" data-years="25">25 yr</button>
              <button class="calc-tab" data-years="30">30 yr</button>
            </div>
          </div>
        </div>

        <div class="calc-result-panel">
          <div class="calc-result-card">
            <p class="calc-result-card__label">Estimated Monthly Payment</p>
            <p class="calc-result-card__amount" id="calc-monthly">—</p>
            <div class="calc-result-card__breakdown">
              <div class="calc-result-card__item">
                <span id="calc-principal">—</span>
                <span>Principal &amp; Interest</span>
              </div>
              <div class="calc-result-card__divider"></div>
              <div class="calc-result-card__item">
                <span id="calc-loan-amount">—</span>
                <span>Loan Amount</span>
              </div>
              <div class="calc-result-card__divider"></div>
              <div class="calc-result-card__item">
                <span id="calc-total-interest">—</span>
                <span>Total Interest</span>
              </div>
            </div>
            <div class="calc-donut-wrap">
              <canvas id="calc-donut" width="160" height="160"></canvas>
              <div class="calc-donut-legend">
                <span class="calc-donut-legend__item calc-donut-legend__item--principal">Principal</span>
                <span class="calc-donut-legend__item calc-donut-legend__item--interest">Interest</span>
              </div>
            </div>
          </div>
          <p class="calc-disclaimer">This calculator provides estimates only. Contact us for tailored financing guidance from our banking partners.</p>
          <a href="#contact" class="btn btn--primary calc-cta">Discuss Financing Options</a>
        </div>
      </div>
    `;
    bindCalculator(container, null);
  }

  function renderEmbedded(containerId, priceUSD) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="calc-embed-inner">
        <div class="calc-inputs">
          <div class="form__group">
            <label for="ec-price">Property Price</label>
            <div class="calc-field__input-wrap">
              <span class="calc-field__prefix">$</span>
              <input type="number" id="ec-price" value="${priceUSD || 4000000}" min="100000" step="50000" />
            </div>
          </div>
          <div class="form__group">
            <label for="ec-down">Down Payment %</label>
            <div class="calc-field__row">
              <input type="range" id="ec-down" min="5" max="80" value="20" step="1" class="calc-range" style="width:100%" />
              <span class="calc-field__pct" id="ec-down-pct" style="white-space:nowrap;min-width:3rem;text-align:right;">20%</span>
            </div>
          </div>
          <div class="form__group">
            <label for="ec-rate">Interest Rate (%)</label>
            <div class="calc-field__input-wrap">
              <input type="number" id="ec-rate" value="7.25" min="1" max="20" step="0.05" />
              <span class="calc-field__suffix">%</span>
            </div>
          </div>
          <div class="form__group">
            <label>Loan Term</label>
            <div class="calc-field__tabs">
              <button class="calc-tab" data-years="10">10 yr</button>
              <button class="calc-tab active" data-years="20">20 yr</button>
              <button class="calc-tab" data-years="30">30 yr</button>
            </div>
          </div>
        </div>
        <div class="calc-result">
          <p class="calc-result__amount" id="ec-monthly">—</p>
          <p class="calc-result__label">Est. Monthly Payment</p>
          <div class="calc-breakdown">
            <div class="calc-breakdown__item">
              <span class="calc-breakdown__value" id="ec-loan">—</span>
              <span class="calc-breakdown__label">Loan Amount</span>
            </div>
            <div class="calc-breakdown__item">
              <span class="calc-breakdown__value" id="ec-interest">—</span>
              <span class="calc-breakdown__label">Total Interest</span>
            </div>
            <div class="calc-breakdown__item">
              <span class="calc-breakdown__value" id="ec-total">—</span>
              <span class="calc-breakdown__label">Total Cost</span>
            </div>
          </div>
        </div>
      </div>
    `;
    bindEmbedded(container);
  }

  /* ── Core calculation ─────────────────────────────────────── */
  function calcMonthly(price, downPct, annualRate, years) {
    const loan    = price * (1 - downPct / 100);
    const r       = annualRate / 100 / 12;
    const n       = years * 12;
    if (r === 0) return { monthly: loan / n, loan, totalInterest: 0, total: loan };
    const monthly = loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total   = monthly * n;
    return { monthly, loan, totalInterest: total - loan, total };
  }

  function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  /* ── Bind standalone ─────────────────────────────────────── */
  function bindCalculator(container, defaultPrice) {
    const priceEl     = container.querySelector('#calc-price');
    const downEl      = container.querySelector('#calc-down');
    const downRange   = container.querySelector('#calc-down-range');
    const downPctEl   = container.querySelector('#calc-down-pct');
    const rateEl      = container.querySelector('#calc-rate');
    const rateRange   = container.querySelector('#calc-rate-range');
    const termTabs    = container.querySelectorAll('.calc-tab');

    let years = 20;

    function update() {
      const price   = +priceEl.value   || 4000000;
      const downPct = downRange ? +downRange.value : 20;
      const rate    = +rateEl.value    || 7.25;
      const res     = calcMonthly(price, downPct, rate, years);

      if (downPctEl) downPctEl.textContent = downPct + '%';
      if (downEl)    downEl.value = Math.round(price * downPct / 100);

      const mEl  = container.querySelector('#calc-monthly');
      const piEl = container.querySelector('#calc-principal');
      const laEl = container.querySelector('#calc-loan-amount');
      const tiEl = container.querySelector('#calc-total-interest');

      if (mEl)  mEl.textContent  = fmt(res.monthly);
      if (piEl) piEl.textContent = fmt(res.monthly);
      if (laEl) laEl.textContent = fmt(res.loan);
      if (tiEl) tiEl.textContent = fmt(res.totalInterest);

      drawDonut(container, res.loan, res.totalInterest);
    }

    if (downRange) downRange.addEventListener('input', update);
    if (downEl)    downEl.addEventListener('input', e => {
      const price = +priceEl.value || 4000000;
      const pct   = Math.round(+e.target.value / price * 100);
      if (downRange) downRange.value = Math.max(5, Math.min(80, pct));
      update();
    });
    if (rateEl)    rateEl.addEventListener('input', update);
    if (rateRange) rateRange.addEventListener('input', e => { rateEl.value = (+e.target.value).toFixed(2); update(); });
    if (priceEl)   priceEl.addEventListener('input', update);

    termTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        termTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        years = +btn.dataset.years;
        update();
      });
    });

    update();
  }

  /* ── Bind embedded ────────────────────────────────────────── */
  function bindEmbedded(container) {
    const priceEl   = container.querySelector('#ec-price');
    const downRange = container.querySelector('#ec-down');
    const downPctEl = container.querySelector('#ec-down-pct');
    const rateEl    = container.querySelector('#ec-rate');
    const termTabs  = container.querySelectorAll('.calc-tab');

    let years = 20;

    function update() {
      const price   = +priceEl.value   || 4000000;
      const downPct = downRange ? +downRange.value : 20;
      const rate    = +rateEl.value    || 7.25;
      const res     = calcMonthly(price, downPct, rate, years);

      if (downPctEl) downPctEl.textContent = downPct + '%';

      const mEl  = container.querySelector('#ec-monthly');
      const lEl  = container.querySelector('#ec-loan');
      const iEl  = container.querySelector('#ec-interest');
      const tEl  = container.querySelector('#ec-total');

      if (mEl) mEl.textContent = fmt(res.monthly);
      if (lEl) lEl.textContent = fmt(res.loan);
      if (iEl) iEl.textContent = fmt(res.totalInterest);
      if (tEl) tEl.textContent = fmt(res.total);
    }

    if (downRange) downRange.addEventListener('input', update);
    if (rateEl)    rateEl.addEventListener('input', update);
    if (priceEl)   priceEl.addEventListener('input', update);

    termTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        termTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        years = +btn.dataset.years;
        update();
      });
    });

    update();
  }

  /* ── Donut chart (vanilla canvas) ───────────────────────────── */
  function drawDonut(container, principal, interest) {
    const canvas = container.querySelector('#calc-donut');
    if (!canvas || !canvas.getContext) return;
    const ctx    = canvas.getContext('2d');
    const cx = 80, cy = 80, r = 60, innerR = 38;
    const total  = principal + interest;
    const pAngle = (principal / total) * 2 * Math.PI;

    ctx.clearRect(0, 0, 160, 160);

    // Interest slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2 + pAngle, -Math.PI / 2 + 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#9a8f80';
    ctx.fill();

    // Principal slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pAngle);
    ctx.closePath();
    ctx.fillStyle = '#c9a96e';
    ctx.fill();

    // Cutout
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-light-alt').trim() || '#f5f3ef';
    ctx.fill();
  }

})();
