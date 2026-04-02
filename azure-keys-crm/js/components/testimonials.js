/* ============================================================
   COMPONENT — TESTIMONIALS
============================================================ */

(function () {
  const grid = document.getElementById('testimonialsGrid');

  function buildCard(t) {
    return `
      <article class="testimonial-card reveal">
        <p class="testimonial-card__quote">${t.quote}</p>
        <div class="testimonial-card__author">
          <img
            src="${t.avatar}"
            alt="Photo of ${t.name}"
            class="testimonial-card__avatar"
            loading="lazy"
          />
          <div class="testimonial-card__info">
            <strong>${t.name}</strong>
            <span>${t.title}</span>
            <span class="testimonial-card__market">${t.market}</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderTestimonials() {
    if (!window.TESTIMONIALS_DATA || !grid) return;
    grid.innerHTML = window.TESTIMONIALS_DATA.map(buildCard).join('');
    initReveal();
  }

  function initReveal() {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, i * 120);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    grid.querySelectorAll('.testimonial-card').forEach(el => observer.observe(el));
  }

  renderTestimonials();
})();
