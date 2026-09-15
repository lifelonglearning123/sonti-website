/* ------------------------------------------------------------------
   POST /api/followup/webhook?key=…  —  the doorbell

   GoHighLevel calls this the moment a new contact is created (a two-step
   workflow there: Contact Created → Webhook). We record the start of the
   sequence on the contact and send the Day 0 email straight away.

   Env: FOLLOWUP_WEBHOOK_SECRET, plus the GHL vars used by lib/followup/ghl.js
   ------------------------------------------------------------------ */

const { enrol } = require('../../lib/followup/engine');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.FOLLOWUP_WEBHOOK_SECRET;
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const key = (req.query && req.query.key) || (body.customData && body.customData.key);
  if (!secret || key !== secret) return res.status(401).json({ error: 'Unauthorised' });

  /* GHL's webhook action sends contact_id; a hand-made test may send id. */
  const contactId = body.contact_id || body.contactId || body.id;
  if (!contactId) return res.status(400).json({ error: 'No contact id in the payload' });

  const sendDay0 = String((req.query && req.query.day0) || '') !== 'skip';
  try {
    const out = await enrol(String(contactId), { sendDay0 });
    console.log('[follow-up] enrol', JSON.stringify(out));
    return res.status(200).json(out);
  } catch (err) {
    console.error('[follow-up] enrol failed', contactId, err.message, err.body || '');
    return res.status(502).json({ error: 'Could not enrol the contact', detail: err.message });
  }
};
