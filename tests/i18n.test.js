import test from "node:test";
import assert from "node:assert/strict";
import { messages, supportedLocales, translate } from "../src/i18n.js";

test("ships all required locale dictionaries for the editor shell", () => { assert.deepEqual(supportedLocales, ["en", "de", "yo", "pcm"]); for (const locale of supportedLocales) for (const key of ["canvas","luxUnavailable","language","layersLighting","timeline","verifiedFormats","validHex"]) assert.ok(messages[locale][key], `${locale} is missing ${key}`); });
test("falls back to English only for a missing translation key", () => { assert.equal(translate("de", "canvas"), "Leinwand erstellen"); assert.equal(translate("missing", "canvas"), "Create Canvas"); });

test("assistant branding consistently uses Adigun Bot in every locale", () => {
  for (const locale of supportedLocales) {
    for (const key of ["luxBrand", "luxTitle", "copilot", "openLux", "askLux", "sendLux", "botNewSuggestion", "moduleCopilot"]) {
      assert.match(messages[locale][key], /Adigun Bot/iu, `${locale}.${key}`);
    }
  }
});

test("every locale covers the English keys and preserves message parameters", () => {
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(messages[locale]).sort(), Object.keys(messages.en).sort(), locale);
    for (const [key, english] of Object.entries(messages.en)) {
      assert.ok(messages[locale][key].trim(), `${locale}.${key} is empty`);
      const parameters = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      assert.deepEqual(parameters(messages[locale][key]), parameters(english), `${locale}.${key}`);
    }
  }
});
