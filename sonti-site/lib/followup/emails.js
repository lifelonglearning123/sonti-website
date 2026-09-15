/* ------------------------------------------------------------------
   The thirty days of email, from Chao. Plain paragraphs, one link each.
   Day is counted from the day the lead arrived. Placeholders:
     {first_name}  the contact's first name, or "there"
     {booking}     the booking link
   ------------------------------------------------------------------ */

const BOOKING = 'https://www.sonti.io/#booking';

const ABOUT = 'Sonti is the AI and automation team behind agencies. When a client asks for a chatbot, a voice agent, an AI-enabled website or an automation that you can\'t build in-house, we build it, and it ships under your brand. A senior analyst scopes and manages your project, our core engineering team in India builds it, so it\'s $25 to $40 an hour all-in. We build with AI, so it\'s fast.';

const SIGN = 'Chao\nCo-Founder, Sonti';

const STEPS = [
  { key: 'd0', day: 0, subject: 'Your enquiry to Sonti, {first_name}', body:
`Hi {first_name},

Thanks for your enquiry. It has landed with me, and I'd like to hear what your client is asking for.

${ABOUT}

The quickest next step is a 30-minute discovery call. You tell me the ask, I tell you how we'd build it and roughly what it takes.

Pick a time that suits you here: {booking}

If nothing on the calendar fits your time zone, reply with a good time and your number and I'll call you.

${SIGN}
sonti.io` },

  { key: 'd1', day: 1, subject: 'What an hour of Sonti costs, and what\'s in it', body:
`Hi {first_name},

The first thing agencies ask is what it costs, so here it is.

Between $25 and $40 an hour, all-in. $1,000 buys 25 hours, $2,500 buys 80, $5,000 buys 200. Every project is estimated in hours before it starts, and that estimate is what you sign off.

"All-in" is the part that matters. An hour includes the senior business analyst who scopes and quotes the project, the engineers and QA who build it, the documentation, and the AI tokens used to build and test it. There's no usage bill from us on top.

The rate is possible because our core team is in India: senior engineers, AI specialists and QA in dedicated squads. What you get on your side is one named contact, client calls at times that suit you, and a contract, invoice and data processing agreement with a registered company.

You keep the client and set the price they pay. We stay invisible.

Want the numbers for a real client? Book 30 minutes: {booking}

${SIGN}` },

  { key: 'd3', day: 3, subject: 'Send a brief tonight. See progress in the morning.', body:
`Hi {first_name},

Two reasons our builds move quickly.

The first is that we build with AI as well as building AI. Scoping, first-pass code, test suites and documentation all start from AI drafts that our engineers then check and finish. It takes days out of every project, and it's why a small team ships like a large one.

The second is the clock. Our engineering team works while you're offline, so a brief you send at the end of your day has progress in your inbox when you start the next one.

What that looks like in practice: a scope and an estimate in hours within two working days of your brief. A chatbot on a client's existing content live in three to four weeks. A voice agent in four to eight. A single automation in days.

Have a client with a deadline? Book 30 minutes: {booking}

${SIGN}` },

  { key: 'd5', day: 5, subject: 'Who\'s actually building it', body:
`Hi {first_name},

AI and automation are what we do, not a line added to a web agency's services page.

Sonti won a £49,800 government innovation grant to make voice AI affordable for small businesses. It's on the public record as UKRI project 10173064, and grants like that are scored by independent assessors on the engineering, not the pitch.

The team behind it: an AI and machine learning lead, a head of engineering and an automation lead in India, with analysts who speak agency rather than code. We build with OpenAI, Anthropic and Google models as well as open-source ones, on the platforms your clients already pay for: HubSpot, Shopify, Webflow, WordPress, Make, n8n, Zapier.

And it's in production. Leonardo Power's website answers visitors in the studio's own words and rings their phone within 60 seconds. Eleven client sites run on the same stack: https://www.leonardopower.com

If your client's ask doesn't fit a box, that's usually the one we're best at: {booking}

${SIGN}` },

  { key: 'd8', day: 8, subject: 'What is your client asking for?', body:
`Hi {first_name},

Most agencies come to us with one of four requests:

1. A chatbot or assistant trained on the client's products, policies and FAQs, on the website, WhatsApp or Messenger.
2. A voice agent that answers the phone, books, reschedules and qualifies, and logs every call to the CRM.
3. An AI-enabled website that answers from its own content and qualifies leads without a person.
4. An automation for the unglamorous work: lead routing, CRM hygiene, reporting, onboarding.

Which is closest to yours? Reply with a line or two, even if it's rough. An email, a call recording or a napkin sketch is enough for us to scope, and you'll have an estimate in hours within two working days.

Or book the call: {booking}

${SIGN}` },

  { key: 'd11', day: 11, subject: 'The app, the backend and the website', body:
`Hi {first_name},

Here's a recent build, so you can see what "the lot" looks like when we do it.

Kairoo helps families agree screen-time rules and stick to them. We designed two apps, one for the parent and one for the child, built the backend that carries every ask and answer between the two phones, and made the website that tells the story: kairoo.family.

Have a look: https://www.sonti.io/#kairoo

If your client's ask is smaller than that, good. Most are. Book a call and we'll size it: {booking}

${SIGN}` },

  { key: 'd14', day: 14, subject: 'What it costs, and what your client pays every month', body:
`Hi {first_name},

Two weeks in, so here are the numbers in full.

You buy hours, not projects, and bring us as many client asks as you like:

Starter: $1,000 for 25 hours. A first client request with a clear finish line: a chatbot on existing content, a single automation, a proof of concept.
Growth: $2,500 for 80 hours. A few asks in flight, or two clients' projects at once. Priority scheduling.
Scale: $5,000 for 200 hours. A named squad that works in your tools and your brand, across your client base.

AI tokens are included in all three, so there's no usage bill from us. Every project is estimated in hours before it starts, and that estimate is what you sign off, not an hourly meter. If a project needs more than you have left, you buy the next package and the same team carries on.

The part agencies like most: these builds need hosting, tuning and support, so your client pays you every month instead of once. You set that price. The scope, the code and the finished product all carry your brand.

If you'd like to work the numbers for a real client, that's what the discovery call is for: {booking}

Or reply with your number and a good time and I'll call you.

${SIGN}` },

  { key: 'd18', day: 18, subject: 'No client asking yet? Three that usually are', body:
`Hi {first_name},

If nobody has asked you for AI yet, three conversations tend to start one:

1. The client who misses calls. Trades, clinics, kennels, anyone whose phone rings while they work. Ask what happens to a call at 6pm.
2. The client whose inbox is the same twenty questions. Opening hours, pricing, "do you do X". That's a chatbot on content they already have, live in three to four weeks.
3. The client whose monthly report is assembled by hand from Meta, Google Ads and GA4. That's an automation, live in days.

Pick one client, have the conversation, and forward me what they say. We'll scope it, and you'll have something to sell back to them.

Or 30 minutes on what's possible, free: {booking}

${SIGN}` },

  { key: 'd22', day: 22, subject: 'The four questions every agency asks first', body:
`Hi {first_name},

These come up on nearly every first call, so here they are in writing, and the call can be about your client instead.

Is it white-label? Yes, by default. If you'd like us on client calls, we come as your technical team. If you'd rather they never hear the name Sonti, they won't.

Who owns the code? You or your client, as set out in the contract. Never us. Everything is handed over with source, documentation and admin access.

Where does the data go? You contract with a registered company, with a data processing agreement as standard. Builds are hosted in the region your client needs, and your client's data never leaves it.

How quickly? A scope and estimate within two working days. A chatbot in three to four weeks, a voice agent in four to eight, a single automation in days.

Anything else, ask me on the call: {booking}

${SIGN}` },

  { key: 'd26', day: 26, subject: 'A voice product you can sell next week', body:
`Hi {first_name},

Not every agency wants a build. Some want a product to sell.

Signal is our voice agent platform, white-labelled for agencies: your name, your subdomain, your prices. It's a flat $349 a month with unlimited clients and no cut of usage, so your second client costs you nothing more than your first.

The details are here: https://signal.sonti.io/agencies

If that's closer to what you had in mind than a custom build, reply "Signal" and I'll send you a walkthrough. Or book a call: {booking}

${SIGN}` },

  { key: 'd30', day: 30, subject: 'Shall we close your enquiry?', body:
`Hi {first_name},

It's been a month since your enquiry and I haven't heard back, so I'll close it for now and stop emailing.

If a client asks you for AI, a chatbot, a voice agent or an automation, the door's open. Reply to this email, or book a call: {booking}

If you'd rather I called, reply with your number and a good time.

Thanks for looking at us.

${SIGN}` }
];

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const URL_RE = /(https?:\/\/[^\s<]+)/g;

/* Text to simple HTML: paragraphs on blank lines, line breaks within,
   URLs clickable with the URL as the text. Reads like plain text. */
function toHtml(text) {
  const paras = text.split(/\n\s*\n/).map((p) =>
    '<p style="margin:0 0 18px">' +
    p.split('\n').map((line) =>
      escapeHtml(line).replace(URL_RE, (u) => `<a href="${u}" style="color:#111111">${u}</a>`)
    ).join('<br>') +
    '</p>'
  );
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111111;max-width:600px">'
    + paras.join('') + '</div>';
}

function render(step, contact) {
  const first = String((contact && contact.firstName) || '').trim() || 'there';
  const fill  = (s) => s.split('{first_name}').join(first).split('{booking}').join(BOOKING);
  return { subject: fill(step.subject), html: toHtml(fill(step.body)), text: fill(step.body) };
}

module.exports = { STEPS, BOOKING, render, toHtml };
