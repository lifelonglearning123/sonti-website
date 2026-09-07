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

## Deploy

`hero-options.html` and `higgsfield-prompt-pack.md` are design working files and are
excluded from the deployment by `.vercelignore`.

Local preview:

    npx serve .

First deploy (from this folder):

    vercel

Production:

    vercel --prod
