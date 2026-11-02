# HEPHZIBAH BEHULAH
# GLOBAL ADIGUN BOT — FLOATING AI COPILOT COMPONENT STANDARD

**Standard ID:** HB-UI-ADIGUNBOT-001  
**Version:** 1.0  
**Scope:** All Hephzibah Behulah websites, software applications, engineering platforms, simulators, design tools and future products.  
**Component name:** `AdigunBotFloatingWindow`  
**Status:** Mandatory global design-system component.

---

## 1. PRIMARY OBJECTIVE

Replace every existing fixed, blocking or modal-based Adigun BOT chat interface with a professional, floating, draggable, resizable, minimizable, maximizable and persistent AI copilot window.

The new Adigun BOT must allow users to continue working inside the application while simultaneously communicating with the AI assistant.

The BOT must behave like a lightweight desktop application window floating above the workspace, rather than a traditional modal dialog.

**Fundamental principle: The user must never lose access to the application workspace simply because Adigun BOT is open.**

This standard must be reusable across all Hephzibah Behulah products without rebuilding the same functionality separately.

## 2. GLOBAL CORPORATE INTEGRATION

Before implementation, inspect and follow the authoritative corporate resources:

Corporate website:
https://github.com/HephzibahBehulahHQ/HephzibahBehulahHQ.github.io

Global design system:
https://github.com/HephzibahBehulahHQ/hb-design-system

Elektroniker division:
https://github.com/HephzibahBehulahHQ/hb-elektroniker

Follow the existing corporate branding hierarchy:

**Hephzibah Behulah → Division → Product → Adigun BOT**

Use the official corporate logo, design tokens, typography, theme settings, component conventions and product-specific accent colors.

For HB Elektroniker products, use the approved electric-cyan division accent where appropriate.

Do not invent a new corporate logo, unrelated BOT identity or competing visual design system.

The floating BOT must integrate seamlessly with light mode, dark mode, responsive layouts and the global navigation structure.

## 3. REQUIRED COMPONENT ARCHITECTURE

Implement the BOT as a reusable global component with a clear separation between:

1. Floating window presentation.
2. Window state management.
3. Drag-and-resize interaction engine.
4. Chat transcript and message composer.
5. AI provider and backend integration.
6. Product context integration.
7. Notification and unread-message handling.
8. Persistent user preferences.
9. Accessibility and keyboard interactions.
10. Security, logging and testing.

Suggested component structure:

`components/AdigunBot/`

- `AdigunBotFloatingWindow`
- `AdigunBotLauncher`
- `AdigunBotHeader`
- `AdigunBotConversation`
- `AdigunBotComposer`
- `AdigunBotWindowControls`
- `AdigunBotResizeHandle`
- `AdigunBotStatusIndicator`
- `AdigunBotNotificationBadge`
- `AdigunBotContextFooter`
- `AdigunBotSettings`
- `useAdigunBotWindow`
- `useAdigunBotPersistence`
- `useAdigunBotNotifications`
- `useAdigunBotContext`

Adapt component naming to the actual project framework.

Avoid introducing unnecessary dependencies or duplicating existing design-system functionality.

## 4. FLOATING NON-MODAL WINDOW

Clicking the Adigun BOT launcher must open a floating chat window above the active application workspace.

Requirements:

- Do not use a blocking full-screen modal on desktop.
- Do not render a backdrop that intercepts workspace interactions.
- Do not disable canvas interaction.
- Do not lock page scrolling unless required by the mobile presentation.
- Keep the floating window above ordinary application panels.
- Allow interaction with the workspace outside the BOT window.
- Ensure pointer events inside the BOT window operate normally.
- Ensure pointer events outside the BOT window reach the underlying application.
- Avoid unintended canvas selection or drawing actions when interacting with the BOT.
- Use an appropriate design-system-managed z-index rather than arbitrary extreme values.

The BOT must feel like a native floating workspace tool.

## 5. DRAG-TO-MOVE FUNCTIONALITY

Users must be able to move the BOT window by dragging its header.

Requirements:

- Dragging begins only from designated header regions.
- Header buttons must remain clickable without starting a drag.
- Use pointer events for consistent mouse, stylus and touch support.
- Update the window position smoothly.
- Prevent text selection during dragging.
- Prevent accidental dragging when typing or selecting messages.
- Constrain the window within the available viewport or workspace bounds.
- Ensure the title bar and window controls remain accessible.
- Recalculate valid coordinates after browser resizing.
- Prevent the window from becoming permanently inaccessible.

Persist the last valid position after dragging ends.

Do not perform a database write on every pointer movement.

Use appropriate animation-frame scheduling or equivalent performance optimization during dragging.

## 6. RESIZABLE WINDOW

Provide a visible but unobtrusive resize affordance, normally at the bottom-right corner.

Where appropriate, support additional edge or corner resizing.

Desktop default size:

- Width: approximately 420 px.
- Height: approximately 600 px.

Recommended minimum size:

- Width: 320 px.
- Height: 400 px.

Recommended maximum size:

- No greater than the available viewport minus a reasonable margin.
- Allow larger sizes on sufficiently large screens, up to approximately 900 × 800 px by default.

These values are design defaults, not rigid requirements on smaller viewports.

Requirements:

