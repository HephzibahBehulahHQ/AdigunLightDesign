import {escapeHtml} from "../ui/html.js";

const axes = [
  ["x", "X (m)", "0.1"],
  ["y", "Y (m)", "0.1"],
  ["z", "Z (m)", "0.1"],
  ["rotation", null, "1"]
];

export function fixturePlacementMarkup(transform, heading, hint, rotationLabel="Rotation") {
  const safeHeading = escapeHtml(heading);
  const safeHint = escapeHtml(hint);
  const fields = axes.map(([axis, label, step]) => `<label>${label ?? escapeHtml(rotationLabel)+" (°)"}<input id="fixture-${axis}" type="number" step="${step}" value="${transform[axis]}" /></label>`).join("");
  return `<fieldset class="fixture-placement"><legend>${safeHeading}</legend><small>${safeHint}</small><div class="fixture-grid">${fields}</div></fieldset>`;
}


