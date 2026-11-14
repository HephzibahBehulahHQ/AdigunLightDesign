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
  assert.equal(await page.locator(".header-save-status").innerText(), "Saved locally", "the seeded reference project is saved in browser storage on first open");

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
  assert.equal(await page.locator(".left-rail-heading").isVisible(), true, "left rail has the compact project/layers/tools header from the reference");
  assert.deepEqual(await page.locator('[data-command-group="project"]').evaluate((group)=>[...group.querySelectorAll("button")].map((button)=>button.id)),["new-project","open-project","save","import-image"],"project commands match New, Open, Save, Import order");
  const importChooser=page.waitForEvent("filechooser");
  await page.locator("#import-image").click();
  await importChooser;
  assert.equal(await page.locator('.command-ribbon [data-command-group="view"]').count(), 0, "module navigation does not repeat a duplicate view group in the command ribbon");
  assert.equal(await page.locator('[data-command-group="scene"] [data-open-scene-editor="room"]').isVisible(), true, "Scene ribbon opens room dimensions");
  assert.equal(await page.locator('[data-command-group="scene"] [data-open-scene-editor="stage"]').isVisible(), true, "Scene ribbon opens stage settings");
  assert.equal(await page.locator('[data-command-group="scene"] [data-camera-axis]').count(), 3, "X/Y/Z camera views are docked in the Scene ribbon");
  assert.equal(await page.locator(".scene-preview .viewport-axis-controls").count(), 0, "camera controls do not cover the 3D canvas");
  for (const selector of ["#viewport-performance", "#viewport-fit", "#viewport-fullscreen", "#preview-quality"]) {
    assert.equal(await page.locator(`.workspace-tabs ${selector}`).count(), 1, `${selector} stays docked in the scene header`);
  }
  const sceneHeaderCanvas=await page.locator(".scene-preview").boundingBox();
  await page.locator("#viewport-performance").click();
  assert.equal(await page.locator("#preview-quality").inputValue(), "performance", "Performance switches the renderer to its real performance profile");
  await page.locator("#viewport-performance").click();
  assert.equal(await page.locator("#preview-quality").inputValue(), "balanced", "Performance toggles back to the balanced renderer profile");
  await page.locator("#viewport-fit").click();
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(), sceneHeaderCanvas, "Fit resets the camera without moving the canvas");
  for (const axis of ["x", "y", "z"]) {
    const control = page.locator(`[data-command-group="scene"] [data-camera-axis="${axis}"]`);
    assert.equal(await control.isEnabled(), true, `${axis.toUpperCase()} camera view is enabled with the active WebGL renderer`);
    await control.click();
  }
  const coreTools = ["select", "paletteBrush", "fixture", "material", "shapes", "text", "measure", "orbit"];
  for (const key of coreTools) {
    assert.equal(await page.locator(`[data-tool="${key}"]`).isEnabled(), true, `${key} tool is enabled`);
  }
  const canvasBefore = await page.locator(".scene-preview").boundingBox();
  const ribbonScroll = await page.locator(".command-ribbon").evaluate((element) => {
    const maxScroll = element.scrollWidth - element.clientWidth;
    element.scrollLeft = maxScroll;
    return { maxScroll, scrollLeft: element.scrollLeft };
  });
  assert.ok(ribbonScroll.maxScroll > 0, "long command ribbon scrolls horizontally inside its lane");
  assert.ok(ribbonScroll.scrollLeft > 0, "horizontal ribbon scrolling reaches additional commands");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(), canvasBefore, "scrolling the command ribbon leaves the central canvas in place");
  await page.locator('[data-tool="shapes"]').click();
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 1, "Shapes adds an editable canvas object");
  await page.locator('[data-tool="text"]').click();
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 2, "Text adds an editable canvas object");
  const firstSceneId=await page.locator("#scene-select").inputValue();
  await page.locator("#save").click();
  const projectForSceneSwitch=await page.evaluate(()=>JSON.parse(localStorage.getItem("adigunlightdesign/project-v1")));
  projectForSceneSwitch.scenes.push({...structuredClone(projectForSceneSwitch.scenes[0]),id:"acceptance-secondary-scene",name:"Secondary room",canvasObjects:[]});
  await page.evaluate((project)=>localStorage.setItem("adigunlightdesign/project-v1",JSON.stringify(project)),projectForSceneSwitch);
  await page.reload();
  assert.equal(await page.locator("#scene-select option").count(), 2, "scene selector reflects scenes in the saved project");
  await page.locator("#scene-select").selectOption("acceptance-secondary-scene");
  assert.match(await page.locator("#scene-select option:checked").innerText(), /Secondary room/, "scene selector switches to the selected project scene");
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 0, "scene selection shows its own canvas objects");
  await page.locator('[data-tool="shapes"]').click();
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 1, "canvas editing writes to the selected scene");
  await page.locator("#scene-select").selectOption(firstSceneId);
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 2, "switching back preserves the first scene canvas");
  await page.locator("#scene-select").selectOption("acceptance-secondary-scene");
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 1, "secondary scene edits persist independently");
  await page.locator("#scene-select").selectOption(firstSceneId);
  await page.locator('[data-open-scene-editor="room"]').click();
  const firstRoomWidth=await page.locator("#room-width").inputValue();
  await page.locator("#scene-select").selectOption("acceptance-secondary-scene");
  await page.locator('[data-open-scene-editor="room"]').click();
  await page.locator("#room-width").fill("6.5");
  await page.locator("#apply-room").click();
  await page.locator("#scene-select").selectOption(firstSceneId);
  assert.equal(await page.locator("#room-width").inputValue(), String(firstRoomWidth), "Room edits do not leak into another scene");
  await page.locator("#scene-select").selectOption("acceptance-secondary-scene");
  assert.equal(await page.locator("#room-width").inputValue(), "6.5", "Room edits apply to the selected scene");
  await page.locator("#scene-select").selectOption(firstSceneId);
  await page.locator("#scene-select").selectOption(firstSceneId);
  await page.locator('[data-tool="measure"]').click();
  await page.locator(".design-canvas").press("ArrowRight");
  assert.match(await page.locator("#status").innerText(), /canvas units/i, "Measure reports a live canvas distance");
  await page.locator('[data-layer-fixture]').nth(1).click();
  assert.equal(await page.locator('[data-layer-fixture]').nth(1).getAttribute("aria-pressed"), "true", "fixture selection follows the selected project fixture");
  await page.locator('[data-module="palette"]').click();
  assert.equal(await page.locator(".palette-panel").isVisible(), true, "2D palette view opens");
  assert.match(await page.locator('[data-module="light"]').innerText(), /3D Light Lab/, "module navigation matches the approved studio label");
  assert.equal(await page.locator("#palette-inspector-panel").isVisible(), true, "Palette Engine module selects the palette inspector");
  const canvasBeforeSceneSettings=await page.locator(".scene-preview").boundingBox();
  await page.locator('[data-open-scene-editor="room"]').click();
  assert.equal(await page.locator(".scene-preview.light-canvas").isVisible(), true, "Room command opens its real settings in the 3D studio");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(), canvasBeforeSceneSettings, "opening Room settings leaves the canvas in place");
  assert.equal(await page.locator('[data-scene-editor="room"]').evaluate((element) => element.open), true, "Room ribbon command opens the existing editable dimensions");
  await page.locator('[data-module="light"]').click();
  assert.equal(await page.locator("#fixture-inspector-panel").isVisible(), true, "Light Lab module selects the fixture inspector");
  await page.locator('[data-open-scene-editor="room"]').click();
  assert.equal(await page.locator('[data-scene-editor="room"]').evaluate((element) => element.open), true, "Room ribbon command opens the existing editable dimensions");
  await page.locator('[data-open-scene-editor="stage"]').click();
  assert.equal(await page.locator('[data-scene-editor="stage"]').evaluate((element) => element.open), true, "Stage ribbon command opens the existing editable platform settings");
  for (const group of ["fixture", "light", "dmx", "effects"]) {
    assert.equal(await page.locator(`#fixture-inspector-panel .inspector-group-${group}`).isVisible(), true, `${group} controls are visible in the unified inspector`);
  }
  const fixtureColor = page.locator("#fixture-colour");
  const originalFixtureColor = await fixtureColor.inputValue();
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), originalFixtureColor.toUpperCase(), "the inspector exposes the selected fixture's actual hex colour");
  assert.equal(await page.locator("#fixture-blue-channel").isVisible(), true, "supported RGB fixtures expose the blue DMX channel in the visible Light group");
  await page.locator("#fixture-blue-channel").fill("199");
  assert.equal(await page.locator("#fixture-blue-channel-value").innerText(), "78%", "blue channel shows its normalized value");
  assert.equal(await fixtureColor.inputValue(), originalFixtureColor, "blue channel edits remain staged before Apply");
  await page.locator("#apply-fixture").click();
  assert.equal(Number.parseInt((await fixtureColor.inputValue()).slice(-2), 16), 199, "Apply commits the selected fixture's exact blue channel");
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), (await fixtureColor.inputValue()).toUpperCase(), "the hex readout follows the applied fixture colour");
  await page.locator("#undo").click();
  assert.equal(await fixtureColor.inputValue(), originalFixtureColor, "Undo restores the blue channel transaction");
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), originalFixtureColor.toUpperCase(), "Undo also restores the visible hex readout");
  assert.equal(await page.locator(".inspector-tabs").isHidden(), true, "fixture inspector has no nested tab menu");
  for (const selector of [".fixture-configuration-details", ".light-advanced-controls"]) {
    assert.equal(await page.locator(`#fixture-inspector-panel ${selector}`).evaluate((element) => element.open), false, `${selector} keeps secondary controls compact by default`);
  }
  assert.match(await page.locator("#fixture-inspector-panel").innerText(), /Type\s+[\s\S]*?Mode\s+/, "fixture type and channel mode are identified from its real profile");
  const effectsBottom = await page.locator(".inspector-group-effects").evaluate((element) => element.getBoundingClientRect().bottom);
  const luxTop = await page.locator(".lux-panel.is-docked").evaluate((element) => element.getBoundingClientRect().top);
  assert.ok(effectsBottom <= luxTop, `Effects remain visible above docked Lux (effects bottom ${effectsBottom}, Lux top ${luxTop})`);
  await page.locator('[data-module="library"]').click();
  assert.equal(await page.locator('.fixture-library [data-profile="generic-led-strip-rgb"]').count(), 1, "the library exposes the tested virtual LED strip profile");
  await page.locator('[data-module="light"]').click();
  assert.equal(await page.locator("[data-layer-fixture]").count(), 9, "the Studio Mood starter project opens with the nine real virtual fixtures in the approved composition");
  await page.locator("[data-layer-fixture]").last().click();
  assert.match(await page.locator(".inspector > .section-title h2").innerText(), /LED Strip RGB 9/, "the reference LED strip is selected on first open");
  assert.equal(await page.locator("[data-layer-fixture]").count(), 9, "the fixture list contains the nine real virtual fixtures in the target composition");
  const visibleFixtureCount=await page.locator(".fixture-layer-list").evaluate((list)=>[...list.querySelectorAll("[data-layer-fixture]")].filter((button)=>{const row=button.getBoundingClientRect(),area=list.getBoundingClientRect();return row.top>=area.top&&row.bottom<=area.bottom;}).length);
  assert.equal(visibleFixtureCount, 9, "all nine reference fixtures fit in the visible left list at 1754×878");
  assert.match(await page.locator(".scene-title small").innerText(), /9\/9 fixtures rendered/, "the target composition renders all nine actual virtual fixtures");
  assert.equal(await page.locator(".inspector > .section-title h2").innerText(), "Selected: LED Strip RGB 9", "the reference fixture is selected from the real nine-fixture composition");
  await page.locator("#fixture-colour").fill("#2196F3");
  await page.locator("#apply-fixture").click();
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), "#2196F3", "the selected LED strip receives the reference swatch through Apply");
  await page.locator("#fixture-blue-channel").fill("199");
  assert.equal(await page.locator("#fixture-blue-channel-value").innerText(), "78%", "the screenshot shows the staged reference channel value");
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), "#2196F3", "staging the blue value leaves the applied fixture colour unchanged");
  await page.evaluate(()=>document.activeElement?.blur?.());
  await page.locator("#reset-camera").click();
  await page.screenshot({ path: resolve("outputs", "studio-acceptance-reference-1754x878.png") });
  for (let index = 0; index < 2; index += 1) await page.locator("#add-fixture").click();
  const fixtureList = page.locator(".fixture-layer-list");
  const fixtureListScroll = await fixtureList.evaluate((element) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    element.scrollTop = maxScroll;
    return { maxScroll, scrollTop: element.scrollTop };
  });
  assert.ok(fixtureListScroll.maxScroll > 0, "fixture list scrolls independently when the project has enough fixtures");
  assert.ok(fixtureListScroll.scrollTop > 0, "fixture list reaches fixtures outside its visible area");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(), canvasBefore, "scrolling the fixture list leaves the central canvas in place");
  await fixtureList.evaluate((element) => { element.scrollTop = 0; });
  await page.locator("#fixture-inspector-panel details").evaluateAll((elements) => elements.forEach((element) => { element.open = true; }));
  const inspectorScroll = await page.locator("#fixture-inspector-panel").evaluate((element) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    element.scrollTop = maxScroll;
    return { maxScroll, scrollTop: element.scrollTop };
  });
  assert.ok(inspectorScroll.maxScroll > 0, "expanded inspector settings scroll inside the inspector panel");
  assert.ok(inspectorScroll.scrollTop > 0, "inspector reaches settings outside its visible area");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(), canvasBefore, "scrolling the inspector leaves the central canvas in place");
  await page.locator("#fixture-inspector-panel").evaluate((element) => { element.scrollTop = 0; });
  for (const selector of ["#create-cue", "#play-tracks", "#pause-playback", "#stop-cue", "#sequence-loop"]) {
    assert.equal(await page.locator(`.timeline-transport ${selector}`).count(), 1, `${selector} is docked in the timeline transport`);
  }
  await page.locator("#sequence-loop").check();
  await page.locator("#create-cue").click();
  await page.locator("#play-tracks").click();
  assert.equal(await page.locator("#stop-cue").isEnabled(), true, "timeline playback starts");
  assert.equal(await page.locator("#pause-playback").isEnabled(), true, "timeline pause is enabled during playback");
  await page.locator("#pause-playback").click();
  assert.equal((await page.locator("#pause-playback").innerText()).trim(), "Resume", "timeline pause toggles to resume");
  await page.locator("#pause-playback").click();
  assert.equal((await page.locator("#pause-playback").innerText()).trim(), "Pause", "timeline playback resumes");
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
  await page.locator("#open-project").click();
  await page.locator("#project-file").setInputFiles(exportPath);
  await page.waitForFunction(() => globalThis.document.querySelector("#project-name")?.value === "Studio Acceptance");
  assert.equal(await page.locator("#project-name").inputValue(), "Studio Acceptance", "Exported project opens through the project file picker");
  page.once("dialog",(dialog)=>dialog.dismiss());
  await page.locator("#new-project").click();
  assert.equal(await page.locator("#project-name").inputValue(), "Studio Acceptance", "canceling New preserves the current project");
  page.once("dialog",(dialog)=>dialog.accept());
  await page.locator("#new-project").click();
  await page.waitForFunction(()=>globalThis.document.querySelector("#project-name")?.value==="Studio Mood");
  assert.equal(await page.locator("[data-layer-fixture]").count(),9,"New creates a fresh reference starter project");
  assert.equal(await page.locator(".header-save-status").innerText(),"Saved locally","New saves its fresh starter project locally");
  const canvasAfter = await page.locator(".scene-preview").boundingBox();
  assert.deepEqual(canvasAfter, canvasBefore, "ordinary tools and view changes preserve the canvas bounds");
  assert.deepEqual(runtimeErrors, [], "browser reports no runtime errors");

  console.log(JSON.stringify({ viewports: reports, tools: coreTools, shapeAndTextCreation: true, measurement: true, fixtureSelection: true, paletteSwitch: true, timelinePlayback: true, projectSaveReload: true, projectJsonImportExport: true, commandRibbonScroll: true, fixtureListScroll: true, inspectorScroll: true, canvasStayedFixed: true, runtimeErrors }, null, 2));
  await context.close();
} finally {
  await browser?.close();
  await server.close();
}

