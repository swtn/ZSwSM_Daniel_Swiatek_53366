import { Text } from "../i18n/LanguageProvider.js";
import { t, getLocale } from "../i18n/translations.js";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, TextInput, View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../components/AppButton.js";
import AppearanceSettings from "../components/AppearanceSettings.js";
import SecuritySettings from "../components/SecuritySettings.js";
import AppVersionInfo from "../components/AppVersionInfo.js";
import LanguageSettings from "../i18n/LanguageSettings.js";
import { apiRequest } from "../services/api.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

export default function AccountScreen({
  session, onUserUpdated, onLogout, onSignedOut, logoutLoading, logoutError,
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const saveInProgress = useRef(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProfile(await apiRequest("/users/me", { token: session.token }));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [session.token]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const user = profile?.user ?? session.user;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const initials = [user.firstName, user.lastName]
    .filter(Boolean).map((name) => Array.from(name)[0]).join("").toUpperCase()
    || user.email.slice(0, 1).toUpperCase();

  function openEditor() {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setSaveError("");
    setNotice("");
    setEditing(true);
  }

  function closeEditor() {
    if (!saveInProgress.current) setEditing(false);
  }

  async function saveProfile() {
    if (saveInProgress.current) return;
    setSaveError("");
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last || first.length > 100 || last.length > 100) {
      setSaveError("Podaj imię i nazwisko, każde od 1 do 100 znaków.");
      return;
    }
    Keyboard.dismiss();
    saveInProgress.current = true;
    setSaving(true);
    try {
      const result = await apiRequest("/users/me", {
        method: "PATCH", token: session.token,
        body: { firstName: first, lastName: last },
      });
      setProfile((previous) => previous
        ? { ...previous, user: result.user }
        : { user: result.user, activity: null });
      onUserUpdated(result.user);
      setEditing(false);
      setNotice("Dane profilu zostały zapisane.");
    } catch (error) {
      setSaveError(error.details?.map((item) => item.message).join("\n") || error.message);
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProfile}
          colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}>
        <Text style={styles.title}>Konto</Text>
        <Text style={styles.muted}>Twój profil i aktywność</Text>

        <View style={styles.card}>
          <View style={styles.profileHeading}>
            <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
            <View style={styles.profileLabels}>
              <Text localized={!fullName} style={styles.name}>{fullName || "Uzupełnij swój profil"}</Text>
              <Text localized={false} style={styles.email}>{user.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.dateRow}>
            <Text style={styles.muted}>Konto utworzone</Text>
            <Text style={styles.value}>
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString(getLocale()) : "—"}
            </Text>
          </View>
          {!user.firstName || !user.lastName ? (
            <Text style={styles.muted}>Dodaj imię i nazwisko przez edycję profilu.</Text>
          ) : null}
          <AppButton title="Edytuj profil" variant="secondary" onPress={openEditor}
            disabled={logoutLoading} />
        </View>

        {notice !== "" && <Text style={styles.success}>{notice}</Text>}
        {loading && !profile && <ActivityIndicator color={theme.colors.primary} />}
        {error !== "" && (
          <View style={styles.card}>
            <Text style={styles.error} accessibilityRole="alert">{error}</Text>
            {profile && <Text style={styles.muted}>Widoczne są ostatnio pobrane dane.</Text>}
            <AppButton title="Spróbuj ponownie" variant="secondary"
              onPress={loadProfile} disabled={loading || logoutLoading} />
          </View>
        )}

        <Text style={styles.sectionTitle}>Podsumowanie aktywności</Text>
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{profile?.activity?.depositCount ?? "—"}</Text>
            <Text style={styles.muted}>Wpłaty</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{profile?.activity?.exchangeCount ?? "—"}</Text>
            <Text style={styles.muted}>Wymiany</Text>
          </View>
        </View>

        <AppearanceSettings />
        <LanguageSettings />
        <SecuritySettings token={session.token} onSignedOut={onSignedOut} />

        {logoutError !== "" && <Text style={styles.error}>{logoutError}</Text>}
        <AppButton title="Wyloguj się" variant="secondary" onPress={onLogout}
          loading={logoutLoading} disabled={saving} />
        <AppVersionInfo />
      </ScrollView>

      {editing && (
        <Modal visible animationType="slide" onRequestClose={closeEditor}>
          <SafeAreaView style={styles.screen}>
            <KeyboardAvoidingView style={styles.screen}
              behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <ScrollView contentContainerStyle={styles.editor}
                keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <Text style={styles.title}>Edytuj profil</Text>
                <Text style={styles.muted}>Zaktualizuj imię i nazwisko.</Text>
                <Text style={styles.label}>Imię</Text>
                <TextInput placeholderTextColor={theme.colors.muted} selectionColor={theme.colors.primary}
                  keyboardAppearance={theme.dark ? "dark" : "light"} style={styles.input} value={firstName} onChangeText={setFirstName}
                  autoComplete="given-name" autoCapitalize="words" maxLength={100}
                  editable={!saving} placeholder={t("Twoje imię")} />
                <Text style={styles.label}>Nazwisko</Text>
                <TextInput placeholderTextColor={theme.colors.muted} selectionColor={theme.colors.primary}
                  keyboardAppearance={theme.dark ? "dark" : "light"} style={styles.input} value={lastName} onChangeText={setLastName}
                  autoComplete="family-name" autoCapitalize="words" maxLength={100}
                  editable={!saving} placeholder={t("Twoje nazwisko")} />
                {saveError !== "" && <Text style={styles.error} accessibilityRole="alert">{saveError}</Text>}
                <AppButton title="Zapisz zmiany" onPress={saveProfile} loading={saving} />
                <AppButton title="Anuluj" variant="secondary" onPress={closeEditor} disabled={saving} />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 20 },
  editor: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 14, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: "700", color: theme.colors.text },
  muted: { fontSize: 14, lineHeight: 21, color: theme.colors.muted },
  card: { padding: 16, gap: 10, backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.border },
  profileHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileLabels: { flex: 1, gap: 4 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.colors.primaryLight,
    alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 20, fontWeight: "700", color: theme.colors.primary },
  name: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  email: { fontSize: 15, color: theme.colors.muted },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  value: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.text, marginTop: 8 },
  stats: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, padding: 16, gap: 6, backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.border },
  statNumber: { fontSize: 30, fontWeight: "700", color: theme.colors.primary },
  label: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  input: { padding: 14, fontSize: 16, color: theme.colors.text, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.input },
  error: { fontSize: 14, color: theme.colors.danger, lineHeight: 21 },
  success: { fontSize: 14, color: theme.colors.success },
});
