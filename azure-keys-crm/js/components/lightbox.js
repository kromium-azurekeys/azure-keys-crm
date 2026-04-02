/* ============================================================
   COMPONENT — LIGHTBOX
============================================================ */

(function () {
  const lightbox    = document.getElementById('lightbox');
  const img         = document.getElementById('lightboxImg');
  const closeBtn    = document.getElementById('lightboxClose');
  const prevBtn     = document.getElementById('lightboxPrev');
  const nextBtn     = document.getElementById('lightboxNext');

  let images = [];  // array of { src, alt }
  let currentIndex = 0;

  function open(listingId) {
    if (!window.LISTINGS_DATA) return;

    // Build images array from current visible listings
    images = window.LISTINGS_DATA
      .filter(p => {
        const card = document.querySelector(`[data-id="${p.id}"]`);
        return card && !card.classList.contains('hidden');
      })
      .map(p => ({ src: p.image, alt: p.alt }));

    // Find index of clicked listing
    const clickedListing = window.LISTINGS_DATA.find(p => p.id === listingId);
    currentIndex = images.findIndex(i => i.src === clickedListing?.image);
    if (currentIndex < 0) currentIndex = 0;

    showImage(currentIndex);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    img.src = '';
  }

  function showImage(index) {
    if (!images.length) return;
    currentIndex = (index + images.length) % images.length;
    img.src = '';
    img.alt = images[currentIndex].alt;
    img.src = images[currentIndex].src;
    prevBtn.style.display = images.length > 1 ? '' : 'none';
    nextBtn.style.display = images.length > 1 ? '' : 'none';
  }

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
  nextBtn.addEventListener('click', () => showImage(currentIndex + 1));

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
  });

  // Expose public API
  window.Lightbox = { open, close };
})();
