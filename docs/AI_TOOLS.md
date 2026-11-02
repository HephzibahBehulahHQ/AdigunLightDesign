# Lux action contract

The browser contains a tested, non-executing registry for the 16 required Lux tool names. Every proposed call has the envelope `{ type: "adigunlightdesign.tool-call", version: 1, name, payload }`; unregistered names and malformed required fields are rejected. Read-only/export previews do not need mutation confirmation; project-changing proposals are marked as requiring it.

This is not an AI provider or backend. Lux remains offline because no authenticated server endpoint, provider credentials, user consent flow, rate limit or server-side audit store has been configured. The browser does not contain an API key and cannot execute generated JavaScript. Connecting an AI service requires a server-side adapter that validates this contract, provides an action diff, obtains explicit confirmation, invokes native project commands and records a receipt.
