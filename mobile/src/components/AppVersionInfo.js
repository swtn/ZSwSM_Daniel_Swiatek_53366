import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text, useLanguage } from "../i18n/LanguageProvider.js";
import { t } from "../i18n/translations.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";
import { appVersion, releases } from "../config/release-notes.js";
import AppButton from "./AppButton.js";

export default function AppVersionInfo() {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  return <>
    <Pressable onPress={() => setVisible(true)} accessibilityRole="button"
      accessibilityLabel={`${t("Wersja")} ${appVersion}. ${t("Historia zmian")}`}
      style={({ pressed }) => [styles.footer, pressed && styles.pressed]}>
      <Text style={styles.small}>Wersja</Text>
      <Text localized={false} style={styles.small}>{appVersion}</Text>
      <Text style={styles.link}>Historia zmian</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
    </Pressable>
    <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Historia zmian</Text>
          <Text style={styles.description}>1.X.Y · X oznacza duże zmiany, Y oznacza poprawki i zmiany interfejsu.</Text>
          {releases.map(release => <View key={release.version} style={styles.card}>
            <View style={styles.heading}>
              <Text localized={false} style={styles.version}>{release.version}</Text>
              {release.version === appVersion && <Text style={styles.badge}>Aktualna wersja</Text>}
            </View>
            {release.changes[language].map((change, index) => <View key={index} style={styles.change}>
              <Text style={styles.bullet}>•</Text><Text localized={false} style={styles.changeText}>{change}</Text>
            </View>)}
          </View>)}
          <AppButton title="Zamknij" variant="secondary" onPress={() => setVisible(false)} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}
const createStyles = theme => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 20, gap: 14, paddingBottom: 30 },
  footer: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 6 },
  small: { color: theme.colors.muted, fontSize: 12 }, link: { color: theme.colors.primary, fontSize: 12, marginLeft: 6 }, pressed: { opacity: 0.7 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "700" }, description: { color: theme.colors.muted, fontSize: 13, lineHeight: 20 },
  card: { padding: 18, gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.border },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, version: { color: theme.colors.text, fontSize: 21, fontWeight: "700" },
  badge: { color: theme.colors.primary, fontSize: 12, fontWeight: "600" }, change: { flexDirection: "row", gap: 8 }, bullet: { color: theme.colors.primary, fontSize: 15 },
  changeText: { flex: 1, color: theme.colors.text, fontSize: 14, lineHeight: 21 },
});
