# Top-right menu — additional required scope

Status: required; not implemented or visually verified.

The latest user request extends this AdigunLightDesign goal. Its repeated
AdigunSPs wording is example context; do not modify the AdigunSPs repository as
part of this product task. Preserve the original scope, latest floating Bot
requirements and approved brand hierarchy.

## Before-build findings

- Current header: `src/app.js`, the `.utility-controls` markup in `render()`.
  Styles: `src/styles.css`, `.topbar`, `.utility-controls` and responsive rules.
- There is currently no Account control or frontend authenticated session in
  this worktree. The existing controls are locale, appearance and offline status.
  Shared Supabase storage exists, but that is not a logged-in browser session.
- A profile status dot must show guest until a real, validated authenticated
  session is available. Do not derive login from a preference, service token,
  local project save or presence of Supabase configuration. Anonymous Supabase
  Auth sessions must also remain guest for login-gated operations.

## Required implementation

Order: Saved locally status, User icon, compact Language/globe control, Settings,
Search, Help. Use the established SVG icon set and four-language accessible
labels/tooltips. The User control replaces visible Account text; its status dot
is green only for real signed-in state and red/gray for guest. Give the dot a
subtle background-colored border and an accessible textual status.

Use normal flex flow with `align-items:center`, a consistent approximately
12-pixel gap, equal square icon buttons and no absolute positioning for menu
items. The status dot may overlay its own icon without positioning sibling menu
items. A compact locale control must retain all four language options. On narrow
screens the save text may hide; icons must remain reachable and never overlap.
Only show Saved locally when the current project was actually saved successfully.
Settings, Search, Help and Account actions require real behavior, not placeholders.

## Deliverable and verification gates

Show only the changed header HTML/JSX and CSS when presenting implementation.
Verify desktop and mobile geometry, user/language separation, button size,
tooltips, keyboard access and real guest/signed-in status changes. Confirm no
overlap only after actual rendered-browser evidence, not source inspection.
Until Auth is connected, report signed-in verification as unavailable.
