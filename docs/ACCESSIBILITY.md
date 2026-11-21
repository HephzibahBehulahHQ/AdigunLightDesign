# Accessibility

The editor provides visible keyboard focus, a skip link, semantic buttons/inputs, live status feedback, localized labels and responsive panel layout. Editor-level shortcuts are Ctrl/Cmd+S (save), Ctrl/Cmd+Z (undo), and Ctrl/Cmd+Shift+Z (redo); they deliberately do not override native undo while focus is in an input, select, textarea or content-editable field.

The browser acceptance runner uses pinned axe-core with WCAG 2.x A and AA
tags to scan the landing page and studio at 1440-pixel desktop and 390-pixel
phone widths. The check fails on detected violations. The desktop cue targets,
fixture sliders, and lighting disclosure use 24-pixel targets. The track list
scrolls internally so the ruler remains reachable with taller cue rows.

Both silent studio demonstrations provide English visual captions and visible
text descriptions. The browser suite loads the WebVTT tracks and uses the
keyboard to open a description.

Automated scans leave manual checks for contrast over layered backgrounds,
ARIA in interactive states, and target spacing.
Assistive-technology testing and full WCAG conformance review remain open.

Chrome checks keyboard opening and dismissal of the project dialogs. Open
Project restores focus on Escape, and Add Room and Save restore focus to their
originating menus after the editor rerenders.
