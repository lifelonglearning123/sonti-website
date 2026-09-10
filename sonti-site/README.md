# Sonti.io website

Static site: `index.html` + `assets/`. No build step. Deployed on Vercel.

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

Seven real captures, all 1000 px wide WebP:

| Asset | Site | Size |
|---|---|---|
| `assets/leonardo-power.webp` | leonardopower.com | 1000x2057 |
| `assets/signal.webp` | signal.macaws.ai | 1000x2057 |
| `assets/nexusportal.webp` | nexusportal.digital | 1000x2057 |
| `assets/viyu-hub.webp` | viyu-hub-mu.vercel.app | 1000x2057 |
| `assets/oliver-store.webp` | oliver-online-store.vercel.app | 1000x2057 |
| `assets/knotie.webp` | knotie.ai | 1000x686 |
| `assets/openflow.webp` | openflow.computer | 1000x686 |

`knotie.webp` and `openflow.webp` are the odd ones out: both are scroll-driven pages with a `100vh` hero, so
a tall viewport just returns one enormous hero and URL fragments don't jump to the sections
below them. They are captured at 1400x960 instead — one screen, the same aspect as the frame,
so there is nothing to pan. Their cards carry `.build-static`, which opts them out of the
hover pan, and their markup omits the `HOVER` pill so no reveal is promised. To give them a pan you
need real scrolling (a driven browser, not `--screenshot`) and a stitched strip.

They are used in two places, with the same idea in both — the top of the page at rest,
panned down to the bottom on hover, `HOVER` pill (`.peek`) as the affordance:

- **The gallery marquee — "What it looks like when it's live".** Each `.shot-card` is an
  `<a>` to the live site wrapping a `.build-frame` (a 420 px browser chrome) and a
  `.shot-cap`. `.build-view img` is `object-fit:cover`, and the pan is `object-position`
  going from `50% 0` to `50% 100%` over 9 s. Seven cards, then the same seven again as
  `aria-hidden` duplicates — `@keyframes gallery` translates the track by `-50%`, so the
  duplicate set is what makes the loop seamless. **Add or remove a card in both halves.**
- **`#work` — the Leonardo case-study card.** The screenshot is `.realshot`, layered over
  the animated `.mock-concierge` and hidden until hover, so that frame shows the mock at
  rest and the live site on hover. The frame is fixed-size there, so the pan is
  `translateY(calc(272px - 100%))`.

Both are behind `@media (hover:hover) and (pointer:fine)` and are frozen at the top under
`prefers-reduced-motion`. **Touch devices never see the pan** — worth revisiting if mobile
traffic matters.

To capture a site, load it at 1400 px wide with a 2880 px tall viewport (so everything is
"in view" and scroll-reveal animations fire), then resize to 1000 px and save as WebP
quality 72:

    chrome --headless=new --hide-scrollbars --window-size=1400,2880 --virtual-time-budget=8000 --screenshot=out.png https://example.com

Live sites capture fine as-is. leonardopower.com had to be served locally with this CSS
injected first — otherwise the strip is half-empty and has a cookie banner across it:

    html.js .fly{opacity:1 !important;transform:none !important;animation:none !important}
    [class*="lpc-"]{display:none !important}
    .palette,.assist{display:none !important}

## Favicon

Source artwork was `Sonti.png` (116x131, only 103x103 of it is the icon). Too small to
upscale, so the mark — coral squircle, two white rounded squares, elbow connector — was
redrawn as `assets/favicon.svg` on a `0 0 103 103` viewBox, matching the original to within
antialiasing on the shape edges. Every raster below is rendered from that SVG, so all sizes
are crisp:

| File | Purpose |
|---|---|
| `assets/favicon.svg` | modern browsers, any size |
| `favicon.ico` (root) | legacy, 16/32/48 in one file |
| `assets/favicon-16/32/48/192.png` | classic PNG rel=icon |
| `assets/apple-touch-icon.png` | iOS home screen, 180x180 |

`apple-touch-icon.png` is deliberately **full-bleed coral with square corners** — iOS applies
its own mask, and a transparent-cornered icon would composite onto black. Everything else
keeps the rounded corners and transparency.

To regenerate after changing the SVG: render it to a 512x512 PNG (Chrome headless with
`--default-background-color=00000000` for transparency), then downsample with LANCZOS.
`<link rel="icon" href="/favicon.ico" sizes="any">` comes first so SVG-capable browsers
still prefer the SVG.

## Deploy

`hero-options.html` and `higgsfield-prompt-pack.md` are design working files and are
excluded from the deployment by `.vercelignore`.

Local preview:

    npx serve .

First deploy (from this folder):

    vercel

Production:

    vercel --prod
