import test from "node:test";
import assert from "node:assert/strict";
import { themes, isThemePreference, resolveTheme } from "../src/theme/theme.js";

function luminance(hex) {
  const values = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("motyw systemowy reaguje na system, ręczny ma pierwszeństwo", () => {
  assert.equal(resolveTheme("system", "dark"), themes.dark);
  assert.equal(resolveTheme("system", "light"), themes.light);
  assert.equal(resolveTheme("dark", "light"), themes.dark);
  assert.equal(resolveTheme("light", "dark"), themes.light);
  assert.equal(resolveTheme("system", null), themes.light);
});

test("nieprawidłowe zapisane ustawienie wraca do motywu systemowego", () => {
  for (const value of [null, "", "blue", "DARK", {}, 1]) {
    assert.equal(isThemePreference(value), false);
    assert.equal(resolveTheme(value, "dark"), themes.dark);
  }
  for (const value of ["light", "dark", "system"]) assert.equal(isThemePreference(value), true);
});

test("tekst, przyciski, błędy i wyróżniona karta mają kontrast co najmniej 4.5:1", () => {
  for (const [mode, { colors }] of Object.entries(themes)) {
    for (const background of ["background", "surface"]) {
      for (const foreground of ["text", "muted", "primary", "danger", "success"]) {
        assert.ok(contrast(colors[foreground], colors[background]) >= 4.5, `${mode}: ${foreground}/${background}`);
      }
    }
    for (const [foreground, background] of [
      ["onPrimary", "primary"], ["primary", "primaryLight"],
      ["onHero", "heroBackground"], ["heroMuted", "heroBackground"],
    ]) assert.ok(contrast(colors[foreground], colors[background]) >= 4.5, `${mode}: ${foreground}/${background}`);
  }
});
