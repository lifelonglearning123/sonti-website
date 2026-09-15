/* ------------------------------------------------------------------
   GoHighLevel client for the lead follow-up.

   GHL stays the CRM and the record: every email goes out through the
   contact's conversation there, and two custom fields on the contact hold
   where they are in the sequence. Nothing is stored on Vercel.

   Env vars: GHL_LOCATION_ID, GHL_TOKEN (Private Integration Token with
   contacts, conversations/message and locations/customFields scopes).
   ------------------------------------------------------------------ */

const BASE    = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';

/* Custom fields created on the SONTI LTD location on 15 Sep 2026.
   Override by env if the location is ever rebuilt. */
const FIELDS = {
  started: process.env.FOLLOWUP_FIELD_STARTED || '2f1tclTejonvw1GGJxzb', // contact.followup_started (DATE)
  sent:    process.env.FOLLOWUP_FIELD_SENT    || 'aJ9Gzt8V0g8iwqCUsuwT'  // contact.followup_sent (TEXT)
};

const TAGS = {
  active:   'follow-up',
  finished: 'follow-up-finished',
  engaged:  'engaged',
  invalidEmail: 'email-invalid',
  stop:     ['engaged', 'do-not-contact', 'follow-up-finished', 'email-invalid']
};

function env() {
  const locationId = process.env.GHL_LOCATION_ID;
  const token      = process.env.GHL_TOKEN;
  if (!locationId || !token) throw new Error('GHL_LOCATION_ID or GHL_TOKEN is not set');
  return { locationId, token };
}

async function api(method, path, body, params) {
  const { token } = env();
  let url = BASE + path;
  if (params) url += '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Version':       VERSION,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      /* Cloudflare in front of GHL rejects some default user agents. */
      'User-Agent':    'sonti-followup/1.0'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let parsed = {};
  try { parsed = await res.json(); } catch (_) { /* empty or non-JSON */ }
  if (!res.ok) {
    const err = new Error(`GHL ${method} ${path} -> ${res.status} ${parsed.message || ''}`.trim());
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

/* ---- contacts ---------------------------------------------------- */

async function getContact(id) {
  const out = await api('GET', `/contacts/${id}`);
  return out.contact || null;
}

function customField(contact, fieldId) {
  const list = (contact && contact.customFields) || [];
  const hit = list.find((f) => f.id === fieldId);
  return hit ? (hit.value ?? hit.field_value ?? '') : '';
}

function readState(contact) {
  const sent = String(customField(contact, FIELDS.sent) || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return {
    started: String(customField(contact, FIELDS.started) || '').slice(0, 10) || null,
    sent,
    tags: (contact.tags || []).map((t) => String(t).toLowerCase()),
    dnd:  contact.dnd === true || (contact.dndSettings && contact.dndSettings.Email && contact.dndSettings.Email.status === 'active')
  };
}

async function writeState(id, { started, sent }) {
  const customFields = [];
  if (started !== undefined) customFields.push({ id: FIELDS.started, field_value: started });
  if (sent    !== undefined) customFields.push({ id: FIELDS.sent,    field_value: sent.join(',') });
  return api('PUT', `/contacts/${id}`, { customFields });
}

const addTags    = (id, tags) => api('POST',   `/contacts/${id}/tags`, { tags });
const removeTags = (id, tags) => api('DELETE', `/contacts/${id}/tags`, { tags });

/* Every contact carrying the active tag, across pages. */
async function contactsWithTag(tag) {
  const { locationId } = env();
  const found = [];
  let searchAfter;
  for (let page = 0; page < 40; page++) {
    const body = {
      locationId,
      pageLimit: 100,
      filters: [{ field: 'tags', operator: 'contains', value: tag }]
    };
    if (searchAfter) body.searchAfter = searchAfter;
    const out = await api('POST', '/contacts/search', body);
    const list = out.contacts || [];
    found.push(...list);
    if (list.length < 100) break;
    searchAfter = list[list.length - 1].searchAfter;
    if (!searchAfter) break;
  }
  return found;
}

/* ---- has the lead come back to us? -------------------------------- */

/* Any inbound message on any channel since the sequence started. */
async function repliedSince(contactId, startedIso) {
  const { locationId } = env();
  const out = await api('GET', '/conversations/search', undefined, { locationId, contactId });
  const since = startedIso ? Date.parse(startedIso) : 0;
  return (out.conversations || []).some((c) => {
    if (c.lastMessageDirection !== 'inbound') return false;
    const when = Number(c.lastMessageDate) || Date.parse(c.lastMessageDate) || 0;
    return when >= since;
  });
}

/* A booked appointment on any calendar since the sequence started. */
async function bookedSince(contactId, startedIso) {
  const out = await api('GET', `/contacts/${contactId}/appointments`);
  const since = startedIso ? Date.parse(startedIso) : 0;
  return (out.events || []).some((e) => {
    const status = String(e.appointmentStatus || e.status || '').toLowerCase();
    if (status === 'cancelled' || status === 'noshow' || status === 'invalid') return false;
    const added = Date.parse(e.dateAdded || e.createdAt || e.startTime || '') || 0;
    return added >= since || Date.parse(e.startTime || '') > Date.now();
  });
}

/* ---- sending ----------------------------------------------------- */

async function sendEmail(contactId, { subject, html }) {
  const body = { type: 'Email', contactId, subject, html };
  if (process.env.FOLLOWUP_FROM_EMAIL) body.emailFrom = process.env.FOLLOWUP_FROM_EMAIL;
  return api('POST', '/conversations/messages', body);
}

module.exports = {
  FIELDS, TAGS, api,
  getContact, readState, writeState, addTags, removeTags, contactsWithTag,
  repliedSince, bookedSince, sendEmail
};
