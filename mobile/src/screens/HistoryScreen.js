import { decimal } from "../i18n/translations.js";
import { Text } from "../i18n/LanguageProvider.js";
import { getLocale, t } from "../i18n/translations.js";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../components/AppButton.js";
import { apiRequest } from "../services/api.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

const initialFilters = { type: "all", currency: "all", from: "", to: "" };
function title(item) {
  return t(item.type === "deposit" ? "Zasilenie portfela" : item.type === "buy" ? `Kupno ${item.toCurrency}` : `Sprzedaż ${item.fromCurrency}`);
}
export default function HistoryScreen({ token }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(initialFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const version = useRef(0);
  const detailVersion = useRef(0);
  const busy = useRef(false);
  const chosen = useRef(initialFilters);

  const load = useCallback(async (nextCursor = null) => {
    if (busy.current) return;
    busy.current = true;
    const id = ++version.current;
    setLoading(true); setError("");
    const query = new URLSearchParams({ type: chosen.current.type, currency: chosen.current.currency, limit: "20" });
    for (const key of ["from", "to"]) if (chosen.current[key]) query.set(key, chosen.current[key]);
    if (nextCursor) query.set("cursor", nextCursor);
    try {
      const result = await apiRequest(`/history?${query}`, { token });
      if (id === version.current) {
        setItems(old => nextCursor ? [...old, ...result.items.filter(item => !old.some(existing => existing.id === item.id && existing.type === item.type))] : result.items);
        setCursor(result.nextCursor);
      }
    } catch (error) { if (id === version.current) setError(error.message); }
    finally { if (id === version.current) { busy.current = false; setLoading(false); } }
  }, [token]);
  useFocusEffect(useCallback(() => {
    load();
    return () => { version.current++; detailVersion.current++; busy.current = false; setLoading(false); setDetailOpen(false); };
  }, [load]));

  function applyFilters(value) {
    for (const date of [value.from, value.to]) {
      if (!date) continue;
      const parsed = new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        setError("Podaj poprawne daty w formacie RRRR-MM-DD."); return;
      }
    }
    if (value.from && value.to && value.from > value.to) { setError("Data początkowa nie może być późniejsza od końcowej."); return; }
    chosen.current = value; setFilters(value); setFilterOpen(false); setItems([]); setCursor(null); load();
  }
  async function openDetails(item) {
    const id = ++detailVersion.current;
    setDetailOpen(true); setDetail(null); setDetailError(""); setDetailLoading(true);
    try {
      const result = await apiRequest(`/history/${item.type}/${item.id}`, { token });
      if (detailVersion.current === id) setDetail(result.item);
    } catch (error) { if (detailVersion.current === id) setDetailError(error.message); }
    finally { if (detailVersion.current === id) setDetailLoading(false); }
  }
  const active = filters.type !== "all" || filters.currency !== "all" || filters.from || filters.to;
  const field = (label, value) => <View style={styles.field} key={label}><Text style={styles.muted}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>;
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}>
        <Text style={styles.title}>Historia</Text><Text style={styles.muted}>Wpłaty, kupno i sprzedaż walut</Text>
        <AppButton title={active ? "Filtry aktywne · Zmień" : "Filtruj historię"} variant="secondary" disabled={loading} onPress={() => { setDraft(filters); setError(""); setFilterOpen(true); }} />
        {error !== "" && <View style={styles.card}><Text style={styles.error}>{error}</Text><AppButton title="Spróbuj ponownie" disabled={loading} onPress={() => load()} /></View>}
        {!loading && !error && !items.length && <View style={styles.card}><Text style={styles.label}>Brak operacji</Text><Text style={styles.muted}>Brak operacji pasujących do wybranych filtrów.</Text></View>}
        {items.map(item => <Pressable key={`${item.type}-${item.id}`} accessibilityRole="button" accessibilityLabel={title(item)} onPress={() => openDetails(item)} style={styles.card}>
          <View style={styles.heading}><Text style={styles.label}>{title(item)}</Text><Ionicons name="chevron-forward" size={20} color={theme.colors.muted} /></View>
          <Text style={styles.amount}>{item.type === "deposit" ? `+${decimal(item.sourceAmount)} PLN` : `${decimal(item.sourceAmount)} ${item.fromCurrency} → ${decimal(item.targetAmount)} ${item.toCurrency}`}</Text>
          <Text style={styles.muted}>{new Date(item.createdAt).toLocaleString(getLocale())}</Text>
        </Pressable>)}
        {cursor && <AppButton title="Pokaż starsze operacje" loading={loading} onPress={() => load(cursor)} />}
        {loading && !cursor && <ActivityIndicator color={theme.colors.primary} />}
        {!cursor && items.length > 0 && !loading && <Text style={styles.muted}>Wyświetlono wszystkie pasujące operacje.</Text>}
      </ScrollView>
      <Modal visible={filterOpen} animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Text style={styles.title}>Filtry historii</Text><Text style={styles.label}>Rodzaj operacji</Text>
          <View style={styles.choices}>{[["all", "Wszystkie"], ["deposit", "Wpłaty"], ["buy", "Kupno"], ["sell", "Sprzedaż"]].map(([value, label]) => <Pressable key={value} onPress={() => setDraft(old => ({ ...old, type: value }))} accessibilityRole="radio" accessibilityState={{ checked: draft.type === value }} style={[styles.chip, draft.type === value && styles.selected]}><Text style={styles.label}>{label}</Text></Pressable>)}</View>
          <Text style={styles.label}>Waluta</Text><View style={styles.choices}>{["all", "PLN", "EUR", "USD", "GBP"].map(value => <Pressable key={value} onPress={() => setDraft(old => ({ ...old, currency: value }))} accessibilityRole="radio" accessibilityState={{ checked: draft.currency === value }} style={[styles.chip, draft.currency === value && styles.selected]}><Text style={styles.label}>{value === "all" ? "Wszystkie" : value}</Text></Pressable>)}</View>
          <Text style={styles.label}>Od dnia · RRRR-MM-DD</Text><TextInput style={styles.input} value={draft.from} onChangeText={from => setDraft(old => ({ ...old, from }))} placeholder="2026-01-01" placeholderTextColor={theme.colors.muted} maxLength={10} />
          <Text style={styles.label}>Do dnia · RRRR-MM-DD</Text><TextInput style={styles.input} value={draft.to} onChangeText={to => setDraft(old => ({ ...old, to }))} placeholder="2026-12-31" placeholderTextColor={theme.colors.muted} maxLength={10} />
          <Text style={styles.muted}>Daty są interpretowane w strefie Europe/Warsaw. Puste pola oznaczają brak ograniczenia.</Text>
          {error !== "" && <Text style={styles.error}>{error}</Text>}
          <AppButton title="Zastosuj filtry" onPress={() => applyFilters(draft)} /><AppButton title="Wyczyść filtry" variant="secondary" onPress={() => applyFilters(initialFilters)} /><AppButton title="Anuluj" variant="secondary" onPress={() => setFilterOpen(false)} />
        </ScrollView></KeyboardAvoidingView></SafeAreaView>
      </Modal>
      <Modal visible={detailOpen} animationType="slide" onRequestClose={() => { detailVersion.current++; setDetailOpen(false); }}>
        <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Szczegóły operacji</Text>
          {detailLoading && <ActivityIndicator color={theme.colors.primary} />}{detailError !== "" && <Text style={styles.error}>{detailError}</Text>}
          {detail && <View style={styles.card}>
            {field("Rodzaj operacji", title(detail))}
            {field("Data i czas", new Date(detail.createdAt).toLocaleString(getLocale()))}
            {field(detail.type === "deposit" ? "Wpłacona kwota" : "Kwota źródłowa", `${decimal(detail.sourceAmount)} ${detail.fromCurrency}`)}
            {detail.type !== "deposit" && <>{field("Otrzymana kwota", `${decimal(detail.targetAmount)} ${detail.toCurrency}`)}{field("Zastosowany kurs", `${decimal(detail.exchangeRate)} PLN`)}{field("Typ kursu", detail.rateType === "ask" ? "Sprzedaż" : "Kupno")}{field("Tabela NBP", detail.tableNumber)}{field("Data publikacji kursu", detail.effectiveDate)}</>}
            {field("Identyfikator operacji", detail.id)}{field("Identyfikator żądania", detail.requestId)}
          </View>}
          <AppButton title="Zamknij" onPress={() => { detailVersion.current++; setDetailOpen(false); }} />
        </ScrollView></SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const createStyles = theme => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 20, gap: 12, paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.text }, muted: { color: theme.colors.muted, fontSize: 13, lineHeight: 20 },
  card: { padding: 16, gap: 10, borderRadius: theme.radius.card, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, label: { color: theme.colors.text, fontWeight: "600", fontSize: 15 },
  amount: { color: theme.colors.text, fontSize: 19, fontWeight: "600" }, error: { color: theme.colors.danger },
  field: { gap: 4 }, value: { color: theme.colors.text, fontSize: 15 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { padding: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 },
  selected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  input: { padding: 14, color: theme.colors.text, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 },
});
