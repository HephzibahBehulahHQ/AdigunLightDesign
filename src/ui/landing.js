import { applyRoomLightingLook, roomLightingLooks } from "../domain/room-lighting-looks.js";
import { createStudioMoodProject } from "../domain/studio-mood.js";
import { createLightLabRenderer } from "../light-lab/renderer.js";

const looks = ["violet-club", "cyan-modern", "warm-welcome"].map(id => roomLightingLooks.find(look => look.id === id));
const studioLink = (id, level) => `./?look=${encodeURIComponent(id)}&level=${level}#AdigunStudio`;

function scaleFixtureDimmers(fixtures, level) {
  return fixtures.map(fixture => ({...fixture, properties:{...fixture.properties,
    dimmer:Math.round(fixture.properties.dimmer * level / 100),
  }}));
}

export function createLandingSample(id, level = 100) {
  const look = looks.find(item => item.id === id);
  if (!look) return null;
  const project = createStudioMoodProject();
  const scene = project.scenes[0];
  const applied = applyRoomLightingLook(scene, project.fixtures, roomLightingLooks.indexOf(look), scene.id);
  project.name = look.name;
  project.scenes[0] = applied.scene;
  project.fixtures = Number.isInteger(level) && level >= 0 && level <= 100
    ? scaleFixtureDimmers(applied.fixtures, level) : applied.fixtures;
  return project;
}

export function landingMarkup() {
  return `<section id="top" class="marketing-home">
    <header class="marketing-header">
      <a class="marketing-brand" href="#top" aria-label="AdigunLightDesign home"><img src="./assets/corporate/hephzibah-behulah-official.jpg" alt="Hephzibah Behulah" width="48" height="48"><span><b>Adigun<span>Light</span>Design</b><small>HB Elektroniker</small></span></a>
      <nav class="marketing-nav" aria-label="Explore AdigunLightDesign"><a href="#lighting-lab">Live preview</a><a href="#studio-demos">Demos</a><a href="#studio-faq">FAQ</a></nav>
      <a class="marketing-cta" href="#AdigunStudio">Go to the Studio</a>
    </header>
    <main class="marketing-main">
      <section class="marketing-hero" aria-labelledby="landing-title">
        <div class="marketing-copy">
          <p class="marketing-eyebrow">Color and lighting design studio</p>
          <h1 id="landing-title">Build the mood.<br><em>Shape the light.</em></h1>
          <p class="marketing-lede">Explore color, light a room in 3D, and sequence virtual DMX cues before a fixture is ever plugged in.</p>
          <div class="marketing-actions"><a class="marketing-cta marketing-cta-primary" href="#AdigunStudio">Open the studio</a><a class="marketing-link" href="#studio-demos">Watch the demos</a></div>
        </div>
        <section id="lighting-lab" class="marketing-lab" aria-label="Interactive lighting preview">
          <div class="marketing-lab-bar"><span>Live 3D preview</span><span>Virtual lighting</span></div>
          <div class="marketing-viewport"><canvas tabindex="0" aria-label="Interactive 3D lighting study. Drag to orbit, or use the arrow keys."></canvas><p data-preview-fallback hidden>WebGL is unavailable here. The studio demos below show the real editor in use.</p></div>
          <div class="marketing-lab-controls">
            <div class="marketing-looks" role="group" aria-label="Lighting looks">${looks.map((look,index) => `<button type="button" data-landing-look="${look.id}" aria-pressed="${index === 0}"><span style="--look-color:${look.materialColor}"></span>${look.name}</button>`).join("")}</div>
            <label class="marketing-intensity" for="landing-intensity">Fixture intensity <input id="landing-intensity" type="range" min="0" max="100" value="100" aria-valuetext="100%"><output for="landing-intensity">100%</output></label>
            <div class="marketing-lab-actions"><button type="button" data-landing-tour aria-pressed="false">Play camera tour</button><a data-landing-open href="${studioLink(looks[0].id, 100)}" target="_blank" rel="noopener">Edit this look <span class="marketing-new-tab">(new tab)</span></a></div>
          </div>
        </section>
      </section>
      <section id="studio-demos" class="marketing-section" aria-labelledby="demo-title">
        <div class="marketing-section-heading"><h2 id="demo-title">Watch the studio work.</h2><p>Captured in AdigunLightDesign using the same previews and timeline you can open in the editor.</p></div>
        <div class="marketing-demos">
          <article>
            <video controls muted playsinline preload="metadata" src="./demos/lighting-tour.webm" aria-label="Studio room camera tour"><track kind="captions" srclang="en" label="English visual captions" src="./demos/lighting-tour.vtt"></video>
            <div><h3>Orbit a lit room</h3><p>Follow the camera tour around a room with real-time virtual lighting and editable fixtures.</p>
              <details class="marketing-video-description"><summary>Read the camera tour description</summary><p>In this silent recording, the Violet club preset casts purple beams across a furnished room. The camera changes angle, revealing ceiling-mounted fixtures above a sofa and round tables, with a window on one wall and tall slats on the other.</p></details>
            </div>
          </article>
          <article>
            <video controls muted playsinline preload="metadata" src="./demos/cue-playback.webm" aria-label="Studio timeline and cue playback"><track kind="captions" srclang="en" label="English visual captions" src="./demos/cue-playback.vtt"></video>
            <div><h3>Play a cue sequence</h3><p>Watch the timeline advance as virtual fixture values drive the 3D preview.</p>
              <details class="marketing-video-description"><summary>Read the cue playback description</summary><p>In this silent recording, the Studio Mood room sits above a timeline with three tracks: Look 1 – Fade In, Color Chase, and Ambient Fill. The playhead advances through the first cue while blue, amber, and magenta beams light the room. The virtual DMX readout sits to the left of the preview.</p></details>
            </div>
          </article>
        </div>
      </section>
      <section class="marketing-section marketing-workflow" aria-labelledby="workflow-title">
        <div class="marketing-section-heading"><h2 id="workflow-title">From color study to cue sheet.</h2></div>
        <div class="marketing-capabilities">
          <article><h3>Design a palette</h3><p>Extract swatches from an image, explore harmonies, check contrast, and apply colors to a scene.</p></article>
          <article><h3>Build a lighting look</h3><p>Place virtual fixtures, edit materials, and compare lighting looks through an interactive camera.</p></article>
          <article><h3>Take the design with you</h3><p>Download project JSON, palette and cue PDFs, CSV, or an HD preview to share your decisions.</p></article>
        </div>
      </section>
      <section id="studio-faq" class="marketing-section marketing-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Before you start.</h2>
        <div><details><summary>Do I need an account?</summary><p>You can create, save, reopen, and export local projects in Guest mode.</p></details><details><summary>Does this control physical fixtures?</summary><p>The studio simulates DMX and light in a virtual room. Physical output is disabled.</p></details><details><summary>Can I work offline?</summary><p>Yes, after the first online visit finishes caching the studio. You can reopen saved local projects and export offline.</p></details></div>
      </section>
      <section class="marketing-bottom"><h2>Start with a room.</h2><a class="marketing-cta marketing-cta-primary" href="#AdigunStudio">Go to the Studio</a></section>
    </main>
    <footer class="marketing-footer">Hephzibah Behulah · HB Elektroniker · AdigunLightDesign</footer>
  </section>`;
}