- Smooth resize behavior.
- Chat transcript expands or contracts correctly.
- Message composer remains visible.
- No clipped controls.
- No horizontal overflow.
- No broken text wrapping.
- No layout shift in the underlying canvas.
- Preserve the last user-selected size.
- Clamp dimensions after viewport changes.
- Support touch resizing where practical.

Save the final dimensions after the resize interaction ends.

## 7. WINDOW CONTROLS

Display the following controls at the top-right of the BOT header.

### Minimize

Minimize the BOT to a compact header, pill or docked indicator.

The conversation remains in memory.

The user can restore it immediately.

Minimizing must not delete messages or interrupt an in-progress request unnecessarily.

### Maximize

Expand the window to occupy most of the available desktop viewport.

Maintain an appropriate margin around the window.

Maximization must not create an inaccessible overlay or permanently disable the underlying workspace.

Save the previous normal dimensions and coordinates before maximizing.

### Restore

Return the window to its previous normal position and size.

Restoration must work correctly after minimizing or maximizing.

### Close

Hide the BOT window completely while keeping its launcher accessible.

Closing must not automatically delete chat history.

Reopening must restore the last appropriate position and size.

### Tooltips

All window controls must provide clear localized labels and tooltips.

Use recognizable icons:

- Minimize: horizontal dash.
- Maximize: square.
- Restore: overlapping squares.
- Close: X.

## 8. ADIGUN BOT LAUNCHER

Provide a persistent launcher in the application's approved interface location.

Possible placements:

- Bottom-right floating action button.
- Global toolbar.
- Product navigation bar.
- Existing AI assistant entry point.

Follow the existing application pattern rather than adding multiple competing launchers.

### Launcher behavior

When closed:
- Click opens the BOT.

When minimized:
- Click restores the BOT.

When already open:
- Click brings the BOT into focus or to the front.

When maximized:
- Click focuses the existing BOT rather than creating another instance.

Do not create duplicate windows from repeated launcher clicks.

### Notification indicators

The launcher must display appropriate notification indicators for:

- New assistant messages.
- Pending suggestions.
- Completed background AI operations.
- Actions requiring user review.

Unread counts must update correctly and clear when the corresponding content is viewed.

## 9. PERSISTENT WINDOW STATE

Persist the following state:

- Open or closed.
- Normal window position.
- Normal window dimensions.
- Minimized state.
- Maximized state.
- Previous restore geometry.
- Unread-message count where appropriate.
- Selected conversation.
- Product and project context identifiers.

### Guest users

Use browser-local storage where appropriate.

Namespace keys by product, application version and user/session identity to avoid collisions.

Example logical namespace:

`hb:adigun-bot:<product-id>:<user-scope>:window:v1`

Do not store confidential AI messages, credentials or sensitive engineering data in unprotected localStorage.

### Authenticated users

Use Supabase-backed preferences when an authenticated account and approved Supabase integration are available.

Store window preferences separately from chat content.

Use authenticated, owner-scoped access controls.

Apply Row Level Security to relevant user-owned tables.

Do not permit one user to read or modify another user's window preferences.

### Cross-device behavior

Window dimensions and coordinates are device-specific.

Do not blindly apply a large desktop window position to a small mobile screen.

Use device-class or viewport-aware preference handling.

Clamp restored geometry to the current viewport.

### Synchronization

Prefer local-first UI updates.

Synchronize to Supabase asynchronously where supported.

Handle network failures gracefully.

If cloud synchronization fails, continue operating with the available local preferences.

Use a documented conflict-resolution strategy for preferences changed on multiple devices.

## 10. SUPABASE DATA MODEL

Where the application already uses Supabase, extend the existing schema carefully.

Suggested logical table:

`user_bot_window_preferences`

Suggested fields:

- `id`
- `user_id`
- `product_id`
- `project_id` (nullable)
- `device_class`
- `is_open`
- `is_minimized`
- `is_maximized`
- `position_x`
- `position_y`
- `width`
- `height`
- `restore_geometry`
- `updated_at`

Add an appropriate unique constraint for the selected preference scope.

Use database migrations rather than manual, undocumented schema edits.

Implement owner-only policies based on authenticated user identity.

Do not create unnecessary duplicate preference tables if the project already provides an equivalent settings system.

## 11. CHAT INTERFACE

The floating window must preserve all existing working Adigun BOT functionality.

### Header

Display:

- Adigun BOT title.
- Product context or division identifier where appropriate.
- AI availability status.
- Minimize, maximize/restore and close controls.

### Conversation area

Provide:

- Scrollable message history.
- Clear distinction between user and assistant messages.
- Proper rendering of supported Markdown and code.
- Safe display of engineering results.
- Loading and streaming indicators where supported.
- Error and retry states.
- Auto-scroll behavior that respects users reading older messages.
- Accessible message announcements.

### Message composer

Provide:

- Multiline text input.
- Send button.
- Keyboard submission behavior.
- Disabled or pending state where appropriate.
- Optional attachment controls only where actually supported.
- Clear feedback for errors.

Enter may submit a message, while Shift+Enter inserts a newline.

Prevent accidental duplicate submissions.

### Footer

Where useful, display:

- Current product.
- Current project.
- Current drawing or canvas.
- AI connection status.
- Clear conversation action.

Clearing chat history must require deliberate user action.

## 12. LIVE AI COPILOT INTEGRATION

