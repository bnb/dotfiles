import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import type { DiffData } from "../src/data.ts";
import {
  createFixtureRepo,
  fixtureSpec,
  NOTE_TEXT,
  removeTempDirs,
  SCRIPT_BREAKOUT,
  tempDir,
  toJsonl,
} from "./helpers.ts";

const dist = (name: string) => fileURLToPath(new URL(`../dist/${name}`, import.meta.url));
const built = ["cli.mjs", "viewer.html", "grammars.json"].every((name) => existsSync(dist(name)));

const OLD_LINE = "export const line10 = 10;";
const NEW_LINE = 'export const line10 = "retry";';

async function box(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${locator} isn't visible`);
  return box;
}

describe.skipIf(!built)(
  built ? "viewer" : "viewer (skipped: dist/ is missing, run `pnpm build` first)",
  () => {
    let pageUrl: string;
    let data: DiffData;
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let errors: string[];

    beforeAll(async () => {
      const dir = tempDir();
      const cli = (...args: string[]) =>
        execFileSync(process.execPath, [dist("cli.mjs"), ...args], { encoding: "utf8" });
      const dataPath = join(dir, "data.json");
      const specPath = join(dir, "spec.jsonl");
      const pagePath = join(dir, "page.html");
      cli("collect", "--repo", createFixtureRepo().root, "--out", dataPath);
      writeFileSync(specPath, toJsonl(fixtureSpec()));
      cli("render", "--data", dataPath, "--spec", specPath, "--out", pagePath);
      data = JSON.parse(readFileSync(dataPath, "utf8")) as DiffData;
      pageUrl = pathToFileURL(pagePath).href;
      browser = await chromium.launch();
    }, 60_000);

    afterAll(async () => {
      await browser?.close();
      removeTempDirs();
    });

    beforeEach(async () => {
      context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      page = await context.newPage();
      errors = [];
      page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(pageUrl);
      await page.getByRole("heading", { level: 1 }).waitFor();
    });

    afterEach(async () => {
      await context.close();
      expect(errors).toEqual([]);
    });

    test("shows the header and the payload can't break out of its script tag", async () => {
      expect(await page.getByRole("heading", { level: 1 }).textContent()).toBe(
        "Retry the fixture app",
      );
      expect(await page.title()).toBe("feature/retry vs main");
      await page.getByText(SCRIPT_BREAKOUT).waitFor();
    });

    test("gives every changed file its own section", async () => {
      for (const file of data.files) {
        const name = file.oldPath ? `${file.oldPath} → ${file.path}` : file.path;
        await page.getByRole("main").getByRole("button", { name }).waitFor();
      }
      expect(await page.getByRole("main").getByRole("button", { expanded: true }).count()).toBe(
        data.files.length - 1,
      );
    });

    test("pins a note under the line it's about", async () => {
      const line = await box(page.getByText(NEW_LINE));
      const note = await box(page.getByText(/Check the\s+retry\s+count here/));
      const nextLine = await box(page.getByText("export const line11 = 11;"));
      expect(note.y).toBeGreaterThanOrEqual(line.y + line.height - 1);
      expect(note.y + note.height).toBeLessThanOrEqual(nextLine.y + 1);
      // Rendered as Markdown, not shown raw.
      expect(NOTE_TEXT).toContain("**retry**");
      expect(await page.getByText("**retry**").count()).toBe(0);
    });

    test("a file list link opens a collapsed generated file", async () => {
      const header = page.getByRole("main").getByRole("button", { name: /pnpm-lock\.yaml/ });
      expect(await header.getAttribute("aria-expanded")).toBe("false");
      expect(await page.getByText("settings: {}").count()).toBe(0);

      await page
        .getByRole("navigation", { name: "Files" })
        .getByRole("link", { name: /pnpm-lock\.yaml/ })
        .click();
      await page.getByText("settings: {}").waitFor();
      expect(await header.getAttribute("aria-expanded")).toBe("true");
    });

    test("switches to a split layout and remembers it", async () => {
      const oldLine = page.getByText(OLD_LINE);
      const newLine = page.getByText(NEW_LINE);
      const unifiedOld = await box(oldLine);
      const unifiedNew = await box(newLine);
      expect(unifiedNew.y).toBeGreaterThan(unifiedOld.y);
      expect(unifiedNew.x).toBe(unifiedOld.x);

      await page.getByRole("radio", { name: "split" }).click();
      await expect.poll(async () => (await box(newLine)).x).toBeGreaterThan(unifiedOld.x);
      expect(Math.abs((await box(newLine)).y - (await box(oldLine)).y)).toBeLessThan(2);

      await page.reload();
      await page.getByRole("radio", { name: "split", checked: true }).waitFor();
      await expect.poll(async () => (await box(newLine)).x).toBeGreaterThan((await box(oldLine)).x);
    });

    test("shows a placeholder for a binary file", async () => {
      const section = page.locator("section", {
        has: page.getByRole("button", { name: /logo\.png/ }),
      });
      await section.getByText("Binary file, not shown.").waitFor();
    });
  },
);
