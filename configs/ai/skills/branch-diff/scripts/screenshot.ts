// Screenshots a rendered page at phone, narrow, and wide widths, in light and
// dark, and prints any console errors. For checking the viewer by eye:
//   node scripts/screenshot.ts <page.html> <out-dir>
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const [page, outDir] = process.argv.slice(2);
if (!page || !outDir) throw new Error("usage: node scripts/screenshot.ts <page.html> <out-dir>");

const browser = await chromium.launch();
for (const colorScheme of ["light", "dark"] as const) {
  for (const [name, width] of [
    ["phone", 390],
    ["narrow", 760],
    ["wide", 1280],
  ] as const) {
    const tab = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
    tab.on(
      "console",
      (message) =>
        message.type() === "error" && console.error(`${name}/${colorScheme}: ${message.text()}`),
    );
    tab.on("pageerror", (error) => console.error(`${name}/${colorScheme}: ${error.message}`));
    await tab.goto(pathToFileURL(page).href);
    await tab.waitForTimeout(1500);
    await tab.screenshot({ path: `${outDir}/${name}-${colorScheme}.png` });
    // Big pages render diffs as they scroll into view, so pass over the whole page first.
    await tab.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
        scrollTo(0, y);
        await new Promise(requestAnimationFrame);
      }
      scrollTo(0, 0);
    });
    await tab.screenshot({ path: `${outDir}/${name}-${colorScheme}-full.png`, fullPage: true });
    await tab.close();
  }
}
await browser.close();
