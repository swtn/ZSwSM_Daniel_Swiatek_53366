import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getPendingDeposit,
  normalizeAmount,
  submitDeposit,
} from "../services/deposit-service.js";
import AppButton from "./AppButton.js";
import { theme } from "../theme/theme.js";

export default function DepositForm({
  session,
  disabled,
  onDeposited,
  onBusyChange,
}) {
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
        setAmount(saved.amount.replace(".", ","));
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
        `Potwierdzono wpłatę ${deposit.amount.replace(".", ",")} PLN.`
      );

      await onDeposited();
    } catch (error) {
      setError(error.message);

      try {
        const saved = await getPendingDeposit(session.user.id);

        setPending(saved);

        if (saved) {
          setAmount(saved.amount.replace(".", ","));
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
      <Text>Kwota wpłaty w PLN</Text>

      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="np. 100,00"
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

      {busy && <ActivityIndicator />}

      {ready ? (
        <Button
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
        <Button
          title="Odczytaj oczekującą wpłatę"
          onPress={restorePending}
          disabled={disabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  notice: {
    color: "#475569",
  },
  error: {
    color: "#b91c1c",
  },
  success: {
    color: "#166534",
  },
});