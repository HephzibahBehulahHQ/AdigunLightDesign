import assert from "node:assert/strict";
import axe from "axe-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { messages, supportedLocales } from "../src/i18n.js";
import { chromium, firefox } from "playwright";
import { createServer, preview } from "vite";

const viewports = [
  [1920, 1080],
  [1880, 690],
  [1855, 829],
  [1672, 941],
  [1440, 900],
  [1366, 768],
  [1754, 878],
];

async function verifyAccessibility(page, screen) {
  if (!await page.evaluate(() => Boolean(globalThis.axe))) await page.addScriptTag({content:axe.source});
  const {violations} = await page.evaluate(() => globalThis.axe.run({
    runOnly:{type:"tag", values:["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]},
  }));
  const failures = violations.map(rule => `${rule.id}: ${rule.nodes.map(node => node.target.join(" > ")).join(", ")}`);
  assert.deepEqual(failures, [], `${screen} has no automated axe violations`);
}

async function verifyUtilityControls(page) {
  const menu = page.locator(".topbar .top-menu");
  const controls = menu.locator(".top-menu-button");
  const viewport = await page.evaluate(() => globalThis.innerWidth);
  assert.equal(await controls.count(), 5, "all five utility controls are present");
  let previousRight = 0;
  for (const control of await controls.all()) {
    const bounds = await control.evaluate(element => {
      const {left, right, width, height} = element.getBoundingClientRect();
      return {x:left, right, width, height};
    });
    assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44, "each utility control has a 44px target");
    assert.ok(bounds.x >= previousRight && bounds.right <= viewport, "utility controls are separate and within the viewport");
    assert.ok(await control.getAttribute("title"), "each utility control has a tooltip");
    previousRight = bounds.right;
  }
  const account = menu.locator("#account-menu");
  await account.focus();
  await page.keyboard.press("Tab");
  const locale = menu.locator("#locale");
  assert.equal(await locale.evaluate(select => select.ownerDocument.activeElement === select), true, "Tab reaches Language directly after Account");
  assert.deepEqual(await locale.locator("option").evaluateAll(options => options.map(option => option.value)), ["en", "de", "yo", "pcm"]);
}

async function verifyVirtualPlayback(browser, studioUrl) {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(()=>{
    globalThis.fixtureUploads=0;
    const upload=globalThis.WebGLRenderingContext.prototype.bufferData;
    globalThis.WebGLRenderingContext.prototype.bufferData=function(...args){
      globalThis.fixtureUploads++;
      return upload.apply(this,args);
    };
  });
  try {
    await page.goto(studioUrl);
    await verifyAccessibility(page, "desktop studio");
    const projectMenu = page.locator('[data-command-menu-trigger="project"]');
    const sceneMenu = page.locator('[data-command-menu-trigger="scene"]');
    const projectDialog = page.locator(".project-dialog");
    const requireFocus = (control, message) => control.evaluate(element => element.ownerDocument.activeElement === element).then(focused => assert.equal(focused, true, message));
    await projectMenu.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await projectDialog.waitFor();
    await page.keyboard.press("Escape");
    await projectDialog.waitFor({state:"detached"});
    await requireFocus(projectMenu, "Escape returns focus from Open Project to the Project menu");
    const canvas = page.locator("#light-canvas");
    const readPreviewPixels = async () => {
      const screenshot = await canvas.screenshot();
      return page.evaluate(async (base64) => {
        const response = await globalThis.fetch(`data:image/png;base64,${base64}`);
        const bitmap = await globalThis.createImageBitmap(await response.blob());
        const sample = globalThis.document.createElement("canvas");
        sample.width = 96;
        sample.height = 54;
        const ctx = sample.getContext("2d");
        ctx.drawImage(bitmap, 0, 0, sample.width, sample.height);
        bitmap.close();
        return Array.from(ctx.getImageData(0, 0, sample.width, sample.height).data);
      }, screenshot.toString("base64"));
    };
    const savedLighting = await readPreviewPixels();
    const colorDifference = pixels => pixels.reduce((total, value, index) => total + Math.abs(value - savedLighting[index]), 0) / pixels.length;
    const virtualDimmer = page.locator(".virtual-dmx-channel").filter({has:page.getByText("dimmer", {exact:true})}).locator("strong");
    const savedDimmer = await virtualDimmer.textContent();
    await page.locator("#effect-period").fill("5");
    await page.locator("#play-effect").click();
    const studioStatus = page.locator("#status");
    assert.equal(await studioStatus.getAttribute("aria-live"), "off", "playback does not announce every status refresh");
    await page.waitForFunction(before => [...globalThis.document.querySelectorAll(".virtual-dmx-channel")].some(channel =>
      channel.querySelector("span")?.textContent === "dimmer" && channel.querySelector("strong")?.textContent !== before), savedDimmer);
    await page.locator("#pause-playback").click();
    const pulseDifference = colorDifference(await readPreviewPixels());
    const pausedUploads=await page.evaluate(async()=>{
      await new Promise(resolve=>globalThis.setTimeout(resolve,250));
      const before=globalThis.fixtureUploads;
      await new Promise(resolve=>globalThis.setTimeout(resolve,350));
      return globalThis.fixtureUploads-before;
    });
    assert.equal(pausedUploads,0,"a stable paused frame makes no geometry uploads");
    assert.ok(pulseDifference > 1, `the virtual pulse changes rendered fixture lighting (${pulseDifference.toFixed(2)})`);
    assert.match(await page.locator("#virtual-dmx-monitor header").textContent(), /output:\s*disabled/i);
    await page.locator("#stop-cue").click();
    assert.equal(await studioStatus.getAttribute("aria-live"), "polite", "ordinary studio announcements resume after playback");
    assert.equal(await virtualDimmer.textContent(), savedDimmer, "stopping the effect restores the saved virtual DMX level");
    const stoppedDifference = colorDifference(await readPreviewPixels());
    assert.ok(stoppedDifference < pulseDifference / 5, `stopping restores the saved WebGL lighting (pulse ${pulseDifference.toFixed(2)}, stopped ${stoppedDifference.toFixed(2)})`);

    const effectType=page.locator("#effect-type");
    const effectPeriod=page.locator("#effect-period");
    const waitForChannel=(name,value)=>page.waitForFunction(([channelName,expected])=>
      [...globalThis.document.querySelectorAll(".virtual-dmx-channel")].some(channel=>
        channel.querySelector("span")?.textContent===channelName && channel.querySelector("strong")?.textContent===expected),
    [name,value]);
    await effectType.selectOption("chase");
    await effectPeriod.fill("12");
    await page.locator("#play-effect").click();
    assert.equal(await effectType.inputValue(),"chase","the controls identify the running effect");
    assert.equal(await effectPeriod.inputValue(),"12","the controls retain the chosen period");
    await waitForChannel("dimmer","0");
    const effectRuler=page.locator(".arrangement-timeline .timeline-ruler");
    await page.locator("#locale").selectOption("de");
    assert.equal(await effectRuler.getAttribute("aria-valuenow"),"0","effect playback leaves the arrangement ruler at zero after rendering");
    await page.locator("#locale").selectOption("en");
    await page.locator("#stop-cue").click();
    assert.equal(await effectType.inputValue(),"chase","stopping retains the selected effect");
    assert.equal(await virtualDimmer.textContent(),savedDimmer,"stopping Chase restores the saved dimmer");

    await page.locator("#toggle-fixtures").click();
    await page.locator('.fixture-select[title="Moving Head RGB 1"]').click();
    const movingHeadDimmer=await virtualDimmer.textContent();
    const pan=page.locator(".virtual-dmx-channel").filter({has:page.getByText("pan",{exact:true})}).locator("strong");
    const savedPan=await pan.textContent();
    await effectType.selectOption("panTilt");
    await effectPeriod.fill("5");
    await page.locator("#play-effect").click();
    await page.waitForFunction(saved=>[...globalThis.document.querySelectorAll(".virtual-dmx-channel")].some(channel=>
      channel.querySelector("span")?.textContent==="pan" && channel.querySelector("strong")?.textContent!==saved),savedPan);
    const previewPan=Number(await pan.textContent());
    assert.ok(previewPan>=64 && previewPan<=192,"Pan/Tilt stays within the virtual sweep range");
    assert.equal(await virtualDimmer.textContent(),movingHeadDimmer,"Pan/Tilt preserves the saved dimmer");
    await page.locator("#stop-cue").click();
    assert.equal(await pan.textContent(),savedPan,"stopping Pan/Tilt restores the saved pan");

    await sceneMenu.press("ArrowDown");
    await page.keyboard.press("Enter");
    await requireFocus(page.locator("#room-template"), "the room dialog focuses its first field");
    await page.locator("#create-room-scene").press("Enter");
    await projectDialog.waitFor({state:"detached"});
    await requireFocus(sceneMenu, "creating a room returns focus to the Scene menu after rendering");
    const setDimmer = async value => {
      await page.locator("#fixture-dimmer").fill(String(value));
      await page.locator("#apply-fixture").click();
      assert.equal(await virtualDimmer.textContent(), String(value));
    };
    await setDimmer(200);
    await page.locator("#create-cue").click();
    await page.locator("#edit-cue-duration").fill("8");
    await page.locator("#edit-cue-delay").fill("1");
    await page.locator("#edit-cue-fade").fill("2");
    await page.locator("#edit-cue-fadeOut").fill("2");
    await page.locator("#edit-cue").click();
    await setDimmer(40);

    const ruler = page.locator(".arrangement-timeline .timeline-ruler");
    const playbackReadout = page.locator("#arrangement-position");
    const waitForPosition = seconds => page.waitForFunction(expected =>
      globalThis.document.querySelector("#arrangement-position")?.textContent === expected,
    `${seconds.toFixed(1)} / 8.0 s`, {timeout:7000});
    const previewBrightness = async () => {
      const pixels = await readPreviewPixels();
      let total = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        total += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      }
      return total / (pixels.length / 4);
    };
    const brightnessByPhase = {};
    for (const [time, expectedDimmer, phase] of [[.5,40,"delay"], [2,120,"fade-in"], [4,200,"hold"], [7,120,"fade-out"]]) {
      const {width,height} = await ruler.boundingBox();
      await ruler.click({position:{x:time / 30 * width, y:height / 2}});
      await waitForPosition(time);
      assert.equal(await virtualDimmer.textContent(), String(expectedDimmer), `virtual dimmer matches the ${phase} envelope`);
      brightnessByPhase[phase] = await previewBrightness();
    }
    const {delay, "fade-in": fadeIn, hold, "fade-out": fadeOut} = brightnessByPhase;
    assert.ok(delay < fadeIn && fadeIn < hold && delay < fadeOut && fadeOut < hold,
      `rendered cue brightens and dims through both fades (${JSON.stringify(brightnessByPhase)})`);
    const smallestFadeStep = Math.min(fadeIn - delay, hold - fadeIn, fadeOut - delay, hold - fadeOut);
    assert.ok(Math.abs(fadeIn - fadeOut) < smallestFadeStep / 10,
      "equal dimmer values in fade-in and fade-out render with consistent brightness");
    await page.locator("#locale").selectOption("de");
    assert.equal(await ruler.getAttribute("aria-valuenow"),"7","redrawing preserves the paused arrangement position");
    assert.equal(await studioStatus.getAttribute("aria-live"), "off", "a paused arrangement retains its quiet status after redrawing");
    assert.equal(await playbackReadout.textContent(),"7.0 / 8.0 s","the redrawn readout agrees with the ruler");
    assert.ok(parseFloat(await page.locator("#arrangement-playhead").evaluate(element=>element.style.left))>23,"the redrawn marker matches the paused position");
    await page.locator("#locale").selectOption("en");
    await page.locator("#sequence-loop").evaluate(element => element.closest("label").click());
    await ruler.press("End");
    await waitForPosition(8);
    assert.equal(await ruler.getAttribute("aria-valuenow"), "8", "End holds the final frame while the arrangement is paused in loop mode");
    assert.equal(await virtualDimmer.textContent(), "40", "fade-out returns to the original nonzero dimmer value");
    assert.ok(Math.abs(await previewBrightness() - delay) < smallestFadeStep / 10,
      "the final rendered frame returns to the baseline brightness");
    await page.locator("#pause-playback").click();
    await page.waitForFunction(() => Number(globalThis.document.querySelector(".arrangement-timeline .timeline-ruler")?.getAttribute("aria-valuenow")) < 2);
    assert.match(await playbackReadout.textContent(), /^0?\d\.\d \/ 8\.0 s$/, "resuming at the end loops the arrangement");
    await page.locator("#stop-cue").click();
    assert.equal(await page.locator("#fixture-dimmer").inputValue(), "40", "preview does not rewrite the saved dimmer");
    await projectMenu.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    const projectName = page.locator("#saved-project-name");
    const saveAnnouncement = page.locator("#project-save-announcement");
    const originalAnnouncement = await saveAnnouncement.elementHandle();
    await requireFocus(projectName, "the Save dialog focuses the project name field");
    const projectNameBeforeSave = await page.locator("#project-name").inputValue();
    const originalStorageWriter = await page.evaluateHandle(() => globalThis.Storage.prototype.setItem);
    await page.evaluate(originalWrite => {
      globalThis.Storage.prototype.setItem = function (key, value) {
        if (key === "adigunlightdesign/saved-projects-v1") {
          throw new globalThis.DOMException("Storage is full", "QuotaExceededError");
        }
        return originalWrite.call(this, key, value);
      };
    }, originalStorageWriter);
    try {
      await projectName.fill("Failed save");
      await projectName.press("Enter");
      await projectDialog.waitFor({state:"detached"});
      await page.waitForFunction(message =>
        globalThis.document.querySelector("#project-save-announcement")?.textContent === message, messages.en.storageUnavailable);
      assert.equal(await page.locator("#project-name").inputValue(), projectNameBeforeSave, "a failed save preserves the working project name");
      assert.equal(await page.evaluate(() => globalThis.localStorage.getItem("adigunlightdesign/saved-projects-v1")), null,
        "a failed save creates no saved project");
    } finally {
      await page.evaluate(originalWrite => {globalThis.Storage.prototype.setItem = originalWrite;}, originalStorageWriter);
      await originalStorageWriter.dispose();
    }
    await page.keyboard.press("Control+s");
    await requireFocus(projectName, "the project remains saveable after browser storage recovers");
    await projectName.fill("Keyboard acceptance");
    await projectName.press("Enter");
    await projectDialog.waitFor({state:"detached"});
    await requireFocus(projectMenu, "saving returns focus to the Project menu after rendering");
    await page.waitForFunction(message =>
      globalThis.document.querySelector("#project-save-announcement")?.textContent === message, messages.en.projectSaved);
    assert.equal(await originalAnnouncement.evaluate(element =>
      element === globalThis.document.querySelector("#project-save-announcement")), true,
    "the save result updates the same live region across a studio redraw");
    await originalAnnouncement.dispose();

    const imageBytes=await page.evaluate(()=>{
      const canvas=globalThis.document.createElement("canvas");
      canvas.width=canvas.height=1;
      const context=canvas.getContext("2d");
      context.fillStyle="#E4128A";
      context.fillRect(0,0,1,1);
      const decode=globalThis.createImageBitmap;
      globalThis.createImageBitmap=async(...args)=>{
        const bitmap=await decode(...args);
        await new Promise(resolve=>{globalThis.releasePaletteDecode=resolve;});
        return bitmap;
      };
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const paletteSwatches=page.locator(".palette-panel [data-swatch]");
    const savedPalette=await paletteSwatches.allTextContents();
    await projectMenu.click();
    const [chooser]=await Promise.all([page.waitForEvent("filechooser"),page.locator("#import-image").click()]);
    await chooser.setFiles({name:"delayed-palette.png",mimeType:"image/png",buffer:Buffer.from(imageBytes,"base64")});
    await page.waitForFunction(()=>typeof globalThis.releasePaletteDecode==="function");
    await projectMenu.click();
    await page.locator("#open-project").click();
    await page.getByRole("button",{name:/Keyboard acceptance/}).click();
    await projectDialog.waitFor({state:"detached"});
    await page.evaluate(async()=>{
      globalThis.releasePaletteDecode();
      delete globalThis.releasePaletteDecode;
      await new Promise(resolve=>globalThis.requestAnimationFrame(resolve));
    });
    assert.deepEqual(await paletteSwatches.allTextContents(),savedPalette,"a pending image import cannot modify a reopened copy of the same project");

    const rigMenu=page.locator('[data-command-menu-trigger="fixtures"]');
    const countBeforeDelay=await page.locator("#fixture-select option").count();
    await rigMenu.click();
    const [pendingRig]=await Promise.all([page.waitForEvent("download"),page.locator("#export-fixture-rig").click()]);
    await page.evaluate(()=>{
      const read=globalThis.File.prototype.text;
      globalThis.File.prototype.text=async function(){
        const text=await read.call(this);
        if(this.name==="delayed-rig.json") {
          globalThis.File.prototype.text=read;
          await new Promise(resolve=>{globalThis.releaseRigRead=resolve;});
        }
        return text;
      };
    });
    await rigMenu.click();
    const [delayedRigChooser]=await Promise.all([page.waitForEvent("filechooser"),page.locator("#import-fixture-rig").click()]);
    await delayedRigChooser.setFiles({name:"delayed-rig.json",mimeType:"application/json",buffer:await readFile(await pendingRig.path())});
    await page.waitForFunction(()=>typeof globalThis.releaseRigRead==="function");
    await projectMenu.click();
    await page.locator("#open-project").click();
    await page.getByRole("button",{name:/Keyboard acceptance/}).click();
    await projectDialog.waitFor({state:"detached"});
    await page.evaluate(async()=>{
      globalThis.releaseRigRead();
      delete globalThis.releaseRigRead;
      await new Promise(resolve=>globalThis.requestAnimationFrame(resolve));
    });
    assert.equal(await page.locator("#fixture-select option").count(),countBeforeDelay,"a pending rig cannot modify a reopened copy of the same room");

    await page.locator('.module-nav [data-module="copilot"]').click();
    await page.locator("#preview-lux-palette").click();
    assert.equal(await page.locator(".lux-action-preview").count(),1,"the assistant shows a local lighting proposal");
    await projectMenu.click();
    await page.locator("#open-project").click();
    await page.getByRole("button",{name:/Keyboard acceptance/}).click();
    await projectDialog.waitFor({state:"detached"});
    await page.locator('.module-nav [data-module="copilot"]').click();
    assert.equal(await page.locator(".lux-action-preview").count(),0,"reopening the same project clears the old proposal");
    await page.locator('[data-module="library"]').click();
    const profiles = [
      ["eurolite-led-par-56-tcl", "LED PAR-56 TCL", 3, "3ch"],
      ["eurolite-led-par-56-tcl", "LED PAR-56 TCL", 5, "5ch"],
      ["generic-rgb-wash", "RGB Wash", 6],
      ["generic-moving-head-rgbw", "Moving Head RGBW", 10],
      ["generic-led-strip-rgb", "LED Strip RGB", 4],
    ];
    for (const [id, name, footprint, mode] of profiles) {
      const optionsBefore = await page.locator("#fixture-select option").count();
      const modeSelector = mode ? `[data-mode="${mode}"]` : "";
      await page.locator(`.fixture-library [data-profile="${id}"]${modeSelector}`).click();
      assert.equal(await page.locator("#fixture-select option").count(), optionsBefore + 1, `${name} is added to the active room`);
      assert.ok((await page.locator("#fixture-select option:checked").textContent()).startsWith(name), `${name} is selected after adding it`);
      assert.equal(await page.locator("#virtual-dmx-monitor .virtual-dmx-channel").count(), footprint, `${name} is patched with its profile's channel footprint`);
      if (mode === "3ch") {
        assert.equal(await page.locator("#fixture-dimmer").count(), 0, "RGB-only mode has no independent dimmer field");
        const rgbValues = page.locator("#virtual-dmx-monitor .virtual-dmx-channel strong");
        const beforeLook = await rgbValues.allTextContents();
        await page.locator("#cycle-lighting-look").click();
        const afterLook = await rgbValues.allTextContents();
        assert.equal(afterLook.length, 3, "room looks preserve the three-channel patch");
        assert.notDeepEqual(afterLook, beforeLook, "room looks change the RGB-only fixture's actual DMX values");
        await page.locator("#fixture-colour").fill("#356392");
        await page.locator("#apply-fixture").click();
        const capturedRgb = ["53", "99", "146"];
        assert.deepEqual(await rgbValues.allTextContents(), capturedRgb,
          "the three-channel fixture commits RGB values without a dimmer");
        await page.locator("#create-cue").click();
        await page.locator("#fixture-colour").fill("#102030");
        await page.locator("#apply-fixture").click();
        const savedRgb = await rgbValues.allTextContents();
        assert.deepEqual(savedRgb, ["16", "32", "48"], "the working fixture has a different color from the captured cue");
        await page.locator(".arrangement-timeline .timeline-ruler").press("End");
        assert.deepEqual(await rgbValues.allTextContents(), capturedRgb,
          "seeking to the captured cue restores its RGB-only virtual frame");
        await page.locator("#stop-cue").click();
        assert.deepEqual(await rgbValues.allTextContents(), savedRgb,
          "stopping cue preview restores the working RGB-only fixture");
      }
    }
    await page.locator("#close-library").click();
    await page.locator("#fixture-universe").fill("2");
    await page.locator("#fixture-address").fill("10");
    await page.locator("#apply-fixture-patch").click();
    assert.match(await page.locator(".timeline-status").textContent(), /Universe 2.*4 active channels/, "the timeline counts only channels patched in the selected universe");
    assert.deepEqual(await page.locator("#virtual-dmx-monitor .virtual-dmx-channel b").allTextContents(), ["010", "011", "012", "013"], "the monitor follows the selected fixture into universe 2");

    await page.locator(".fixture-configuration-details > summary").click();
    await page.locator("#fixture-rotation").fill("55");
    await page.locator("#fixture-dimmer").fill("93");
    await page.locator("#apply-fixture").click();
    const fixturesMenu = page.locator('[data-command-menu-trigger="fixtures"]');
    await fixturesMenu.click();
    const [rigDownload] = await Promise.all([page.waitForEvent("download"), page.locator("#export-fixture-rig").click()]);
    assert.ok(rigDownload.suggestedFilename().endsWith(".ald-rig.json"));
    const rigPath = await rigDownload.path();
    const rig = JSON.parse(await readFile(rigPath, "utf8"));
    const sourceRoom = await page.locator("#scene-select").inputValue();
    const sourceIds = await page.locator("#fixture-select option").evaluateAll(options => options.map(option => option.value));
    assert.equal(rig.fixtures.length, sourceIds.length, "the rig exports exactly the fixtures in the active room");
    assert.equal(rig.fixtures.at(-1).transform.rotation,55,"the portable rig contains the edited orientation");
    assert.equal(rig.fixtures.at(-1).properties.dimmer,93,"the portable rig contains the edited channel level");
    await sceneMenu.click();
    await page.locator("#add-room-scene").click();
    await page.locator("#room-template").selectOption("bathroom");
    await page.locator("#create-room-scene").click();
    const destinationFixtureIds = await page.locator("#fixture-select option").evaluateAll(options => options.map(option => option.value));
    await fixturesMenu.click();
    const [rigChooser] = await Promise.all([page.waitForEvent("filechooser"), page.locator("#import-fixture-rig").click()]);
    await rigChooser.setFiles(rigPath);
    await page.waitForFunction(expected => globalThis.document.querySelector("#fixture-select").options.length === expected,
      destinationFixtureIds.length + rig.fixtures.length);
    const importedIds = await page.locator("#fixture-select option").evaluateAll(options => options.map(option => option.value));
    assert.ok(importedIds.every(id => !sourceIds.includes(id)), "import creates independent fixture identities in the destination room");
    assert.ok(destinationFixtureIds.every(id => importedIds.includes(id)), "import preserves the destination's existing fixtures");
    assert.equal(await page.locator("#fixture-rotation").inputValue(),"55","the imported fixture retains its orientation");
    assert.equal(await page.locator("#fixture-dimmer").inputValue(),"93","the imported fixture retains its channel level");
    assert.match(await page.locator(".timeline-status").textContent(), /active channels/, "imported fixtures are patched in the destination room");
    await page.locator('[data-command-menu-trigger="history"]').click();
    await page.locator("#undo").click();
    assert.equal(await page.locator("#fixture-select option").count(), destinationFixtureIds.length, "one Undo removes the imported rig");
    await page.locator("#scene-select").selectOption(sourceRoom);
    assert.deepEqual(await page.locator("#fixture-select option").evaluateAll(options => options.map(option => option.value)), sourceIds, "import and undo leave the original rig intact");
  } finally {
    await page.close();
  }
}

async function verifyPaletteVersions(browser,studioUrl) {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  try {
    await page.goto(studioUrl);
    await page.locator('[data-module="palette"]').click();
    const paletteMenu=page.locator('[data-command-menu-trigger="palette"]');
    const openPalette=async()=>{if(await paletteMenu.getAttribute("aria-expanded")!=="true")await paletteMenu.click();};
    const openVersions=async()=>{
      await openPalette();
      const versions=page.locator("#open-versions");
      if(await versions.getAttribute("aria-expanded")!=="true")await versions.click();
    };
    const versions=page.locator("#palette-version");
    const hex=page.locator("#swatch-hex"),opacity=page.locator("#swatch-opacity");
    const harmony=page.locator("#harmony");
    const originalHex=await hex.inputValue(),originalOpacity=await opacity.inputValue(),originalHarmony=await harmony.inputValue();
    await openVersions();
    await page.locator("#save-version").click();
    const first=await versions.inputValue();
    await hex.fill("#114488");
    await page.locator("#apply-colour").click();
    await opacity.fill("60");
    await page.locator("#apply-opacity").click();
    await openPalette();
    await harmony.selectOption("square");
    await openVersions();
    await page.locator("#save-version").click();
    const second=await versions.inputValue();
    assert.notEqual(second,first,"saving a version selects the new snapshot");
    await page.locator('[data-command-menu-trigger="export"]').click();
    const [portableDownload]=await Promise.all([page.waitForEvent("download"),page.locator('[data-export="palette"]').click()]);
    const portablePath=await portableDownload.path();
    await openVersions();
    await versions.selectOption(first);
    await page.locator("#locale").selectOption("de");
    assert.equal(await versions.inputValue(),first,"a redraw preserves the selected snapshot");
    await openVersions();
    await page.locator("#restore-version").click();
    assert.equal(await hex.inputValue(),originalHex,"Restore recovers the snapshot color");
    assert.equal(await opacity.inputValue(),originalOpacity,"Restore recovers the snapshot opacity");
    assert.equal(await harmony.inputValue(),originalHarmony,"Restore recovers the snapshot harmony");
    await openPalette();
    const [paletteChooser]=await Promise.all([page.waitForEvent("filechooser"),page.locator("#import-palette").click()]);
    await paletteChooser.setFiles(portablePath);
    await page.waitForFunction(()=>globalThis.document.querySelector("#harmony")?.value==="square");
    assert.equal(await hex.inputValue(),"#114488","the portable palette restores the exported color");
    assert.equal(await opacity.inputValue(),"60","the portable palette restores the exported opacity");
    await page.locator('[data-command-menu-trigger="history"]').click();
    await page.locator("#undo").click();
    assert.equal(await hex.inputValue(),originalHex,"one Undo rolls back a portable palette import");
    assert.equal(await opacity.inputValue(),originalOpacity);
    assert.equal(await harmony.inputValue(),originalHarmony);
    await page.locator('[data-command-menu-trigger="history"]').click();
    await page.locator("#undo").click();
    assert.equal(await hex.inputValue(),"#114488","one Undo restores the edited color");
    assert.equal(await opacity.inputValue(),"60","one Undo restores the edited opacity");
    assert.equal(await harmony.inputValue(),"square","one Undo restores the edited harmony");
  } finally {
    await page.close();
  }
}

async function verifyOfflineStudio(browser) {
  const previewServer = await preview({configFile:false, logLevel:"error", preview:{host:"127.0.0.1", port:0}});
  try {
    const address = previewServer.httpServer.address();
    const context = await browser.newContext({viewport:{width:1440,height:900}, acceptDownloads:true});
    try {
      const page = await context.newPage();
      const openMenu = name => page.locator(`[data-command-menu-trigger="${name}"]`).click();
      await page.goto(`http://127.0.0.1:${address.port}/#AdigunStudio`);
      await page.waitForFunction(() => Boolean(globalThis.navigator.serviceWorker.controller));
      await openMenu("project");
      await page.locator("#save").click();
      await page.locator("#saved-project-name").fill("Offline acceptance");
      await page.locator('.project-dialog [type="submit"]').click();
      await context.setOffline(true);
      await page.reload();
      assert.ok(await page.evaluate(() => Boolean(globalThis.navigator.serviceWorker.controller)), "the production studio reopens from its installed release offline");
      await openMenu("project");
      await page.locator("#open-project").click();
      await page.locator("[data-open-saved]").filter({hasText:"Offline acceptance"}).click();
      assert.equal(await page.locator("#project-name").inputValue(), "Offline acceptance", "a local project can be reopened offline");
      await openMenu("export");
      const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export-pdf").click()]);
      const pdf = await PDFDocument.load(await readFile(await download.path()));
      assert.ok(pdf.getPageCount() > 0, "offline palette PDF uses the cached lazy export chunk");
    } finally {
      await context.close();
    }
  } finally {
    await new Promise((resolveClose, reject) => previewServer.httpServer.close(error => error ? reject(error) : resolveClose()));
  }
}

const server = await createServer({
  configFile: false,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
let browser;
const useFirefox = process.env.STUDIO_TEST_BROWSER === "firefox";

try {
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address === "object", "Vite exposes a local test port");
  browser = await (useFirefox ? firefox : chromium).launch({
    headless: true,
    ...(!useFirefox && process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1754, height: 878 },acceptDownloads:true });
  const page = await context.newPage();
  const openCommandMenu=async(key)=>{const trigger=page.locator(`[data-command-menu-trigger="${key}"]`);if(await trigger.getAttribute("aria-expanded")!=="true")await trigger.click();};
  const clickCommand=async(key,selector)=>{await openCommandMenu(key);await page.locator(selector).click();};
  const openFixtureList=async()=>{const trigger=page.locator("#toggle-fixtures");if(await trigger.getAttribute("aria-expanded")!=="true")await trigger.click();};
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem("adigunlightdesign/project-v1",JSON.stringify({name:"stale working copy"})));
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".marketing-home").isVisible(),true,"the product landing page is the public entry point");
  assert.equal(await page.locator(".marketing-brand img").evaluate(image=>image.complete&&image.naturalWidth>0),true,"the approved corporate logo loads from the bundled product asset");
  assert.equal(await page.locator(".studio-shell").isVisible(),false,"the editor stays off the landing page until requested");
  const landingCanvas = page.locator(".marketing-viewport canvas");
  const defaultPreview = await landingCanvas.screenshot();
  await page.locator('[data-landing-look="cyan-modern"]').click();
  assert.equal(await page.locator('[data-landing-look="cyan-modern"]').getAttribute("aria-pressed"), "true");
  const cyanPreview = await landingCanvas.screenshot();
  assert.notDeepEqual(cyanPreview, defaultPreview, "selecting a look changes the actual rendered scene");
  await page.locator("#landing-intensity").fill("50");
  assert.notDeepEqual(await landingCanvas.screenshot(), cyanPreview, "dimming the fixtures changes the rendered light");
  const landingTour = page.locator("[data-landing-tour]");
  assert.equal(await landingTour.getAttribute("aria-pressed"),"false","the camera tour is idle with reduced motion enabled");
  assert.equal(await page.locator(".marketing-demos video").evaluateAll(videos=>videos.every(video=>video.paused && !video.autoplay)),true,"the real demos await user playback");
  await page.emulateMedia({reducedMotion:"no-preference"});
  await landingTour.click();
  assert.equal(await landingTour.getAttribute("aria-pressed"), "true", "the landing camera tour runs");
  await landingCanvas.press("ArrowLeft");
  assert.equal(await landingTour.getAttribute("aria-pressed"),"false","manual camera movement stops the tour and updates its control");
  assert.equal(await landingTour.innerText(),"Play camera tour");
  await landingTour.click();
  await landingTour.click();
  assert.equal(await landingTour.getAttribute("aria-pressed"), "false", "the landing camera tour can be stopped");
  const beforeContextLoss=await landingCanvas.screenshot();
  await landingCanvas.evaluate(async canvas=>{
    const gl=canvas.getContext("webgl");
    const extension=gl.getExtension("WEBGL_lose_context");
    await new Promise((resolve,reject)=>{
      const timeout=globalThis.setTimeout(()=>reject(new Error("WebGL restoration timed out")),5000);
      canvas.addEventListener("webglcontextrestored",()=>{globalThis.clearTimeout(timeout);resolve();},{once:true});
      canvas.addEventListener("webglcontextlost",()=>globalThis.setTimeout(()=>extension.restoreContext(),0),{once:true});
      extension.loseContext();
    });
  });
  assert.deepEqual(await landingCanvas.screenshot(),beforeContextLoss,"the real WebGL context restores the selected lighting and camera");
  const [samplePage] = await Promise.all([context.waitForEvent("page"), page.locator("[data-landing-open]").click()]);
  await samplePage.locator("body.studio-route").waitFor();
  assert.equal(await samplePage.locator("#project-name").inputValue(), "Cyan modern", "the selected look opens as an editable sample");
  assert.match(await samplePage.locator("#cycle-lighting-look").getAttribute("title"), /Cyan modern/);
  assert.equal(await samplePage.locator("#fixture-dimmer").inputValue(), "105", "the sample carries the preview fixture intensity into the editable project");
  await samplePage.close();
  const demos = page.locator(".marketing-demos video");
  assert.equal(await demos.count(), 2);
  for (const video of await demos.all()) {
    await video.evaluate(async element => { await element.play(); });
    const start = await video.evaluate(element => element.currentTime);
    await page.waitForFunction(({src, start}) => [...globalThis.document.querySelectorAll("video")].some(element =>
      element.getAttribute("src") === src && element.currentTime > start + .1), {src:await video.getAttribute("src"), start});
    await video.evaluate(element => { element.pause(); element.currentTime = 0; });
    const captions = video.locator("track");
    await captions.evaluate(track => { track.track.mode = "showing"; });
    await page.waitForFunction(src => [...globalThis.document.querySelectorAll("video track")].some(track =>
      track.getAttribute("src") === src && track.readyState === 2), await captions.getAttribute("src"), {timeout:10000});
    assert.equal(await video.evaluate(element => element.textTracks[0].cues.length), 2, "the actual demo exposes its visual captions");
    await video.evaluate(element => { element.textTracks[0].mode = "disabled"; });
  }
  const videoDescription = page.locator(".marketing-video-description").first();
  await videoDescription.locator("summary").press("Enter");
  assert.equal(await videoDescription.locator("p").isVisible(), true, "a keyboard user can open the text alternative to the camera tour");
  await videoDescription.locator("summary").press("Enter");
  await page.setViewportSize({width:1440,height:900});
  await verifyAccessibility(page, "desktop landing page");
  await page.screenshot({path:resolve("outputs/landing-page-1440x900.png"),fullPage:true});
  await page.setViewportSize({width:1754,height:878});
  await page.getByRole("link",{name:/Go to the Studio/}).first().click();
  await page.waitForURL(/#AdigunStudio$/);
  await page.locator("body.studio-route").waitFor();
  await verifyUtilityControls(page);
  assert.equal(await page.locator(".marketing-home").isVisible(),false,"the studio anchor replaces the landing view");
  assert.equal(await page.locator(".studio-shell").isVisible(),true,"the existing studio opens at its anchor");
  assert.equal(await page.locator(".header-save-status").innerText(), "Unsaved project", "startup opens a fresh workspace instead of restoring the working copy");
  assert.equal(await page.locator(".studio-panel-title").innerText(),"SCENE 01 / 3D MOCKUP ROOM","the studio heading matches the approved room label");
  assert.equal(await page.locator(".scene-title b").innerText(),"STUDIO MOOD • RGBW PREVIEW","the live preview badge identifies the studio RGBW view");
  assert.equal(await page.locator(".scene-title small").innerText(),"Scene view • virtual RGBW previsualization","the preview subtitle describes the live virtual view accurately");
  assert.match(await page.locator(".footer-ready").innerText(),/^● READY · Studio Mood \/ Scene 01 · 3D \/ Virtual DMX · Unsaved project$/,"footer status matches the approved project, scene, mode, and save summary");
  const hdDownloadReady=page.waitForEvent("download");
  await clickCommand("export","#export-viewport");
  const hdDownload=await hdDownloadReady,hdBytes=await readFile(await hdDownload.path());
  assert.equal(hdBytes.readUInt32BE(16),1920,"HD viewport image width is 1920 pixels");
  assert.equal(hdBytes.readUInt32BE(20),1080,"HD viewport image height is 1080 pixels");
  assert.equal(hdBytes.toString("ascii",1,4),"PNG","HD viewport export is a PNG image");

  const downloadExportFile = async (selector, extension) => {
    await openCommandMenu("export");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.locator(selector).click(),
    ]);
    assert.ok(download.suggestedFilename().endsWith(extension), `export uses the ${extension} extension`);
    return readFile(await download.path());
  };
  const sampleViewportExport = async bytes => page.evaluate(async base64 => {
    const response = await fetch(`data:image/png;base64,${base64}`);
    const bitmap = await globalThis.createImageBitmap(await response.blob());
    try {
      const sample = globalThis.document.createElement("canvas");
      sample.width = 96;
      sample.height = 54;
      const context = sample.getContext("2d");
      context.drawImage(bitmap, 0, 0, sample.width, sample.height);
      return Array.from(context.getImageData(0, 0, sample.width, sample.height).data);
    } finally {
      bitmap.close();
    }
  }, bytes.toString("base64"));
  const sampleCurrentViewport = async () =>
    sampleViewportExport(await downloadExportFile("#export-viewport", ".png"));
  const viewportPixelDifference = (before, after) =>
    before.reduce((total, value, index) => total + Math.abs(value - after[index]), 0) / before.length;
  const initialViewport = await sampleViewportExport(hdBytes);
  const initialColors = new Set();
  for (let index = 0; index < initialViewport.length; index += 4) {
    if (initialViewport[index + 3] === 255) {
      initialColors.add(initialViewport.slice(index, index + 3).join(","));
    }
  }
  assert.ok(initialColors.size > 20, "the initial viewport PNG contains opaque rendered scene detail");
  const paletteJsonBytes = await downloadExportFile('[data-export="palette"]', ".json");
  const exportedPalette = JSON.parse(paletteJsonBytes.toString("utf8"));
  assert.equal(exportedPalette.schemaVersion, 1);
  assert.ok(exportedPalette.colors.length > 0, "palette JSON contains swatches");
  const firstColor = exportedPalette.colors[0].hex.toUpperCase();
  const css = await downloadExportFile('[data-export="css"]', ".css");
  assert.ok(css.toString("utf8").toUpperCase().includes(firstColor), "CSS contains the active palette color");
  const svg = (await downloadExportFile("#export-svg", ".svg")).toString("utf8");
  assert.match(svg, /<svg\b/);
  assert.ok(svg.toUpperCase().includes(firstColor), "SVG contains the active palette color");
  const png = await downloadExportFile('[data-raster="image/png"]', ".png");
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "palette PNG has the PNG signature");
  assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0, "palette PNG has nonzero dimensions");
  const jpeg = await downloadExportFile('[data-raster="image/jpeg"]', ".jpg");
  assert.equal(jpeg.subarray(0, 3).toString("hex"), "ffd8ff", "palette JPEG has the JPEG signature");
  assert.equal(jpeg.subarray(-2).toString("hex"), "ffd9", "palette JPEG has an end-of-image marker");
  const expectedSwatches = exportedPalette.colors.map(({hex}) =>
    hex.slice(1).match(/../g).map(channel => Number.parseInt(channel, 16)));
  const columns = Math.min(5, expectedSwatches.length);
  for (const [bytes, mime, tolerance] of [
    [Buffer.from(svg), "image/svg+xml", 0],
    [png, "image/png", 0],
    [jpeg, "image/jpeg", 5],
  ]) {
    const sampledSwatches = await page.evaluate(async ({base64, mime, columns, count}) => {
      const source = await fetch(`data:${mime};base64,${base64}`);
      const image = new globalThis.Image();
      const url = URL.createObjectURL(await source.blob());
      try {
        image.src = url;
        await image.decode();
        const sample = globalThis.document.createElement("canvas");
        sample.width = image.naturalWidth;
        sample.height = image.naturalHeight;
        const context = sample.getContext("2d");
        context.drawImage(image, 0, 0);
        return Array.from({length:count}, (_, index) => {
          const x = 100 + (index % columns) * 180;
          const y = 115 + Math.floor(index / columns) * 150;
          return Array.from(context.getImageData(x, y, 1, 1).data);
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }, {base64:bytes.toString("base64"), mime, columns, count:expectedSwatches.length});
    for (const [index, expected] of expectedSwatches.entries()) {
      const actual = sampledSwatches[index];
      assert.equal(actual[3], 255, `${mime} swatch ${index + 1} has an opaque center`);
      assert.ok(expected.every((channel, offset) => Math.abs(actual[offset] - channel) <= tolerance),
        `${mime} swatch ${index + 1} renders ${expected.join(",")}, sampled ${actual.slice(0, 3).join(",")}`);
    }
  }
  const pdf = await downloadExportFile("#export-pdf", ".pdf");
  assert.equal(pdf.toString("ascii", 0, 5), "%PDF-", "palette PDF has the PDF signature");
  const palettePdf = await PDFDocument.load(pdf);
  assert.equal(palettePdf.getTitle(), exportedPalette.name, "palette PDF metadata identifies the active palette");
  assert.equal(palettePdf.getPageCount(), Math.ceil(exportedPalette.colors.length / 10),
    "the downloaded palette PDF has one page per ten swatches");
  await writeFile(resolve("outputs", "studio-palette-sheet.pdf"), pdf);
  const tokens = JSON.parse(await downloadExportFile("#export-tokens", "-tokens.json"));
  assert.equal(tokens.format, "adigunlightdesign.design-tokens");
  assert.deepEqual(Object.values(tokens.color).map(token => token.sourceId), exportedPalette.colors.map(color => color.id), "design tokens retain active swatch order and IDs");
  const ase = await downloadExportFile('[data-export="ase"]', ".ase");
  assert.equal(ase.toString("ascii", 0, 4), "ASEF", "experimental ASE has the ASE signature");
  const patchCsv = (await downloadExportFile('[data-export="patch"]', "-patch.csv")).toString("utf8");
  assert.match(patchCsv, /^Fixture,Profile,Mode,Universe,Start address,Footprint\r?\n"Moving Head RGB 1"/);
  const cueCsv = (await downloadExportFile('[data-export="cues"]', "-cues.csv")).toString("utf8");
  assert.match(cueCsv, /^Cue,Duration seconds,.*Track end seconds\r?\n"Look 1 - Fade In"/);
  const cuePdf = await PDFDocument.load(await downloadExportFile("#export-cue-pdf", "-cues.pdf"));
  assert.equal(cuePdf.getTitle(), "AdigunLightDesign cue sheet");
  assert.equal(cuePdf.getPageCount(), 1, "the starter timeline fits on one cue-sheet page");

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
      const left = box(".left-rail");
      const scene = box(".scene-preview");
      const mediaControls=box(".canvas-media-controls");
      const paintControls=box(".canvas-actions");
      const dock = box(".lower-workspace");
      const inspector = box(".inspector");
      const inspectorContent = box("#fixture-inspector-panel");
      const lux = box(".lux-panel.is-docked");
      const inspectorScroll = (() => { const panel=doc.querySelector("#fixture-inspector-panel");return {scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,overflowY:browser.getComputedStyle(panel).overflowY}; })();
      const footer = box(".studio-footer");
      const leftRailContent=doc.querySelector(".left-rail"),activePalette=doc.querySelector(".left-rail .palette-panel");
      return {
        viewport: [browser.innerWidth, browser.innerHeight],
        document: [doc.documentElement.scrollWidth, doc.documentElement.scrollHeight],
        header,
        navigation,
        left,
        leftRailContent: {scrollHeight:leftRailContent.scrollHeight,clientHeight:leftRailContent.clientHeight},
        activePalette: {scrollHeight:activePalette.scrollHeight,clientHeight:activePalette.clientHeight},
        scene,
        mediaControls,
        paintControls,
        dock,
        inspector,
        inspectorContent,
        lux,
        inspectorScroll,
        footer,
      };
    });

    assert.deepEqual(report.document, [width, height], `no page overflow at ${width}×${height}`);
    assert.equal(Math.round(report.header.height), 44, `44px header at ${width}×${height}`);
    assert.equal(Math.round(report.navigation.height), 34, `34px navigation at ${width}×${height}`);
    assert.equal(Math.round(report.footer.height), 38, `38px footer at ${width}×${height}`);
    assert.equal(Math.round(report.footer.bottom), height, `footer reaches viewport bottom at ${width}×${height}`);
    assert.ok(report.left.right <= report.scene.x + 1, `left rail does not overlap canvas at ${width}×${height}`);
    assert.ok(report.scene.right <= report.inspector.x + 1, `canvas does not overlap inspector at ${width}×${height}`);
    assert.ok(report.scene.bottom <= report.dock.y + 1, `canvas does not overlap dock at ${width}×${height}`);
    assert.ok(report.mediaControls.x>=report.scene.x&&report.mediaControls.right<=report.scene.right&&report.mediaControls.bottom<=report.scene.bottom,`tour, looks and music controls stay inside the canvas at ${width}×${height}`);
    assert.ok(report.mediaControls.right<=report.paintControls.x||report.mediaControls.bottom<=report.paintControls.y,`canvas media controls do not overlap Paint surface at ${width}×${height}`);
    assert.ok(report.inspectorContent.bottom <= report.lux.y + 1, `inspector scroll lane stops before docked Lux at ${width}×${height}`);
    if(width===1754&&height===878){assert.ok(report.leftRailContent.scrollHeight<=report.leftRailContent.clientHeight+2,"all left-rail sections fit without a hidden sidebar overflow");assert.ok(report.activePalette.scrollHeight<=report.activePalette.clientHeight+2,"the full Active Palette controls fit in their dock");}
    if(width===1754 && height===878){const play=await page.locator("#play-effect").boundingBox();assert.ok(play.y+play.height<=report.inspectorContent.bottom+1,`Effects Play stays visible before docked Lux at the reference viewport (${play.y+play.height} <= ${report.inspectorContent.bottom})`);}
    assert.ok(report.inspectorScroll.scrollHeight >= report.inspectorScroll.clientHeight, `fixture inspector has a bounded scroll viewport at ${width}×${height}`);
    if(report.inspectorScroll.scrollHeight>report.inspectorScroll.clientHeight) assert.ok(["auto","scroll"].includes(report.inspectorScroll.overflowY), `inspector overflow scrolls inside its own lane at ${width}×${height}`);
    if(width===1880 && height===690){
      const canvasBefore=await page.locator(".scene-preview").boundingBox();
      const dimensionsBefore=await page.evaluate(()=>[globalThis.document.documentElement.scrollWidth,globalThis.document.documentElement.scrollHeight]);
      const scrollState=await page.locator("#fixture-inspector-panel").evaluate(panel=>{panel.scrollTop=panel.scrollHeight;return {scrollTop:panel.scrollTop,overflowY:globalThis.getComputedStyle(panel).overflowY,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight};});
      assert.ok(["auto","scroll"].includes(scrollState.overflowY),"short viewport keeps inspector content in its independent scroll lane");
      assert.ok(scrollState.scrollTop>0||scrollState.scrollHeight<=scrollState.clientHeight+1,"short viewport scrolls only when its more compact controls need the extra room");
      assert.deepEqual(await page.locator(".scene-preview").boundingBox(),canvasBefore,"inspector scrolling leaves the central canvas stationary");
      assert.deepEqual(await page.evaluate(()=>[globalThis.document.documentElement.scrollWidth,globalThis.document.documentElement.scrollHeight]),dimensionsBefore,"inspector scrolling does not scroll the document");
      await page.locator("#fixture-inspector-panel").evaluate(panel=>panel.scrollTop=0);
    }
    assert.ok(Math.abs(report.scene.x - report.dock.x) <= 1, `canvas and dock share the same left edge at ${width}×${height}`);
    assert.ok(Math.abs(report.scene.width - report.dock.width) <= 1, `canvas and dock share the same width at ${width}×${height}`);
    reports.push({ viewport: `${width}×${height}`, noOverflow: true, noOverlap: true });

    if ((width === 1754 && height === 878) || (width === 1672 && height === 941)) {
      const directory = resolve("outputs");
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: resolve(directory, `studio-acceptance-${width}x${height}.png`) });
    }
  }

  await page.setViewportSize({ width: 1754, height: 878 });
  assert.deepEqual(await page.locator(".command-menu").evaluateAll(items=>items.map(item=>item.dataset.commandMenu)),["project","history","scene","palette","fixtures","stage","room","export","guide"],"Help & Guide sits beside Export without displacing the existing Scene menu");
  await openCommandMenu("guide");
  assert.equal(await page.locator("#command-menu-panel-guide .guide-section").count(),10,"Help & Guide contains the ten beginner manual sections");
  await page.locator("#guide-search").fill("DMX");
  assert.ok(await page.locator("#command-menu-panel-guide .guide-section:not([hidden])").count()>=1,"guide search finds DMX instructions");
  await page.locator('[data-command-menu-trigger="guide"]').click();
  assert.equal(await page.locator(".left-rail-heading").isVisible(), true, "left rail has the compact project/layers/tools header from the reference");
  assert.equal((await page.locator(".header-project-context").innerText()).replace(/\s+/g," ").trim(),"Studio Mood • Scene 01","header context shows the active scene number as in the reference");
  assert.match(await page.locator(".tool-section > h2").innerText(),/Tools — One Click/,"the tool group uses the one-click reference label");
  assert.equal((await page.locator(".product-lockup strong").innerText()).replace(/\s+/g, " ").trim(), "Adigun Light Design", "the header wordmark keeps the approved three-word spacing");
  assert.deepEqual(await page.locator(".workspace-modules .module").evaluateAll((buttons)=>buttons.map((button)=>button.innerText.trim())),["Design","3D Studio","Fixture Library","Adigun Bot"],"primary navigation exposes only direct workspace and assistant actions");
  assert.equal(await page.locator(".module-nav #show-timeline, .workspace-switcher").count(),0,"duplicate view and timeline navigation is removed");
  const switcherCanvas=await page.locator(".scene-preview").boundingBox();
  await page.locator('.module-nav [data-module="palette"]').click();
  assert.equal(await page.locator("#palette-inspector-panel").isVisible(),true,"Design opens the existing 2D palette workspace");
  await page.locator('.module-nav [data-module="light"]').click();
  assert.equal(await page.locator("#fixture-inspector-panel").isVisible(),true,"3D Studio opens the existing lighting workspace");
  assert.equal(await page.locator(".lower-workspace .timeline").isVisible(),true,"the cue timeline stays docked in the workspace");
  assert.equal(await page.locator(".layer-list li").count(),3,"all Lighting, Palette, and Scene layers remain present");
  assert.equal(await page.locator(".layer-list li").evaluateAll(rows=>rows.every(row=>row.getBoundingClientRect().height>=20&&row.getBoundingClientRect().bottom<=row.parentElement.parentElement.getBoundingClientRect().bottom)),true,"the three layer controls stay fully inside their panel");
  const paletteHueRows=await page.locator(".left-rail .palette-actions:has(#custom-spacing),.left-rail .palette-actions:has(#temperature-strength)").evaluateAll(rows=>rows.map(row=>({row:row.getBoundingClientRect().toJSON(),label:row.querySelector("label").getBoundingClientRect().toJSON(),buttons:[...row.querySelectorAll("button")].map(button=>button.getBoundingClientRect().toJSON())})));
  assert.equal(paletteHueRows.length,2,"both Active Palette hue controls are docked in the sidebar");
  assert.equal(paletteHueRows.every(({row,label,buttons})=>label.right<=row.right&&buttons.every(button=>button.left>=row.left&&button.right<=row.right)&&buttons.every((button,index)=>buttons.slice(index+1).every(other=>button.right<=other.left||other.right<=button.left))),true,"hue labels, fields, and buttons do not overlap or escape the sidebar");
  const groupRowHeight=await page.locator(".fixture-group-section > h2").evaluate(node=>node.getBoundingClientRect().height),fixtureRowHeight=await page.locator(".fixture-list-section > h2").evaluate(node=>node.getBoundingClientRect().height);
  assert.ok(Math.abs(groupRowHeight-fixtureRowHeight)<=2,"Fixture Groups is as compact as Fixture List");
  assert.equal(await page.locator(".timeline").evaluate(panel=>panel.scrollHeight<=panel.clientHeight+1&&globalThis.getComputedStyle(panel).overflowY==="hidden"),true,"the docked timeline fits without vertical scrolling");
  const timelineHeader=await page.locator(".timeline > .section-title").evaluate(row=>{const title=row.querySelector("h2").getBoundingClientRect(),tools=row.querySelector(".timeline-transport").getBoundingClientRect();return {separated:title.right<=tools.left+1,toolsVisible:tools.left>=row.getBoundingClientRect().left&&tools.right<=row.getBoundingClientRect().right};});
  assert.equal(timelineHeader.separated&&timelineHeader.toolsVisible,true,"timeline title and transport controls have separate visible space");
  const transportBounds=await page.locator(".timeline-transport > *").evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect()));
  assert.equal(transportBounds.every((box,index)=>box.width>0&&transportBounds.slice(index+1).every(other=>box.right<=other.left||other.right<=box.left)),true,"timeline transport buttons never overlap");
  const transportLabels=await page.locator(".timeline-transport button").evaluateAll(buttons=>buttons.map(button=>button.textContent.trim()));
  assert.equal(transportLabels.every(label=>label.length<=1),true,`timeline transport buttons use compact icons: ${JSON.stringify(transportLabels)}`);
  const timelineControls=await page.locator("#sequence-loop,#cue-group,#arrangement-position").evaluateAll(controls=>controls.map(control=>{const box=control.getBoundingClientRect(),panel=control.closest(".timeline")?.getBoundingClientRect();return {id:control.id,visible:box.height>0,inPanel:Boolean(panel&&box.top>=panel.top&&box.bottom<=panel.bottom+1)};}));
  assert.equal(timelineControls.length===3&&timelineControls.every(control=>control.visible&&control.inPanel),true,`timeline controls fit without scrolling: ${JSON.stringify(timelineControls)}`);
  assert.equal(await page.locator("#add-fixture,#apply-fixture-colour").evaluateAll(buttons=>buttons.length===2&&buttons.every(button=>button.closest('[data-command-group="fixtures"]'))),true,"fixture creation and swatch application have one home in the Fixtures menu");
  assert.equal(await page.locator(".timeline").evaluate(panel=>panel.scrollHeight<=panel.clientHeight+1),true,"timeline has no document or panel scroll");
  assert.equal(await page.locator("#fixture-inspector-panel #effect-type,#fixture-inspector-panel #effect-period,#fixture-inspector-panel #play-effect").count(),3,"virtual effects keep their single home in the right Effects inspector group");
  const brandBounds=await page.locator(".brand-lockup,.product-lockup,.header-project-context").evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));
  assert.equal(brandBounds[0].right<=brandBounds[1].left&&brandBounds[1].right<=brandBounds[2].left,true,"brand, product name, and project context do not overlap");
  await page.locator('.module-nav [data-module="library"]').click();
  assert.equal(await page.locator(".library-drawer .fixture-library article").count(),4,"Fixture Library opens the generic profiles and documented Eurolite profile");
  await page.locator("#close-library").click();
  await page.locator('.module-nav [data-module="copilot"]').click();
  const assistant = page.locator("#floating-lux-window");
  assert.equal(await page.locator("#toggle-lux").getAttribute("aria-expanded"), "true", "Lux navigation expands the existing assistant");
  const settings = assistant.locator(".lux-service-settings > summary");
  assert.equal(await settings.isVisible(), true, "the expanded desktop assistant exposes service settings");
  await settings.click();
  assert.equal(await assistant.locator('[name="endpoint"]').isVisible(), true, "service settings expose the endpoint field");
  const consent = assistant.locator(".bot-composer .lux-consent");
  assert.equal(await consent.evaluate(label => label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1), true, "the consent disclosure wraps without clipping");
  assert.equal(await assistant.locator(".bot-composer > button").isDisabled(), true, "an unconfigured service cannot submit a request");
  await assistant.locator('[name="endpoint"]').fill("https://example.test/api/lux");
  await assistant.locator('[name="token"]').fill("test-only-service-token-32-characters-long");
  await assistant.getByRole("button", {name:"Configure",exact:true}).click();
  assert.match(await assistant.locator(".lux-message b").innerText(), /connection not verified/i);
  assert.doesNotMatch(await assistant.locator(".lux-heading").innerText(), /offline/i);
  assert.equal(await assistant.locator(".bot-composer > button").isEnabled(), true);
  await assistant.getByRole("button", {name:"Disconnect",exact:true}).click();
  assert.match(await assistant.locator(".lux-message b").innerText(), /offline/i);
  assert.equal(await assistant.locator(".bot-composer > button").isDisabled(), true);
  await page.locator("#toggle-lux").click();
  assert.equal(await page.locator("#toggle-lux").getAttribute("aria-expanded"), "false");
  assert.equal(await consent.isHidden(), true, "the collapsed assistant hides its request form");
  const notice = assistant.locator(".lux-message");
  assert.equal(await notice.evaluate(box => box.scrollWidth <= box.clientWidth + 1 && box.scrollHeight <= box.clientHeight + 1), true, "the collapsed availability notice is readable");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(),switcherCanvas,"workspace shortcuts leave the 3D canvas stationary");

  assert.equal(await page.locator(".inspector > .section-title button:disabled").count(), 0, "the contextual inspector header has no inert close control");
  assert.equal(await page.locator(".scene-preview .canvas-actions #apply-scene").count(), 1, "Apply colour stays in the canvas quick-action lane");
  assert.equal(await page.locator(".scene-preview .canvas-actions #material-target").count(), 1, "surface painting stays in the canvas quick-action lane");
  assert.equal(await page.locator('.command-group[data-command-group="scene"] #apply-scene, .command-group[data-command-group="scene"] #material-target').count(), 0, "canvas quick actions do not duplicate scene-ribbon controls");
  assert.equal(await page.locator("#material-target").inputValue(), "wall", "the quick-paint control opens on Walls as shown in the reference");
  assert.equal(await page.locator("#material-target").evaluate((select)=>select.closest("label").firstChild.textContent.trim()), "Paint:", "the canvas quick-paint control has a compact reference label");
  assert.equal((await page.locator("#apply-scene").innerText()).trim(), "Paint surface", "the canvas action identifies its scene surface target");
  assert.equal((await page.locator("#reset-camera").innerText()).trim(), "Reset camera", "the Scene menu has the single camera reset action");
  assert.equal(await page.locator("#reset-camera-canvas").count(),0,"the duplicate canvas camera reset is removed");
  assert.deepEqual(await page.locator('.command-group[data-command-group="scene"]').evaluate((group)=>[...group.querySelectorAll("button")].map((button)=>button.id)),["add-room-scene","reset-camera"],"Scene keeps room creation and reset while view presets stay above the canvas");
  for (const [locale,labels] of Object.entries({de:["Bemalen:","Wände","Oberfläche färben","Kamera zurücksetzen"],yo:["Kún:","Àwọn ògiri","Kún ojú ilẹ̀","Tún kámẹ́rà bẹ̀rẹ̀"],pcm:["Paint:","Walls","Paint surface","Reset camera"]})) {
    await page.locator("#locale").selectOption(locale);
    assert.equal(await page.locator("#material-target").evaluate((select)=>select.closest("label").firstChild.textContent.trim()),labels[0],`${locale} paint label remains translated`);
    assert.equal((await page.locator("#material-target option:checked").innerText()).trim(),labels[1],`${locale} paint target remains translated`);
    assert.equal((await page.locator("#apply-scene").innerText()).trim(),labels[2],`${locale} Apply colour remains translated`);
    assert.equal((await page.locator("#reset-camera").innerText()).trim(),labels[3],`${locale} camera reset remains translated`);
  }
  await page.locator("#locale").selectOption("en");
  for (const locale of supportedLocales) {
    await page.locator("#locale").selectOption(locale);
    const labels = messages[locale];
    assert.equal(await page.locator(".fixture-configuration-details > summary").textContent(),labels.fixtureNameAndPosition);
    assert.equal(await page.locator(".light-advanced-controls > summary").textContent(),labels.moreLightControls);
    assert.equal(await page.getByLabel(labels.fixtureName,{exact:true}).count(),1,"fixture naming has a localized label");
    assert.equal(await page.getByLabel(`${labels.fixtureRotation} (°)`,{exact:true}).count(),1,"fixture rotation has a localized label and unit");
    await openCommandMenu("palette");
    assert.equal(await page.locator("#seed").getAttribute("aria-label"),labels.seedColour,"the seed field has a localized accessible name");
    const harmony=page.locator("#harmony");
    const value=await harmony.inputValue()==="complementary" ? "triadic" : "complementary";
    const harmonyLabel=labels[`harmony_${value}`];
    await harmony.selectOption(value);
    assert.equal(await harmony.locator("option:checked").textContent(),harmonyLabel);
    assert.ok((await page.locator(".palette-summary").textContent()).includes(harmonyLabel),"the summary immediately shows the localized harmony");
    await page.keyboard.press("Escape");
    const exportLabels = {
      '[data-export="project"]': `${labels.project} JSON`,
      '[data-export="palette"]': `${labels.commandPalette} JSON`,
      '[data-export="css"]': labels.exportCss,
      "#export-svg": `${labels.commandPalette} SVG`,
      '[data-raster="image/png"]': `${labels.commandPalette} PNG`,
      '[data-raster="image/jpeg"]': `${labels.commandPalette} JPEG`,
      '[data-export="patch"]': `${labels.commandFixtures} CSV`,
      '[data-export="cues"]': `${labels.timeline} CSV`,
    };
    assert.equal(await page.locator("html").getAttribute("lang"), locale, "the document exposes the selected locale");
    for (const [selector, label] of Object.entries(exportLabels)) {
      assert.equal(await page.locator(`#command-menu-panel-export ${selector}`).textContent(), label, `${selector} matches the ${locale} interface`);
    }
  }
  await page.locator("#locale").selectOption("en");
  assert.deepEqual(await page.locator('[data-command-group="project"]').evaluate((group)=>[...group.querySelectorAll("button")].map((button)=>button.id)),["new-project","open-project","save","import-project","import-image"],"project commands match New, Open, Save, Import order");
  const importChooser=page.waitForEvent("filechooser");
  await clickCommand("project","#import-image");
  await importChooser;
  assert.equal(await page.locator('.command-menu-system [data-command-group="view"]').count(), 0, "module navigation does not repeat a duplicate view group in the top-bar menu");
  assert.equal((await page.locator('[data-command-group="scene"] > span').innerText()).trim().toUpperCase(), "SCENE", "the top-bar menu labels this group with the concise Scene heading from the reference");
  assert.deepEqual(await page.locator(".command-group > span").evaluateAll((items)=>items.map((item)=>item.textContent.trim())),["Project","History","Scene","Palette","Fixtures","Stage","Room","Export","Help & Guide"],"Stage and Room sit beside Export, followed by Help & Guide");
  assert.equal((await page.locator('.command-group[data-command-group="palette"] .harmony-command > span').innerText()).trim(), "◇ Harmonies", "palette harmony control matches the reference label");
  for (const [button,label] of [["#open-versions","Versions"],["#open-compare","Compare"]]) {
    assert.equal((await page.locator(`.command-group[data-command-group="palette"] ${button}`).innerText()).trim(),label,`${label} is a primary Palette menu action`);
  }
  await clickCommand("palette","#open-compare");
  assert.equal(await page.locator("#palette-compare-menu").evaluate((menu)=>menu.hidden===false),true,"Compare opens its in-menu panel");
  assert.match(await page.locator("#version-comparison").innerText(),/Save a palette version/,"Compare explains the empty state before a version exists");
  await page.locator("#open-compare").click();
  await clickCommand("palette","#open-versions");
  await page.locator("#save-version").click();
  await page.waitForFunction(()=>globalThis.document.querySelector("#palette-version option"));
  await clickCommand("palette","#open-compare");
  assert.ok(await page.locator("#version-comparison table tbody tr").count()>0,"Compare renders rows after a version is saved");
  await page.locator("#open-compare").click();

  for (const selector of ["#harmony", "#reroll", "#add-colour"]) {
    assert.equal(await page.locator(`.command-group[data-command-group="palette"] ${selector}`).count(), 1, `${selector} is available in the Palette command group`);
  }
  for (const selector of ["#save-version", "#palette-version", "#restore-version"]) {
    assert.equal(await page.locator(`#palette-versions-menu ${selector}`).count(), 1, `${selector} remains available in the Versions subpanel`);
  }
  for (const selector of ["#seed", "#custom-spacing", "#custom-hues", "#perceptual-scale", "#temperature-strength"]) {
    assert.equal(await page.locator(`.left-rail .palette-panel ${selector}`).count(), 1, `${selector} remains available in the docked Active Palette panel`);
    assert.equal(await page.locator(`.command-group[data-command-group="palette"] ${selector}`).count(), 0, `${selector} does not crowd the primary Palette menu`);
  }
  assert.equal(await page.locator(".lower-workspace .palette-panel").count(),0,"the palette panel uses its dedicated left-rail dock");
  assert.equal(await page.locator(".lower-workspace .timeline").evaluate((timeline)=>timeline.getBoundingClientRect().width>800),true,"the timeline expands across the freed lower work area");
  const sidebarCanvas=await page.locator(".scene-preview").boundingBox();
  await page.locator("#toggle-fixture-groups").click();
  assert.equal(await page.locator("#fixture-groups:popover-open").count(),1,"Fixture Groups opens as a floating left-rail menu");
  assert.equal(await page.locator("#fixture-groups [data-group-member]").count(),9,"Fixture Groups lists all nine active fixtures");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(),sidebarCanvas,"opening Fixture Groups leaves the studio stationary");
  await page.locator("#group-name").fill("Verification group");
  await page.locator("#fixture-groups [data-group-member]").nth(0).check();
  await page.locator("#fixture-groups [data-group-member]").nth(1).check();
  await page.locator("#save-group").click();
  await page.locator("#toggle-fixture-groups").click();
  assert.equal(await page.locator("#fixture-groups").getByText("Verification group").count(),1,"saving a group persists and renders it in the floating menu");
  await page.locator("#fixture-groups [data-delete-group]").click();
  await page.locator("#toggle-fixture-groups").click();
  const groupBounds=await page.locator("#fixture-groups").boundingBox();
  assert.ok(groupBounds.x>=0&&groupBounds.y>=0&&groupBounds.x+groupBounds.width<=1754&&groupBounds.y+groupBounds.height<=878,"Fixture Groups stays within the visible viewport");
  await page.mouse.move(1700,850);
  await page.locator("#fixture-groups:popover-open").waitFor({state:"detached",timeout:3000});
  await openFixtureList();
  await page.locator('.fixture-select[title="Moving Head RGB 2"]').click();
  assert.equal(await page.locator("#virtual-dmx-monitor .virtual-dmx-channel").count(),10,"Virtual DMX keeps the selected fixture's live channel values visible in the left sidebar");
  assert.deepEqual(await page.locator("#virtual-dmx-monitor .virtual-dmx-channel b").allTextContents(),["011","012","013","014","015","016","017","018","019","020"],"Virtual DMX keeps the selected fixture's one-based patched addresses");
  assert.equal(await page.locator("#virtual-dmx-monitor .virtual-dmx-channels").evaluate((grid)=>globalThis.getComputedStyle(grid).gridTemplateColumns.split(" ").length),5,"Virtual DMX fits five channels per row");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(),sidebarCanvas,"the docked Virtual DMX values leave the studio stationary");

  assert.equal(await page.locator(".workspace-tabs .viewport-view-controls [data-camera-view]").count(), 6, "six camera views are docked beside projection controls above the canvas");
  assert.equal(await page.locator(".inspector [data-scene-editor]").count(),0,"Stage and Room settings are removed from the inspector sidebar");
  const stageTrigger=page.locator('[data-command-menu-trigger="stage"]'),roomTrigger=page.locator('[data-command-menu-trigger="room"]');
  const stageTriggerBox=await stageTrigger.boundingBox(),roomTriggerBox=await roomTrigger.boundingBox(),exportTriggerBox=await page.locator('[data-command-menu-trigger="export"]').boundingBox();
  assert.equal(stageTriggerBox.y,roomTriggerBox.y,"Stage and Room labels share one menu row");
  assert.equal(roomTriggerBox.y,exportTriggerBox.y,"Room and Export labels share one menu row");
  assert.ok(stageTriggerBox.x+stageTriggerBox.width<=roomTriggerBox.x&&roomTriggerBox.x+roomTriggerBox.width<=exportTriggerBox.x,"Stage and Room have separate, non-overlapping homes beside Export");
  const stageCanvasBefore=await page.locator(".scene-preview").boundingBox();
  await stageTrigger.click();
  assert.equal(await page.locator("#stage-enabled").isVisible(),true,"Stage opens its editable platform controls in the floating top menu");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(),stageCanvasBefore,"opening Stage leaves the studio canvas stationary");
  const stageBounds=await page.locator("#command-menu-panel-stage").boundingBox(),stageViewport=page.viewportSize();
  assert.ok(stageBounds.x>=0&&stageBounds.x+stageBounds.width<=stageViewport.width&&stageBounds.y>=0&&stageBounds.y+stageBounds.height<=stageViewport.height,"Stage panel stays inside the viewport");
  await page.locator("#stage-width").fill("6.2");
  await page.locator("#stage-width").press("Tab");
  assert.equal(await page.locator("#command-menu-panel-stage").evaluate(panel=>panel.matches(":popover-open")),true,"editing Stage fields keeps the panel open until Apply");
  await page.locator("#apply-stage").click();
  assert.equal(await page.locator("#stage-width").count(),1,"applying Stage settings persists them and rerenders the editor");
  await roomTrigger.click();
  assert.equal(await page.locator("#room-width").isVisible(),true,"Room opens its editable dimensions and ambience controls");
  await page.keyboard.press("Escape");
  assert.equal(await roomTrigger.getAttribute("aria-expanded"),"false","Escape closes the Room menu");
  await openCommandMenu("export");
  assert.deepEqual(await page.locator('[data-command-group="export"] > button').evaluateAll((buttons)=>buttons.slice(0,2).map((button)=>button.id)),["export-viewport","export-canvas"],"PNG and canvas export lead the Export command group");
  assert.match((await page.locator("#export-viewport").innerText()).trim(),/PNG/,"the primary export action is visibly labeled PNG");

  await openCommandMenu("scene");
  assert.deepEqual(await page.locator(".workspace-tabs .viewport-view-controls [data-camera-view]").evaluateAll(buttons=>buttons.map(button=>button.title)),["Front view","Right view","Top view","Left view","Rear view","Isometric view"],"camera view icons expose clear names on hover and focus");
  assert.equal(await page.locator(".scene-preview .viewport-view-controls").count(), 0, "camera controls do not cover the 3D canvas");
  for (const selector of ["#viewport-projection", "#viewport-fullscreen"]) {
    assert.equal(await page.locator(`.workspace-tabs ${selector}`).count(), 1, `${selector} stays docked in the scene header`);
  }
  assert.deepEqual(await page.locator(".workspace-tabs").evaluate((row)=>[...row.querySelectorAll(":scope > button.view-menu")].map((button)=>button.id)),["viewport-projection","viewport-fullscreen"],"scene header keeps only unique projection and fullscreen actions");
  assert.equal(await page.locator('[data-command-group="scene"] #preview-quality').count(),1,"renderer quality has one clearly labeled home in the Scene menu");
  const sceneHeaderCanvas=await page.locator(".scene-preview").boundingBox();
  const projectionToggle=page.locator("#viewport-projection");
  await projectionToggle.click();
  assert.equal(await projectionToggle.getAttribute("aria-pressed"),"true","projection button visibly switches to orthographic mode");
  await projectionToggle.click();
  assert.equal(await projectionToggle.getAttribute("aria-pressed"),"false","projection button switches back to perspective mode");
  await openCommandMenu("scene");await page.locator("#preview-quality").selectOption("performance");
  assert.equal(await page.locator("#preview-quality").inputValue(), "performance", "the single quality selector switches the renderer to its performance profile");
  await openCommandMenu("scene");await page.locator("#preview-quality").selectOption("balanced");
  assert.equal(await page.locator("#preview-quality").inputValue(), "balanced", "the same quality selector restores the balanced renderer profile");
  await clickCommand("scene","#reset-camera");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(), sceneHeaderCanvas, "Reset camera does not move the canvas");
  let frontViewport;
  for (const view of ["front", "right", "top", "left", "back", "iso"]) {
    const control = page.locator(`.viewport-view-controls [data-camera-view="${view}"]`);
    assert.equal(await control.isEnabled(), true, `${view} camera view is enabled with the active WebGL renderer`);
    await control.click();
    assert.equal(await control.getAttribute("aria-pressed"),"true",`${view} view shows its active selection state`);
    if (view === "front") frontViewport = await sampleCurrentViewport();
    if (view === "top") {
      assert.ok(viewportPixelDifference(frontViewport, await sampleCurrentViewport()) > 1,
        "front and top camera views produce different rendered viewport exports");
    }
  }
  const coreTools = ["select", "paletteBrush", "fixture", "material", "shapes", "text", "measure", "orbit"];
  for (const key of coreTools) {
    assert.equal(await page.locator(`[data-tool="${key}"]`).isEnabled(), true, `${key} tool is enabled`);
  }
  const canvasBefore = await page.locator(".scene-preview").boundingBox();
  const menuCanvasBefore=await page.locator(".scene-preview").boundingBox();
  const menuDocumentBefore=await page.evaluate(()=>[globalThis.document.documentElement.scrollWidth,globalThis.document.documentElement.scrollHeight]);
  assert.equal(await page.locator(".ribbon-scroll-hint").count(),0,"the obsolete drag-scroll ribbon label is removed");
  const projectMenuTrigger=page.locator('[data-command-menu-trigger="project"]');
  await projectMenuTrigger.click();
  assert.equal(await page.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),true,"Project opens as a floating top-layer menu");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(),menuCanvasBefore,"opening a menu does not move the canvas");
  assert.deepEqual(await page.evaluate(()=>[globalThis.document.documentElement.scrollWidth,globalThis.document.documentElement.scrollHeight]),menuDocumentBefore,"opening a menu does not resize the page");
  const projectMenuBounds=await page.locator("#command-menu-panel-project").boundingBox();
  assert.ok(projectMenuBounds.x>=0&&projectMenuBounds.y>=0&&projectMenuBounds.x+projectMenuBounds.width<=1754&&projectMenuBounds.y+projectMenuBounds.height<=878,"Project menu stays inside the viewport");
  await projectMenuTrigger.click();
  assert.equal(await page.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),false,"clicking the same menu closes it");
  await projectMenuTrigger.click();
  await page.locator('[data-command-menu-trigger="history"]').click();
  assert.equal(await page.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),false,"opening another menu closes the previous one");
  assert.equal(await page.locator("#command-menu-panel-history").evaluate(panel=>panel.matches(":popover-open")),true,"the selected menu opens");
  assert.equal(await page.locator(".command-menu-panel:popover-open").count(),1,"only one command menu stays open");
  await page.locator(".footer-ready").click();
  assert.equal(await page.locator("#command-menu-panel-history").evaluate(panel=>panel.matches(":popover-open")),false,"outside click closes the menu");
  const roomSceneMenuTrigger=page.locator('[data-command-menu-trigger="scene"]');
  await roomSceneMenuTrigger.click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#command-menu-panel-scene").evaluate(panel=>panel.matches(":popover-open")),false,"Escape closes the menu");
  await roomSceneMenuTrigger.focus();await page.keyboard.press("ArrowDown");
  assert.equal(await page.locator("#command-menu-panel-scene").evaluate(panel=>panel.matches(":popover-open")),true,"Arrow Down opens the focused menu");
  assert.equal(await page.evaluate(()=>globalThis.document.activeElement?.closest(".command-menu-panel")!==null),true,"Arrow Down moves focus into the menu");
  await page.keyboard.press("Escape");
  assert.equal(await roomSceneMenuTrigger.evaluate(trigger=>globalThis.document.activeElement===trigger),true,"Escape restores focus to the menu trigger");
  const triggerBox=await projectMenuTrigger.boundingBox();
  await page.mouse.move(triggerBox.x+triggerBox.width/2,triggerBox.y+triggerBox.height/2);
  await projectMenuTrigger.click();
  const itemBox=await page.locator("#new-project").boundingBox();
  await page.mouse.move(itemBox.x+itemBox.width/2,itemBox.y+itemBox.height/2);
  await page.waitForTimeout(260);
  assert.equal(await page.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),true,"moving from trigger into its panel does not close it");
  await page.mouse.move(24,20);
  await page.waitForTimeout(260);
  assert.equal(await page.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),false,"mouse leaving both trigger and panel closes it after a short delay");
  const exportTrigger=page.locator('[data-command-menu-trigger="export"]');
  await exportTrigger.click();
  const exportBounds=await page.locator("#command-menu-panel-export").boundingBox();
  assert.ok(exportBounds.x>=0&&exportBounds.x+exportBounds.width<=1754&&exportBounds.y>=0&&exportBounds.y+exportBounds.height<=878,"the right-edge Export menu repositions within the viewport");
  await page.locator(".footer-ready").click();

  const toolsToggle=page.locator("#toggle-tools"),toolMenu=page.locator("#tool-list"),fixturesToggle=page.locator("#toggle-fixtures"),fixturesMenu=page.locator("#fixture-list");
  const fixtureListBounds=await page.locator(".fixture-list-section").boundingBox();
  const sceneBoundsBeforeTools=await page.locator(".scene-preview").boundingBox();
  await fixturesToggle.click();
  assert.equal(await fixturesMenu.evaluate(panel=>panel.matches(":popover-open")),true,"clicking Fixture list opens its floating panel");
  const firstFixtureRow=page.locator("[data-layer-fixture]").first();
  assert.ok(await firstFixtureRow.getAttribute("title"),"fixture rows identify their name on hover");
  await firstFixtureRow.hover();
  await page.waitForTimeout(260);
  assert.equal(await fixturesMenu.evaluate(panel=>panel.matches(":popover-open")),true,"the fixture panel stays open while inspecting a row past its leave delay");
  assert.equal(await firstFixtureRow.evaluate(row=>row.matches(":hover")),true,"the hovered fixture row remains the visible selection target");
  await page.mouse.move(1738,860);
  await page.waitForTimeout(260);
  assert.equal(await fixturesMenu.evaluate(panel=>panel.matches(":popover-open")),false,"leaving both the Fixture list trigger and panel closes it after a short delay");
  await fixturesToggle.click();
  await firstFixtureRow.focus();
  await page.keyboard.press("Escape");
  await page.waitForFunction(()=>globalThis.document.querySelector("#toggle-fixtures")?.getAttribute("aria-expanded")==="false");
  assert.equal(await fixturesToggle.getAttribute("aria-expanded"),"false","Escape closes the Fixture list panel");
  await fixturesToggle.click();
  assert.equal(await toolsToggle.getAttribute("aria-expanded"),"false","Tools starts closed");
  await toolsToggle.click();
  assert.equal(await fixturesMenu.evaluate(panel=>panel.matches(":popover-open")),false,"opening Tools closes the Fixture list panel");
  assert.equal(await toolsToggle.getAttribute("aria-expanded"),"true","clicking Tools opens its floating panel");
  assert.equal(await toolMenu.evaluate(panel=>panel.matches(":popover-open")),true,"Tools opens as a top-layer popover");
  const shapesTool=page.locator('[data-tool="shapes"]');
  assert.equal(await shapesTool.isVisible(),true,"all tools are available in the floating panel");
  assert.ok(await shapesTool.getAttribute("title"),"tool rows identify their action on hover");
  await shapesTool.hover();
  await page.waitForTimeout(260);
  assert.equal(await toolMenu.evaluate(panel=>panel.matches(":popover-open")),true,"Tools stays open while inspecting a tool past its leave delay");
  assert.equal(await shapesTool.evaluate(button=>button.matches(":hover")),true,"the hovered tool row remains the visible selection target");
  const toolBounds=await toolMenu.boundingBox(),viewport=page.viewportSize();
  assert.ok(toolBounds.x>=0&&toolBounds.x+toolBounds.width<=viewport.width&&toolBounds.y>=0&&toolBounds.y+toolBounds.height<=viewport.height,"the Tools panel stays inside the viewport");
  assert.deepEqual(await page.locator(".fixture-list-section").boundingBox(),fixtureListBounds,"opening Tools does not resize or displace the fixture list");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(),sceneBoundsBeforeTools,"opening Tools leaves the studio canvas stationary");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(40);
  assert.equal(await toolMenu.evaluate(panel=>panel.matches(":popover-open")),false,"Escape closes Tools");
  assert.equal(await toolsToggle.getAttribute("aria-expanded"),"false","ARIA state follows Escape dismissal");
  await toolsToggle.evaluate(trigger=>trigger.click());
  assert.equal(await toolMenu.evaluate(panel=>panel.matches(":popover-open")),true,"the same Tools trigger opens the panel again");
  await toolsToggle.evaluate(trigger=>trigger.click());
  assert.equal(await toolMenu.evaluate(panel=>panel.matches(":popover-open")),false,"clicking Tools again closes its panel");
  await toolsToggle.click();
  await page.locator(".footer-ready").click();
  await page.waitForTimeout(40);
  assert.equal(await toolMenu.evaluate(panel=>panel.matches(":popover-open")),false,"clicking outside closes Tools");
  assert.deepEqual(await page.locator(".fixture-list-section").boundingBox(),fixtureListBounds,"closing Tools keeps the fixture list stationary");
  await toolsToggle.click();

  await page.locator('[data-tool="shapes"]').click();
  assert.equal(await page.locator("#tool-list").evaluate(panel=>panel.matches(":popover-open")),false,"selecting a tool closes the Tools panel");
  assert.equal(await page.locator('[data-tool="shapes"]').isVisible(),false,"closed Tools controls do not remain over the sidebar");
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 1, "Shapes adds an editable canvas object");
  await toolsToggle.click();
  await page.locator('[data-tool="text"]').click();
  assert.equal(await page.locator("#tool-list").evaluate(panel=>panel.matches(":popover-open")),false,"Text selection also closes Tools");
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 2, "Text adds an editable canvas object");
  const textEditor=page.locator("#canvas-text");
  assert.equal(await textEditor.isVisible(), true, "Text tool opens the selected text object in the inspector editor");
  assert.equal(await textEditor.evaluate((input) => input.ownerDocument.activeElement === input), true, "Text input receives focus immediately");
  assert.equal(await textEditor.inputValue(), "Text", "new text placeholder is selected for replacement");
  await textEditor.fill("Editable label");
  await page.locator("#apply-object").click();
  assert.equal(await page.locator(".design-canvas text").textContent(), "Editable label", "Apply object changes updates the text shown on the canvas");
  const canvasSvg = (await downloadExportFile("#export-canvas", "-canvas.svg")).toString("utf8");
  assert.match(canvasSvg, /<text\b[^>]*>Editable label<\/text>/, "canvas SVG includes the edited text as vector text");
  assert.doesNotMatch(canvasSvg, /data-canvas-object/, "canvas SVG omits editor interaction attributes");
  const firstSceneId=await page.locator("#scene-select").inputValue();
  await page.locator("#create-cue").click();
  const firstSceneCues=page.locator(".timeline > .cue-track .cue-block"),firstSceneCueCount=await firstSceneCues.count();
  const firstSceneCueId=await firstSceneCues.last().getAttribute("data-cue");
  assert.ok(firstSceneCueId,"a cue can be captured in the first scene");
  await openCommandMenu("palette");
  await page.locator("#harmony").selectOption("square");
  await clickCommand("palette","#reroll");
  const portablePalette=JSON.parse(await downloadExportFile('[data-export="palette"]',".json"));
  assert.equal(portablePalette.harmonyType,"square","palette JSON exports the chosen project harmony");
  await clickCommand("project","#save");
  await page.locator("#saved-project-name").fill("Studio Acceptance");
  await page.locator(".project-dialog button[type=submit]").click();
  assert.equal(await page.locator(".header-save-status").innerText(),"Saved locally","explicit Save marks the named project as saved");
  const savedRecord=await page.evaluate(()=>JSON.parse(localStorage.getItem("adigunlightdesign/saved-projects-v1")).projects[0]);
  assert.equal(savedRecord.project.palettes[0].harmonyType,"square","the project saves its harmony");
  assert.equal(savedRecord.project.cues.find(cue=>cue.id===firstSceneCueId).sceneId,firstSceneId,"saved cues retain their owning scene id");
  savedRecord.project.scenes.push({...structuredClone(savedRecord.project.scenes[0]),id:"acceptance-secondary-scene",name:"Secondary room",canvasObjects:[]});
  await page.evaluate((record)=>{const data=JSON.parse(localStorage.getItem("adigunlightdesign/saved-projects-v1"));data.projects[0]=record;localStorage.setItem("adigunlightdesign/saved-projects-v1",JSON.stringify(data));},savedRecord);
  await page.reload();
  assert.equal(await page.locator("#project-name").inputValue(),"Studio Mood","refresh starts a fresh workspace even when a project was explicitly saved");
  assert.equal(await page.locator("#scene-select option").count(),1,"saved projects are not restored automatically after refresh");
  assert.equal(await page.locator("#harmony").inputValue(),"analogous","a fresh project uses its own starter harmony");
  await clickCommand("project","#open-project");
  await page.locator('[data-open-saved]').filter({hasText:"Studio Acceptance"}).click();
  assert.equal(await page.locator("#scene-select option").count(), 2, "Open explicitly loads the selected saved project");
  assert.equal(await page.locator("#harmony").inputValue(),"square","reopening restores the project harmony");
  await page.locator("#scene-select").selectOption("acceptance-secondary-scene");
  assert.match(await page.locator("#scene-select option:checked").innerText(), /Secondary room/, "scene selector switches to the selected project scene");
  assert.match(await page.locator(".footer-ready").innerText(),/Scene 02/,"footer scene number updates when the active scene changes");
  assert.equal(await page.locator(".fixture-layer-list li").count(),0,"a new room starts without borrowing the first room's fixtures");
  await clickCommand("fixtures","#add-fixture");
  assert.equal(await page.locator(".fixture-layer-list li").count(),1,"a fixture added in the selected room belongs to that room");
  await openFixtureList();
  const secondaryFixtureId=(await page.locator("[data-layer-fixture]").first().getAttribute("data-layer-fixture"));
  assert.equal(await page.locator(".timeline > .cue-track .cue-block").count(),0,"a new scene starts with its own empty cue timeline");
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 0, "scene selection shows its own canvas objects");
  await page.locator("#create-cue").click();
  const secondSceneCueId=await page.locator(".timeline > .cue-track .cue-block").getAttribute("data-cue");
  assert.ok(secondSceneCueId,"a cue can be captured in the selected scene");
  const cueExportPromise=page.waitForEvent("download");
  await clickCommand("export",'[data-export="project"]');
  const cueExport=await cueExportPromise, cueExportPath=await cueExport.path();
  const persistedSecondSceneCue=JSON.parse(await readFile(cueExportPath,"utf8")).cues.find(cue=>cue.id===secondSceneCueId);
  assert.equal(persistedSecondSceneCue.sceneId,"acceptance-secondary-scene","new cues store their owning scene id");
  assert.deepEqual(persistedSecondSceneCue.targets.map(target=>target.fixtureId),[secondaryFixtureId],"a room cue captures only fixtures owned by that room");
  await page.locator("#toggle-tools").click();
  await page.locator('[data-tool="shapes"]').click();
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 1, "canvas editing writes to the selected scene");
  await page.locator("#scene-select").selectOption(firstSceneId);
  await openFixtureList();
  assert.equal(await page.locator(".timeline > .cue-track .cue-block").count(),firstSceneCueCount,"the first scene keeps its own cue lane");
  assert.equal(await page.locator(".fixture-layer-list li").count(),9,"the first room retains its original fixture rig");
  assert.notEqual(await page.locator(".timeline > .cue-track .cue-block").last().getAttribute("data-cue"),secondSceneCueId,"switching scenes does not show the other scene's cues");
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 2, "switching back preserves the first scene canvas");
  await page.locator("#scene-select").selectOption("acceptance-secondary-scene");
  await openFixtureList();
  assert.equal(await page.locator(".timeline > .cue-track .cue-block").count(),1,"switching back restores the second scene cue lane");
  assert.equal(await page.locator(".fixture-layer-list li").count(),1,"switching back restores the room's own fixture rig");
  assert.equal(await page.locator(".timeline > .cue-track .cue-block").getAttribute("data-cue"),secondSceneCueId,"the second scene cue remains selected in its own timeline");
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(), 1, "secondary scene edits persist independently");
  await page.locator("#scene-select").selectOption(firstSceneId);
  await openFixtureList();
  await openCommandMenu("room");
  const firstRoomWidth=await page.locator("#room-width").inputValue();
  await page.locator("#scene-select").selectOption("acceptance-secondary-scene");
  await openCommandMenu("room");
  await page.locator("#room-width").fill("6.5");
  await page.locator("#apply-room").click();
  await page.locator("#scene-select").selectOption(firstSceneId);
  assert.equal(await page.locator("#room-width").inputValue(), String(firstRoomWidth), "Room edits do not leak into another scene");
  await page.locator("#scene-select").selectOption("acceptance-secondary-scene");
  assert.equal(await page.locator("#room-width").inputValue(), "6.5", "Room edits apply to the selected scene");
  await page.locator("#scene-select").selectOption(firstSceneId);
  await page.locator("#scene-select").selectOption(firstSceneId);
  await page.locator("#toggle-tools").click();
  await page.locator('[data-tool="measure"]').click();
  await page.locator(".design-canvas").press("ArrowRight");
  assert.match(await page.locator("#status").innerText(), /canvas units/i, "Measure reports a live canvas distance");
  await openFixtureList();
  await page.locator('[data-layer-fixture]').nth(1).click();
  assert.equal(await page.locator('[data-layer-fixture]').nth(1).getAttribute("aria-pressed"), "true", "fixture selection follows the selected project fixture");
  await page.locator('[data-module="palette"]').click();
  assert.equal(await page.locator(".palette-panel").isVisible(), true, "2D palette view opens");
  assert.match(await page.locator('[data-module="light"]').innerText(), /3D Studio/, "module navigation clearly names the lighting workspace");
  assert.equal(await page.locator("#palette-inspector-panel").isVisible(), true, "Design selects the palette inspector");
  for(const selector of ["#swatch-name","#swatch-hex","#apply-colour","#copy-hex","#apply-hsl","#apply-oklch","#swatch-opacity","#apply-opacity","#lock-swatch",".colour-space-card",".contrast-card"]) assert.ok(await page.locator(`#palette-inspector-panel ${selector}`).count()>0,`Palette Engine keeps ${selector} available in the compact right sidebar`);
  assert.equal(await page.locator("#palette-inspector-panel .contrast-card dl > div").count(),4,"Palette Engine keeps all four AA/AAA contrast checks visible");
  assert.ok(await page.locator("#palette-inspector-panel").evaluate((panel)=>panel.scrollHeight<=panel.clientHeight+2),"Palette Engine controls fit in the right sidebar without a hidden scroll region");
  const swatchHex=page.locator("#swatch-hex");
  const background=page.locator("#contrast-background");
  const originalBackground=await background.inputValue();
  const contrastRatio=page.locator(".contrast-card b");
  const contrastLevels=page.locator(".contrast-card dl dd");
  await background.fill("#ffffff");
  await swatchHex.fill("#0477DB");
  await page.locator("#apply-colour").click();
  assert.equal(await contrastRatio.innerText(),"4.49 : 1","a ratio below 4.5 never displays as 4.50");
  assert.equal(await contrastLevels.first().getAttribute("class"),"fail");
  await page.locator("#apply-contrast").click();
  assert.equal(await contrastLevels.first().getAttribute("class"),"pass","the suggested color actually crosses the AA threshold");
  await clickCommand("history","#undo");
  await clickCommand("history","#undo");
  await swatchHex.fill("#000000");
  await page.locator("#apply-colour").click();
  await page.locator("#swatch-opacity").fill("50");
  await page.locator("#apply-opacity").click();
  assert.deepEqual(await contrastLevels.evaluateAll(items=>items.map(item=>item.className)),["fail","fail","pass","fail"],"translucent black on white passes large-text AA only");
  assert.equal(await page.locator(".selected-preview").evaluate(node=>globalThis.getComputedStyle(node).backgroundColor),"rgb(128, 128, 128)","the preview shows the same composited swatch used for contrast");
  await clickCommand("history","#undo");
  await clickCommand("history","#undo");
  await background.fill(originalBackground);
  const swatches = page.locator(".palette-panel .swatches [data-swatch]");
  const existingSwatches = await swatches.allTextContents();
  const imageFixtures = await page.evaluate(() => {
    const canvas = globalThis.document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext("2d");
    context.fillStyle = "#E4128A";
    context.fillRect(0, 0, 2, 2);
    return [["png", "image/png"], ["jpg", "image/jpeg"], ["webp", "image/webp"]].map(([extension, mimeType]) => ({
      extension,
      mimeType,
      encoded: canvas.toDataURL(mimeType, 1),
    }));
  });
  for (const { extension, mimeType, encoded } of imageFixtures) {
    const [header, payload] = encoded.split(",");
    assert.equal(header, `data:${mimeType};base64`, `the fixture is encoded as ${mimeType}`);
    const [imageChooser] = await Promise.all([page.waitForEvent("filechooser"), page.locator("#extract-image").click()]);
    await imageChooser.setFiles({ name: `palette-source.${extension}`, mimeType, buffer: Buffer.from(payload, "base64") });
    await page.waitForFunction(count => globalThis.document.querySelectorAll(".palette-panel .swatches [data-swatch]").length === count + 1, existingSwatches.length);
    const extractedSwatches = await swatches.allTextContents();
    assert.deepEqual(extractedSwatches.slice(0, -1), existingSwatches, `${mimeType} extraction preserves the existing palette`);
    const color = extractedSwatches.at(-1).match(/#([0-9a-f]{6})/i);
    assert.ok(color, `${mimeType} extraction appends a hex swatch`);
    const channels = Buffer.from(color[1], "hex");
    const tolerance = extension === "png" ? 0 : 4;
    assert.ok(channels.every((channel, index) => Math.abs(channel - [228, 18, 138][index]) <= tolerance), `${mimeType} yields the expected color within encoding tolerance`);
    await clickCommand("history", "#undo");
    assert.deepEqual(await swatches.allTextContents(), existingSwatches, `Undo restores the palette before ${mimeType} extraction`);
    await clickCommand("history", "#redo");
    assert.deepEqual(await swatches.allTextContents(), extractedSwatches, `Redo restores the ${mimeType} swatch`);
    await clickCommand("history", "#undo");
  }
  await page.screenshot({path:resolve("outputs","palette-engine-1754x878.png")});
  const canvasBeforeSceneSettings=await page.locator(".scene-preview").boundingBox();
  await openCommandMenu("room");
  assert.equal(await page.locator("#command-menu-panel-room").isVisible(), true, "Room command opens its settings without changing the active workspace");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(), canvasBeforeSceneSettings, "opening Room settings leaves the canvas in place");
  await page.locator('[data-module="light"]').click();
  assert.equal(await page.locator("#fixture-inspector-panel").isVisible(), true, "Light Lab module selects the fixture inspector");
  assert.equal(await page.locator(".inspector-group-fixture #apply-fixture").getAttribute("aria-label"),"Apply fixture properties","fixture apply icon retains its accessible action name");
  assert.equal(await page.locator(".inspector-group-dmx #apply-fixture-patch").getAttribute("aria-label"),"Apply patch","the compact patch icon keeps its distinct accessible action");
  assert.equal(await page.locator(".inspector-group-effects h3 #play-effect").getAttribute("aria-label"),"Preview effect","Effects keeps a distinct accessible preview action in its heading");
  assert.equal(await page.locator(".inspector-group-light .inspector-icon-action").count(),0,"Light controls do not gain a duplicate or dummy Apply action");
  assert.equal(await page.locator("#fixture-inspector-panel .fixture-profile-summary, #fixture-inspector-panel .fixture-profile-context, #fixture-inspector-panel .fixture-position-summary").count(),0,"redundant type, mode, and position readouts are removed while their editable controls remain");
  assert.equal(await page.locator("#fixture-inspector-panel").evaluate(panel=>panel.scrollWidth<=panel.clientWidth+1),true,"compact inspector controls do not create horizontal overflow");
  for(const action of ["#apply-fixture","#apply-fixture-patch","#play-effect"]){const button=page.locator(action),bounds=await button.boundingBox();assert.ok(bounds.width<=29&&bounds.height<=27,`${action} uses a compact icon control`);assert.ok(await button.getAttribute("title"),`${action} explains its icon on hover`);}
  assert.equal(await page.locator(".inspector-group-dmx .fixture-output-note").innerText(),"Virtual output only · CH 1–512","DMX panel states the real virtual-only channel range");
  assert.equal(await page.locator("#fixture-address").evaluate((input)=>input.closest("label").firstChild.textContent),"Start","the patch form names its starting DMX address");
  await openCommandMenu("room");
  assert.equal(await page.locator("#room-width").isVisible(),true,"Room dimensions remain accessible from the dedicated top menu");
  await openCommandMenu("stage");
  assert.equal(await page.locator("#stage-enabled").isVisible(),true,"Stage settings remain accessible from the dedicated top menu");
  for (const group of ["fixture", "light", "dmx", "effects"]) {
    assert.equal(await page.locator(`#fixture-inspector-panel .inspector-group-${group}`).isVisible(), true, `${group} controls are visible in the unified inspector`);
  }
  const fixtureColor = page.locator("#fixture-colour");
  const originalFixtureColor = await fixtureColor.inputValue();
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), originalFixtureColor.toUpperCase(), "the inspector exposes the selected fixture's actual hex colour");
  assert.equal(await page.locator("#fixture-blue-channel").isVisible(), true, "supported RGB fixtures expose the blue DMX channel in the visible Light group");
  const originalPatchAddress=await page.locator("#fixture-address").inputValue();
  await page.locator("#fixture-address").fill("200");
  await page.locator("#fixture-blue-channel").fill("199");
  assert.equal(await page.locator("#fixture-blue-channel-value").innerText(), "78%", "blue channel shows its normalized value");
  assert.equal(await fixtureColor.inputValue(), originalFixtureColor, "blue channel edits remain staged before Apply");
  await page.locator("#apply-fixture").click();
  assert.equal(await page.locator("#fixture-address").inputValue(),originalPatchAddress,"fixture properties do not commit a staged DMX patch");
  assert.equal(Number.parseInt((await fixtureColor.inputValue()).slice(-2), 16), 199, "Apply commits the selected fixture's exact blue channel");
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), (await fixtureColor.inputValue()).toUpperCase(), "the hex readout follows the applied fixture colour");
  await clickCommand("history","#undo");
  assert.equal(await fixtureColor.inputValue(), originalFixtureColor, "Undo restores the blue channel transaction");
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), originalFixtureColor.toUpperCase(), "Undo also restores the visible hex readout");
  const projectExportSelector = '[data-export="project"]';
  const fixturesBeforePatch = JSON.parse(await downloadExportFile(projectExportSelector, ".ald.json")).fixtures;
  const patchFixtureId = await page.locator("#fixture-select").inputValue();
  const existingPatch = fixturesBeforePatch.find(fixture => fixture.id === patchFixtureId).patchAssignment;
  const conflictingFixture = fixturesBeforePatch.find(fixture =>
    fixture.id !== patchFixtureId && fixture.patchAssignment?.universe === existingPatch.universe);
  assert.ok(conflictingFixture, "the starter rig has another fixture in the same universe");
  const patchAddress = page.locator("#fixture-address");
  await patchAddress.fill(String(conflictingFixture.patchAssignment.startAddress));
  await page.locator("#apply-fixture-patch").click();
  assert.ok((await page.locator("#status").textContent()).includes(`Address overlaps ${conflictingFixture.name}.`),
    "a conflicting address identifies the fixture occupying it");
  const fixturesAfterRejectedPatch = JSON.parse(await downloadExportFile(projectExportSelector, ".ald.json")).fixtures;
  assert.deepEqual(fixturesAfterRejectedPatch, fixturesBeforePatch,
    "a rejected address change preserves the saved assignments for every fixture");
  await page.locator("#fixture-address").fill("200");
  await page.locator("#apply-fixture-patch").click();
  assert.equal(await page.locator("#fixture-address").inputValue(),"200","Apply patch commits the requested valid start address");
  await clickCommand("history","#undo");
  assert.equal(await page.locator("#fixture-address").inputValue(),originalPatchAddress,"Undo restores the previous DMX patch");
  assert.equal(await page.locator(".inspector-tabs").isHidden(), true, "fixture inspector has no nested tab menu");
  assert.equal(await page.locator(".fixture-actions-details").count(),0,"fixture actions are not repeated in the inspector; the ribbon and timeline own them");
  assert.equal(await page.locator(".command-group[data-command-group=\"fixtures\"] #add-fixture").count(),1,"Add RGB wash remains in the Fixtures menu");
  assert.equal(await page.locator(".timeline #create-cue").count(),1,"Capture cue remains in the docked timeline");
  for (const selector of [".fixture-configuration-details", ".light-advanced-controls"]) {
    assert.equal(await page.locator(`#fixture-inspector-panel ${selector}`).evaluate((element) => element.open), false, `${selector} keeps secondary controls compact by default`);
  }
  assert.doesNotMatch(await page.locator("#fixture-inspector-panel").innerText(), /(?:^|\n)Type\s|(?:^|\n)Mode\s|Position X\s|Pan\s+\d+\s+Tilt/i, "the sidebar omits redundant fixture type, mode, position, and channel readouts");
  const luxTop = await page.locator(".lux-panel.is-docked").evaluate((element) => element.getBoundingClientRect().top);
  const canvasBeforeInspectorScroll=await page.locator(".scene-preview").boundingBox();
  await page.locator("#play-effect").scrollIntoViewIfNeeded();
  const effectActionBottom=await page.locator("#play-effect").evaluate((element)=>element.getBoundingClientRect().bottom);
  assert.ok(effectActionBottom<=luxTop,`scrolling reveals the Effects action above docked Lux (action bottom ${effectActionBottom}, Lux top ${luxTop})`);
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(),canvasBeforeInspectorScroll,"opening the scrolled effect action leaves the canvas stationary");
  await page.locator("#fixture-inspector-panel").evaluate((panel)=>panel.scrollTop=0);
  await page.locator('[data-module="library"]').click();
  assert.equal(await page.locator('.fixture-library [data-profile="generic-led-strip-rgb"]').count(), 1, "the library exposes the tested virtual LED strip profile");
  await page.locator('[data-module="light"]').click();
  await openFixtureList();
  assert.equal(await page.locator("[data-layer-fixture]").count(), 9, "the Studio Mood starter project opens with the nine real virtual fixtures in the approved composition");
  await page.locator("[data-layer-fixture]").last().click();
  assert.match(await page.locator(".inspector > .section-title h2").innerText(), /LED Strip RGB 9/, "the reference LED strip is selected on first open");
  assert.equal(await page.locator("[data-layer-fixture]").count(), 9, "the fixture list contains the nine real virtual fixtures in the target composition");
  const visibleFixtureCount=await page.locator(".fixture-layer-list").evaluate((list)=>[...list.querySelectorAll("[data-layer-fixture]")].filter((button)=>{const row=button.getBoundingClientRect(),area=list.getBoundingClientRect();return row.top>=area.top&&row.bottom<=area.bottom;}).length);
  assert.equal(visibleFixtureCount, 9, "all nine reference fixtures fit in the visible left list at 1754×878");
  assert.match(await page.locator(".scene-title small").getAttribute("aria-label"), /9\/9 fixtures rendered/, "the preview badge exposes its actual rendered fixture count accessibly");
  assert.equal(await page.locator(".inspector > .section-title h2").innerText(), "Selected: LED Strip RGB 9", "the reference fixture is selected from the real nine-fixture composition");
  const layerCanvasBounds=await page.locator(".scene-preview").boundingBox();
  const lightingLayer=page.locator('[data-layer-visibility="lighting"]');
  assert.equal(await lightingLayer.getAttribute("aria-pressed"),"true","the Lighting layer starts visible");
  await lightingLayer.click();
  assert.equal(await page.locator('[data-layer-visibility="lighting"]').getAttribute("aria-pressed"),"false","clicking the Lighting layer turns its render off");
  assert.equal(await page.locator(".scene-preview").evaluate((canvas)=>canvas.classList.contains("hide-lighting")),true,"Lighting visibility is reflected by the studio canvas");
  assert.deepEqual(await page.locator(".scene-preview").boundingBox(),layerCanvasBounds,"toggling lighting leaves the studio canvas in place");
  await page.locator('[data-layer-visibility="lighting"]').click();
  const paletteLayer=page.locator('[data-layer-visibility="palette"]');
  await paletteLayer.click();
  assert.equal(await page.locator(".palette-panel").isVisible(),false,"clicking the Palette layer hides palette controls");
  await page.locator('[data-layer-visibility="palette"]').click();
  assert.equal(await page.locator(".palette-panel").isVisible(),true,"clicking the Palette layer again restores palette controls");
  await page.locator('[data-layer-visibility="props"]').click();
  assert.equal(await page.locator(".scene-preview").evaluate((canvas)=>canvas.classList.contains("hide-props")),true,"clicking Scene and props hides room furnishings");
  await page.locator('[data-layer-visibility="props"]').click();
  assert.equal(await page.locator(".scene-preview").evaluate((canvas)=>canvas.classList.contains("hide-props")),false,"clicking Scene and props again restores room furnishings");
  await openFixtureList();
  await page.locator("[data-delete-fixture-row]").first().click();
  assert.equal(await page.locator("[data-layer-fixture]").count(),8,"the fixture-row × control deletes only its chosen fixture");
  await clickCommand("history","#undo");
  await openFixtureList();
  assert.equal(await page.locator("[data-layer-fixture]").count(),9,"Undo restores the deleted fixture and project state");
  await page.locator('[data-layer-fixture]').last().click();
  await page.locator("#fixture-colour").fill("#2196F3");
  await page.locator("#apply-fixture").click();
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), "#2196F3", "the selected LED strip receives the reference swatch through Apply");
  await page.locator("#fixture-blue-channel").fill("199");
  assert.equal(await page.locator("#fixture-blue-channel-value").innerText(), "78%", "the screenshot shows the staged reference channel value");
  assert.equal(await page.locator("#fixture-colour-hex").innerText(), "#2196F3", "staging the blue value leaves the applied fixture colour unchanged");
  await page.evaluate(()=>globalThis.globalThis.document.activeElement?.blur?.());
  await clickCommand("scene","#reset-camera");
  await page.screenshot({ path: resolve("outputs", "studio-acceptance-reference-1754x878.png") });
  for (let index = 0; index < 12; index += 1) await clickCommand("fixtures","#add-fixture");
  await openFixtureList();
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
  await page.locator("#sequence-loop").evaluate((element) => { element.closest("label").click(); });
  assert.equal(await page.locator("#sequence-loop").isChecked(), true, "sequence looping toggles from its visible label");
  await page.locator("#create-cue").click();
  assert.equal(await page.locator(".cue-editor > h3").count(),0,"cue labels occupy the first line without a separate section-title line");
  const cueDock=await page.locator(".timeline-active-cue-editor").evaluate(editor=>{const timeline=editor.closest(".timeline"),actions=timeline.querySelector(":scope > .dmx-actions"),status=actions.querySelector(".timeline-status"),title=timeline.querySelector(":scope > .section-title"),transport=title.querySelector(".timeline-transport"),bounds=element=>{const box=element.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom};},editorBox=bounds(editor),actionsBox=bounds(actions),statusBox=bounds(status),titleBox=bounds(title),transportBox=bounds(transport);return {directChild:editor.parentElement===timeline,editorBeforeArrangement:editorBox.bottom<=timeline.querySelector(":scope > .arrangement-timeline").getBoundingClientRect().top+1,statusBeforeToolbar:actionsBox.bottom<=titleBox.top+1,statusContained:statusBox.left>=actionsBox.left&&statusBox.right<=actionsBox.right,editorFits:editorBox.left>=timeline.getBoundingClientRect().left&&editorBox.right<=timeline.getBoundingClientRect().right&&editor.scrollWidth<=editor.clientWidth+1,transportFits:transportBox.left>=titleBox.left&&transportBox.right<=titleBox.right&&transport.scrollWidth<=transport.clientWidth+1};});
  assert.equal(Object.values(cueDock).every(Boolean),true,`cue details occupy the former header area while title and transport fit below the status without overflow: ${JSON.stringify(cueDock)}`);
  const openCueEditor=await page.locator(".cue-editor").evaluate(editor=>{const bounds=editor.getBoundingClientRect(),controls=[...editor.querySelectorAll("input,select,button")],rect=element=>{const box=element.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom};};return {height:bounds.height,clientHeight:editor.clientHeight,scrollHeight:editor.scrollHeight,editor:rect(editor),hidden:controls.filter(control=>{const box=control.getBoundingClientRect();return box.width<=0||box.height<=0||box.top<bounds.top||box.bottom>bounds.bottom+1||box.left<bounds.left||box.right>bounds.right+1;}).map(control=>({id:control.id||control.getAttribute("aria-label")||control.textContent.trim(),bounds:rect(control)}))};});
  assert.equal(openCueEditor.scrollHeight<=openCueEditor.clientHeight+1&&openCueEditor.hidden.length===0,true,`cue timing and scheduling remain visible without scrolling when a cue is selected: ${JSON.stringify(openCueEditor)}`);
  const cueRows=await page.locator(".cue-timing").evaluate(row=>{const headingRow=row.querySelector(".cue-timing-headings"),valueRow=row.querySelector(".cue-timing-values"),headings=[...headingRow.children].filter(item=>!item.hasAttribute("aria-hidden")),values=[...valueRow.children],bounds=element=>{const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};},headerBox=bounds(headingRow),valueBox=bounds(valueRow),headerBounds=headings.map(bounds),valueBounds=values.slice(0,headings.length).map(bounds),allValueBounds=values.map(bounds),overlaps=items=>items.some((item,index)=>items.slice(index+1).some(other=>item.left<other.right-1&&item.right>other.left+1&&item.top<other.bottom-1&&item.bottom>other.top+1));return {labelsOnOneLine:headerBounds.every(item=>Math.abs(item.top-headerBounds[0].top)<1),valuesOnSecondLine:valueBox.top>=headerBox.bottom-1&&valueBounds.every(item=>item.top>=valueBox.top-1&&item.bottom<=valueBox.bottom+1),labelsAligned:headerBounds.every((item,index)=>Math.abs((item.left+item.right)/2-(valueBounds[index].left+valueBounds[index].right)/2)<1),overlaps:overlaps(headerBounds)||overlaps(allValueBounds),headerBox,valueBox,fields:headings.map(item=>item.textContent)};});
  assert.equal(cueRows.labelsOnOneLine&&cueRows.valuesOnSecondLine&&cueRows.labelsAligned&&!cueRows.overlaps,true,`cue timing and scheduling have aligned headings with compact values beneath and no overlap: ${JSON.stringify(cueRows)}`);
  await page.getByLabel("Cue name",{exact:true}).fill("Acceptance fade");
  await page.locator("#edit-cue-duration").fill("8");
  await page.locator("#edit-cue-fade").fill("1.5");
  await page.locator("#edit-cue-delay").fill("0.5");
  await page.locator("#edit-cue-fadeOut").fill("2");
  await page.locator("#edit-cue").click();
  await page.locator("#cue-track-name").fill("Acceptance track");
  await page.locator("#cue-start-time").fill("3.5");
  await page.locator("#schedule-cue").click();
  assert.equal(await page.locator(".arrangement-timeline .track-name").filter({hasText:"Acceptance track"}).count(), 1, "the scheduled cue appears on its chosen track");
  const keyframeChannel = JSON.parse(await page.locator("#keyframe-channel").inputValue());
  const channelName=await page.locator("#keyframe-channel option:checked").textContent();
  await page.locator("#keyframe-time").fill("2.5");
  await page.locator("#keyframe-value").fill("192");
  await page.locator("#save-keyframe").click();
  const keyframeRemoval=page.locator("[data-remove-keyframe]").first();
  assert.ok((await keyframeRemoval.locator("..").textContent()).startsWith(`${channelName} · 2.5s → 192`));
  assert.equal(await keyframeRemoval.getAttribute("aria-label"),`Remove keyframe · ${channelName} · 2.5s`);
  await page.locator("#edit-cue-duration").fill("2");
  await page.locator("#edit-cue-fadeOut").fill("0");
  await page.locator("#edit-cue").click();
  assert.match(await page.locator("#status").textContent(),/Keep the duration at 2.5 s or longer/);
  assert.equal(await keyframeRemoval.count(),1,"a rejected duration edit preserves its keyframe");
  await page.locator('.arrangement-timeline .cue-block[aria-pressed="true"]').click();
  assert.equal(await page.locator("#edit-cue-duration").inputValue(),"8","a rejected edit preserves the stored duration");
  const ruler = page.locator('.arrangement-timeline .timeline-ruler[role="slider"]');
  await ruler.press("Home");
  await ruler.press("ArrowRight");
  await ruler.press("Shift+ArrowRight");
  assert.equal(await ruler.getAttribute("aria-valuenow"), "1.1", "keyboard seeking uses both fine and coarse steps");
  assert.equal(await ruler.evaluate(element => element.ownerDocument.activeElement === element), true, "keyboard seeking retains timeline focus after rendering");
  const rulerBounds = await ruler.boundingBox();
  await ruler.click({position:{x:rulerBounds.width / 2,y:rulerBounds.height / 2}});
  const pointerTime = Number(await ruler.getAttribute("aria-valuenow"));
  assert.ok(Math.abs(pointerTime - 15) <= .2, "pointer seeking moves to the midpoint of the thirty-second ruler");
  assert.match(await page.locator("#pause-playback").getAttribute("aria-label"), /^Resume/, "seeking pauses the arrangement preview");
  await page.locator("#play-tracks").click();
  assert.equal(await page.locator("#stop-cue").isEnabled(), true, "timeline playback starts");
  assert.equal(await page.locator("#pause-playback").isEnabled(), true, "timeline pause is enabled during playback");
  await page.locator("#pause-playback").click();
  assert.equal((await page.locator("#pause-playback").innerText()).trim(), "▶", "timeline pause toggles to its resume icon");
  assert.match(await page.locator("#pause-playback").getAttribute("aria-label"), /^Resume/, "resume action remains named for assistive technology");
  await page.locator("#pause-playback").click();
  assert.equal((await page.locator("#pause-playback").innerText()).trim(), "Ⅱ", "timeline playback resumes with its pause icon");
  assert.match(await page.locator("#pause-playback").getAttribute("aria-label"), /^Pause/, "pause action remains named for assistive technology");
  await page.locator("#stop-cue").click();
  await page.locator("#project-name").fill("Studio Acceptance");
  await page.locator("#project-name").press("Tab");
  await clickCommand("project","#save");
  assert.equal(await page.locator(".header-save-status").innerText(),"Saved locally","the active project is saved before export");
  await openCommandMenu("export");
  const [projectExport]=await Promise.all([
    page.waitForEvent("download"),
    page.locator('[data-export="project"]').click(),
  ]);
  const exportPath = await projectExport.path();
  assert.ok(exportPath, "Project JSON export produces a file");
  const exportedProject = JSON.parse(await readFile(exportPath, "utf8"));
  assert.equal(exportedProject.name, "Studio Acceptance", "Project JSON contains the saved project name");
  const editedCue = exportedProject.cues.find(cue => cue.name === "Acceptance fade");
  assert.ok(editedCue, "the edited cue persists in the project export");
  assert.deepEqual([editedCue.trackId, editedCue.startTime, editedCue.duration, editedCue.fade, editedCue.delay, editedCue.fadeOut], ["Acceptance track", 3.5, 8, 1.5, .5, 2]);
  assert.ok(editedCue.channelKeyframes.some(frame => frame.fixtureId === keyframeChannel.fixtureId && frame.property === keyframeChannel.property && frame.time === 2.5 && frame.value === 192), "the saved keyframe persists in the project export");
  await page.reload();
  assert.equal(await page.locator("#project-name").inputValue(), "Studio Mood", "refresh does not auto-open the last saved project");
  await clickCommand("project","#open-project");
  await page.locator(".project-dialog [data-open-saved]").filter({hasText:"Studio Acceptance"}).click();
  assert.equal(await page.locator("#project-name").inputValue(),"Studio Acceptance","Open loads the saved project by choice");
  await clickCommand("project","#open-project");
  await page.locator(".project-dialog [data-import]").click();
  await page.locator("#project-file").setInputFiles(exportPath);
  await page.waitForFunction(() => globalThis.document.querySelector("#project-name")?.value === "Studio Acceptance");
  assert.equal(await page.locator("#project-name").inputValue(), "Studio Acceptance", "Import project JSON opens the selected file");
  await clickCommand("project","#new-project");
  assert.equal(await page.locator(".project-dialog [data-save]").count(),1,"unsaved replacement presents Save, Discard and Cancel");
  await page.locator(".project-dialog [data-cancel]").click();
  assert.equal(await page.locator("#project-name").inputValue(), "Studio Acceptance", "Cancel preserves the current project");
  await clickCommand("project","#new-project");
  await page.locator(".project-dialog [data-save]").click();
  await page.locator("#saved-project-name").fill("Imported acceptance");
  await page.locator(".project-dialog button[type=submit]").click();
  await page.waitForFunction(()=>globalThis.document.querySelector("#project-name")?.value==="Studio Mood");
  await openFixtureList();
  assert.equal(await page.locator("[data-layer-fixture]").count(),9,"Save then continue creates a fresh starter workspace");
  assert.equal(await page.locator(".header-save-status").innerText(),"Unsaved project","the fresh workspace is not mistaken for a saved project");
  await page.locator("#toggle-tools").click();
  await page.locator('[data-tool="shapes"]').click();
  const beforeUnload=await page.evaluate(()=>{const event=new Event("beforeunload",{cancelable:true});globalThis.dispatchEvent(event);return event.defaultPrevented;});
  assert.equal(beforeUnload,true,"unsaved work registers the browser native leave warning");
  await clickCommand("project","#new-project");
  await page.locator(".project-dialog [data-discard]").click();
  assert.equal(await page.locator("#project-name").inputValue(),"Studio Mood","Discard starts a clean new workspace");
  assert.equal(await page.locator(".design-canvas [data-canvas-object]").count(),0,"discard removes unsaved canvas work");
  const canvasAfter = await page.locator(".scene-preview").boundingBox();
  assert.deepEqual(canvasAfter, canvasBefore, "ordinary tools and view changes preserve the canvas bounds");
  await clickCommand("scene","#add-room-scene");
  assert.equal(await page.locator(".project-dialog").evaluate(dialog=>dialog.open),true,"Add room opens a floating template dialog");
  await page.locator("#room-template").selectOption("kitchen");
    assert.equal(await page.locator("#room-template option").count(),20,"Scene room templates include the original rooms and ten additional scene types");
    assert.ok(await page.locator('#room-template option[value="church"]').count()===1&&await page.locator('#room-template option[value="electrical-workshop"]').count()===1&&await page.locator('#room-template option[value="airplane-cabin"]').count()===1,"room templates include Church, Electrical workshop and Airplane cabin");
  await page.locator("#create-room-scene").click();
  await page.locator(".project-dialog").waitFor({state:"detached"});
  assert.equal(await page.locator("#scene-select option").count(),2,"Add room creates a second saved scene in the project");
  const addedRoomId=await page.locator("#scene-select").inputValue();
  assert.match(await page.locator("#scene-select option:checked").innerText(),/Kitchen/,"the selected scene is labeled with its room template");
  assert.match(await page.locator(".workspace-tabs .studio-panel-title").innerText(),/Kitchen/i,"the studio header identifies the active room in the 3D preview");
  assert.ok(await page.locator("[data-layer-fixture]").count()>=3,"new kitchen scenes start with a usable wash and architectural strip rig");
  assert.match(await page.locator("#cycle-lighting-look").innerText(),/01\/100/,"new rooms start on their first automatic lighting look");
  assert.equal((await page.locator("#fixture-colour").inputValue()).toUpperCase(),"#FFA65B","the starter look applies its real channel color to the new room rig");
  await page.locator("#cycle-lighting-look").click();
  assert.match(await page.locator("#cycle-lighting-look").innerText(),/02\/100/,"the floating canvas control advances to the next look");
  assert.equal((await page.locator("#fixture-colour").inputValue()).toUpperCase(),"#FFE8BB","cycling a look updates the active room fixture channels");
  const lookToggleBounds=await page.locator("#cycle-lighting-look").boundingBox();
  const canvasBounds=await page.locator(".scene-preview").boundingBox();
  const paintControlsBounds=await page.locator(".canvas-actions").boundingBox();
  assert.ok(lookToggleBounds.x>=canvasBounds.x&&lookToggleBounds.y>=canvasBounds.y&&lookToggleBounds.x+lookToggleBounds.width<=canvasBounds.x+canvasBounds.width&&lookToggleBounds.y+lookToggleBounds.height<=canvasBounds.y+canvasBounds.height,"the lighting look switch stays inside the canvas");
  assert.ok(lookToggleBounds.x+lookToggleBounds.width<=paintControlsBounds.x||lookToggleBounds.x>=paintControlsBounds.x+paintControlsBounds.width||lookToggleBounds.y+lookToggleBounds.height<=paintControlsBounds.y||lookToggleBounds.y>=paintControlsBounds.y+paintControlsBounds.height,"the lighting look switch does not overlap canvas paint controls");
  await page.locator("#play-room-tour").click();
  assert.equal(await page.locator("#play-room-tour").getAttribute("aria-pressed"),"true","Play tour starts the room camera walkthrough");
  await page.locator("#light-canvas").press("Escape");
  assert.equal(await page.locator("#play-room-tour").getAttribute("aria-pressed"),"false","Escape stops the tour from the studio canvas");
  await page.locator("#play-room-tour").click();
  await page.locator("#play-room-tour").click();
  assert.equal(await page.locator("#play-room-tour").getAttribute("aria-pressed"),"false","the room camera walkthrough stops on the second click");
  await page.locator("#open-room-music").click();
  assert.equal(await page.locator("#room-music-panel").evaluate(panel=>panel.matches(":popover-open")),true,"music settings open as a floating canvas popover");
  const musicPopoverBounds=await page.locator("#room-music-panel").evaluate(panel=>{const box=panel.getBoundingClientRect();return {left:box.left,top:box.top,right:box.right,bottom:box.bottom,width:globalThis.innerWidth,height:globalThis.innerHeight};});
  assert.ok(musicPopoverBounds.left>=0&&musicPopoverBounds.top>=0&&musicPopoverBounds.right<=musicPopoverBounds.width&&musicPopoverBounds.bottom<=musicPopoverBounds.height,"music settings reposition inside the visible viewport");
  assert.equal(await page.locator("#room-music-mood option").count(),5,"music settings provide five distinct piano moods");
  await page.locator("#room-music-panel").hover();
  assert.equal(await page.locator("#room-music-panel").evaluate(panel=>panel.matches(":popover-open")),true,"the popover stays open while the pointer is over its controls");
  await page.locator(".product-lockup").hover();
  await page.waitForFunction(()=>!globalThis.document.querySelector("#room-music-panel")?.matches(":popover-open"));
  await page.locator("#open-room-music").click();
  await page.locator("#room-music-mood").selectOption("night-piano");
  assert.equal(await page.locator("#room-music-mood").inputValue(),"night-piano","piano mood selection remains interactive");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#room-music-panel").evaluate(panel=>panel.matches(":popover-open")),false,"Escape closes the music settings popover");
  await page.locator("#toggle-room-music").click();
  await page.waitForFunction(()=>globalThis.document.querySelector("#toggle-room-music")?.getAttribute("aria-pressed")==="true"||globalThis.document.querySelector("#status")?.textContent.includes("unavailable"));
  if(await page.locator("#toggle-room-music").getAttribute("aria-pressed")==="true"){
    await page.locator("#toggle-room-music").click();
    await page.waitForFunction(()=>globalThis.document.querySelector("#toggle-room-music")?.getAttribute("aria-pressed")==="false");
  }
  await clickCommand("history","#undo");
  assert.match(await page.locator("#cycle-lighting-look").innerText(),/01\/100/,"undo restores the previous room lighting look");
  await clickCommand("history","#redo");
  assert.match(await page.locator("#cycle-lighting-look").innerText(),/02\/100/,"redo restores the cycled room lighting look");
  await page.screenshot({path:resolve("outputs/kitchen-lighting-look.png")});
  await openCommandMenu("room");
  assert.match(await page.locator('#command-menu-panel-room .room-type-label').innerText(),/Kitchen/,"room settings identify the selected template");
  await clickCommand("fixtures","#add-fixture");
  const kitchenFixtureId=await page.locator("#fixture-select").inputValue();
  const kitchenPosition=await page.evaluate(()=>["x","y","z"].map(axis=>Number(globalThis.document.querySelector(`#fixture-${axis}`).value)));
  assert.ok(Math.abs(kitchenPosition[0])<3&&kitchenPosition[1]>0&&kitchenPosition[1]<3&&Math.abs(kitchenPosition[2])<2.5,"new kitchen fixtures start inside the selected room");
  const originalKitchenViewport = await sampleCurrentViewport();
  const kitchenFixtureName = "Kitchen <accent> & fill";
  const fixtureConfiguration = page.locator(".fixture-configuration-details");
  if (await fixtureConfiguration.getAttribute("open") === null) {
    await fixtureConfiguration.locator("summary").click();
  }
  await page.locator("#fixture-name").fill(kitchenFixtureName);
  await page.locator("#fixture-colour").fill("#ff2030");
  await page.locator("#fixture-dimmer").fill("180");
  await page.locator("#apply-fixture").click();
  assert.ok((await page.locator("#status").textContent()).includes(kitchenFixtureName),
    "the footer displays fixture name punctuation literally after a studio redraw");
  assert.ok(viewportPixelDifference(originalKitchenViewport, await sampleCurrentViewport()) > 0.25,
    "changing kitchen fixture color and dimmer changes the pixels in the downloaded viewport");
  assert.match(await page.locator("#cycle-lighting-look").innerText(),/Custom/i,"manual fixture edits identify the room lighting as customized");
  await page.locator("#scene-select").selectOption("studio-room");
  assert.notEqual((await page.locator("#fixture-colour").inputValue()).toUpperCase(),"#FF2030","changing a kitchen fixture leaves the living-room rig unchanged");
  await page.locator("#scene-select").selectOption(addedRoomId);
  assert.equal(await page.locator("#fixture-select").inputValue(),kitchenFixtureId,"switching rooms restores the room-owned fixture selection");
  assert.equal((await page.locator("#fixture-colour").inputValue()).toUpperCase(),"#FF2030","each room keeps its own fixture color channels");
  assert.equal(await page.locator("#fixture-dimmer").inputValue(),"180","each room keeps its own fixture dimmer level");
  await openCommandMenu("room");
  const defaultAmbient=await page.locator("#room-ambience-color").inputValue();
  await page.locator("#room-ambience-color").fill("#52B8D8");
  await page.locator("#room-ambience-level").fill("44");
  await page.locator("#apply-room").click();
  await page.locator("#scene-select").selectOption("studio-room");
  assert.equal((await page.locator("#room-ambience-color").inputValue()).toUpperCase(),"#FFD2A0","each scene retains its own ambient color");
  await page.locator("#scene-select").selectOption(addedRoomId);
  assert.equal((await page.locator("#room-ambience-color").inputValue()).toUpperCase(),"#52B8D8","ambient color and intensity persist with the selected scene");
  assert.equal(await page.locator("#room-ambience-level").inputValue(),"44","room ambient intensity is editable and persisted");
  await clickCommand("history","#undo");
  assert.equal(await page.locator("#room-ambience-color").inputValue(),defaultAmbient,"ambient settings participate in project undo");
  await clickCommand("scene","#add-room-scene");
  await page.locator("#room-template").selectOption("bathroom");
  await page.locator("#create-room-scene").click();
  await page.waitForFunction(()=>globalThis.document.querySelector(".studio-panel-title")?.innerText.includes("BATHROOM"));
  await page.screenshot({path:resolve("outputs/bathroom-camera-fit.png")});
  await clickCommand("scene","#add-room-scene");
  await page.locator("#room-template").selectOption("toilet");
  await page.locator("#create-room-scene").click();
  await page.waitForFunction(()=>globalThis.document.querySelector(".studio-panel-title")?.innerText.includes("TOILET"));
  await page.screenshot({path:resolve("outputs/toilet-scene.png")});
  await clickCommand("scene","#add-room-scene");
  await page.locator("#room-template").selectOption("hallway");
  await page.locator("#create-room-scene").click();
  await page.waitForFunction(()=>globalThis.document.querySelector(".studio-panel-title")?.innerText.includes("HALLWAY"));
  await page.screenshot({path:resolve("outputs/hallway-scene.png")});
  await clickCommand("scene","#add-room-scene");
  await page.locator("#room-template").selectOption("clubhouse");
  await page.locator("#create-room-scene").click();
  await page.waitForFunction(()=>globalThis.document.querySelector(".studio-panel-title")?.innerText.includes("CLUBHOUSE"));
  await page.screenshot({path:resolve("outputs/clubhouse-scene.png")});
  assert.deepEqual(runtimeErrors, [], "browser reports no runtime errors");

  console.log(JSON.stringify({ viewports: reports, tools: coreTools, shapeAndTextCreation: true, measurement: true, fixtureSelection: true, paletteSwitch: true, timelinePlayback: true, projectSaveReload: true, projectJsonImportExport: true, commandMenus: true, fixtureListScroll: true, inspectorScroll: true, canvasStayedFixed: true, runtimeErrors }, null, 2));
  const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:!useFirefox});
  const touchPage=await touchContext.newPage();
  await touchPage.goto(`http://127.0.0.1:${address.port}/`,{waitUntil:"networkidle"});
  assert.equal(await touchPage.locator(".marketing-home").isVisible(),true,"the marketing page loads at a mobile viewport");
  await verifyAccessibility(touchPage, "phone landing page");
  assert.equal(await touchPage.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true,"the mobile landing page has no horizontal overflow");
  await touchPage.getByRole("link",{name:/Go to the Studio/}).first().tap();
  await touchPage.locator("body.studio-route").waitFor();
  assert.equal(await touchPage.locator(".studio-shell").isVisible(),true,"the studio CTA works on touch screens");
  await verifyAccessibility(touchPage, "phone studio");
  await verifyUtilityControls(touchPage);
  for (const width of [320, 360, 390, 671, 768, 940, 941, 1024, 1099]) {
    await touchPage.setViewportSize({ width, height: 844 });
    const mobile = await touchPage.evaluate(() => {
      const doc = globalThis.document;
      const bounds = selector => doc.querySelector(selector).getBoundingClientRect();
      const shell = doc.querySelector(".studio-shell");
      const rail = doc.querySelector(".left-rail");
      return {
        viewport: globalThis.innerWidth,
        scrollWidth: shell.scrollWidth,
        canScroll: shell.scrollHeight > shell.clientHeight && globalThis.getComputedStyle(shell).overflowY === "auto",
        headerBottom: bounds(".topbar").bottom,
        navTop: bounds(".module-nav").top,
        inspectorBottom: bounds(".inspector").bottom,
        footerTop: bounds(".studio-footer").top,
        toolbarRight: bounds("#viewport-fullscreen").right,
        timelineRight: bounds(".arrangement-timeline .timeline-scale").right,
        railFits: rail.scrollWidth <= rail.clientWidth + 1,
      };
    });
    assert.equal(mobile.viewport, width, "the mobile test uses the requested viewport");
    assert.ok(mobile.scrollWidth <= width && mobile.canScroll, `the ${width}px studio scrolls vertically without spilling horizontally`);
    assert.ok(mobile.headerBottom <= mobile.navTop && mobile.inspectorBottom <= mobile.footerTop, `header and footer do not cover editor controls at ${width}px`);
    assert.ok(mobile.toolbarRight <= width && mobile.timelineRight <= width, `fullscreen and timeline controls stay reachable at ${width}px`);
    if (width > 670) assert.equal(mobile.railFits, true, `tablet palette controls fit the left rail at ${width}px`);
  }
  await touchPage.setViewportSize({ width: 390, height: 844 });
  const touchProject=touchPage.locator('[data-command-menu-trigger="project"]');
  await touchProject.tap();
  assert.equal(await touchPage.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),true,"touch tap opens the command menu");
  await touchPage.waitForTimeout(300);
  assert.equal(await touchPage.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),true,"touch menus do not depend on mouseleave");
  await touchPage.locator('[data-command-menu-trigger="history"]').tap();
  assert.equal(await touchPage.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),false,"touching another menu closes the previous one");
  assert.equal(await touchPage.locator("#command-menu-panel-history").evaluate(panel=>panel.matches(":popover-open")),true,"touching another menu opens it");
  await touchPage.locator("#workspace").tap({position:{x:8,y:8}});
  assert.equal(await touchPage.locator("#command-menu-panel-history").evaluate(panel=>panel.matches(":popover-open")),false,"touch outside closes the open menu");
  const touchAssistant = touchPage.locator("#floating-lux-window");
  const touchToggle = touchAssistant.locator("#toggle-lux");
  const touchNotice = touchAssistant.locator(".lux-message");
  assert.equal(await touchNotice.evaluate(notice => notice.getBoundingClientRect().bottom <= notice.closest(".lux-panel").getBoundingClientRect().bottom), true, "collapsed assistant contains its full mobile notice");
  await touchToggle.tap();
  assert.equal(await touchToggle.getAttribute("aria-expanded"), "true");
  await touchAssistant.locator(".lux-service-settings > summary").tap();
  await touchAssistant.locator('[name="endpoint"]').tap();
  assert.equal(await touchAssistant.locator('[name="endpoint"]').evaluate(input => input.ownerDocument.activeElement === input), true, "mobile users can reach the service endpoint field");
  assert.equal(await touchAssistant.locator(".bot-composer .lux-consent").evaluate(label => label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1), true, "mobile consent disclosure fits without clipping");
  await touchToggle.tap();
  assert.equal(await touchToggle.getAttribute("aria-expanded"), "false");
  const touchDimmer = touchPage.locator("#fixture-dimmer");
  const touchApply = touchPage.locator("#apply-fixture");
  await touchDimmer.fill("180");
  await touchApply.scrollIntoViewIfNeeded();
  assert.ok(await touchPage.locator(".studio-shell").evaluate(shell => shell.scrollTop > 0), "the mobile inspector is reached by scrolling");
  await touchApply.tap();
  assert.equal(await touchDimmer.inputValue(), "180", "the fixture edit persists through the studio render");
  const applyBounds = await touchApply.boundingBox();
  assert.ok(applyBounds.y >= 0 && applyBounds.y + applyBounds.height <= 844, "applying a mobile fixture edit keeps its action in view");
  await touchContext.close();
  await context.close();
  await verifyVirtualPlayback(browser, `http://127.0.0.1:${address.port}/#AdigunStudio`);
  await verifyPaletteVersions(browser,`http://127.0.0.1:${address.port}/#AdigunStudio`);
  await verifyOfflineStudio(browser);
} finally {
  await browser?.close();
  await server.close();
}

