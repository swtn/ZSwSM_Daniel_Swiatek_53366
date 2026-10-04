import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert, Text as NativeText } from "react-native";
import * as SecureStore from "expo-secure-store";
import { setLanguageValue, t } from "./translations.js";
const Context = createContext(null);
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("pl");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync("kantor.language").then(value => {
      if (active && (value === "pl" || value === "en")) { setLanguageValue(value); setLanguage(value); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  async function changeLanguage(value) {
    if (savingRef.current || !["pl", "en"].includes(value)) return;
    savingRef.current = true;
    setSaving(true);
    try { await SecureStore.setItemAsync("kantor.language", value); setLanguageValue(value); setLanguage(value); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <Context.Provider value={{ language, changeLanguage, saving }}>{children}</Context.Provider>;
}
export function useLanguage() { return useContext(Context); }
export function Text({ children, localized = true, ...props }) {
  useLanguage();
  function translate(value) { return Array.isArray(value) ? value.map(translate) : typeof value === "string" ? t(value) : value; }
  return <NativeText {...props}>{localized ? translate(children) : children}</NativeText>;
}
export function localizedAlert(title, message, buttons, options) {
  return Alert.alert(t(title), t(message), buttons?.map(button => ({ ...button, text: t(button.text) })), options);
}