The floating window is the presentation layer for the existing functional Adigun BOT.

Do not replace a working AI backend with hardcoded messages or a dummy interface.

The BOT must remain product-aware.

Depending on the application, it may assist with:

- Electrical schematic design.
- Component selection.
- Circuit validation.
- Simulation explanation.
- Lighting design.
- PLC-related workflows.
- Engineering calculations.
- Project documentation.
- CAD operations.
- Error interpretation.

Only expose tools that are actually implemented and authorized.

### Proactive suggestions

When the BOT detects a useful suggestion:

1. Do not automatically open the chat window.
2. Do not steal keyboard focus.
3. Do not interrupt an active canvas interaction.
4. Update the launcher notification badge.
5. Display a nonintrusive toast where appropriate.
6. Preserve the suggestion until viewed or dismissed.

The user controls when to open the BOT.

### AI actions affecting the workspace

For actions such as adding components, editing schematics, modifying geometry or changing project settings:

- Validate tool inputs.
- Show a preview where feasible.
- Explain expected changes.
- Request confirmation before consequential changes.
- Execute through authorized application APIs.
- Preserve undo/redo support.
- Report actual execution results.
- Never claim a modification succeeded without confirmation.

## 13. ACCESSIBILITY

Implement keyboard-accessible window controls.

Requirements:

- Launcher is keyboard reachable.
- Controls have accessible names.
- Focus indicators are visible.
- Focus moves appropriately when the BOT opens.
- Closing returns focus to the launcher when appropriate.
- Tab and Shift+Tab follow a predictable order.
- Escape closes or minimizes the window according to a documented convention.
- Enter sends messages where appropriate.
- Shift+Enter inserts a newline.
- Window status and notifications are announced accessibly.
- Dragging is not the only way to reposition the window.

Provide keyboard-accessible movement and resizing alternatives, such as an accessible position/size menu or documented keyboard commands.

Use appropriate non-modal accessibility semantics.

Do not mark the floating window as modal when the background remains interactive.

Avoid trapping keyboard focus inside a non-modal panel.

Use accessible labeling for the title, conversation region, composer and window controls.

Respect reduced-motion preferences.

## 14. MOBILE AND TOUCH BEHAVIOR

On smaller screens, use an adaptive presentation.

Recommended behavior:

- Desktop: floating, draggable, resizable panel.
- Tablet: floating panel where practical, with viewport-aware constraints.
- Mobile: full-screen or near-full-screen chat view.

On mobile:

- Provide a prominent close button.
- Respect safe-area insets.
- Keep the composer visible above the virtual keyboard.
- Avoid horizontal scrolling.
- Prevent content from being hidden beneath fixed navigation.
- Preserve conversation state during orientation changes.
- Do not require dragging or resizing to access essential functions.

Support pointer and touch interactions without interfering with the application's own touch gestures.

## 15. THEME AND VISUAL DESIGN

The BOT must use the global Hephzibah Behulah design system.

Requirements:

- Official corporate branding.
- Approved division accent.
- Existing typography.
- Existing icon conventions.
- Consistent border radius.
- Professional shadows and elevation.
- Light and dark themes.
- Responsive spacing.
- High-contrast focus indicators.
- Clear status colors.
- Smooth but restrained transitions.

Avoid heavy modal styling.

Avoid excessive animations, glowing effects or distracting visual elements.

The interface should feel professional, lightweight and suitable for technical engineering software.

## 16. FOUR-LANGUAGE LOCALIZATION

Support the corporate languages:

- English (`en`).
- German (`de`).
- Yoruba (`yo`).
- Nigerian Pidgin (`pcm`).

Localize:

- Window titles.
- Tooltips.
- Buttons.
- Status indicators.
- Notifications.
- Error messages.
- Settings.
- Help documentation.
- Accessibility labels.

Reuse the product's existing localization infrastructure.

Do not hardcode English labels into the shared component.

Ensure translated labels do not overflow controls.

## 17. PERFORMANCE REQUIREMENTS

The floating BOT must not degrade the performance of engineering canvases, 3D scenes or simulation engines.

Requirements:

- Avoid unnecessary canvas re-renders during dragging.
- Throttle or schedule pointer-driven updates appropriately.
- Persist state after interactions rather than on every movement.
- Use efficient message rendering for long conversations.
- Clean up event listeners.
- Prevent memory leaks.
- Avoid duplicate AI connections.
- Suspend unnecessary work when the window is hidden.
- Preserve in-progress requests safely when minimized.
- Prevent stacking-context and pointer-event conflicts.

Use existing tested drag/resize utilities when appropriate and compatible with the design system.

## 18. CLOUDFLARE AND SUPABASE INTEGRATION

The owner authorizes development and configuration of the Adigun BOT integration with the existing Cloudflare and Supabase infrastructure, subject to actual connector access, security controls and the approval boundaries below.

### Cloudflare

Where Cloudflare is part of the application architecture:

- Preserve the existing deployment architecture.
- Use appropriate server-side functions or Workers for AI requests where supported.
- Keep provider credentials server-side.
- Apply appropriate request validation and rate limiting.
- Preserve existing environment separation.
- Avoid exposing privileged credentials to browser code.
- Validate deployment compatibility before publishing.

### Supabase

Where Supabase is already used:

