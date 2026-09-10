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

   Optional — report the lead to TikTok's Events API as well:
     TIKTOK_ACCESS_TOKEN      Events API access token for pixel DAHI7ABC77UCRCTVCVIG
     TIKTOK_TEST_EVENT_CODE   while testing only; shows events under Test events

   `python -m http.server` cannot run this. Use `vercel dev` locally.
   ------------------------------------------------------------------ */

const crypto = require('crypto');

const UPSERT_URL  = 'https://services.leadconnectorhq.com/contacts/upsert';
const GHL_VERSION = '2021-07-28';

const TIKTOK_URL        = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
const TIKTOK_PIXEL      = 'DAHI7ABC77UCRCTVCVIG';
const TIKTOK_TIMEOUT_MS = 3000;
const SITE_ORIGINS      = ['https://www.sonti.io', 'https://sonti.io'];

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

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return clean(req.headers['x-real-ip']);
}

/* The page comes from the browser, so only a sonti.io address is passed on. */
function pageUrl(value) {
  const url = clean(value).slice(0, 500);
  const ours = SITE_ORIGINS.some((origin) => url === origin || url.startsWith(origin + '/'));
  return ours ? url : 'https://www.sonti.io/';
}

/* The server-side copy of the pixel's Lead event. It only goes when the visitor
   allowed cookies, and it carries the browser's event_id so TikTok counts the
   lead once. The lead is already safe in GHL by now, so a TikTok problem is
   logged and never shown to the visitor, and it can't hold the form up for
   longer than TIKTOK_TIMEOUT_MS. */
async function reportLeadToTikTok(req, data, contactId) {
  const token   = process.env.TIKTOK_ACCESS_TOKEN;
  const context = data.tiktok && typeof data.tiktok === 'object' ? data.tiktok : {};
  if (!token || context.consent !== 'granted') return;

  const user = { email: sha256(clean(data.email).toLowerCase()) };
  if (contactId) user.external_id = sha256(String(contactId));
  const ttclid = clean(context.ttclid).slice(0, 500);
  if (ttclid) user.ttclid = ttclid;
  const ttp = clean(context.ttp).slice(0, 500);
  if (ttp) user.ttp = ttp;
  const ip = clientIp(req);
  if (ip) user.ip = ip;
  const userAgent = clean(req.headers['user-agent']).slice(0, 500);
  if (userAgent) user.user_agent = userAgent;

  const type  = clean(data.type);
  const event = {
    event:      'Lead',
    event_time: Math.floor(Date.now() / 1000),
    user,
    properties: { content_name: type ? `Enquiry: ${type}` : 'Enquiry' },
    page:       { url: pageUrl(context.url) }
  };
  const eventId = clean(context.event_id).slice(0, 100);
  if (eventId) event.event_id = eventId;

  const body = { event_source: 'web', event_source_id: TIKTOK_PIXEL, data: [event] };
  if (process.env.TIKTOK_TEST_EVENT_CODE) body.test_event_code = process.env.TIKTOK_TEST_EVENT_CODE;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIKTOK_TIMEOUT_MS);
  try {
    const res = await fetch(TIKTOK_URL, {
      method: 'POST',
      headers: { 'Access-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    let out = {};
    try { out = await res.json(); } catch (_) { /* empty or non-JSON */ }
    if (!res.ok || out.code !== 0) {
      console.error('[TikTok] Lead event not accepted:', res.status, out.code, out.message);
    }
  } catch (err) {
    console.error('[TikTok] Lead event failed:', err.name === 'AbortError' ? 'timed out' : err.message);
  } finally {
    clearTimeout(timer);
  }
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

    /* Awaited, not fired and forgotten: Vercel can freeze the function as soon
       as the response is sent. The call is capped at TIKTOK_TIMEOUT_MS. */
    await reportLeadToTikTok(req, data, contactId);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[GHL] Request error:', err);
    return res.status(502).json({ error: 'We could not save that. Please email hello@sonti.io.' });
  }
};
