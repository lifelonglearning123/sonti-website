/* ------------------------------------------------------------------
   POST /api/lead  —  Vercel serverless function

   Takes the "Bring us your next AI request" form and creates or updates
   the contact in the Sonti GoHighLevel location, then attaches the brief
   as a note. The location ID and the token are read from environment
   variables and stay on the server — nothing sensitive reaches the
   browser.

   Required env vars (Vercel > Project > Settings > Environment Variables):
     GHL_LOCATION_ID   the sub-account / location ID
     GHL_TOKEN         Private Integration Token with contacts.write

   `python -m http.server` cannot run this. Use `vercel dev` locally.
   ------------------------------------------------------------------ */

const UPSERT_URL  = 'https://services.leadconnectorhq.com/contacts/upsert';
const GHL_VERSION = '2021-07-28';

const SOURCE  = 'sonti.io — Bring us your next AI request';
const COUNTRY = 'GB';
const MAX_LEN = 5000;

/* What they picked in "What is the client asking for?" becomes a tag, so
   the lead can be routed and reported on without reading the note first. */
const TYPE_TAGS = {
  'A chatbot or AI assistant':            'chatbot',
  'A voice agent':                        'voice-agent',
  'An AI-enabled website':                'ai-website',
  'Workflow or marketing automation':     'automation',
  'Something else':                       'other',
  'Not sure yet — help me work it out':   'unsure'
};

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_LEN);
}

/* One name field on the form, two on the contact record. */
function splitName(full) {
  const parts = clean(full).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function buildPayload(data, locationId) {
  const { firstName, lastName } = splitName(data.name);
  const type = clean(data.type);

  const payload = {
    locationId,
    firstName,
    lastName,
    email:   clean(data.email),
    source:  SOURCE,
    country: COUNTRY,
    tags:    ['website-lead'].concat(TYPE_TAGS[type] ? [TYPE_TAGS[type]] : [])
  };

  /* An empty string is not an absent field — GHL answers an empty
     companyName the same way it answers a bad one, so leave it out. */
  const agency = clean(data.agency);
  if (agency) payload.companyName = agency;

  return payload;
}

async function ghl(url, token, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Version':       GHL_VERSION,
      'Content-Type':  'application/json',
      'Accept':        'application/json'
    },
    body: JSON.stringify(body)
  });
  let parsed = {};
  try { parsed = await res.json(); } catch (_) { /* empty or non-JSON */ }
  return { ok: res.ok, status: res.status, body: parsed };
}

/* The brief has no standard GHL field, so it goes on as a note. A note
   always lands, whereas a custom field silently vanishes if the key
   doesn't exist in the location. */
function buildNote(data) {
  const stamp = new Date().toLocaleString('en-GB', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/London'
  });
  const lines = ['Website enquiry — ' + stamp, ''];

  const agency = clean(data.agency);
  const type   = clean(data.type);
  if (agency) lines.push('Agency: ' + agency);
  if (type)   lines.push('Client is asking for: ' + type);

  const brief = clean(data.brief);
  if (brief) lines.push('', "The ask, in the client's words:", brief);

  return lines.join('\n');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const locationId = process.env.GHL_LOCATION_ID;
  const token      = process.env.GHL_TOKEN;

  if (!locationId || !token) {
    console.error('[GHL] Missing GHL_LOCATION_ID or GHL_TOKEN');
    return res.status(500).json({ error: 'The form is not configured yet.' });
  }

  const data = typeof req.body === 'string'
    ? JSON.parse(req.body || '{}')
    : (req.body || {});

  /* Honeypot: bots fill the hidden field, people never see it.
     Answer 200 so the bot thinks it worked and moves on. */
  if (clean(data.website)) return res.status(200).json({ ok: true });

  const email = clean(data.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Please give us a work email address.' });
  }

  try {
    const result = await ghl(UPSERT_URL, token, buildPayload(data, locationId));

    if (!result.ok) {
      /* Detail stays in the server log, never in the browser response. */
      console.error('[GHL] Upsert failed:', result.status, result.body);
      return res.status(502).json({ error: 'We could not save that. Please email hello@sonti.io.' });
    }

    const contactId = result.body && result.body.contact && result.body.contact.id;

    if (contactId) {
      const note = await ghl(
        `https://services.leadconnectorhq.com/contacts/${contactId}/notes`,
        token, { body: buildNote(data) });
      /* The lead is safely in GHL. A missing note is an inconvenience for
         whoever picks it up, not a reason to tell the visitor it failed. */
      if (!note.ok) console.error('[GHL] Note failed for', contactId, note.status, note.body);
    } else {
      console.error('[GHL] Upsert returned no contact id; note skipped');
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[GHL] Request error:', err);
    return res.status(502).json({ error: 'We could not save that. Please email hello@sonti.io.' });
  }
};
