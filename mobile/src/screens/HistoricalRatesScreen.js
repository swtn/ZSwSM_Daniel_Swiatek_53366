import { decimal } from "../i18n/translations.js";
import { Text } from "../i18n/LanguageProvider.js";
import { t } from "../i18n/translations.js";
import { useCallback, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../components/AppButton.js";
import { apiRequest } from "../services/api.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

function initialDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function HistoricalRatesScreen({ token }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [date, setDate] = useState(initialDate);
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notFound, setNotFound] = useState(false);
  const request = useRef(0);
  const busy = useRef(false);

  // Dane kursowe istnieją tylko w pamięci aktywnego ekranu.
  useFocusEffect(useCallback(() => () => {
    request.current += 1;
    busy.current = false;
    setTable(null);
    setMessage("");
    setLoading(false);
  }, [token]));

  function changeDate(value) {
    setDate(value);
    setTable(null);
    setMessage("");
    setNotFound(false);
  }

  async function loadRates() {
    if (busy.current) return;
    Keyboard.dismiss();
    const value = date.trim();
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      setMessage("Podaj poprawną datę w formacie RRRR-MM-DD.");
      setNotFound(false);
      setTable(null);
      return;
    }
    busy.current = true;
    const id = ++request.current;
    setLoading(true);
    setTable(null);
    setMessage("");
    setNotFound(false);
    try {
      const result = await apiRequest(`/rates/historical?date=${encodeURIComponent(value)}`, { token });
      if (request.current === id) setTable(result);
    } catch (error) {
      if (request.current === id) {
        setNotFound(error.code === "RATES_NOT_FOUND");
        setMessage(error.message);
      }
    } finally {
      if (request.current === id) {
        busy.current = false;
        setLoading(false);
      }
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.title}>Archiwum kursów</Text>
        <Text style={styles.description}>Sprawdź notowanie NBP z wybranego dnia.</Text>
        <View style={styles.search}>
          <Text style={styles.label}>Data publikacji · RRRR-MM-DD</Text>
          <TextInput
            value={date} onChangeText={changeDate} editable={!loading}
            placeholder="2024-01-05" placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.primary} style={styles.input}
            accessibilityLabel={t("Data publikacji kursów w formacie rok miesiąc dzień")}
            autoCorrect={false} autoCapitalize="none" maxLength={10}
            returnKeyType="search" onSubmitEditing={loadRates}
          />
          <AppButton title={loading ? "Pobieranie…" : "Pokaż kursy"} loading={loading} onPress={loadRates} />
        </View>
        {message !== "" && (
          <View style={styles.notice}>
            <Ionicons name={notFound ? "calendar-outline" : "alert-circle-outline"} size={24} color={notFound ? theme.colors.muted : theme.colors.danger} />
            <Text style={[styles.description, !notFound && styles.error]} accessibilityRole="alert">{message}</Text>
            {notFound && <Text style={styles.description}>W weekendy i dni wolne zwykle nie ma nowego notowania. Wybierz wcześniejszy dzień roboczy.</Text>}
          </View>
        )}
        {table && (
          <>
            <Text style={styles.metadata}>{table.tableNumber} · {table.effectiveDate}</Text>
            <Text style={styles.description}>PLN za 1 jednostkę waluty obcej</Text>
            {table.rates.map((rate) => (
              <View key={rate.currency} style={styles.card}>
                <View style={styles.heading}>
                  <Text style={styles.currency}>{rate.currency}</Text>
                  <Text style={styles.description}>{rate.name}</Text>
                </View>
                <View style={styles.row}>
                  <View style={styles.column}><Text style={styles.description}>Kupno</Text><Text style={styles.rate}>{decimal(rate.bid)}</Text></View>
                  <View style={styles.column}><Text style={styles.description}>Sprzedaż</Text><Text style={styles.rate}>{decimal(rate.ask)}</Text></View>
                </View>
              </View>
            ))}
          </>
        )}
        {!table && !message && !loading && <Text style={styles.description}>Wybierz datę i naciśnij „Pokaż kursy”. Dane dostępne od 2 stycznia 2002 r.</Text>}
        <Text style={styles.footer}>Kursy archiwalne służą wyłącznie do podglądu. Wymiana korzysta z bieżących kursów NBP.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, padding: theme.spacing.screen, gap: 10 },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
  description: { fontSize: 13, lineHeight: 19, color: theme.colors.muted, flexShrink: 1 },
  search: { gap: 8, marginVertical: 4 },
  label: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.input, paddingHorizontal: 14, fontSize: 17, color: theme.colors.text, backgroundColor: theme.colors.surface },
  card: { paddingHorizontal: 16, paddingVertical: 10, gap: 6, borderRadius: theme.radius.card, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  currency: { fontSize: 19, fontWeight: "700", color: theme.colors.text },
  row: { flexDirection: "row", gap: 16 },
  column: { flex: 1, gap: 2 },
  rate: { fontSize: 20, fontWeight: "600", color: theme.colors.text },
  metadata: { fontSize: 12, fontWeight: "600", color: theme.colors.primary },
  notice: { padding: 16, gap: 8, borderRadius: theme.radius.card, backgroundColor: theme.colors.surface },
  error: { color: theme.colors.danger },
  footer: { fontSize: 12, lineHeight: 18, color: theme.colors.muted, marginTop: 4 },
});