- Integrate authenticated user preferences.
- Apply Row Level Security.
- Use safe migrations.
- Maintain owner-scoped project data.
- Reuse existing authentication sessions.
- Validate permission boundaries.
- Avoid unnecessary database duplication.

### Authorization boundaries

Approval to develop and integrate these services does not authorize:

- Publishing credentials.
- Disabling authentication or security policies.
- Deleting production data.
- Unreviewed destructive migrations.
- Unapproved paid resource provisioning.
- Changing billing plans.
- Unrestricted production deployment.

Use the existing authorized project environments and report any required additional access.

## 19. REQUIRED TESTS

Implement automated tests where technically feasible, plus documented manual verification for interaction behavior.

### Window interaction tests

1. Open the BOT from its launcher.
2. Drag the window to another location.
3. Reload and verify restored position.
4. Resize the window.
5. Reload and verify restored dimensions.
6. Minimize and restore.
7. Maximize and restore.
8. Close and reopen.
9. Confirm no duplicate windows appear.
10. Confirm the underlying canvas remains interactive outside the BOT.

### Persistence tests

11. Guest preferences survive reload.
12. Authenticated preferences persist correctly.
13. One user's preferences cannot be accessed by another user.
14. Small viewport restoration clamps invalid desktop coordinates.
15. Offline preference synchronization fails gracefully.

### AI behavior tests

16. New suggestions do not force the window open.
17. Notification badges update correctly.
18. Sending a message reaches the actual configured AI backend.
19. AI errors are handled without breaking the window.
20. Consequential AI workspace actions require appropriate confirmation.
21. Minimizing preserves an active conversation.

### Accessibility tests

22. Keyboard-only open, navigate, minimize, close and reopen.
23. Accessible window movement and resizing.
24. Screen-reader labels and status announcements.
25. Correct focus restoration.
26. Reduced-motion behavior.

### Responsive tests

27. Desktop viewport.
28. Tablet viewport.
29. Mobile viewport.
30. Mobile keyboard and orientation changes.

### Regression tests

31. Existing canvas tools still work.
32. Existing project saving still works.
33. Existing AI tools still work.
34. No unintended layout overflow.
35. No critical browser-console errors.

Record actual test outcomes. Do not claim tests passed if they were not executed.

## 20. DOCUMENTATION

Update the product's `docs/HELP.md`.

Add a Table of Contents entry:

**Using the Adigun BOT Floating Window**

Document:

- How to open the BOT.
- How to drag the window.
- How to resize it.
- How to minimize.
- How to maximize.
- How to restore.
- How to close.
- How to reopen.
- How notifications work.
- How position and size are remembered.
- How mobile behavior differs.
- How to use keyboard controls.
- How to clear chat history.
- What happens when the AI service is unavailable.

Where supported, provide localized help content.

## 21. DELIVERABLES

The agent must deliver:

1. A reusable global floating Adigun BOT component.
2. Working drag-and-drop positioning.
3. Working resize controls.
4. Working minimize, maximize, restore and close actions.
5. Reliable launcher and unread-message behavior.
6. Local preference persistence.
7. Authenticated preference persistence where Supabase is configured.
8. Nonintrusive proactive AI notifications.
9. Existing functional AI chat and product-context integration.
10. Accessibility and mobile support.
11. Automated and documented manual tests.
12. Updated help documentation.
13. Integration instructions for other Hephzibah Behulah products.
14. A concise report of actual changes, tests and remaining limitations.

## 22. IMPLEMENTATION ORDER

Implement progressively:

**Phase 1 — Audit:** Inspect the existing BOT, product UI, design system and AI backend.

**Phase 2 — Shared component:** Implement the floating non-modal window and launcher.

**Phase 3 — Window management:** Add dragging, resizing, minimizing, maximizing, restoring and closing.

**Phase 4 — Persistence:** Add local preferences and authenticated Supabase synchronization where applicable.

**Phase 5 — AI integration:** Preserve existing conversations, tool calls, context and proactive suggestions.

**Phase 6 — Accessibility and responsive design:** Complete keyboard, screen-reader, touch and mobile behavior.

**Phase 7 — Verification:** Run functional, regression, security and accessibility tests.

**Phase 8 — Documentation and rollout:** Update help documentation, prepare integration guidance and deploy only through the authorized workflow.

Do not replace working functionality unnecessarily.

Do not claim completion based only on the visual appearance of the window.

## 23. FINAL AGENT DIRECTIVE

Implement the Adigun BOT as a reusable, production-oriented floating AI copilot across the Hephzibah Behulah ecosystem.

Preserve the existing AI capabilities.

Make the workspace interactive while the BOT is open.

Provide reliable window controls and state persistence.

Follow corporate branding and four-language requirements.

Integrate Cloudflare and Supabase securely where applicable.

Test actual behavior.

Use isolated Git branches and preserve existing work.

Report only verified results.

**Adigun BOT must behave like a professional floating engineering assistant, not a blocking chatbot modal or decorative AI button.**

# ADDENDUM A — GLOBAL ADIGUN BOT INTELLIGENCE, PURPOSE AND LIVE COPILOT STANDARD

**Standard ID:** HB-AI-ADIGUNBOT-002  
**Version:** 1.0  
**Applies to:** Every Hephzibah Behulah product, application, platform, website and future software division.  
**Parent specification:** Global Adigun BOT Floating AI Copilot Component Standard.

