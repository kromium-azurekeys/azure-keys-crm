/* ============================================================
   COMPONENT — NAV
============================================================ */

(function () {
  const nav          = document.getElementById('mainNav');
  const hamburger    = document.getElementById('hamburgerBtn');
  const drawer       = document.getElementById('mobileDrawer');
  const drawerClose  = document.getElementById('drawerClose');
  const overlay      = document.getElementById('navOverlay');
  const drawerLinks  = document.querySelectorAll('.nav__drawer-link');
  const navLinks     = document.querySelectorAll('.nav__link');

  // ---- Scroll: add .scrolled class ----
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 60);
    updateActiveLink();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load

  // ---- Active nav link (based on scroll position) ----
  function updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    let current = '';

    sections.forEach(section => {
      const top = section.offsetTop - 100;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle(
        'active',
        link.getAttribute('href') === '#' + current
      );
    });
  }

  // ---- Mobile Drawer ----
  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('visible');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('visible');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });

  drawerClose.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Close drawer when a link is clicked
  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });
})();
