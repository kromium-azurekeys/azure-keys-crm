/* ============================================================
   ENQUIRY SUBMISSION
   Writes website enquiries to Supabase website_enquiries table.
   Called from property page sidebar form + main contact form.
   Also optionally creates a contact record in the CRM contacts table.
============================================================ */

window.EnquirySubmit = (function () {

  const URL = window.SUPABASE_URL;
  const KEY = window.SUPABASE_ANON;

  /* ── Submit a property enquiry (sidebar form on property page) ── */
  async function submitPropertyEnquiry({ name, email, phone, message, propertyId, propertyName, market }) {
    return _insert('website_enquiries', {
      name,
      email,
      phone:         phone || null,
      message:       message || null,
      property_id:   propertyId || null,
      property_name: propertyName || null,
      market:        market || null,
      source:        'website_property',
      status:        'new',
    });
  }

  /* ── Submit main contact form ───────────────────────────── */
  async function submitContactForm({ firstName, lastName, email, phone, market, budget, message }) {
    return _insert('website_enquiries', {
      name:    `${firstName} ${lastName}`.trim(),
      email,
      phone:   phone || null,
      message: message || null,
      market:  market || null,
      source:  'website_contact',
      status:  'new',
      form_data: { budget, market },
    });
  }

  /* ── Submit buyer lead capture form (with AI score) ─────── */
  async function submitBuyerForm({ name, email, phone, answers, score, tier, topMatches }) {
    return _insert('website_enquiries', {
      name,
      email,
      phone:      phone || null,
      source:     'buyer_form',
      status:     'new',
      lead_score: score || null,
      lead_tier:  tier  || null,
      market:     (answers.markets || []).join(', ') || null,
      form_data:  { answers, topMatches },
    });
  }

  /* ── Submit seller valuation form ───────────────────────── */
  async function submitSellerForm({ name, email, phone, answers, estimate }) {
    return _insert('website_enquiries', {
      name,
      email,
      phone:    phone || null,
      source:   'seller_form',
      status:   'new',
      market:   answers.island || null,
      form_data: { answers, estimate },
    });
  }

  /* ── Internal POST to Supabase ──────────────────────────── */
  async function _insert(table, data) {
    if (!URL || !KEY) {
      console.warn('[EnquirySubmit] Supabase config missing — enquiry not saved');
      return { ok: false, error: 'No Supabase config' };
    }

    try {
      const res = await fetch(`${URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey':        KEY,
          'Authorization': `Bearer ${KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[EnquirySubmit] Failed:', res.status, text);
        return { ok: false, error: text };
      }

      console.log('[EnquirySubmit] Saved to Supabase ✓', table);
      return { ok: true };

    } catch (err) {
      console.error('[EnquirySubmit] Network error:', err);
      return { ok: false, error: err.message };
    }
  }

  return { submitPropertyEnquiry, submitContactForm, submitBuyerForm, submitSellerForm };

})();