---

## A1. UNIVERSAL PURPOSE OF ADIGUN BOT

Adigun BOT is the official intelligent, context-aware, action-capable AI assistant integrated into Hephzibah Behulah software products.

Its purpose is to help users accomplish the actual goals of the product in which it operates.

Adigun BOT must not be limited to answering questions or generating text.

Where the host application provides the necessary functionality, Adigun BOT must be capable of:

1. Understanding the user's current work and goals.
2. Observing relevant application state in real time.
3. Explaining the current project or selected content.
4. Identifying verifiable errors, omissions and opportunities.
5. Proactively offering useful assistance.
6. Creating new product-native content and projects.
7. Editing existing content through authorized application tools.
8. Analyzing and validating work against applicable rules.
9. Performing supported calculations and simulations.
10. Importing generated results directly into the application's workspace.
11. Automating repetitive workflows with appropriate approval.
12. Explaining actions and their consequences.
13. Supporting beginners and advanced users.
14. Learning the current session's stated goals and preferences.
15. Preserving user control, data security and undo capabilities.

**The BOT's intelligence, tools, terminology, workflows and capabilities must adapt to its host product.**

There must not be one generic, prompt-only BOT that behaves identically across unrelated applications.

## A2. GLOBAL COMPONENT, PRODUCT-SPECIFIC INTELLIGENCE

Maintain one reusable global Adigun BOT foundation.

The foundation supplies common capabilities:

- Floating chat interface.
- Window controls and persistence.
- Conversation management.
- AI provider integration.
- Tool-calling infrastructure.
- Real-time application context.
- Proactive suggestion framework.
- Notification handling.
- User approvals.
- Audit logging.
- Error recovery.
- Localization.
- Accessibility.
- Authentication and permission checks.

Each product must supply its own domain adapter.

The domain adapter defines:

- Product identity.
- Product purpose.
- Supported workflows.
- Domain-specific knowledge.
- Available application tools.
- Readable application state.
- Writable application state.
- Validation rules.
- Supported calculations.
- Supported import and export formats.
- Action permissions.
- Safety boundaries.
- Testing requirements.

Do not hardcode electrical engineering, cybersecurity, religion, finance, education or any other specialized domain into the shared BOT foundation.

Domain-specific capabilities belong in the appropriate product adapter.

## A3. PRODUCT CAPABILITY CONTRACT

Every product integrating Adigun BOT must declare a machine-readable capability contract.

Suggested configuration:

`adigun-bot.config.json`

The configuration must identify:

- Product ID and display name.
- Division.
- Product description.
- Available languages.
- Supported AI features.
- Context providers.
- Available tools.
- Tool input and output schemas.
- Tool permission levels.
- Confirmation requirements.
- Validation capabilities.
- Supported content types.
- Persistence capabilities.
- Simulation or execution capabilities.
- Domain-specific safety rules.
- Applicable help documentation.

The BOT must discover and use only tools that are actually implemented and registered.

Never advertise a feature that the host product does not support.

If a capability is unavailable, explain the limitation and offer the closest supported alternative.

## A4. EXAMPLES OF PRODUCT-SPECIFIC BOT BEHAVIOR

These examples illustrate the required architecture. They do not limit future products.

### Electrical engineering and electronic design products

The BOT should be able to:

- Understand electrical and electronic schematics.
- Identify existing components and connections.
- Design circuits from natural-language instructions.
- Select compatible components using verified data.
- Create valid product-native schematic objects.
- Route supported electrical connections.
- Insert completed designs into the actual canvas.
- Explain electrical behavior.
- Analyze incomplete or disconnected circuits.
- Run available simulations.
- Interpret simulation results.
- Perform supported engineering calculations.
- Generate bills of materials.
- Validate applicable engineering rules.
- Assist with control panels, PLC logic and electrical documentation where supported.

Example request:

"Design a three-phase motor starter with start, stop, overload protection and indicator lamps."

Expected behavior:

1. Interpret the engineering requirements.
2. Ask for essential missing specifications.
3. Select appropriate verified components.
4. Generate a valid circuit model.
5. Check connectivity and relevant constraints.
6. Show a schematic preview.
7. Explain assumptions and limitations.
8. Request permission to insert the design.
9. Import it into the real editor through the application API.
10. Preserve undo/redo and project integrity.
11. Report validation results accurately.

Do not replace this workflow with a decorative image or unconnected diagram.

### Cybersecurity products

The BOT should understand the current authorized security workspace and help with:

- Security findings.
- Risk assessment.
- Vulnerability interpretation.
- Log analysis.
- Defensive investigation.
- Security reporting.
- Remediation recommendations.
- Authorized testing workflows.

It must operate within the application's permissions and applicable security restrictions.

### Data analytics products

The BOT should be able to:

- Understand available datasets.
- Explain columns and metrics.
- Generate supported analyses.
- Identify data-quality issues.
- Create charts and dashboards.
- Apply transformations through authorized tools.
- Explain calculations.
- Export supported analytical results.

### Artificial intelligence and machine-learning products

The BOT should help users:

- Prepare datasets.
- Configure supported models.
- Explain training metrics.
- Inspect evaluation results.
- Generate supported experiments.
- Compare model performance.
- Identify reproducible errors.
- Operate available AI workflows.

### Religious, educational and theological products

