import { decimal } from "../i18n/translations.js";
import { Text, localizedAlert } from "../i18n/LanguageProvider.js";
import { t } from "../i18n/translations.js";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import AppButton from "./AppButton.js";
import { apiRequest } from "../services/api.js";
import {
  getPendingExchange,
  submitExchange,
} from "../services/exchange-service.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

const currencies = ["EUR", "USD", "GBP"];

export default function ExchangePreviewForm({
  session,
  onExchanged,
  onBusyChange,
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [foreignCurrency, setForeignCurrency] = useState("EUR");
  const [buyingForeign, setBuyingForeign] = useState(true);
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState(null);
  const [completed, setCompleted] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const busy = loading || executing;
  const blocked = busy || !ready || Boolean(pending);
  const fromCurrency = buyingForeign ? "PLN" : foreignCurrency;
  const toCurrency = buyingForeign ? foreignCurrency : "PLN";

  useEffect(() => {
    restorePending();
  }, [session.user.id]);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  function showPending(saved) {
    setPending(saved);

    if (saved) {
      const buying = saved.input.fromCurrency === "PLN";

      setBuyingForeign(buying);
      setForeignCurrency(
        buying ? saved.input.toCurrency : saved.input.fromCurrency
      );
      setAmount(decimal(saved.input.amount));
      setPreview(null);
    }
  }

  async function restorePending() {
    setReady(false);
    setLoading(true);
    setError("");

    try {
      showPending(await getPendingExchange(session.user.id));
      setReady(true);
    } catch {
      setError("Nie udało się odczytać oczekującej wymiany.");
    } finally {
      setLoading(false);
    }
  }

  function clearResult() {
    setPreview(null);
    setCompleted(null);
    setError("");
  }

  function changeCurrency(currency) {
    setForeignCurrency(currency);
    clearResult();
  }

  function changeDirection(buying) {
    setBuyingForeign(buying);
    clearResult();
  }

  function changeAmount(value) {
    setAmount(value);
    clearResult();
  }

  async function handlePreview() {
    if (submitting.current || blocked) {
      return;
    }

    clearResult();
    Keyboard.dismiss();

    const text = amount.trim().replace(",", ".");

    if (!/^(0|[1-9]\d{0,16})(\.\d{1,2})?$/.test(text)) {
      setError("Podaj kwotę z maksymalnie dwoma miejscami po przecinku.");
      return;
    }

    const [whole, fraction = ""] = text.split(".");
    const normalized = `${whole}.${fraction.padEnd(2, "0")}`;

    if (normalized === "0.00") {
      setError("Kwota wymiany musi być większa od zera.");
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      const result = await apiRequest("/exchange/preview", {
        method: "POST",
        token: session.token,
        body: {
          fromCurrency,
          toCurrency,
          amount: normalized,
        },
      });

      setPreview(result.preview);
    } catch (error) {
      setError(error.message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function execute(input) {
    setError("");
    setCompleted(null);

    try {
      const exchange = await submitExchange(session, input);

      setPending(null);
      setPreview(null);
      setAmount("");
      setCompleted(exchange);

      await onExchanged();
    } catch (error) {
      setError(error.message);

      try {
        const saved = await getPendingExchange(session.user.id);
        showPending(saved);

        if (!saved) {
          // Po odrzuceniu operacji wymagamy nowego podglądu.
          setPreview(null);
        }
      } catch {
        setReady(false);
        setError(
          "Nie udało się sprawdzić oczekującej wymiany. Ponów jej odczyt."
        );
      }
    } finally {
      submitting.current = false;
      setExecuting(false);
    }
  }

  function confirmExchange() {
    if (!preview || blocked || submitting.current) {
      return;
    }

    const acceptedPreview = preview;
    submitting.current = true;
    setExecuting(true);
    Keyboard.dismiss();

    localizedAlert(
      "Potwierdź wymianę",
      `Wymienisz ${decimal(acceptedPreview.sourceAmount)} `
      + `${acceptedPreview.fromCurrency} na `
      + `${decimal(acceptedPreview.targetAmount)} `
      + `${acceptedPreview.toCurrency}.`,
      [
        {
          text: "Anuluj",
          style: "cancel",
          onPress: () => {
            submitting.current = false;
            setExecuting(false);
          },
        },
        {
          text: "Wymień",
          onPress: () => execute({
            fromCurrency: acceptedPreview.fromCurrency,
            toCurrency: acceptedPreview.toCurrency,
            amount: acceptedPreview.sourceAmount,
            expectedRate: acceptedPreview.exchangeRate,
          }),
        },
      ],
      { cancelable: false }
    );
  }

  function retryExchange() {
    if (!pending || busy || !ready || submitting.current) {
      return;
    }

    submitting.current = true;
    setExecuting(true);
    execute(pending.input);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Waluta obca</Text>

      <View style={styles.options}>
        {currencies.map((currency) => (
          <Pressable
            key={currency}
            onPress={() => changeCurrency(currency)}
            disabled={blocked}
            accessibilityRole="button"
            accessibilityState={{
              selected: foreignCurrency === currency,
              disabled: blocked,
            }}
            style={[
              styles.option,
              foreignCurrency === currency && styles.selectedOption,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                foreignCurrency === currency && styles.selectedText,
              ]}
            >
              {currency}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Kierunek wymiany</Text>

      <View style={styles.options}>
        {[
          { buying: true, title: `PLN → ${foreignCurrency}` },
          { buying: false, title: `${foreignCurrency} → PLN` },
        ].map((option) => (
          <Pressable
            key={String(option.buying)}
            onPress={() => changeDirection(option.buying)}
            disabled={blocked}
            accessibilityRole="button"
            accessibilityState={{
              selected: buyingForeign === option.buying,
              disabled: blocked,
            }}
            style={[
              styles.option,
              buyingForeign === option.buying && styles.selectedOption,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                buyingForeign === option.buying && styles.selectedText,
              ]}
            >
              {option.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Kwota w {fromCurrency}</Text>

      <TextInput
            placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.primary}
            keyboardAppearance={theme.dark ? "dark" : "light"}
        style={styles.input}
        value={amount}
        onChangeText={changeAmount}
        keyboardType="decimal-pad"
        placeholder={t("np. 50,00")}
        editable={!blocked}
      />

      {error !== "" && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {!ready ? (
        <AppButton
          title="Odczytaj oczekującą wymianę"
          onPress={restorePending}
          loading={loading}
        />
      ) : pending ? (
        <View style={styles.previewCard}>
          <Text style={styles.description}>
            Poprzednia wymiana oczekuje na potwierdzenie wyniku.
            Ponowienie użyje tego samego identyfikatora.
          </Text>

          <Text style={styles.sourceAmount}>
            {decimal(pending.input.amount)}
            {" "}{pending.input.fromCurrency}
            {" → "}{pending.input.toCurrency}
          </Text>

          <AppButton
            title="Sprawdź wynik wymiany"
            onPress={retryExchange}
            loading={executing}
          />
        </View>
      ) : (
        <AppButton
          title="Oblicz wymianę"
          onPress={handlePreview}
          loading={loading}
          disabled={executing}
        />
      )}

      {preview && !pending && (
        <View style={styles.previewCard}>
          <Text style={styles.description}>Wymienisz</Text>
          <Text style={styles.sourceAmount}>
            {decimal(preview.sourceAmount)}
            {" "}{preview.fromCurrency}
          </Text>

          <Text style={styles.description}>Otrzymasz</Text>
          <Text style={styles.targetAmount}>
            {decimal(preview.targetAmount)}
            {" "}{preview.toCurrency}
          </Text>

          <Text style={styles.description}>
            Kurs {preview.rateType === "ask" ? "sprzedaży" : "kupna"}:
            {" "}{decimal(preview.exchangeRate)} PLN
          </Text>

          <Text style={styles.description}>
            {preview.tableNumber} · {preview.effectiveDate}
          </Text>

          <Text style={styles.description}>
            Jeśli kurs się zmieni, poprosimy o nowy podgląd.
          </Text>

          <AppButton
            title="Potwierdź wymianę"
            onPress={confirmExchange}
            loading={executing}
            disabled={loading}
          />
        </View>
      )}

      {completed && (
        <View style={styles.previewCard}>
          <Text style={styles.label}>Wymiana potwierdzona</Text>

          <Text style={styles.sourceAmount}>
            {decimal(completed.sourceAmount)}
            {" "}{completed.fromCurrency}
          </Text>

          <Text style={styles.targetAmount}>
            → {decimal(completed.targetAmount)}
            {" "}{completed.toCurrency}
          </Text>

          <Text style={styles.description}>
            Salda zostały odświeżone.
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    gap: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  options: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedOption: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.muted,
  },
  selectedText: {
    color: theme.colors.primary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 14,
    fontSize: 18,
    color: theme.colors.text,
  },
  previewCard: {
    padding: 20,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  sourceAmount: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
  },
  targetAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  description: {
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 19,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 14,
  },
});
