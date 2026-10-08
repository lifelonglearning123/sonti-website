/* ------------------------------------------------------------------
   node scripts/check-ghl.js

   Read-only check that .env.local can talk to the Macaws.ai GHL
   location. It changes nothing: it reads the location's custom fields,
   proves the token and location ID work, and prints the IDs to put in
   FOLLOWUP_FIELD_STARTED and FOLLOWUP_FIELD_SENT.
   ------------------------------------------------------------------ */

const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv(path.join(__dirname, '..', '.env.local'));

const locationId = process.env.GHL_LOCATION_ID || '';
const token = process.env.GHL_TOKEN || '';

if (!locationId || locationId.startsWith('PASTE') || !token || token.startsWith('PASTE')) {
  console.error('Fill in GHL_LOCATION_ID and GHL_TOKEN in .env.local first.');
  process.exit(1);
}

(async () => {
  const res = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}/customFields`, {
    headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' }
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`GHL said ${res.status}: ${body.message || JSON.stringify(body)}`);
    if (res.status === 401) console.error('The token is wrong, expired, or belongs to another location.');
    if (res.status === 403) console.error('The token is missing a scope. Add locations/customFields.readonly.');
    process.exit(1);
  }

  console.log('Connected to GHL location', locationId);
  const fields = body.customFields || [];
  const find = (key) => fields.find((f) => (f.fieldKey || '').toLowerCase() === `contact.${key}`);
  const started = find('followup_started');
  const sent = find('followup_sent');

  console.log('');
  console.log(started ? `FOLLOWUP_FIELD_STARTED=${started.id}` : 'Missing: custom field "followup_started" (type Date). Create it in GHL > Settings > Custom Fields.');
  console.log(sent ? `FOLLOWUP_FIELD_SENT=${sent.id}` : 'Missing: custom field "followup_sent" (type Single line text). Create it in GHL > Settings > Custom Fields.');
  if (started && sent) console.log('\nCopy those two lines into .env.local and into Vercel.');
})().catch((err) => { console.error('Could not reach GHL:', err.message); process.exit(1); });
