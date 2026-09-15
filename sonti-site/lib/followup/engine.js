/* ------------------------------------------------------------------
   The follow-up engine.

   enrol(contactId)   a lead has just arrived: record the start date, tag
                      them `follow-up`, send Day 0.
   runDue()           the daily pass: for every lead tagged `follow-up`,
                      stop if they have replied or booked, otherwise send
                      the email that is due today.

   State lives on the GHL contact:
     followup_started  YYYY-MM-DD, the day the lead arrived (UTC)
     followup_sent     comma list of step keys already sent, e.g. d0,d1,d3
     tags              follow-up while active, follow-up-finished after
                       Day 30, engaged once they reply or book
   ------------------------------------------------------------------ */

const ghl = require('./ghl');
const { STEPS, render } = require('./emails');

const DAY_MS = 24 * 60 * 60 * 1000;
const todayUtc = () => new Date().toISOString().slice(0, 10);
const daysSince = (ymd) => Math.floor((Date.parse(todayUtc()) - Date.parse(ymd)) / DAY_MS);

/* Two runs a day. The morning one (before 12:00 UTC) takes everyone
   whose phone is not in the Americas; the afternoon one takes the
   Americas. Leads with no phone go in the morning. */
function windowFor(phone) {
  return /^\+?(1|5\d)/.test(String(phone || '').replace(/\s/g, '')) ? 'pm' : 'am';
}
const currentWindow = () => (new Date().getUTCHours() < 12 ? 'am' : 'pm');

async function send(contact, step, state) {
  const mail = render(step, contact);
  await ghl.sendEmail(contact.id, mail);
  const sent = state.sent.concat(step.key);
  await ghl.writeState(contact.id, { sent });
  return sent;
}

/* ---- a new lead ---------------------------------------------------- */

async function enrol(contactId, { sendDay0 = true } = {}) {
  const contact = await ghl.getContact(contactId);
  if (!contact) return { contactId, result: 'not-found' };

  const state = ghl.readState(contact);
  if (state.started) return { contactId, result: 'already-enrolled', started: state.started };
  if (state.dnd || state.tags.some((t) => ghl.TAGS.stop.includes(t))) {
    return { contactId, result: 'skipped', reason: state.dnd ? 'dnd' : 'stop-tag' };
  }

  const started = todayUtc();
  await ghl.writeState(contactId, { started, sent: sendDay0 ? [] : ['d0'] });
  await ghl.addTags(contactId, [ghl.TAGS.active]);

  let sent = sendDay0 ? [] : ['d0'];
  if (sendDay0) sent = await send(contact, STEPS[0], { sent: [] });
  return { contactId, result: 'enrolled', started, sent };
}

/* ---- the daily pass ------------------------------------------------ */

async function stopSequence(contact, reason) {
  const tags = [ghl.TAGS.finished];
  if (reason === 'replied' || reason === 'booked') tags.push(ghl.TAGS.engaged);
  await ghl.addTags(contact.id, tags);
  await ghl.removeTags(contact.id, [ghl.TAGS.active]);
  return { contactId: contact.id, result: 'stopped', reason };
}

async function processContact(summary, window, dry) {
  const contact = await ghl.getContact(summary.id);
  if (!contact) return { contactId: summary.id, result: 'not-found' };
  const state = ghl.readState(contact);

  if (!state.started) {
    /* Tagged by hand without a start date: treat today as Day 0 done. */
    if (dry) return { contactId: contact.id, result: 'would-start' };
    await ghl.writeState(contact.id, { started: todayUtc(), sent: ['d0'] });
    return { contactId: contact.id, result: 'started', started: todayUtc() };
  }

  if (state.dnd)                                            return dry ? { contactId: contact.id, result: 'would-stop', reason: 'dnd' }     : stopSequence(contact, 'dnd');
  if (state.tags.includes(ghl.TAGS.engaged))                return dry ? { contactId: contact.id, result: 'would-stop', reason: 'engaged' } : stopSequence(contact, 'engaged');
  if (state.tags.includes('do-not-contact'))                return dry ? { contactId: contact.id, result: 'would-stop', reason: 'do-not-contact' } : stopSequence(contact, 'do-not-contact');
  if (await ghl.repliedSince(contact.id, state.started))    return dry ? { contactId: contact.id, result: 'would-stop', reason: 'replied' } : stopSequence(contact, 'replied');
  if (await ghl.bookedSince(contact.id, state.started))     return dry ? { contactId: contact.id, result: 'would-stop', reason: 'booked' }  : stopSequence(contact, 'booked');

  if (windowFor(contact.phone) !== window) {
    return { contactId: contact.id, result: 'other-window', window: windowFor(contact.phone) };
  }

  const day = daysSince(state.started);
  const due = STEPS.filter((s) => s.day <= day && !state.sent.includes(s.key));
  if (!due.length) return { contactId: contact.id, result: 'nothing-due', day };

  /* Only the latest due step goes. Earlier ones that were missed (a run
     that failed, a lead enrolled late) are marked so they never bunch up. */
  const step = due[due.length - 1];
  const skipped = due.slice(0, -1).map((s) => s.key);
  if (dry) return { contactId: contact.id, result: 'would-send', step: step.key, day, skipped };

  const sent = await send(contact, step, { sent: state.sent.concat(skipped) });
  if (step.key === STEPS[STEPS.length - 1].key) {
    await ghl.addTags(contact.id, [ghl.TAGS.finished]);
    await ghl.removeTags(contact.id, [ghl.TAGS.active]);
  }
  return { contactId: contact.id, result: 'sent', step: step.key, day, skipped, sent };
}

async function runDue({ dry = false, window } = {}) {
  window = window || currentWindow();
  const leads = await ghl.contactsWithTag(ghl.TAGS.active);
  const results = [];
  for (const lead of leads) {
    try {
      results.push(await processContact(lead, window, dry));
    } catch (err) {
      results.push({ contactId: lead.id, result: 'error', error: err.message });
    }
  }
  const counts = results.reduce((acc, r) => { acc[r.result] = (acc[r.result] || 0) + 1; return acc; }, {});
  return { window, dry, leads: leads.length, counts, results };
}

module.exports = { enrol, runDue, windowFor, currentWindow };
