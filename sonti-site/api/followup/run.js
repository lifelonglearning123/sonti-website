/* ------------------------------------------------------------------
   GET /api/followup/run  —  the daily pass, called by Vercel Cron

   Two schedules in vercel.json: 07:30 UTC for the UK, Europe, Australia,
   New Zealand and India, 14:30 UTC for the Americas. The engine picks the
   window from the clock, so one endpoint serves both.

   Vercel sends `Authorization: Bearer $CRON_SECRET`. For a manual run,
   send the same header, and add ?dry=1 to see what would go without
   sending anything.
   ------------------------------------------------------------------ */

const { runDue } = require('../../lib/followup/engine');

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers['authorization'] || '';
  if (!secret || auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorised' });

  const dry = String((req.query && req.query.dry) || '') === '1';
  const window = (req.query && req.query.window) || undefined; // am | pm, for manual runs
  try {
    const out = await runDue({ dry, window });
    console.log('[follow-up] run', JSON.stringify({ window: out.window, dry, leads: out.leads, counts: out.counts }));
    return res.status(200).json(out);
  } catch (err) {
    console.error('[follow-up] run failed', err.message, err.body || '');
    return res.status(502).json({ error: 'Run failed', detail: err.message });
  }
};
