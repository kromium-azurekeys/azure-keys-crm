# Azure Keys — Website Project

Luxury Caribbean real estate website. Pure HTML/CSS/JS — no build step required.

## Project Structure

```
azure-keys/
├── index.html                  ← Main HTML (all sections)
│
├── css/
│   ├── reset.css               ← Base reset & typography defaults
│   ├── variables.css           ← Design tokens (colours, spacing, fonts)
│   ├── layout.css              ← Container, section wrappers, section headers
│   ├── components.css          ← Buttons, nav, cards, form, lightbox
│   ├── sections.css            ← Hero, stats, about, listings, investment, contact, footer
│   ├── animations.css          ← Scroll-reveal, shimmer, keyframes
│   └── responsive.css          ← Breakpoints (1024, 768, 480px)
│
└── js/
    ├── main.js                 ← Entry point: year, scroll reveal, about tabs
    ├── data/
    │   ├── listings.data.js    ← All property card data (edit to add/update listings)
    │   └── testimonials.data.js ← Client testimonial data
    └── components/
        ├── nav.js              ← Scroll behaviour, active links, mobile drawer
        ├── listings.js         ← Render cards, filter by market
        ├── testimonials.js     ← Render testimonial cards
        ├── lightbox.js         ← Image lightbox with keyboard nav
        └── contact.js          ← Form validation & submit handler
```

## How to Run

Open `index.html` directly in a browser — or deploy to Netlify by dragging the folder.

## Common Tasks

### Add a new listing
Edit `js/data/listings.data.js` — add an object to `window.LISTINGS_DATA`.

### Update testimonials
Edit `js/data/testimonials.data.js`.

### Change colours / fonts
Edit `css/variables.css` — all design tokens live here.

### Add a new section
1. Add HTML to `index.html`
2. Add styles to `css/sections.css` (or a new file linked in `index.html`)
3. Add JS logic to a new file in `js/components/`

### Connect a real form backend
In `js/components/contact.js`, replace the `setTimeout` mock in the submit handler
with a real `fetch()` call to your backend, Netlify Forms, or Formspree.

## Deploy to Netlify

1. Drag the `azure-keys/` folder onto [netlify.com/drop](https://app.netlify.com/drop)
2. Or connect your Git repo and set publish directory to `/` (root)
