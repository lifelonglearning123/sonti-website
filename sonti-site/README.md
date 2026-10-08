# Macaws.ai website

Static site: `index.html` + `assets/`. No build step. Deployed on Vercel.

The page sells three products to small and medium-sized businesses whose owners are not
technical: **Signal** (the AI receptionist, signal.macaws.ai, £99 a month), **Nexus** (the
customer hub, crm.macaws.ai, a white-labelled GoHighLevel, £50 a seat a month) and the
**Google Business Profile** service (free audit from the GBP Audit tool, then £99 a month
managed). Every section leads with the owner's problem, then the fix; product jargon is
kept for the FAQ.

The page keeps the fourteen numbered sections (`data-n="00"` to `"13"`) and their layouts.
Section ids that other things link to: `#services` (the three product cards, with
`#signal`, `#nexus` and `#google` on the cards), `#how`, `#model` (the Nexus day),
`#work` (results), `#award`, `#team`, `#fit`, `#packages` (pricing), `#faq`, `#contact`,
`#booking` (the calendar modal, also opened by `/#booking`).

## Business in a Box (`business-in-a-box.html`, served at `/business-in-a-box`)

The offer page for businesses in their first year of trading: all three tools for £250 a year
(plus VAT), paid once, nothing auto-renews. It is generated from `index.html` by
`scratchpad/build_box.py` in the session that made it, but it is a plain static page: the
`<head>`, the whole `<style>` block, the footer, the booking modal and the scripts are copied
verbatim from `index.html`, so when the shared CSS or the footer changes on the home page,
copy them across again (or diff the two files). Page-specific CSS sits at the end of the style
block under `/* business in a box */`.

Hero visuals were generated with Higgsfield (GPT Image 2.5 for the still, Kling 3.0 for the
loop, start and end frame set to the same still so it loops seamlessly):

| Asset | What | Notes |
|---|---|---|
| `assets/box-hero.webp` | 1200x1200 still, also the video poster | background gain-matched to the canvas `#e6e7e2` |
| `assets/box-hero.mp4` | 1080x1080 H.264, 5 s, silent, same colour correction | `id="blocks-loop"` so the home page's autoplay fallback JS applies; `.no-video` shows the still |

The form posts to the same `/api/lead` with a hidden `type` of "Business in a Box" (tag
`business-in-a-box`) and a `started` field ("When did you start trading?") that goes into the
note. The thirty-day follow-up sequence runs for these leads too.

The home page links here from the hero eyebrow tag and the footer.

## Brand

`assets/macaws-logo.png` is the wordmark with the parrot, trimmed from `../macaws_logo.png`
(371×92). It sits in the nav and footer as `.brand .logo` (28 px / 32 px tall). Favicons and
`apple-touch-icon.png` are the parrot alone, cut from the same PNG; the touch icon is white on
coral `#ef4f41`, the logo's coral, which is also the `theme-color`. Regenerate them from the
source PNG if the logo changes.

Company details in the footer and legal pages: FairFax Group Ltd, trading as Macaws.ai,
company number 14517057, registered office c/o Growth Accountants Ltd, Merlin House, Brunel
Road, Theale, Reading RG7 4AB. Contact address used on the site: hello@macaws.ai.

## Lead form (`api/lead.js`)

Posts to the Macaws.ai GoHighLevel location. Fields: `name`, `business`, `email`, `phone`
(optional), `type` (the "biggest problem" dropdown, which becomes a tag: `signal`, `nexus`,
`google-profile`, `gbp-audit`, `all-three`, `unsure`) and `brief` (saved as a note).
Env vars: `GHL_LOCATION_ID`, `GHL_TOKEN`, optional `TIKTOK_ACCESS_TOKEN`.

The TikTok pixel ID in `index.html` and `api/lead.js` is still the one the Sonti site used;
swap it for the Macaws pixel before running ads.

## Lead follow-up (`api/followup/`, `lib/followup/`)

Thirty days of email to every new lead, run from here rather than from a
GoHighLevel workflow. GHL stays the CRM: each email is sent through the
contact's conversation there, and the contact's custom fields
`followup_started` (the day they arrived) and `followup_sent` (step keys
already sent) plus the tags `follow-up` / `follow-up-finished` / `engaged`
hold where they are. Nothing is stored on Vercel.

- `lib/followup/emails.js` — the copy, written for owners. Edit here, commit, done.
- `api/followup/webhook.js` — the doorbell. A two-step GHL workflow
  (Contact Created → Webhook) POSTs to `/api/followup/webhook?key=$FOLLOWUP_WEBHOOK_SECRET`;
  it records the start date, tags the contact and sends Day 0.
- `api/followup/run.js` — the daily pass, called by the two crons in
  `vercel.json` (07:30 UTC for the UK, Europe, Australia, NZ and India;
  14:30 UTC for the Americas, chosen by phone prefix). Stops a lead who has
  replied on any channel, booked, or is on DND, otherwise sends the step due.
  Manual run: `GET /api/followup/run?dry=1` with `Authorization: Bearer $CRON_SECRET`.