The BOT should adapt to the product's religious or educational purpose.

Depending on the product, it may:

- Explain religious texts and concepts.
- Help users navigate approved study resources.
- Create lesson plans.
- Assist with educational content.
- Compare interpretations with appropriate attribution.
- Generate study questions.
- Support multilingual learning.
- Organize educational materials.

It must distinguish quotations, source-backed claims, interpretations and generated commentary.

It must not fabricate scriptural quotations, citations or source references.

### Business and productivity products

The BOT should support the actual product workflows, including:

- Document creation.
- Structured planning.
- Business analysis.
- Workflow assistance.
- Reporting.
- Authorized task automation.

These examples establish the principle:

**Every Adigun BOT must be deeply integrated with the actual purpose and functionality of its host product.**

## A5. LIVE APPLICATION-AWARE COPILOT

Upgrade Adigun BOT from a reactive prompt-only assistant into a live copilot.

The BOT must be capable of understanding relevant changes occurring inside the active product workspace.

For canvas-based applications, this may include:

- Components.
- Objects.
- Connections.
- Layers.
- Coordinates.
- Selection state.
- Project metadata.
- Simulation state.
- Validation findings.
- Recent edits.

For non-canvas applications, equivalent context may include:

- Current document.
- Selected text.
- Active dataset.
- Dashboard filters.
- Open lesson.
- Current workflow.
- Security findings.
- Selected records.
- User-approved task context.

Use the host application's actual state APIs.

Do not infer authoritative application state from screenshots when structured state is available.

## A6. REAL-TIME STATE SUBSCRIPTION

Implement a product-aware context subscription.

Requirements:

1. Subscribe to meaningful application-state changes.
2. Receive typed, structured events.
3. Debounce or batch high-frequency changes.
4. Distinguish committed changes from temporary interactions.
5. Track the active document, project or workspace.
6. Detect selection changes where relevant.
7. Track supported execution or simulation status.
8. Maintain a current context version.
9. Handle project switching correctly.
10. Unsubscribe and clean up listeners when necessary.

Suggested event types:

- `project.opened`
- `project.changed`
- `document.updated`
- `object.added`
- `object.modified`
- `object.deleted`
- `selection.changed`
- `connection.changed`
- `validation.completed`
- `simulation.completed`
- `user.idle`
- `user.active`
- `tool.execution.completed`

Products may extend this vocabulary.

Do not transmit every mouse movement, keystroke or full project state to an external AI service.

Prefer local event processing and minimal relevant context.

The BOT must not continuously transmit sensitive user data without an appropriate lawful basis, notice and authorization.

## A7. CONTEXT ANALYZER

Build a domain-specific analyzer that interprets the live application state.

The analyzer must identify meaningful findings using verifiable rules and available product data.

Possible finding categories:

- Incomplete work.
- Invalid configuration.
- Missing required elements.
- Unconnected or unused objects.
- Inconsistent settings.
- Duplicate or conflicting definitions.
- Failed validation.
- Unsupported combinations.
- User-requested opportunities for improvement.
- Ambiguous project goals.

Use deterministic validation rules wherever possible.

The language model may interpret findings and propose solutions, but must not fabricate analyzer results.

Each finding should include:

- Finding ID.
- Product and project scope.
- Relevant object identifiers.
- Evidence.
- Severity.
- Confidence where applicable.
- Recommended action.
- Validation source.
- State version.

A finding must be invalidated or recalculated when the relevant application state changes.

## A8. PROACTIVE SUGGESTION ENGINE

The BOT should offer relevant assistance without waiting for a direct question.

Examples:

Electrical design:
"I noticed this motor control circuit has no overload protection. Would you like me to review the protection arrangement?"

Data analytics:
"This dataset contains missing values in a field used by your chart. Would you like me to inspect them?"

Cybersecurity:
"Three findings appear to share the same affected asset. Would you like me to group them for review?"

Educational application:
"You have completed this lesson. Would you like a short knowledge check?"

Suggestions must be grounded in actual application state.

Do not invent warnings or claim to have detected problems that were not verified.

### Suggestion structure

Each suggestion must contain:

- Short title.
- One-line explanation.
- Relevant context.
- Proposed action.
- Accept button.
- Dismiss button.
- Tell me more button.

Where appropriate, include severity and evidence.

### Nonintrusive presentation

Suggestions should appear as:

- A compact speech bubble.
- A small dismissible side panel.
- A notification attached to the BOT launcher.
- A lightweight toast.

Never force-open the floating chat window.

Never steal focus during active work.

Never display a blocking modal for ordinary suggestions.

## A9. RATE LIMITING AND INTERRUPTION CONTROL

The live copilot must be calm and respectful of user attention.

Default behavior:

- No more than one ordinary proactive suggestion every 20–30 seconds.
- Suppress suggestions during dragging, typing, drawing or other active interactions.
- Avoid repeating dismissed suggestions.
- Group related findings.
- Prefer high-value suggestions.
- Suppress stale suggestions.
- Allow users to disable proactive assistance.

Provide configurable modes:

- Off.
- Quiet.
- Standard.
- Proactive.

Default to a nonintrusive mode appropriate for the product.

Critical, verified safety findings may use a distinct notification policy, but must still avoid unsupported alarm claims.

## A10. USER INTENT AND GOAL UNDERSTANDING

