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
  const openCommandMenu=async(key)=>{const trigger=page.locator(`[data-command-menu-trigger="${key}"]`);if(await trigger.getAttribute("aria-expanded")!=="true")await trigger.click();};
  const clickCommand=async(key,selector)=>{await openCommandMenu(key);await page.locator(selector).click();};
  const openFixtureList=async()=>{const trigger=page.locator("#toggle-fixtures");if(await trigger.getAttribute("aria-expanded")!=="true")await trigger.click();};
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem("adigunlightdesign/project-v1",JSON.stringify({name:"stale working copy"})));
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".header-save-status").innerText(), "Unsaved project", "startup opens a fresh workspace instead of restoring the working copy");
  assert.equal(await page.locator(".studio-panel-title").innerText(),"SCENE 01 / 3D MOCKUP ROOM","the studio heading matches the approved room label");
  assert.equal(await page.locator(".scene-title b").innerText(),"STUDIO MOOD • RGBW PREVIEW","the live preview badge identifies the studio RGBW view");
  assert.equal(await page.locator(".scene-title small").innerText(),"Scene view • virtual RGBW previsualization","the preview subtitle describes the live virtual view accurately");
  assert.match(await page.locator(".footer-ready").innerText(),/^● READY · Studio Mood \/ Scene 01 · 3D \/ Virtual DMX · Unsaved project$/,"footer status matches the approved project, scene, mode, and save summary");

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
      const dock = box(".lower-workspace");
      const inspector = box(".inspector");
      const inspectorContent = box("#fixture-inspector-panel");
      const lux = box(".lux-panel.is-docked");
      const inspectorScroll = (() => { const panel=doc.querySelector("#fixture-inspector-panel");return {scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,overflowY:browser.getComputedStyle(panel).overflowY}; })();
      const footer = box("footer");
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
  assert.equal(await page.locator(".library-drawer .fixture-library article").count(),3,"Fixture Library opens the three real generic profiles");
  await page.locator("#close-library").click();
  await page.locator('.module-nav [data-module="copilot"]').click();
  assert.equal(await page.locator("#floating-lux-window").isVisible(),true,"Lux navigation opens the existing assistant");
  await page.locator("#toggle-lux").click();
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
  assert.deepEqual(await page.locator('[data-command-group="project"]').evaluate((group)=>[...group.querySelectorAll("button")].map((button)=>button.id)),["new-project","open-project","save","import-project","import-image"],"project commands match New, Open, Save, Import order");
  const importChooser=page.waitForEvent("filechooser");
  await clickCommand("project","#import-image");
  await importChooser;
  assert.equal(await page.locator('.command-menu-system [data-command-group="view"]').count(), 0, "module navigation does not repeat a duplicate view group in the top-bar menu");
  assert.equal((await page.locator('[data-command-group="scene"] > span').innerText()).trim().toUpperCase(), "SCENE", "the top-bar menu labels this group with the concise Scene heading from the reference");
  assert.deepEqual(await page.locator(".command-group > span").evaluateAll((items)=>items.map((item)=>item.textContent.trim())),["Project","History","Scene","Palette","Fixtures","Stage","Room","Export"],"Stage and Room sit immediately beside Export in the compact top menu bar");
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
  await page.waitForTimeout(220);
  assert.equal(await page.locator("#fixture-groups:popover-open").count(),0,"Fixture Groups closes after the pointer leaves the trigger and panel");
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
  for (const view of ["front", "right", "top", "left", "back", "iso"]) {
    const control = page.locator(`.viewport-view-controls [data-camera-view="${view}"]`);
    assert.equal(await control.isEnabled(), true, `${view} camera view is enabled with the active WebGL renderer`);
    await control.click();
    assert.equal(await control.getAttribute("aria-pressed"),"true",`${view} view shows its active selection state`);
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
  const firstSceneId=await page.locator("#scene-select").inputValue();
  await page.locator("#create-cue").click();
  const firstSceneCues=page.locator(".timeline > .cue-track .cue-block"),firstSceneCueCount=await firstSceneCues.count();
  const firstSceneCueId=await firstSceneCues.last().getAttribute("data-cue");
  assert.ok(firstSceneCueId,"a cue can be captured in the first scene");
  await clickCommand("project","#save");
  await page.locator("#saved-project-name").fill("Studio Acceptance");
  await page.locator(".project-dialog button[type=submit]").click();
  assert.equal(await page.locator(".header-save-status").innerText(),"Saved locally","explicit Save marks the named project as saved");
  const savedRecord=await page.evaluate(()=>JSON.parse(localStorage.getItem("adigunlightdesign/saved-projects-v1")).projects[0]);
  assert.equal(savedRecord.project.cues.find(cue=>cue.id===firstSceneCueId).sceneId,firstSceneId,"saved cues retain their owning scene id");
  savedRecord.project.scenes.push({...structuredClone(savedRecord.project.scenes[0]),id:"acceptance-secondary-scene",name:"Secondary room",canvasObjects:[]});
  await page.evaluate((record)=>{const data=JSON.parse(localStorage.getItem("adigunlightdesign/saved-projects-v1"));data.projects[0]=record;localStorage.setItem("adigunlightdesign/saved-projects-v1",JSON.stringify(data));},savedRecord);
  await page.reload();
  assert.equal(await page.locator("#project-name").inputValue(),"Studio Mood","refresh starts a fresh workspace even when a project was explicitly saved");
  assert.equal(await page.locator("#scene-select option").count(),1,"saved projects are not restored automatically after refresh");
  await clickCommand("project","#open-project");
  await page.locator('[data-open-saved]').filter({hasText:"Studio Acceptance"}).click();
  assert.equal(await page.locator("#scene-select option").count(), 2, "Open explicitly loads the selected saved project");
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
  const openCueEditor=await page.locator(".cue-editor").evaluate(editor=>{const bounds=editor.getBoundingClientRect(),controls=[...editor.querySelectorAll("input,select,button")];return {height:bounds.height,clientHeight:editor.clientHeight,scrollHeight:editor.scrollHeight,hidden:controls.filter(control=>{const box=control.getBoundingClientRect();return box.width<=0||box.height<=0||box.top<bounds.top||box.bottom>bounds.bottom+1||box.left<bounds.left||box.right>bounds.right+1;}).map(control=>control.id||control.getAttribute("aria-label")||control.textContent.trim())};});
  assert.equal(openCueEditor.scrollHeight<=openCueEditor.clientHeight+1&&openCueEditor.hidden.length===0,true,`cue timing and scheduling remain visible without scrolling when a cue is selected: ${JSON.stringify(openCueEditor)}`);
  const cueRows=await page.locator(".cue-timing").evaluate(row=>{const headings=[...row.querySelector(".cue-timing-headings").children],values=[...row.querySelector(".cue-timing-values").children],bounds=element=>{const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};},headerBounds=headings.map(bounds),valueBounds=values.slice(0,headings.length).map(bounds),allValueBounds=values.map(bounds),overlaps=items=>items.some((item,index)=>items.slice(index+1).some(other=>item.left<other.right-1&&item.right>other.left+1&&item.top<other.bottom-1&&item.bottom>other.top+1));return {labelsOnOneLine:headerBounds.every(item=>Math.abs(item.top-headerBounds[0].top)<1),valuesOnSecondLine:valueBounds.every(item=>Math.abs(item.top-valueBounds[0].top)<1)&&valueBounds[0].top>headerBounds[0].top,labelsAligned:headerBounds.every((item,index)=>Math.abs((item.left+item.right)/2-(valueBounds[index].left+valueBounds[index].right)/2)<1),overlaps:overlaps(headerBounds)||overlaps(allValueBounds),fields:headings.map(item=>item.textContent)};});
  assert.equal(cueRows.labelsOnOneLine&&cueRows.valuesOnSecondLine&&cueRows.labelsAligned&&!cueRows.overlaps,true,`cue timing and scheduling have aligned headings with compact values beneath and no overlap: ${JSON.stringify(cueRows)}`);
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
  const exportPromise = page.waitForEvent("download");
  await clickCommand("export",'[data-export="project"]');
  const projectExport = await exportPromise;
  const exportPath = await projectExport.path();
  assert.ok(exportPath, "Project JSON export produces a file");
  const exportedProject = JSON.parse(await readFile(exportPath, "utf8"));
  assert.equal(exportedProject.name, "Studio Acceptance", "Project JSON contains the saved project name");
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
  await page.locator("#create-room-scene").click();
  assert.equal(await page.locator(".project-dialog").count(),0,"creating a room closes the modal");
  assert.equal(await page.locator("#scene-select option").count(),2,"Add room creates a second saved scene in the project");
  const addedRoomId=await page.locator("#scene-select").inputValue();
  assert.match(await page.locator("#scene-select option:checked").innerText(),/Kitchen/,"the selected scene is labeled with its room template");
  assert.match(await page.locator(".workspace-tabs .studio-panel-title").innerText(),/Kitchen/i,"the studio header identifies the active room in the 3D preview");
  await openCommandMenu("room");
  assert.match(await page.locator('#command-menu-panel-room .room-type-label').innerText(),/Kitchen/,"room settings identify the selected template");
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
  const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const touchPage=await touchContext.newPage();
  await touchPage.goto(`http://127.0.0.1:${address.port}/`,{waitUntil:"networkidle"});
  const touchProject=touchPage.locator('[data-command-menu-trigger="project"]');
  await touchProject.tap();
  assert.equal(await touchPage.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),true,"touch tap opens the command menu");
  await touchPage.waitForTimeout(300);
  assert.equal(await touchPage.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),true,"touch menus do not depend on mouseleave");
  await touchPage.locator('[data-command-menu-trigger="history"]').tap();
  assert.equal(await touchPage.locator("#command-menu-panel-project").evaluate(panel=>panel.matches(":popover-open")),false,"touching another menu closes the previous one");
  assert.equal(await touchPage.locator("#command-menu-panel-history").evaluate(panel=>panel.matches(":popover-open")),true,"touching another menu opens it");
  await touchPage.locator("main").tap({position:{x:8,y:8}});
  assert.equal(await touchPage.locator("#command-menu-panel-history").evaluate(panel=>panel.matches(":popover-open")),false,"touch outside closes the open menu");
  await touchContext.close();
  await context.close();
} finally {
  await browser?.close();
  await server.close();
}

