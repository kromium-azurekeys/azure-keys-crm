/* ============================================================
   MAIN — entry point
============================================================ */

// ---- Footer year ----
const yearEl = document.getElementById('currentYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---- Global scroll-reveal ----
(function () {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  // Apply to all .reveal elements not inside listings/testimonials grids
  // (those grids have their own observers inside their component files)
  document.querySelectorAll('.section__header, .investment__card, .contact__info, .contact__form').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
})();

// ---- About market tabs ----
(function () {
  const tabs = document.querySelectorAll('.about__market-tab');
  if (!tabs.length) return;

  // Market content snippets (optional — extend as needed)
  const marketContent = {
    jamaica: {
      title: "Jamaica",
      description: "Jamaica's luxury market is centred around Montego Bay's Sandy Bay corridor, Port Antonio's dramatic clifftop estates, and the emerging Tryall Club community. Freehold ownership is available to foreign nationals with straightforward title transfer processes.",
    },
    bahamas: {
      title: "Bahamas",
      description: "The Bahamas offers some of the region's most established luxury communities — from Lyford Cay and Old Fort Bay in Nassau to the unspoiled Out Islands. Foreign ownership is unrestricted and the jurisdiction is a recognised tax-neutral domicile.",
    },
    cayman: {
      title: "Cayman Islands",
      description: "Grand Cayman's Seven Mile Beach corridor is one of the world's most prestigious oceanfront addresses. The Cayman Islands levy no property, income, or capital gains tax, making it exceptionally attractive for international investors.",
    },
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Optionally update a descriptive paragraph (if element exists)
      const desc = document.querySelector('.about__market-description');
      if (desc && marketContent[tab.dataset.market]) {
        desc.textContent = marketContent[tab.dataset.market].description;
      }
    });
  });
})();

// ---- Smooth anchor scroll (for older browsers) ----
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  });
});
