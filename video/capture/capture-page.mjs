// Frame-accurate recording of a live page. The page's clock (timers, rAF, Date) and its
// time-based CSS/Web animations are stepped one video frame at a time, so a slow scroll or
// a typed chat comes out perfectly even at 60 fps however long each screenshot takes.
// Usage: node capture-page.mjs <job.json>
//
// job.json:
// {
//   "url": "https://…", "out": "…/clip.mp4",
//   "viewport": { "width": 432, "height": 768 }, "dsf": 2.5, "mobile": true,
//   "fps": 60, "duration": 20, "settleMs": 2500, "preRollMs": 1500,
//   "setup":  [ { "click": "text=Reject all", "optional": true }, { "wait": 800 } ],
//   "path":   [ { "t": 0, "y": 0 }, { "t": 20, "y": 1100, "ease": "cruise", "ramp": 1.5 } ],
//   "events": [ { "t": 1.0, "click": "[data-toggle-assist]" },
//               { "t": 2.0, "type": "Hello", "into": "input", "cps": 11 },
//               { "t": 4.5, "press": "Enter" } ],
//   "stills": [0, 600]
// }
// "path" is optional; without it the window scroll is left to the page.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";

const job = JSON.parse(readFileSync(process.argv[2], "utf8"));
const fps = job.fps ?? 60;
const frameMs = 1000 / fps;
const frames = Math.round(job.duration * fps);
const stills = new Set(job.stills ?? [0]);
mkdirSync(dirname(job.out), { recursive: true });

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

// ── scroll path ───────────────────────────────────────────────────────────────
const EASES = {
  linear: (u) => u,
  inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  inSine: (u) => 1 - Math.cos((u * Math.PI) / 2),
  outSine: (u) => Math.sin((u * Math.PI) / 2),
};

// Constant speed with sine-shaped acceleration over `ramp` seconds at each end.
function cruise(tau, D, R) {
  R = Math.min(R, D / 2);
  if (R <= 0) return tau / D;
  const area = D - R;
  const ramp = (x) => x / 2 - (R / (2 * Math.PI)) * Math.sin((Math.PI * x) / R);
  let pos;
  if (tau < R) pos = ramp(tau);
  else if (tau <= D - R) pos = R / 2 + (tau - R);
  else pos = area - ramp(D - tau);
  return pos / area;
}

function scrollAt(sec) {
  const p = job.path;
  if (sec <= p[0].t) return p[0].y;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    if (sec <= b.t) {
      const D = b.t - a.t;
      const tau = sec - a.t;
      const u = b.ease === "cruise" ? cruise(tau, D, b.ramp ?? 1) : (EASES[b.ease ?? "linear"] ?? EASES.linear)(tau / D);
      return a.y + (b.y - a.y) * u;
    }
  }
  return p[p.length - 1].y;
}

// ── typed input: per-character times with a little human unevenness ────────────
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const events = (job.events ?? []).map((e, n) => {
  if (!e.type) return { ...e, done: false };
  const rand = mulberry32(1234 + n);
  const cps = e.cps ?? 10;
  const times = [];
  let t = e.t;
  for (const ch of e.type) {
    times.push(t);
    t += (1 / cps) * (0.55 + 0.9 * rand()) + (ch === " " ? 0.04 : 0);
  }
  return { ...e, times, typed: 0, done: false };
});

// ── browser ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ channel: "chrome", headless: true });
// "mobile" means a phone user agent at the job's viewport. Chrome's isMobile emulation is
// opt-in ("isMobile": true): it widens the layout viewport to fit any horizontal overflow,
// which shifts pages like leonardopower.com sideways in the screenshot.
const context = await browser.newContext({
  viewport: job.viewport,
  deviceScaleFactor: job.dsf ?? 1,
  isMobile: !!job.isMobile,
  hasTouch: !!job.isMobile,
  userAgent: job.mobile ? MOBILE_UA : undefined,
  locale: "en-GB",
  timezoneId: "Europe/London",
  colorScheme: "light",
});
await context.clock.install();
const page = await context.newPage();
page.on("request", (r) => {
  if (r.method() !== "GET") console.log(`  NET ${r.method()} ${r.url()}`);
});

