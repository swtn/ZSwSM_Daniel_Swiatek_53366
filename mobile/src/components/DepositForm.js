import { decimal } from "../i18n/translations.js";
import { Text } from "../i18n/LanguageProvider.js";
import { t } from "../i18n/translations.js";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  getPendingDeposit,
  normalizeAmount,
  submitDeposit,
} from "../services/deposit-service.js";
import AppButton from "./AppButton.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

export default function DepositForm({
  session,
  disabled,
  onDeposited,
  onBusyChange,
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    restorePending();
  }, [session.user.id]);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  async function restorePending() {
    setReady(false);
    setError("");

    try {
      const saved = await getPendingDeposit(session.user.id);

      setPending(saved);

      if (saved) {
        setAmount(decimal(saved.amount));
      }

      setReady(true);
    } catch {
      setError("Nie udało się odczytać oczekującej wpłaty.");
    }
  }

  async function handleDeposit() {
    if (submitting.current || !ready || disabled) {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    Keyboard.dismiss();

    try {
      const normalized = pending
        ? pending.amount
        : normalizeAmount(amount);

      const deposit = await submitDeposit(session, normalized);

      setPending(null);
      setAmount("");
      setMessage(
        `Potwierdzono wpłatę ${decimal(deposit.amount)} PLN.`
      );

      await onDeposited();
    } catch (error) {
      setError(error.message);

      try {
        const saved = await getPendingDeposit(session.user.id);

        setPending(saved);

        if (saved) {
          setAmount(decimal(saved.amount));
        }
      } catch {
        setReady(false);
        setError(
          "Nie udało się sprawdzić oczekującej wpłaty. Ponów jej odczyt."
        );
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zasil portfel</Text>
      <Text style={styles.notice}>Kwota wpłaty w PLN</Text>

      <TextInput
            placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.primary}
            keyboardAppearance={theme.dark ? "dark" : "light"}
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder={t("np. 100,00")}
        keyboardType="decimal-pad"
        editable={ready && !busy && !disabled && !pending}
      />

      {pending && (
        <Text style={styles.notice}>
          Poprzednia wpłata oczekuje na potwierdzenie.
          Ponowienie nie utworzy drugiej wpłaty.
        </Text>
      )}

      {error !== "" && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {message !== "" && (
        <Text style={styles.success}>{message}</Text>
      )}

      {busy && <ActivityIndicator color={theme.colors.primary} />}

      {ready ? (
        <AppButton
          title={
            busy
              ? "Sprawdzanie wpłaty…"
              : pending
                ? "Ponów oczekującą wpłatę"
                : "Wpłać PLN"
          }
          onPress={handleDeposit}
          disabled={busy || disabled}
        />
      ) : (
        <AppButton
          title="Odczytaj oczekującą wpłatę"
          onPress={restorePending}
          disabled={disabled}
        />
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    gap: 12,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  notice: {
    color: theme.colors.muted,
  },
  error: {
    color: theme.colors.danger,
  },
  success: {
    color: theme.colors.success,
  },
});
