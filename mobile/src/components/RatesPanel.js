import { decimal } from "../i18n/translations.js";
import { Text } from "../i18n/LanguageProvider.js";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { apiRequest } from "../services/api.js";
import AppButton from "./AppButton.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

export default function RatesPanel({ token }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRates();
  }, [token]);

  async function loadRates() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/rates", { token });
      setTable(result);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" color={theme.colors.primary} />}

      {error !== "" && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {error !== "" && table && (
        <Text style={styles.description}>
          Widoczne są ostatnio pobrane dane.
        </Text>
      )}

      {table && (
        <>
          <Text style={styles.description}>
            {table.tableNumber} · {table.effectiveDate}
          </Text>
          <Text style={styles.description}>
            Kursy w PLN za 1 jednostkę waluty obcej.
          </Text>

          {table.rates.map((rate) => (
            <View key={rate.currency} style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={styles.currency}>{rate.currency}</Text>
                <Text style={styles.name}>{rate.name}</Text>
              </View>
              <View style={styles.rateRow}>
                <View style={styles.rateColumn}>
                  <Text style={styles.description}>Kupno</Text>
                  <Text style={styles.rate}>{decimal(rate.bid)}</Text>
                </View>
                <View style={styles.rateColumn}>
                  <Text style={styles.description}>Sprzedaż</Text>
                  <Text style={styles.rate}>{decimal(rate.ask)}</Text>
                </View>
              </View>
            </View>
          ))}

          <Text style={styles.description}>
            Sprzedając walutę, otrzymujesz kurs kupna.
            Kupując walutę, płacisz kurs sprzedaży.
          </Text>
        </>
      )}

      <AppButton
        title={loading ? "Pobieranie…" : "Odśwież kursy"}
        onPress={loadRates}
        disabled={loading}
      />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    gap: 10,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  currency: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  name: {
    fontSize: 12,
    color: theme.colors.muted,
    flexShrink: 1,
  },
  rateRow: {
    flexDirection: "row",
    gap: 20,
  },
  rateColumn: {
    flex: 1,
    gap: 2,
  },
  rate: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
  },
  description: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  error: {
    fontSize: 16,
    color: theme.colors.danger,
  },
});
