import {escapeHtml as esc} from "./html.js";
import {icon} from "./icons.js";

export function projectOverview(t){
  const card=(title,items,warning=false)=>`<article class="overview-card ${warning ? "overview-constraints" : ""}"><h2>${esc(t(title))}</h2><ul>${items.map(key=>`<li>${esc(t(key))}</li>`).join("")}</ul></article>`;
  return `<section class="project-overview" aria-label="${esc(t("overviewLabel"))}"><article class="overview-brand"><div class="overview-light">${icon("light")}</div><strong>Adigun<span>LightDesign</span></strong><p>${esc(t("overviewTagline"))}</p><small>${esc(t("overviewWorkflow"))}</small></article>${card("overviewFeatures",["overviewPalette","overviewLighting","overviewLocalExports","overviewLocales"])}${card("overviewImplementation",["overviewRepository","overviewRuntime","overviewPersistence","overviewAI"])}${card("overviewMilestones",["overviewM0","overviewCore","overviewRemaining","overviewVisual"])}${card("overviewConstraints",["overviewProfiles","overviewHardware","overviewCloud","overviewFormats"],true)}</section>`;
}
