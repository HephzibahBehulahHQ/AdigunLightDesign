import test from "node:test";
import assert from "node:assert/strict";
import { messages, supportedLocales, translate } from "../src/i18n.js";

test("ships all required locale dictionaries for the editor shell", () => { assert.deepEqual(supportedLocales, ["en", "de", "yo", "pcm"]); for (const locale of supportedLocales) for (const key of ["canvas","luxUnavailable","language","layersLighting","timeline","verifiedFormats","validHex"]) assert.ok(messages[locale][key], `${locale} is missing ${key}`); });
test("falls back to English only for a missing translation key", () => { assert.equal(translate("de", "canvas"), "Leinwand erstellen"); assert.equal(translate("missing", "canvas"), "Create Canvas"); });