await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(job.settleMs ?? 2500);

for (const step of job.setup ?? []) {
  if (step.click) {
    try {
      await page.locator(step.click).first().click({ timeout: step.timeout ?? 5000 });
    } catch (e) {
      if (!step.optional) throw e;
      console.log(`  (optional click skipped: ${step.click})`);
    }
  }
  if (step.scrollTo !== undefined) {
    await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), step.scrollTo);
  }
  if (step.evaluate) await page.evaluate(step.evaluate);
  if (step.wait) await page.waitForTimeout(step.wait);
}

// Fail fast if a blocking overlay (a cookie banner) is still on top after setup.
if (job.expectHidden) {
  const still = await page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].some((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight) return false;
      const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
      return el.contains(document.elementFromPoint(x, y));
    });
  }, job.expectHidden);
  if (still) throw new Error(`${job.expectHidden} is still showing after setup`);
}

// A path can be relative to an element: "anchor": { "selector": ".contact__form", "offset": -240 }
if (job.anchor && job.path) {
  const base = await page.evaluate(({ selector, offset }) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`missing anchor ${selector}`);
    return el.getBoundingClientRect().top + window.scrollY + (offset ?? 0);
  }, job.anchor);
  for (const p of job.path) p.y += base;
}

// Park on the first position in real time so on-load and reveal animations have run,
// then freeze the page clock. From here on, time only moves when we step it.
if (job.path) await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), scrollAt(0));
await page.waitForTimeout(job.preRollMs ?? 1500);
const pageNow = await page.evaluate(() => Date.now());
await page.clock.pauseAt(pageNow + 20);

// ── encoder ───────────────────────────────────────────────────────────────────
const ff = spawn(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", String(job.crf ?? 12),
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    job.out,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

async function fireEvents(sec) {
  for (const e of events) {
    if (e.done || sec + 1e-9 < e.t) continue;
    if (e.click) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`missing ${sel}`);
        el.click();
      }, e.click);
      e.done = true;
    } else if (e.press) {
      await page.keyboard.press(e.press);
      e.done = true;
    } else if (e.type) {
      if (e.typed === 0 && e.into) await page.evaluate((sel) => document.querySelector(sel)?.focus(), e.into);
      while (e.typed < e.times.length && e.times[e.typed] <= sec + 1e-9) {
        await page.keyboard.type(e.type[e.typed]);
        e.typed++;
      }
      e.done = e.typed === e.times.length;
    }
  }
}

const started = Date.now();
for (let i = 0; i < frames; i++) {
  const sec = i / fps;
  const T = i * frameMs;
  if (job.path) await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), scrollAt(sec));
  await fireEvents(sec);
  // one real rendering pass so scroll events / IntersectionObservers fire and start transitions
  await page.waitForTimeout(24);
  if (i > 0) await page.clock.runFor(frameMs);
  await page.evaluate((T) => {
    for (const a of document.getAnimations()) {
      if (a.timeline !== document.timeline) continue; // scroll-driven animations follow the scroll
      if (a.__vt0 === undefined) {
        a.__vt0 = T;
        a.__vc0 = Number(a.currentTime) || 0;
        a.pause();
      }
      a.currentTime = a.__vc0 + (T - a.__vt0) * (a.playbackRate || 1);
    }
  }, T);
  const png = await page.screenshot({ type: "png", caret: "initial", animations: "allow" });
  if (stills.has(i)) writeFileSync(join(dirname(job.out), `${basename(job.out, ".mp4")}-f${i}.png`), png);
  if (!ff.stdin.write(png)) await once(ff.stdin, "drain");
  if (i % fps === 0) console.log(`  frame ${i}/${frames}  ${((Date.now() - started) / 1000).toFixed(0)}s elapsed`);
}

ff.stdin.end();
const [code] = await once(ff, "close");
await browser.close();
if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
console.log(`done: ${job.out} (${frames} frames, ${((Date.now() - started) / 1000).toFixed(0)}s)`);
