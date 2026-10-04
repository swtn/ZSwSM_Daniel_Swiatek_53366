const layout = {
  radius: { card: 20, input: 12, button: 14 },
  spacing: { screen: 20, gap: 16 },
};

export const themes = {
  light: {
    ...layout,
    dark: false,
    colors: {
      background: "#F4F0E8", surface: "#FFFDF8", text: "#27251F",
      muted: "#716957", primary: "#8A4B12", onPrimary: "#FFF9ED",
      primaryLight: "#F3E3C8", border: "#DED7CB", success: "#286443",
      danger: "#AF3434", heroBackground: "#35382E", onHero: "#F8F3E6",
      heroMuted: "#D0D1BC",
    },
  },
  dark: {
    ...layout,
    dark: true,
    colors: {
      background: "#171715", surface: "#23231F", text: "#F4EFE4",
      muted: "#B7AF9F", primary: "#E3B365", onPrimary: "#211A10",
      primaryLight: "#383025", border: "#403D34", success: "#93C6A0",
      danger: "#F09B90", heroBackground: "#39362A", onHero: "#FFF0CF",
      heroMuted: "#D9CBAA",
    },
  },
};

export function isThemePreference(value) {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(preference, systemScheme) {
  const mode = preference === "light" || preference === "dark"
    ? preference : systemScheme === "dark" ? "dark" : "light";
  return themes[mode];
}
