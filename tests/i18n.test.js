import test from "node:test";
import assert from "node:assert/strict";
import { messages, supportedLocales, translate } from "../src/i18n.js";

test("ships all required locale dictionaries for the editor shell", () => { assert.deepEqual(supportedLocales, ["en", "de", "yo", "pcm"]); for (const locale of supportedLocales) { assert.ok(messages[locale].canvas); assert.ok(messages[locale].luxUnavailable); } });
test("falls back to English only for a missing translation key", () => { assert.equal(translate("de", "canvas"), "Leinwand erstellen"); assert.equal(translate("missing", "canvas"), "Create Canvas"); });
