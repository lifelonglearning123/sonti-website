// The 02:14 take — two real recordings made at the same moment, aligned by wall-clock time:
//   · the leonardopower.com page and its assistant, from a headless Chrome (page pixels only)
//   · the Windows taskbar clock: a 140×72 px grab of the tall display that contains nothing else
// No other part of the desktop is ever captured.
//
//   node night-rig.mjs --test                    dry run now (types ~25 s after start)
//   node night-rig.mjs --record --at 02:14:05    wait for the wall clock, then record and ask
import { chromium } from "playwright-core";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { appendFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out", "night");
mkdirSync(OUT, { recursive: true });

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const TEST = process.argv.includes("--test");
const AT = arg("at", "02:14:05");
const QUESTION = arg("question", "Could someone call me back tomorrow about a new site?");
const TAG = arg("tag", TEST ? "test" : "take");

// Physical pixels, primary-monitor origin: the right end of the tall display's taskbar.
const CLOCK = { x: 3700, y: 1672, w: 140, h: 72 };
const URL = "https://www.leonardopower.com";
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const log = (m) => {
  const line = `${new Date().toISOString()}  ${m}`;
  console.log(line);
  appendFileSync(join(OUT, "night-log.txt"), line + "\n");
};
const wall = () => Date.now() / 1000;
const sleepUntil = async (sec) => {
  const ms = sec * 1000 - Date.now();
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
};
function nextAt(hms) {
  const [h, m, s] = hms.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, s ?? 0, 0);
  if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
  return d.getTime() / 1000;
}

function grabClock(file, seconds) {
  return spawn(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-f", "gdigrab", "-framerate", "10", "-draw_mouse", "0",
      "-offset_x", String(CLOCK.x), "-offset_y", String(CLOCK.y),
      "-video_size", `${CLOCK.w}x${CLOCK.h}`, "-i", "desktop",
      "-t", String(seconds), "-c:v", "libx264", "-preset", "veryfast", "-crf", "8", "-pix_fmt", "yuv420p",
      file,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
}

async function startScreencast(page, dir) {
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", (f) => {
    const file = join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, ts: f.metadata?.timestamp ?? wall() });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  return async () => {
    await cdp.send("Page.stopScreencast").catch(() => {});
    return frames;
  };
}

// Variable-timed screencast frames → constant 30 fps, starting exactly at the clock grab's start.
function assemble(frames, startWall, endWall, out) {
  let k = 0;
  for (let i = 0; i < frames.length; i++) if (frames[i].ts <= startWall) k = i;
  const kept = frames.slice(k);
  const lines = ["ffconcat version 1.0"];
  kept.forEach((fr, i) => {
    const from = i === 0 ? startWall : fr.ts;
    const to = i + 1 < kept.length ? kept[i + 1].ts : endWall;
    lines.push(`file '${fr.file.replace(/\\/g, "/")}'`, `duration ${Math.max(0.001, to - from).toFixed(4)}`);
  });
  lines.push(`file '${kept[kept.length - 1].file.replace(/\\/g, "/")}'`);
  const list = out.replace(/\.mp4$/, ".ffconcat");
  writeFileSync(list, lines.join("\n"));
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
     "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-movflags", "+faststart", out],
    { stdio: "inherit" },
  );
  return r.status === 0;
}

const typeAt = TEST ? wall() + 25 : nextAt(AT);
const stamp = TEST ? "test" : AT.replace(/:/g, "");
const pageFile = join(OUT, `${TAG}-${stamp}-page.mp4`);
const clockFile = join(OUT, `${TAG}-${stamp}-clock.mp4`);
const framesDir = join(OUT, `${TAG}-${stamp}-frames`);
log(`armed: enquiry at ${new Date(typeAt * 1000).toString()}`);

await sleepUntil(typeAt - 75);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 432, height: 768 },
  deviceScaleFactor: 2.5,
  isMobile: false, // Chrome's mobile emulation widens this page's layout viewport and shifts it
  hasTouch: false,
  userAgent: MOBILE_UA,
  locale: "en-GB",
  timezoneId: "Europe/London",
  colorScheme: "light",
});
const page = await ctx.newPage();
page.on("request", (r) => {
  if (r.method() !== "GET") log(`NET ${r.method()} ${r.url()}`);
});
for (let attempt = 1; ; attempt++) {
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    break;
  } catch (e) {
    log(`load attempt ${attempt} failed: ${e.message.split("\n")[0]}`);
    if (attempt >= 5) throw e;
    await new Promise((r) => setTimeout(r, 8000));
  }
}
await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
// The consent banner swallows pointer events; press its own "Reject all" button in the page.
const rejected = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button, a, [role=button]")].find(
    (e) => /^reject all$/i.test(e.textContent.trim()) && e.getClientRects().length,
  );
  b?.click();
  return !!b;
});
await page.waitForTimeout(1200);
const bannerUp = await page.evaluate(() => {
  const el = document.querySelector(".lpc");
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight) return false;
  return el.contains(document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + r.height / 2, innerHeight - 1)));
});
log(`consent: rejected=${rejected} bannerStillUp=${bannerUp}`);
await page.evaluate(() => document.querySelector("[data-toggle-assist]").click());
await page.waitForTimeout(600);
log("assistant open");

await sleepUntil(typeAt - 15);
const clock = grabClock(clockFile, 60);
const startWall = wall();
const stopScreencast = await startScreencast(page, framesDir);
log("recording");

await sleepUntil(typeAt);
// The chat log and chips overlap the input's hit area on this layout, so focus it directly.
await page.evaluate(() => document.querySelector("[data-assist-form] input").focus());
await page.keyboard.type(QUESTION, { delay: 95 });
await page.waitForTimeout(450);
await page.keyboard.press("Enter");
const sentWall = wall();
log("enquiry sent");

await sleepUntil(typeAt + 40);
const frames = await stopScreencast();
const endWall = wall();
await once(clock, "close");
await browser.close();

const ok = frames.length > 0 && assemble(frames, startWall, endWall, pageFile);
writeFileSync(
  join(OUT, `${TAG}-${stamp}-sync.json`),
  JSON.stringify({ question: QUESTION, startWall, sentWall, endWall, frames: frames.length, pageFile, clockFile }, null, 2),
);
const good = ok && existsSync(pageFile) && existsSync(clockFile) && statSync(clockFile).size > 5000;
if (good) rmSync(framesDir, { recursive: true, force: true });
log(good ? `saved ${pageFile} + ${clockFile} (${frames.length} page frames)` : "FAILED — check the frames folder and log");
