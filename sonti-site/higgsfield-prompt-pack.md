# Sonti.io hero — Higgsfield prompt pack

The hero currently runs a code-rendered loop (`assets/blocks-loop.mp4` / `.webm`). This pack is for producing the Higgsfield version to drop in its place. Everything below is written so the result matches the site: same palette, same ground colour, same framing, and a seam-free loop.

## 1. Target spec

| | |
|---|---|
| Duration | 8–10 s (the loop restarts invisibly, so shorter is fine if it's seamless) |
| Aspect | 4:5 portrait (1080 × 1350) or 1:1 (1080 × 1080). The hero slot is 1 : 1.05 and masks the edges, so either works |
| Frame rate | 24–30 fps from the generator is fine; interpolate to 60 fps afterwards for the "very smooth" feel (Topaz Video AI, or `ffmpeg minterpolate` below) |
| Camera | Locked off or an almost imperceptible slow orbit. No zooms, no pans, no dolly |
| Background | Flat, even, matte pale warm grey — **#e6e7e2** — no gradient, no horizon line, no vignette. The video is composited straight onto the page, so a floor that fades to a different grey will show as a rectangle |
| Content | No text, no logos, no people, no hands |
| Loop | First and last frames must be identical (see §2) |

## 2. The workflow that actually gives a seamless loop

Text-to-video almost never loops cleanly. Use **image-to-video with the same image as start frame and end frame** — pick a model in Higgsfield that supports a start + end frame (their Kling, Veo and WAN options do at the time of writing; check the model card for "end frame" / "last frame").

1. Upload `blocks-poster.png` (in this folder — it's the exact first frame of the current loop, so colours and framing already match the site) as the **start frame**.
2. Upload the **same file** as the **end frame**.
3. Paste Prompt A below. Duration: the longest the model allows (5–10 s).
4. Generate 4 variations. Judge them on: no morphing/melting blocks, blocks keep their edges and colours, the ground stays flat #e6e7e2, nothing drifts off-frame.
5. Take the best one through §4 to interpolate to 60 fps and encode.

If you'd rather start from a fresh image: generate a still first with Prompt S (Higgsfield's image model or any image generator), fix the background to #e6e7e2 in Photoshop/Figma, then use that still as start + end frame.

## 3. Prompts

### Prompt A — main (image-to-video, start = end frame)

> Seamless looping 3D animation, studio product render. Glossy rounded cubes stack themselves one on top of another in three tidy towers on a flat matte pale-grey floor (#e6e7e2). Each new cube materialises above a tower, drops smoothly, lands with a soft squash and settles; the towers sink steadily into the floor so they never grow taller. Cube colours: matte black, warm white, acid lime-yellow (#dcf34a), coral (#ff6b4a), soft lilac (#c9b8ff), pale sky blue (#8fd3ff). A thin white ring hovers and slowly rotates around the tallest tower with three tiny cubes riding it; small thin slabs hover and turn slowly nearby. Isometric three-quarter view from above, long lens, camera locked off. Soft diffuse studio lighting from the upper left, gentle contact shadows, glossy clear-coat plastic surfaces with clean reflections. Minimal, futuristic, precise, calm. Motion is smooth, continuous and mechanical, ending exactly where it began.

### Prompt B — busier / "more complicated" variant

> Same scene as above, but the cubes arrive as two halves that slide together mid-air before dropping, small cubes orbit each tower on their own rings, and thin slabs rotate at different heights like a mobile. Everything moves on a metronome, perfectly in phase, so the last frame matches the first.

### Prompt C — calmer variant (if A is too frantic)

> Same scene, but slower: one cube lands every two seconds, the ring rotates a quarter turn over the whole clip, satellites drift rather than orbit. Meditative, precise, premium.

### Prompt S — still image for a start/end frame (if not using blocks-poster.png)

> Product-render still, isometric three-quarter view from above, long lens. Three towers of glossy rounded cubes on a flat matte pale-grey floor (#e6e7e2) with no horizon: a tall tower of large cubes in the centre-right, a medium tower to the left, a short one to the right. Cube colours: matte black, warm white, acid lime-yellow (#dcf34a), coral (#ff6b4a), soft lilac (#c9b8ff), pale sky blue (#8fd3ff). A thin white ring floats around the tallest tower with three tiny cubes on it; a few thin slabs hover nearby. Soft studio light from the upper left, gentle contact shadows, clear-coat plastic. Minimal, futuristic, calm. Lots of empty floor. No text.

### Negative prompt (paste wherever the model accepts one)

> text, letters, logo, watermark, people, hands, faces, horizon, gradient background, dark background, vignette, lens flare, motion blur, camera shake, zoom, pan, warping, melting, morphing, extra limbs, low contrast, grain, noise, glitch

### Settings to prefer

- Motion strength / camera motion: low. If there's a "camera" preset, choose static.
- Quality / steps: highest available.
- Seed: fixed once you find a good one, then vary only the prompt.

## 4. Post-production (drop-in files)

Three files go into `assets/` beside `index.html`, keeping these names so nothing in the HTML changes:

- `blocks-loop.mp4` — H.264, yuv420p, faststart
- `blocks-loop.webm` — VP9 (smaller; Chrome/Firefox/Edge pick this first)
- `blocks-poster.jpg` — first frame, shown before the video plays

Commands (ffmpeg, free):

```bash
# 1. Interpolate to 60 fps and trim so the clip is exactly one loop.
#    If the generator's first and last frames are identical, drop the last frame
#    with -t so the loop doesn't hold a duplicate frame at the seam.
ffmpeg -i higgsfield-output.mp4 -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1" -t 8 -c:v libx264 -crf 8 -pix_fmt yuv444p master.mp4

# 2. Web encodes
ffmpeg -i master.mp4 -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -an blocks-loop.mp4
ffmpeg -i master.mp4 -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 -pix_fmt yuv420p -an blocks-loop.webm

# 3. Poster
ffmpeg -i master.mp4 -frames:v 1 -q:v 2 blocks-poster.jpg
```

## 5. What to check before shipping

- Scrub the seam: play the loop 3–4 times on the live page and watch the moment it restarts. Any jump means the start and end frames weren't identical — regenerate with the same image as both.
- Sample the background: the corners of the video should read #e6e7e2 (±2). Off-colour floor = visible rectangle on the page.
- Watch the edges: the page masks the outer 20% of the video with a soft feather, so keep the action in the middle 70%.
- Blocks stay blocks: any shot where a cube morphs, changes colour mid-air or merges with another is a reject — the towers are the brand's "backbone" metaphor and should feel engineered, not dreamy.
