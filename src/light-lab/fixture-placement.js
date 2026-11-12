const axes = [
  ["x", "X (m)", "0.1"],
  ["y", "Y (m)", "0.1"],
  ["z", "Z (m)", "0.1"],
  ["rotation", "Rotation (°)", "1"]
];

export function fixturePlacementMarkup(transform, heading) {
  const safeHeading = String(heading).replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  const fields = axes.map(([axis, label, step]) => `<label>${label}<input id="fixture-${axis}" type="number" step="${step}" value="${transform[axis]}" /></label>`).join("");
  return `<fieldset class="fixture-placement"><legend>${safeHeading}</legend><div class="fixture-grid">${fields}</div></fieldset>`;
}

