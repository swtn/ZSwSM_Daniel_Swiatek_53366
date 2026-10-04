import { t } from "./translations.js";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, useLanguage } from "./LanguageProvider.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";
export default function LanguageSettings() {
  const { language, changeLanguage, saving } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [error, setError] = useState("");
  async function select(value) {
    setError("");
    try { await changeLanguage(value); } catch { setError("Nie udało się zapisać języka."); }
  }
  return <View style={styles.card}>
    <View style={styles.row}><Ionicons name="language-outline" size={22} color={theme.colors.primary} /><Text style={styles.label}>Język aplikacji</Text>
      {[["pl", "PL"], ["en", "EN"]].map(([value, label]) => <Pressable key={value} onPress={() => select(value)} disabled={saving} accessibilityRole="radio" accessibilityLabel={t(value === "pl" ? "Polski" : "Angielski")} accessibilityState={{ checked: language === value, disabled: saving }} style={[styles.option, language === value && styles.selected]}><Text style={styles.label}>{label}</Text></Pressable>)}
    </View>{error !== "" && <Text style={styles.error}>{error}</Text>}
  </View>;
}
const createStyles = theme => StyleSheet.create({
  card: { padding: 12, gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.card, backgroundColor: theme.colors.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 10 }, label: { fontSize: 14, fontWeight: "600", color: theme.colors.text, flexShrink: 1 },
  option: { padding: 10, borderRadius: 10 }, selected: { backgroundColor: theme.colors.primaryLight }, error: { color: theme.colors.danger },
});
