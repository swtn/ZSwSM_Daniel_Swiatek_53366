import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { ActivityIndicator, Appearance, useColorScheme, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as SystemUI from "expo-system-ui";
import { isThemePreference, resolveTheme } from "./theme.js";

const ThemeContext = createContext(null);
const PREFERENCE_KEY = "kantor.appearance";

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState("system");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const theme = resolveTheme(preference, systemScheme);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(PREFERENCE_KEY)
      .then((saved) => {
        if (active && isThemePreference(saved)) setPreference(saved);
      })
      .catch(() => {
        if (active) setError("Nie udało się odczytać ustawienia wyglądu.");
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (ready) Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
  }, [preference, ready]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {
      // Błąd natywnego tła nie zmienia kolorów widoków aplikacji.
    });
  }, [theme.colors.background]);

  const changePreference = useCallback(async (next) => {
    if (!isThemePreference(next) || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await SecureStore.setItemAsync(PREFERENCE_KEY, next);
      setPreference(next);
    } catch {
      setError("Nie udało się zapisać ustawienia wyglądu. Spróbuj ponownie.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);

  const value = useMemo(() => ({
    theme, preference, changePreference, saving, error,
  }), [theme, preference, changePreference, saving, error]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background,
        alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Brak ThemeProvider w aplikacji.");
  return context;
}

export function useThemedStyles(createStyles) {
  const { theme } = useTheme();
  return useMemo(() => createStyles(theme), [createStyles, theme]);
}
