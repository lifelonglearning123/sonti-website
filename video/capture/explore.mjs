// Recon pass before any recording: what leonardopower.com and the eleven client
// sites look like at phone width, where the consent banner and assistant live,
// and which inner pages exist. Screenshots are 1x — they are for planning only.
// Usage: node explore.mjs <out-dir>
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2];
if (!OUT) throw new Error("usage: node explore.mjs <out-dir>");
mkdirSync(join(OUT, "sites"), { recursive: true });

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const LP = "https://www.leonardopower.com";
const SITES = [
  "https://artificialignorance.io/",
  "https://jackintheboxtrainingltd.com/",
  "https://junabali.com/",
  "https://www.apexconstruction.site/",
  "https://www.cr-assoc.net/",
  "https://www.glassgardenrooms.net/",
  "https://www.growtth.ai/",
  "https://www.jselectricalswindon.co.uk/",
  "https://www.rblandscapesanddriveways.com/",
  "https://www.stonebasepavingandlandscaping.co.uk/",
  "https://www.woodboroughkennels.co.uk/",
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {};

const mobile = () =>
  browser.newContext({
    viewport: { width: 432, height: 768 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_UA,
  });

async function open(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

// leonardopower.com at phone width
{
  const ctx = await mobile();
  const page = await ctx.newPage();
  await open(page, LP);
  await page.screenshot({ path: join(OUT, "lp-m-00.png") });
  report.lpMobile = await page.evaluate(() => {
    const all = (s) => [...document.querySelectorAll(s)];
    return {
      height: document.documentElement.scrollHeight,
      consent: all('[class*="lpc-"]')
        .slice(0, 6)
        .map((e) => ({
          cls: String(e.className).slice(0, 120),
          text: e.innerText.slice(0, 200),
          buttons: [...e.querySelectorAll("button,a")].map((b) => b.innerText.trim()).filter(Boolean),
        })),
      assist: document.querySelector("[data-assist]")?.outerHTML.slice(0, 4000) ?? null,
      ids: all("[id]").map((e) => e.id).slice(0, 60),
    };
  });
  for (const f of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(report.lpMobile.height * f));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT, `lp-m-${String(Math.round(f * 100)).padStart(2, "0")}.png`) });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  try {
    await page.locator("[data-toggle-assist]").first().click({ timeout: 5000 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: join(OUT, "lp-m-assist.png") });
    report.lpMobileAssistText = await page.locator(".assist-panel").innerText();
  } catch (e) {
    report.lpMobileAssistErr = e.message;
  }
  await ctx.close();
}

// leonardopower.com on a desktop, for the "corner of the page" framing
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await open(page, LP);
  await page.screenshot({ path: join(OUT, "lp-d-top.png") });
  try {
    await page.locator("[data-toggle-assist]").first().click({ timeout: 5000 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: join(OUT, "lp-d-assist.png") });
  } catch (e) {
    report.lpDesktopAssistErr = e.message;
  }
  await ctx.close();
}

// the eleven client sites
report.sites = [];
for (const url of SITES) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const ctx = await mobile();
  const page = await ctx.newPage();
  const entry = { url, host };
  try {
    await open(page, url);
    await page.screenshot({ path: join(OUT, "sites", `${host}.png`) });
    Object.assign(
      entry,
      await page.evaluate(() => ({
        title: document.title,
        hasAssist: !!document.querySelector("[data-assist]"),
        height: document.documentElement.scrollHeight,
        links: [
          ...new Set(
            [...document.querySelectorAll("a[href]")]
              .map((a) => a.getAttribute("href"))
              .filter((h) => h && !/^(#|mailto:|tel:|javascript:)/.test(h)),
          ),
        ].slice(0, 40),
        forms: [...document.querySelectorAll("form")].slice(0, 5).map((f) => ({
          cls: String(f.className).slice(0, 80),
          fields: [...f.querySelectorAll("input,select,textarea")].map((i) => i.name || i.id || i.type),
        })),
      })),
    );
  } catch (e) {
    entry.error = e.message;
  }
  report.sites.push(entry);
  await ctx.close();
}

writeFileSync(join(OUT, "explore.json"), JSON.stringify(report, null, 2));
await browser.close();
console.log("done");