export function bindLanding(root) {
  const canvas = root.querySelector("canvas");
  const fallback = root.querySelector("[data-preview-fallback]");
  const buttons = [...root.querySelectorAll("[data-landing-look]")];
  const tour = root.querySelector("[data-landing-tour]");
  const open = root.querySelector("[data-landing-open]");
  const intensity = root.querySelector("#landing-intensity");
  const intensityValue = root.querySelector(".marketing-intensity output");
  let selected = looks[0].id;
  let renderer;
  let baseFixtures;

  function stop() {
    renderer?.destroy();
    renderer = null;
    tour.setAttribute("aria-pressed", "false");
    tour.textContent = "Play camera tour";
  }

  function show() {
    if (renderer) return;
    const { scenes: [scene], fixtures } = createLandingSample(selected);
    baseFixtures = fixtures;
    renderer = createLightLabRenderer(canvas, { accent:scene.materialColor, fixtures:scaleFixtureDimmers(fixtures, intensity.valueAsNumber), ambience:scene.ambience, materials:scene.materials });
    fallback.hidden = renderer.supported;
    canvas.hidden = !renderer.supported;
    tour.disabled = !renderer.supported;
    intensity.disabled = !renderer.supported;
  }

  for (const button of buttons) button.onclick = () => {
    if (selected === button.dataset.landingLook) return;
    selected = button.dataset.landingLook;
    for (const item of buttons) item.setAttribute("aria-pressed", String(item === button));
    open.href = studioLink(selected, intensity.valueAsNumber);
    stop();
    show();
  };
  intensity.oninput = () => {
    const level = intensity.valueAsNumber;
    intensityValue.value = `${level}%`;
    intensity.setAttribute("aria-valuetext", intensityValue.value);
    open.href = studioLink(selected, level);
    renderer?.setFixtures(scaleFixtureDimmers(baseFixtures, level));
  };
  tour.onclick = () => {
    const running = Boolean(renderer?.toggleTour());
    tour.textContent = running ? "Stop camera tour" : "Play camera tour";
    tour.setAttribute("aria-pressed", String(running));
  };
  return { show, stop };
}
