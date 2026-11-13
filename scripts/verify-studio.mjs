import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const viewports = [
  [1920, 1080],
  [1880, 690],
  [1855, 829],
  [1672, 941],
  [1440, 900],
  [1366, 768],
  [1754, 878],
];

const server = await createServer({
  configFile: false,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
let browser;

try {
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address === "object", "Vite exposes a local test port");
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1754, height: 878 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: "networkidle" });

  const reports = [];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    const report = await page.evaluate(() => {
      const browser = globalThis;
      const doc = browser.document;
      const box = (selector) => {
        const { x, y, width, height, right, bottom } = doc.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height, right, bottom };
      };
      const header = box(".topbar");
      const navigation = box(".module-nav");
      const ribbon = box(".command-ribbon");
      const left = box(".left-rail");
      const scene = box(".scene-preview");
      const dock = box(".lower-workspace");
      const inspector = box(".inspector");
      const footer = box("footer");
      const labelGaps = [...doc.querySelectorAll(".command-group")].flatMap((group) => {
        const label = group.querySelector("span");
        const firstButton = group.querySelector("button");
        return label && firstButton
          ? [firstButton.getBoundingClientRect().top - label.getBoundingClientRect().bottom]
          : [];
      });
      return {
        viewport: [browser.innerWidth, browser.innerHeight],
        document: [doc.documentElement.scrollWidth, doc.documentElement.scrollHeight],
        header,
        navigation,
        ribbon,
        left,
        scene,
        dock,
        inspector,
        footer,
        minimumLabelGap: labelGaps.length ? Math.min(...labelGaps) : null,
      };
    });

    assert.deepEqual(report.document, [width, height], `no page overflow at ${width}×${height}`);
    assert.equal(Math.round(report.header.height), 44, `44px header at ${width}×${height}`);
    assert.equal(Math.round(report.navigation.height), 34, `34px navigation at ${width}×${height}`);
    assert.equal(Math.round(report.ribbon.height), 60, `60px command ribbon at ${width}×${height}`);
    assert.equal(Math.round(report.footer.height), 38, `38px footer at ${width}×${height}`);
    assert.equal(Math.round(report.footer.bottom), height, `footer reaches viewport bottom at ${width}×${height}`);
    assert.ok(report.left.right <= report.scene.x + 1, `left rail does not overlap canvas at ${width}×${height}`);
    assert.ok(report.scene.right <= report.inspector.x + 1, `canvas does not overlap inspector at ${width}×${height}`);
    assert.ok(report.scene.bottom <= report.dock.y + 1, `canvas does not overlap dock at ${width}×${height}`);
    assert.ok(Math.abs(report.scene.x - report.dock.x) <= 1, `canvas and dock share the same left edge at ${width}×${height}`);
    assert.ok(Math.abs(report.scene.width - report.dock.width) <= 1, `canvas and dock share the same width at ${width}×${height}`);
    assert.ok(report.minimumLabelGap === null || report.minimumLabelGap >= 0, `ribbon labels clear buttons at ${width}×${height}`);
    reports.push({ viewport: `${width}×${height}`, noOverflow: true, noOverlap: true });

    if ((width === 1754 && height === 878) || (width === 1672 && height === 941)) {
      const directory = resolve("outputs");
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: resolve(directory, `studio-acceptance-${width}x${height}.png`) });
    }
  }

  await page.setViewportSize({ width: 1754, height: 878 });
  const coreTools = ["select", "paletteBrush", "fixture", "material", "shapes", "text", "measure", "orbit"];
  for (const key of coreTools) {
    assert.equal(await page.locator(`[data-tool="${key}"]`).isEnabled(), true, `${key} tool is enabled`);
  }
  const canvasBefore = await page.locator(".scene-preview").boundingBox();
  await page.locator('[data-tool="shapes"]').click();
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 1, "Shapes adds an editable canvas object");
  await page.locator('[data-tool="text"]').click();
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 2, "Text adds an editable canvas object");
  await page.locator('[data-tool="measure"]').click();
  await page.locator(".design-canvas").press("ArrowRight");
  assert.match(await page.locator("#status").innerText(), /canvas units/i, "Measure reports a live canvas distance");
  await page.locator('[data-layer-fixture]').nth(1).click();
  assert.equal(await page.locator('[data-layer-fixture]').nth(1).getAttribute("aria-pressed"), "true", "fixture selection follows the selected project fixture");
  await page.locator('[data-module="palette"]').click();
  assert.equal(await page.locator(".palette-panel").isVisible(), true, "2D palette view opens");
  assert.equal(await page.locator("#palette-inspector-panel").isVisible(), true, "Palette Engine module selects the palette inspector");
  await page.locator('[data-module="light"]').click();
  assert.equal(await page.locator("#fixture-inspector-panel").isVisible(), true, "Light Lab module selects the fixture inspector");
  for (const group of ["fixture", "light", "dmx", "effects"]) {
    assert.equal(await page.locator(`#fixture-inspector-panel .inspector-group-${group}`).isVisible(), true, `${group} controls are visible in the unified inspector`);
  }
  assert.equal(await page.locator(".inspector-tabs").isHidden(), true, "fixture inspector has no nested tab menu");
  for (const selector of [".fixture-configuration-details", ".light-advanced-controls"]) {
    assert.equal(await page.locator(`#fixture-inspector-panel ${selector}`).evaluate((element) => element.open), false, `${selector} keeps secondary controls compact by default`);
  }
  assert.match(await page.locator("#fixture-inspector-panel").innerText(), /Type\s+[\s\S]*?Mode\s+/, "fixture type and channel mode are identified from its real profile");
  assert.equal(await page.locator(".inspector-group-effects").evaluate((element) => element.getBoundingClientRect().bottom <= globalThis.document.querySelector(".lux-panel.is-docked").getBoundingClientRect().top), true, "Effects remain visible above the docked Lux panel at the reference viewport");
  await page.locator("#play-tracks").click();
  assert.equal(await page.locator("#stop-cue").isEnabled(), true, "timeline playback starts");
  await page.locator("#stop-cue").click();
  await page.locator("#project-name").fill("Studio Acceptance");
  await page.locator("#project-name").press("Tab");
  await page.locator("#save").click();
  const exportPromise = page.waitForEvent("download");
  await page.locator('[data-export="project"]').click();
  const projectExport = await exportPromise;
  const exportPath = await projectExport.path();
  assert.ok(exportPath, "Project JSON export produces a file");
  const exportedProject = JSON.parse(await readFile(exportPath, "utf8"));
  assert.equal(exportedProject.name, "Studio Acceptance", "Project JSON contains the saved project name");
  await page.reload();
  assert.equal(await page.locator("#project-name").inputValue(), "Studio Acceptance", "Project name persists across reload");
  await page.locator("#import-project").click();
  await page.locator("#project-file").setInputFiles(exportPath);
  await page.waitForFunction(() => globalThis.document.querySelector("#project-name")?.value === "Studio Acceptance");
  assert.equal(await page.locator("#project-name").inputValue(), "Studio Acceptance", "Exported project imports through the existing file picker handler");
  const canvasAfter = await page.locator(".scene-preview").boundingBox();
  assert.deepEqual(canvasAfter, canvasBefore, "ordinary tools and view changes preserve the canvas bounds");
  assert.deepEqual(runtimeErrors, [], "browser reports no runtime errors");

  console.log(JSON.stringify({ viewports: reports, tools: coreTools, shapeAndTextCreation: true, measurement: true, fixtureSelection: true, paletteSwitch: true, timelinePlayback: true, projectSaveReload: true, projectJsonImportExport: true, canvasStayedFixed: true, runtimeErrors }, null, 2));
  await context.close();
} finally {
  await browser?.close();
  await server.close();
}

