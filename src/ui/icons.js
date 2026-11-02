const paths={
  user:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="3"/><path d="M5 19a7 7 0 0 1 14 0"/>',
  settings:'<path d="m9 3 1-1h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L0 9l2-4 3 1 3-1Z"/><circle cx="12" cy="12" r="3"/>',
  search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01"/>',
  fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  canvas:'<path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3z"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.7 1.7 0 0 1 1-3.1h2A4 4 0 0 0 21 10c0-4-4-7-9-7Z"/><circle cx="7" cy="10" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="6.5" cy="15" r="1"/>',
  light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  copilot:'<rect x="4" y="7" width="16" height="13" rx="5"/><path d="M12 3v4M2 12v4m20-4v4M8 16h8"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>',
  library:'<path d="m12 3 10 5-10 5L2 8Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  export:'<path d="M14 3h7v7m0-7L10 14M9 5H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  community:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4Zm13-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2h-3"/>',
  select:'<path d="m5 3 14 10-7 1-3 7Z"/>',
  paletteBrush:'<path d="m14 3 7 7-9 9-7-7ZM5 12l-3 9 9-3m5-13 3 3"/>',
  fixture:'<path d="m7 4 12 3-3 10-12-3Z M11 17l-1 4m-5 0h10M3 7 1 6m17 13 2 2m1-8 2 1"/><circle cx="12" cy="10" r="3"/>',
  material:'<path d="m12 3 9 5-9 5L3 8Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  shapes:'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 7h4V3"/>',
  text:'<path d="M4 5V3h16v2M12 3v18m-4 0h8"/>',
  measure:'<path d="m3 16 13-13 5 5L8 21Zm11-11 3 3m-6 0 2 2m-5 1 3 3m-6 0 2 2"/>',
  orbit:'<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="7" transform="rotate(-35 12 12)"/>',
  aiPin:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 9h18M3 15h18"/>',
  moon:'<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>'
};
export function icon(name) {
  const content=Object.hasOwn(paths,name) ? paths[name] : paths.shapes;
  return `<svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${content}</svg>`;
}