Env vars: `GHL_LOCATION_ID`, `GHL_TOKEN` (needs contacts, conversations/message
and customFields scopes), `CRON_SECRET`, `FOLLOWUP_WEBHOOK_SECRET`, optional
`FOLLOWUP_FROM_EMAIL` (a sending domain verified in GHL's Email Services for the Macaws
location; change it there and in Vercel together). The custom fields `followup_started`
and `followup_sent` must exist on the Macaws location; their IDs go in `FOLLOWUP_FIELD_STARTED`
and `FOLLOWUP_FIELD_SENT`. `.env.local` (git-ignored) holds every variable for local runs, and
`node scripts/check-ghl.js` is a read-only test that the token works and prints those two IDs.
Local dry run: set those in the shell and
`node -e "require('./lib/followup/engine').runDue({dry:true}).then(r=>console.log(JSON.stringify(r)))"`.

## Hero video

`assets/hero-blocks-hevc.mp4` (1920x1920 HEVC, Safari / hardware-decode browsers) with
`assets/hero-blocks.mp4` (1080x1080 H.264) as the fallback source, and
`assets/hero-blocks-poster.jpg` as the poster. The master opens on 1.1 s of solid white (keyframe at 1.100 s), which is trimmed off so the native loop never shows it. The clip is rendered on pure white, so
`.blocks-video` uses `mix-blend-mode: multiply` to sit it on the grey canvas.

To replace the clip, drop the new master next to this folder and run (from `sonti-site`):

    ffmpeg -y -ss 1.1 -i ../new-master.mp4 -an -c:v copy -tag:v hvc1 -avoid_negative_ts make_zero -movflags +faststart assets/hero-blocks-hevc.mp4
    ffmpeg -y -ss 1.1 -i ../new-master.mp4 -an -vf scale=1080:1080:flags=lanczos -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart assets/hero-blocks.mp4
    ffmpeg -y -sseof -0.05 -i ../new-master.mp4 -frames:v 1 -vf scale=1080:1080 -q:v 3 assets/hero-blocks-poster.jpg

## Real site screenshots

All 1000 px wide WebP, captured with headless Chrome:

| Asset | Site | Size | Used in |
|---|---|---|---|
| `assets/signal.webp` | signal.macaws.ai | 1000x2057 | gallery marquee |
| `assets/signal-1/2/3.webp` | signal.macaws.ai, three 1400x960 windows down the page | 1000x686 | `#featured` frames |
| `assets/nexus.webp` | crm.macaws.ai | 1000x2057 | gallery marquee |
| `assets/nexus-one.webp`, `nexus-two.webp` | crm.macaws.ai, top and the feature grid | 1000x625 | the two cards in `#model` |
| `assets/leonardo-power.webp` | leonardopower.com | 1000x2057 | marquee, `#work` |
| `assets/viyu-hub.webp` | viyu-hub-mu.vercel.app | 1000x2057 | marquee |
| `assets/oliver-store.webp` | oliver-online-store.vercel.app | 1000x2057 | marquee |
| `assets/signal-ai-phone.webp` | Signal's call screen | 480x1920 | `#work`, behind the phone mock on hover |

`kairoo*.webp`, `knotie.webp`, `openflow.webp`, `uk-team.webp`, `india-office.webp` and the
Kairoo film are no longer referenced by the page and can be deleted once nobody needs them.

The marquee cards and the `#work` case cards share one idea: the top of the page at rest,
panned down to the bottom on hover, `HOVER` pill (`.peek`) as the affordance. Cards for pages
with a `100vh` hero carry `.build-static` and skip the pan.

- **The gallery marquee.** Each `.shot-card` is an `<a>` to the live site wrapping a
  `.build-frame` and a `.shot-cap`. Five cards, then the same five again as `aria-hidden`
  duplicates, so `@keyframes gallery` (translate by `-50%`) loops seamlessly.
  **Add or remove a card in both halves.**
- **`#featured`** is Signal end to end: the animated phone mock (`.mock-voice`, the same markup
  as the first `#work` case) in the film slot, the story beside it, and three frames of
  signal.macaws.ai below.

To capture a site, load it at 1400 px wide with a 2880 px tall viewport (so everything is
"in view" and scroll-reveal animations fire), then resize to 1000 px and save as WebP
quality 72:

    chrome --headless=new --hide-scrollbars --window-size=1400,2880 --virtual-time-budget=8000 --screenshot=out.png https://example.com

For the three `signal-N.webp` frames, crop 1400x960 windows at y = 0, 1130 and 1880 from the
tall capture and resize to 1000x686. For the Nexus cards, crop 1400x875 (16:10) windows and
resize to 1000x625.

## Legal pages

`privacy.html`, `terms.html`, `cookies.html` and `cookie-settings.html` are served at `/privacy`, `/terms`,
`/cookies` and `/cookie-settings` (`cleanUrls` in `vercel.json`). They share `legal.css`, which copies the
tokens, nav, buttons and footer from `index.html`, so change the two together. `legal.css` sits at the root
rather than in `assets/`, because `assets/` is served with a one-year immutable cache.

The cookie choice lives in `localStorage` as `macaws-consent` (`granted` or `denied`). The banner in
`index.html` and the switch on `cookie-settings.html` both write it, and both delete TikTok's `_ttp`,
`_tt_*`, `ttcsid*` and `ttclid` cookies and `macaws-ttclid` when someone says no.

The cookie tables in `cookies.html` were taken from the Sonti site on 12 Sep 2026 with headless Chrome.
Re-check them on the Macaws domain before launch and whenever a tracking tag, the booking widget or
another third-party script changes, and update the dates on the pages.

## Deploy

`hero-options.html` and `higgsfield-prompt-pack.md` are design working files and are
excluded from the deployment by `.vercelignore`.

Local preview:

    npx serve .

First deploy (from this folder):

    vercel

Production:

    vercel --prod
