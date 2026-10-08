/* ------------------------------------------------------------------
   The thirty days of email, from Chao. Plain paragraphs, one link each,
   written for a small-business owner who is not technical.
   Day is counted from the day the lead arrived. Placeholders:
     {first_name}  the contact's first name, or "there"
     {booking}     the booking link
   ------------------------------------------------------------------ */

const BOOKING = 'https://www.macaws.ai/#booking';

const ABOUT = 'Macaws.ai is three simple tools for small businesses, set up for you. Signal answers your phone, day or night, in a voice callers take for a person, and books the job into your diary. Nexus keeps every customer and every message in one place and chases quotes, sends reminders and asks for reviews on its own. And we check your Google Business Profile free, then fix and run it if you want us to.';

const SIGN = 'Chao\nFounder, Macaws.ai';

const STEPS = [
  { key: 'd0', day: 0, subject: 'Your message to Macaws, {first_name}', body:
`Hi {first_name},

Thanks for getting in touch. Your message has landed with me, and I'd like to hear what's slipping through.

${ABOUT}

The quickest next step is a free 20-minute call. You tell me what you do and where customers get lost. I tell you which of the three fits, what it costs and when it would be live.

Pick a time that suits you here: {booking}

If nothing on the calendar fits, reply with a good time and your number and I'll call you.

${SIGN}
macaws.ai` },

  { key: 'd1', day: 1, subject: 'What it costs, in one email', body:
`Hi {first_name},

The first thing owners ask is what it costs, so here it is.

Signal, the receptionist that answers every call and books the job: £99 a month, with 200 minutes of calls included.

Nexus, every customer and every message in one place, with the follow-ups sent for you: £50 a month for each person who logs in. Most businesses start with one.

Your Google Business Profile: the audit is free. If you want us to fix it and keep it right every month, that's £99 a month.

Prices exclude VAT. There's no setup fee and no long contract. Setting it up and keeping it running are included, so the monthly price is the whole price.

Want to know which one you actually need? That's what the call is for: {booking}

${SIGN}` },

  { key: 'd3', day: 3, subject: 'The call you missed at 23:41', body:
`Hi {first_name},

Here's the one that convinces most people.

It's late on a Wednesday. Half of someone's sockets have gone dead and they are ringing every electrician on Google until one picks up. If it's your number and nobody answers, they try the next one. You never know the call happened.

With Signal, the call is answered in under three seconds. It asks what's wrong, works out it's a circuit fault, checks your diary, books them in for first thing and reads it back. By the time you're up, the job is in your diary and the whole call is written up in your inbox.

You can hear real calls like it here, including an estate-agent viewing and a cold call being politely turned away: https://signal.macaws.ai

If your phone rings while you work, this is the one to start with. Book 20 minutes and we'll set it up on your number: {booking}

${SIGN}` },

  { key: 'd5', day: 5, subject: 'Who you\'d be dealing with', body:
`Hi {first_name},

A fair question before you hand anyone your phone number: who are these people?

Macaws.ai is based in Cambridge. The voice technology behind Signal won a £49,800 grant from Innovate UK, the government's innovation agency, to make a human-sounding receptionist affordable for a four-person practice or a one-van trade. It's on the public record as UKRI project 10173064, and grants like that are scored by independent assessors on the engineering, not the pitch.

The team is small. Your first call is with me. Soli turns that call into the setup. Avijit, Sushanta, Soham and Biswanath build and look after the technology. You'll know their names, and you'll be able to message a person when you want something changed.

And it's running in real businesses today, from letting agents to a web studio whose site rings the owner within a minute of someone asking a question.

Happy to tell you more on the call: {booking}

${SIGN}` },

  { key: 'd8', day: 8, subject: 'Which one is yours?', body:
`Hi {first_name},

Most owners come to us with one of three problems:

1. Calls I can't get to. You're on a job, in with a patient or behind the counter, and the phone goes to voicemail. That's Signal.
2. Enquiries I forget to chase. The quote went out by text, the enquiry came in by email, and a week later you remember. That's Nexus.
3. We're not on the first page of Google. Good work, good reviews, and still below the chains when someone nearby searches. That's your Google profile, and the audit is free.

Which is closest to yours? Reply with a line or two, even if it's rough. Your website address helps, because Signal learns your business from it.

Or book the call: {booking}

${SIGN}` },

  { key: 'd11', day: 11, subject: 'Your Google profile, checked free in a minute', body:
`Hi {first_name},

If you haven't looked at your Google Business Profile since you set it up, this is the easiest thing you can do this week.

Reply to this email with the name of your business and the town, and I'll run the audit for you. It checks six things: how complete the profile is, your reviews, how many you've replied to, your categories and services, your photos, and your posts. You get a score out of 100 and a short list of fixes, in plain English.

No cost, no obligation. If you'd like us to make the fixes and keep the profile right every month, that's £99 a month. If you'd rather do it yourself from the list, that's fine too.

Or book 20 minutes and we'll go through it together: {booking}

${SIGN}` },

  { key: 'd14', day: 14, subject: 'What you get for £99 a month', body:
`Hi {first_name},

Two weeks in, so here's the whole thing in one place.

Signal, £99 a month, 200 minutes of calls included. Every call answered in under three seconds, jobs booked into your diary during the call, urgent callers put through to your mobile, every call recorded and written up in your inbox. Works out at about £3.30 a day, so one booked job a month pays for it.

Nexus, £50 a seat a month. Calls, texts, emails and WhatsApp in one inbox, one thread per customer. Quotes chased, appointments reminded and reviews requested without you remembering to. On your phone.

Google profile, £99 a month, after a free audit. Photos, posts, services and hours kept right, every review replied to in your voice, and a one-page summary each month of what came in from Google.

Setting up is included. Keeping it running is included. There's no setup fee and no long contract, and you can cancel with 30 days' notice.

If you'd like to work out which you need, that's the call: {booking}

Or reply with your number and a good time and I'll ring you.

${SIGN}` },

  { key: 'd18', day: 18, subject: 'A Tuesday, with it running', body:
`Hi {first_name},

Here's what a normal day looks like for a two-van trade business with all three running.

07:40. Someone rings about a leaking tap before you're up. Signal books them for Thursday morning. The job is in your diary when you check it over breakfast.

12:15. The quote you sent on Monday gets its nudge from Nexus. The customer replies "yes please" by text. You see it at lunch and reply with a thumbs up.

18:30. Yesterday's customer gets a thank-you and a link to leave a review. The five stars land on your Google profile, where the next person searching will see them.

Nothing on that list needed you to remember anything. That's the point.

If that's the day you'd like to have, book 20 minutes: {booking}

${SIGN}` },

  { key: 'd22', day: 22, subject: 'The four questions owners ask first', body:
`Hi {first_name},

These come up on nearly every first call, so here they are in writing.

Will callers know it's a computer? Usually not. It sounds like a calm receptionist, and most callers book and hang up without asking. If someone does ask, it tells them the truth.

Do I have to change my number? No. You keep your number and point it at Signal, all the time or only when you can't answer. We do that with you on the setup call.

What if it can't answer something? It takes the caller's name and number, tells them when you'll ring back, and emails you the written-up call. Urgent callers go straight through to your mobile.

Can I cancel? Yes. Everything is monthly, with no setup fee and no long contract. Give us 30 days' notice and your last month runs to the end.

Anything else, ask me on the call: {booking}

${SIGN}` },

  { key: 'd26', day: 26, subject: 'Hear it before you decide', body:
`Hi {first_name},

If you'd rather hear Signal than read about it, there are real recorded calls on the site: an electrical job being booked, an estate-agent viewing, an online-shop query, and a cold caller being politely sent on their way.

https://signal.macaws.ai

Play one and ask yourself whether you'd have known. Then imagine it's your number, at nine at night, while you're having your tea.

If you'd like it answering your phone by this time next week, book 20 minutes: {booking}

${SIGN}` },

  { key: 'd30', day: 30, subject: 'Shall I close your enquiry?', body:
`Hi {first_name},

It's been a month since you got in touch and I haven't heard back, so I'll close it for now and stop emailing.

If the phone keeps ringing out, the quotes keep going unchased or Google keeps sending people elsewhere, the door's open. Reply to this email, or book a call: {booking}

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
