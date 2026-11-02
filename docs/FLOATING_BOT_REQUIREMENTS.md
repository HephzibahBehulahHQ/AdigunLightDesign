# Floating Adigun Bot — additional required scope

Status: in progress; core implemented, acceptance incomplete.

Implementation progress: the Bot is now mounted as a non-modal complementary
window with pointer drag/resize, keyboard movement/resize, minimize/maximize/
restore/close, AI-navigation reopening and local per-project persistence.
Local suggestions and service replies set unread state without opening or
focusing the window. Focus returns to the AI control on close and to the chat
input on explicit open. Mobile uses viewport-sized geometry. Normal project
editing and simulation continue when the Bot is opened.

Five state/controller tests cover geometry reload, bounds, storage denial,
maximize/restore, minimized state, canceled dragging, final pointer positions,
unread behavior, focus callbacks and mobile geometry. Related locale and panel
tests also passed. These use event-surface doubles, not a real browser. Account
storage, actual touch/browser interaction, desktop/mobile overlap checks and
exact visual acceptance remain pending. The requirements below stay binding.

Validation: full local `npm test` passed 204 tests with zero failures or skips;
project checks and static build passed. This does not establish browser or
account-backed behavior. The production domain was checked separately: DNS and
HTTPS work, but it still serves the main-branch landing page rather than this
implementation branch. No deployment was performed.

Authority: the user's attached continuation request
`80971f78-f3a7-4a52-b800-61f7f3c00de2/Pasted text.txt`.
This extends the master specification and live co-pilot requirements. The latest
instruction replaces a permanently fixed Bot panel with a floating window while
preserving the approved visual style and the rest of the desktop composition.

## Required behavior

- Open from the existing fixed AI navigation control. Use a non-modal floating
  window above the workspace with no blocking backdrop; canvas interaction stays
  available outside the window. Reopening preserves its last geometry.
- Drag by the title bar with pointer/touch support. Keep at least the title bar
  recoverable inside the viewport, including after viewport changes.
- Resize from a visible handle with sensible minimum and viewport-bounded maximum
  dimensions, approximately 320 × 400 through 900 × 800 where space permits.
- Provide labelled, tooltip-equipped Minimize, Maximize, Restore and Close
  controls. Restore recovers the pre-maximize geometry. Minimize keeps a compact
  title bar/pill; Close hides the window and the AI control reopens it.
- Persist geometry, minimized/maximized state and closed/open state. Guest
  localStorage is the minimum; account-backed layout storage remains a required
  deliverable, scoped to the authenticated user and preferably the project.
- On an incoming message or proactive suggestion, update an unread/pending badge
  on the fixed AI control and show a non-blocking notification. Never auto-open
  the window or steal focus. Opening/reading must acknowledge badge state.
- Preserve live co-pilot consent, editing suppression, rate limits, explicit
  preview/acceptance and login-gated saving. Window movement never saves a project.
- Escape closes or minimizes consistently. Provide logical Tab order and a
  keyboard-accessible alternative to dragging/resizing. Opening focuses chat
  input; closing returns focus to the AI control. Use labelled complementary or
  non-modal dialog semantics; do not trap focus away from the canvas.
- On small screens a full-screen panel is permitted with a visible working close
  control. Touch movement/resizing must remain usable.
- Keep EN/DE/Yoruba/Nigerian Pidgin labels and existing brand tokens. Show honest
  Hosted AI/Offline status, the transcript and input; project context and Clear
  chat may appear in a footer. Configuration alone is not a verified AI connection.

## Verification and documentation gates

Test drag/reload and resize/reload persistence; minimize/restore; maximize/restore
geometry; close/reopen; canvas interaction while open; unread suggestion without
auto-open; keyboard-only operation; mobile full-screen closing; touch handling;
viewport bounds; guest/account separation; and storage failure fallback.
Actual browser tests are required alongside domain/handler tests.

Add “Using the Bot window” to `docs/HELP.md` and its table of contents when
implemented. Explain movement, resizing, window controls and reopening. Do not
document these behaviors as available before they work.