The BOT should understand what the user is trying to accomplish.

Sources may include:

- Explicit user instructions.
- Project description.
- Selected workflow.
- Active document.
- Recent authorized interactions.
- Current project metadata.

If the goal is unclear, ask a concise clarifying question.

Examples:

"What are you trying to build?"

"Should I optimize this design for cost, efficiency or maintainability?"

"Would you like an explanation or should I prepare a change?"

Remember the answer within the relevant session or project scope.

Do not permanently store inferred personal preferences without appropriate authorization.

## A11. ACTION-CAPABLE AI TOOLS

Every product must expose appropriate application tools to Adigun BOT.

Use typed, validated tool interfaces.

Suggested universal tool categories:

### Read tools

- Get current project.
- Get current selection.
- Get document structure.
- Get validation results.
- Get available capabilities.
- Get supported component or content catalog.

### Create tools

- Create product-native objects.
- Generate supported projects.
- Add components or content.
- Insert generated results into the workspace.

### Edit tools

- Modify selected objects.
- Update properties.
- Reorganize supported content.
- Apply validated changes.

### Analyze tools

- Validate current work.
- Run supported calculations.
- Execute authorized simulations.
- Explain detected problems.

### Export tools

- Generate supported reports.
- Export supported project formats.
- Create product-specific deliverables.

The actual tools must be implemented by the host product.

Do not create a universal tool that bypasses domain-specific validation.

## A12. NATURAL LANGUAGE TO REAL WORKSPACE ACTION

A central requirement is that Adigun BOT must be capable of turning natural-language requests into actual product-native operations.

For example, an electrical design request must be capable of producing real schematic objects and connections rather than merely describing them.

Required execution pipeline:

1. Interpret the user request.
2. Read the relevant current project context.
3. Check supported product capabilities.
4. Identify missing requirements.
5. Produce a structured action plan.
6. Validate proposed operations.
7. Generate a preview or diff.
8. Request user approval.
9. Execute through authorized product APIs.
10. Verify the resulting application state.
11. Record the change in undo/redo history where supported.
12. Report success or failure accurately.

For multi-step operations, use transactions or equivalent rollback mechanisms where practical.

Never claim an operation succeeded simply because the language model generated a plausible response.

## A13. APPROVAL, PREVIEW AND ROLLBACK

The BOT must never silently make consequential changes to a user's project.

For proposed modifications:

- Explain what will change.
- Show affected objects or content.
- Provide a preview where feasible.
- Request explicit confirmation.
- Apply the change through validated tools.
- Preserve an undo mechanism where supported.
- Roll back failed operations where technically possible.

If rollback is not supported, disclose that limitation before execution.

The user remains in control.

## A14. LIVE EXPLANATIONS

The BOT should be able to explain the current application state.

Examples:

- "What does this component do?"
- "Why is this circuit not working?"
- "Explain this chart."
- "What does this security finding mean?"
- "Summarize this lesson."
- "What changed in my project?"

Use the actual selected object, document, dataset or project context.

Distinguish verified facts from assumptions.

Do not invent nonexistent components, connections, data fields or project history.

## A15. GUEST AND AUTHENTICATED ACCESS

Provide useful AI assistance to guests where the product permits it.

Guest users may receive:

- Contextual explanations.
- Supported live suggestions.
- Local analysis.
- Previews.
- Permitted temporary workspace operations.

Apply product-specific usage limits and security controls.

Authentication is required for account-bound cloud saving and other protected operations.

Do not require login merely to display an explanation when guest access is supported.

### Saving behavior

The BOT must not automatically save projects to local or cloud storage solely because it generated a suggestion.

Saving must follow the host product's explicit save workflow and permissions.

Guest saving rules must match the product's approved behavior.

Do not assume all local saving requires authentication.

## A16. PRIVACY AND SECURITY

The BOT must observe only the application context necessary for its authorized functions.

Requirements:

- Respect product permissions.
- Minimize context sent to AI providers.
- Avoid unnecessary collection of personal information.
- Never expose credentials.
- Apply server-side tool authorization.
- Validate all AI-generated tool arguments.
- Protect user-owned data.
- Use appropriate logging and retention controls.
- Prevent cross-project and cross-user data leakage.
- Treat document content and external tool responses as untrusted.
- Prevent prompt-injection content from overriding tool permissions.

Cloudflare, Supabase or other connected infrastructure may be used only through configured and authorized integrations.

Do not interpret broad implementation approval as permission to bypass production safeguards or create unapproved charges.

## A17. RELIABILITY AND FALLBACK BEHAVIOR

The BOT must remain useful when some services are unavailable.

Examples:

- If hosted AI is unavailable, show an accurate offline or unavailable status.
- If deterministic local validation is available, continue offering supported local findings.
- If a tool fails, report the failure.
- If an operation is unsupported, explain why.
- If the context subscription disconnects, stop presenting stale findings as current.
- If the user changes projects, discard or refresh obsolete suggestions.

Never fabricate a successful operation to conceal a backend failure.

## A18. FOUR-LANGUAGE SUPPORT

The global BOT must follow the corporate localization requirements:

- English.
- German.
- Yoruba.
- Nigerian Pidgin.

Translate the interface, tooltips, suggestions, status messages, error messages and help content.

Domain-specific technical terminology should remain accurate.

