import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { apiRequest, ApiError } from "./api.js";

function storageKey(userId) {
  return `kantor.pending-exchange.${userId}`;
}

export async function getPendingExchange(userId) {
  const saved = await SecureStore.getItemAsync(storageKey(userId));

  return saved ? JSON.parse(saved) : null;
}

export async function submitExchange(session, input) {
  const key = storageKey(session.user.id);
  let pending = await getPendingExchange(session.user.id);

  if (pending) {
    const fields = [
      "fromCurrency",
      "toCurrency",
      "amount",
      "expectedRate",
    ];

    const sameInput = fields.every(
      (field) => pending.input[field] === input[field]
    );

    if (!sameInput) {
      throw new Error(
        "Najpierw sprawdź wynik oczekującej wymiany."
      );
    }
  } else {
    pending = {
      requestId: Crypto.randomUUID(),
      input: {
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        amount: input.amount,
        expectedRate: input.expectedRate,
      },
    };

    await SecureStore.setItemAsync(key, JSON.stringify(pending));
  }

  let result;

  try {
    result = await apiRequest("/exchange", {
      method: "POST",
      token: session.token,
      requestId: pending.requestId,
      body: pending.input,
    });
  } catch (error) {
    const definitelyRejected =
      error instanceof ApiError &&
      (
        error.status === 400 ||
        error.code === "EXCHANGE_RATE_CHANGED" ||
        error.code === "INSUFFICIENT_FUNDS" ||
        error.code === "WALLET_NOT_FOUND"
      );

    if (definitelyRejected) {
      await SecureStore.deleteItemAsync(key);
    }

    throw error;
  }

  await SecureStore.deleteItemAsync(key);

  return result.exchange;
}