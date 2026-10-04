import { Text } from "../i18n/LanguageProvider.js";
import { t } from "../i18n/translations.js";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "./AppButton.js";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

const options = [
  { value: "system", label: "Systemowy", description: "Zgodnie z ustawieniami urządzenia", icon: "phone-portrait-outline" },
  { value: "light", label: "Jasny", description: "Ciepłe, piaskowe odcienie", icon: "sunny-outline" },
  { value: "dark", label: "Ciemny", description: "Grafit i bursztynowe akcenty", icon: "moon-outline" },
];

export default function AppearanceSettings() {
  const { theme, preference, changePreference, saving, error } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  const current = options.find((option) => option.value === preference);

  return (
    <>
      <Pressable onPress={() => setVisible(true)} accessibilityRole="button"
        accessibilityLabel={t(`Wygląd aplikacji: ${t(current.label)}. Zmień motyw.`)}
        style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
        <Ionicons name={current.icon} size={24} color={theme.colors.primary} />
        <View style={styles.labels}>
          <Text style={styles.label}>Wygląd aplikacji</Text>
          <Text style={styles.description}>{current.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide"
        onRequestClose={() => { if (!saving) setVisible(false); }}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => { if (!saving) setVisible(false); }}
            accessibilityRole="button" accessibilityLabel={t("Zamknij wybór motywu")} disabled={saving} />
          <SafeAreaView style={styles.sheet} edges={["bottom", "left", "right"]}>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <Text style={styles.title}>Wygląd aplikacji</Text>
              {options.map((option) => {
                const selected = preference === option.value;
                return (
                  <Pressable key={option.value} onPress={() => changePreference(option.value)}
                    disabled={saving} accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: saving }}
                    style={({ pressed }) => [styles.option, selected && styles.selected,
                      pressed && styles.pressed, saving && styles.saving]}>
                    <Ionicons name={option.icon} size={24}
                      color={selected ? theme.colors.primary : theme.colors.muted} />
                    <View style={styles.labels}>
                      <Text style={styles.label}>{option.label}</Text>
                      <Text style={styles.description}>{option.description}</Text>
                    </View>
                    <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={22} color={selected ? theme.colors.primary : theme.colors.muted} />
                  </Pressable>
                );
              })}
              {error !== "" && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
              <Text style={styles.description}>Ustawienie jest zapamiętywane na tym urządzeniu.</Text>
              <AppButton title="Gotowe" onPress={() => setVisible(false)} disabled={saving} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme) => StyleSheet.create({
  settingsRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12,
    borderRadius: theme.radius.card, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { maxHeight: "85%", backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: 24, gap: 14 },
  title: { fontSize: 18, fontWeight: "600", color: theme.colors.text },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    minHeight: 64, borderRadius: theme.radius.input, borderWidth: 1, borderColor: theme.colors.border },
  selected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  labels: { flex: 1, gap: 4 },
  label: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  description: { fontSize: 12, lineHeight: 18, color: theme.colors.muted },
  error: { fontSize: 14, color: theme.colors.danger },
  pressed: { opacity: 0.8 },
  saving: { opacity: 0.6 },
});
