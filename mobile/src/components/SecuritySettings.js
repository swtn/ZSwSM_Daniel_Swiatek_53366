import { Text, localizedAlert } from "../i18n/LanguageProvider.js";
import { getLocale, t } from "../i18n/translations.js";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "../services/api.js";
import AppButton from "./AppButton.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

export default function SecuritySettings({ token, onSignedOut }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState("password");
  const [sessions, setSessions] = useState([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  function clearPasswords() { setCurrentPassword(""); setNewPassword(""); setRepeatPassword(""); }
  function close() { if (!busy.current) { clearPasswords(); setVisible(false); setSessions([]); } }
  async function perform(action) {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(""); setNotice("");
    try { await action(); } catch (error) { setError(error.message); }
    finally { busy.current = false; setLoading(false); }
  }
  async function loadSessions() {
    const result = await apiRequest("/auth/sessions", { token }); setSessions(result.sessions);
  }
  function open(value) {
    setMode(value); setVisible(true); setError(""); setNotice(""); clearPasswords();
    if (value === "sessions") perform(loadSessions);
  }
  async function changePassword() {
    if (!currentPassword || newPassword.length < 12 || newPassword.length > 128 || currentPassword === newPassword) {
      setError("Nowe hasło musi mieć od 12 do 128 znaków i różnić się od obecnego."); return;
    }
    if (newPassword !== repeatPassword) { setError("Podane hasła nie są takie same."); return; }
    await perform(async () => {
      await apiRequest("/auth/password", { token, method: "POST", body: { currentPassword, newPassword } });
      clearPasswords(); setNotice("Hasło zmienione. Pozostałe sesje zostały zakończone.");
    });
  }
  function revoke(session) {
    localizedAlert("Zakończyć sesję?", session.isCurrent ? "Nastąpi wylogowanie z tej aplikacji." : "Ta sesja straci dostęp do konta.", [
      { text: "Anuluj", style: "cancel" },
      { text: "Zakończ sesję", style: "destructive", onPress: () => perform(async () => {
        await apiRequest(`/auth/sessions/${session.id}`, { token, method: "DELETE" });
        if (session.isCurrent) { clearPasswords(); await onSignedOut(); } else { await loadSessions(); setNotice("Sesja została zakończona."); }
      }) },
    ]);
  }
  function logoutAll() {
    if (!currentPassword) { setError("Podaj obecne hasło."); return; }
    localizedAlert("Wylogować ze wszystkich urządzeń?", "Nastąpi również wylogowanie z tej aplikacji.", [
      { text: "Anuluj", style: "cancel" },
      { text: "Wyloguj wszystkich", style: "destructive", onPress: () => perform(async () => {
        await apiRequest("/auth/logout-all", { token, method: "POST", body: { currentPassword } });
        clearPasswords(); await onSignedOut();
      }) },
    ]);
  }
  const passwordField = (label, value, onChangeText) => <View style={styles.field} key={label}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!loading} maxLength={128} accessibilityLabel={t(label)} selectionColor={theme.colors.primary} /></View>;
  return <>
    <View style={styles.row}>
      <View style={styles.half}><AppButton title="Zmień hasło" variant="secondary" onPress={() => open("password")} /></View>
      <View style={styles.half}><AppButton title="Sesje" variant="secondary" onPress={() => open("sessions")} /></View>
    </View>
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode === "password" ? "Zmiana hasła" : "Aktywne sesje"}</Text>
        {mode === "password" ? <>
          <Text style={styles.muted}>Po zmianie hasła inne sesje zostaną zakończone. Obecna sesja pozostanie aktywna.</Text>
          {passwordField("Obecne hasło", currentPassword, setCurrentPassword)}{passwordField("Nowe hasło", newPassword, setNewPassword)}{passwordField("Powtórz hasło", repeatPassword, setRepeatPassword)}
          <AppButton title="Zmień hasło" onPress={changePassword} loading={loading} />
        </> : <>
          <Text style={styles.muted}>Sesje identyfikujemy po czasie logowania. Nie przechowujemy nazw urządzeń.</Text>
          <AppButton title="Odśwież sesje" variant="secondary" onPress={() => perform(loadSessions)} loading={loading} />
          {sessions.map(session => <View style={styles.card} key={session.id}>
            <Text style={styles.label}>{session.isCurrent ? "Obecna sesja" : "Inna sesja"}</Text>
            <Text style={styles.muted}>{new Date(session.createdAt).toLocaleString(getLocale())}</Text>
            <Text style={styles.muted}>Wygasa: {new Date(session.expiresAt).toLocaleString(getLocale())}</Text>
            <AppButton title="Zakończ sesję" variant="secondary" disabled={loading} onPress={() => revoke(session)} />
          </View>)}
          {passwordField("Obecne hasło", currentPassword, setCurrentPassword)}
          <AppButton title="Wyloguj ze wszystkich urządzeń" disabled={loading} onPress={logoutAll} />
        </>}
        {error !== "" && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}{notice !== "" && <Text style={styles.success}>{notice}</Text>}
        <AppButton title="Zamknij" variant="secondary" disabled={loading} onPress={close} />
      </ScrollView></KeyboardAvoidingView></SafeAreaView>
    </Modal>
  </>;
}
const createStyles = theme => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 24, gap: 14, paddingBottom: 40 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "700" }, row: { flexDirection: "row", gap: 10 }, half: { flex: 1 },
  muted: { color: theme.colors.muted, fontSize: 13, lineHeight: 20 }, label: { color: theme.colors.text, fontSize: 15, fontWeight: "600" },
  field: { gap: 6 }, input: { padding: 14, color: theme.colors.text, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  card: { padding: 16, gap: 8, backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border },
  error: { color: theme.colors.danger }, success: { color: theme.colors.success },
});