Preserve established engineering symbols, programming syntax, units, identifiers and standards references where translation would make them incorrect.

## A19. REQUIRED TESTS

Test the universal foundation and each product adapter separately.

### Live-context tests

1. Detect relevant committed application changes.
2. Ignore temporary pointer movements.
3. Update context after project switching.
4. Avoid using stale object references.
5. Stop observing when the feature is disabled.

### Analyzer tests

6. Detect a known incomplete pattern.
7. Reject false-positive findings.
8. Identify supported validation errors.
9. Preserve evidence and relevant object IDs.
10. Recalculate findings after edits.

### Suggestion tests

11. Generate an actionable suggestion from a verified finding.
12. Suppress suggestions during active editing.
13. Respect rate limits.
14. Prevent immediate repetition after dismissal.
15. Display notifications without opening the BOT.
16. Ask about ambiguous goals when useful.

### Tool-execution tests

17. Validate generated tool arguments.
18. Show a preview before consequential changes.
19. Require user approval.
20. Apply accepted changes to the actual application state.
21. Reject unauthorized actions.
22. Roll back failed operations where supported.
23. Report accurate execution results.

### Product integration tests

24. Verify that the BOT uses the correct product adapter.
25. Verify that unrelated domain tools are unavailable.
26. Verify that the BOT understands the current project.
27. Verify that generated content is genuinely editable in the host application.
28. Verify that existing product workflows remain functional.
29. Verify guest and authenticated permissions.
30. Verify localization and accessibility.

### Electrical engineering reference tests

Where relevant:

31. Detect an unconnected output.
32. Detect a missing required gate input.
33. Identify an incomplete control circuit.
34. Generate a valid supported circuit from a prompt.
35. Insert the circuit into the native canvas.
36. Preserve component and connection identifiers.
37. Run supported validation.
38. Verify undo/redo.
39. Reject invalid component configurations.
40. Avoid fabricated electrical safety warnings.

These electrical tests belong to electrical products, not the universal BOT foundation.

## A20. DOCUMENTATION

Update each product's `docs/HELP.md`.

Add a Table of Contents entry:

**The Live Adigun BOT Copilot**

Explain:

- The BOT's purpose in that product.
- What the BOT can observe.
- What the BOT can create or modify.
- How to enable or disable live suggestions.
- How to accept, dismiss or inspect suggestions.
- How to ask questions about current work.
- How action previews and confirmations work.
- How to undo supported changes.
- Guest and authenticated limitations.
- Privacy and AI availability.
- What features are not yet supported.

The documentation must reflect real implemented capabilities.

## A21. IMPLEMENTATION MILESTONES

### Milestone 1 — Product capability audit

Identify the host product's actual functionality, state APIs, tools, permissions and existing AI integration.

### Milestone 2 — Domain adapter

Implement the product-specific capability contract and tool registry.

### Milestone 3 — Live context

Connect the BOT to relevant structured application-state events.

### Milestone 4 — Analyzer

Implement deterministic domain-specific findings and validation rules.

### Milestone 5 — Suggestion engine

Generate contextual, actionable and rate-limited suggestions.

### Milestone 6 — Action execution

Connect AI requests to validated product-native operations.

### Milestone 7 — Preview and approval

Implement confirmations, execution reporting and rollback where supported.

### Milestone 8 — Floating-window integration

Connect live suggestions and tool execution to the existing floating BOT interface.

### Milestone 9 — Security and reliability

Verify permissions, context minimization, error handling and fallback behavior.

### Milestone 10 — Testing and documentation

Run product-specific tests, update help content and record remaining limitations.

Implement in bounded, verified increments.

## A22. ACCEPTANCE CRITERIA

The implementation is successful only when:

1. Adigun BOT understands its host product's actual purpose.
2. The BOT receives current, authorized application context.
3. It can explain relevant current work.
4. It detects genuine problems using verifiable evidence.
5. It offers useful assistance without interrupting the user.
6. Users can accept, dismiss or investigate suggestions.
7. Supported AI-generated changes are applied to real application data.
8. Consequential changes require appropriate approval.
9. Generated work remains editable in the native workspace.
10. The BOT reports failures and limitations accurately.
11. Guest and authenticated permissions are respected.
12. The global framework can be reused across unrelated product domains.
13. Product-specific tools remain isolated.
14. Automated tests verify the core behaviors.

## A23. FINAL DIRECTIVE

Adigun BOT must evolve from a passive chatbot into an intelligent, product-aware, real-time AI collaborator.

Its capabilities must be determined by the product in which it operates.

It must observe relevant work, understand the user's goal, offer contextual help, perform supported actions and generate real product-native results.

An electrical BOT should design and insert actual circuits.

A data analytics BOT should analyze real datasets and generate usable analytical outputs.

A cybersecurity BOT should assist with authorized defensive workflows.

An educational or religious BOT should work with its approved learning resources and content tools.

Other products must define their own equivalent domain-specific capabilities.

The global foundation must remain reusable, secure, accessible, multilingual and consistent with the Hephzibah Behulah design system.

**Build one global Adigun BOT framework, but give every product the specialized intelligence and operational capabilities necessary to fulfill its own purpose.**

Do not implement decorative AI, fake tool execution, invented warnings or nonfunctional integrations.

Deliver real, validated functionality and report verified results.
