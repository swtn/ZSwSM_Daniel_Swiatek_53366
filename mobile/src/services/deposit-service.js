import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { apiRequest, ApiError } from "./api.js";

function storageKey(userId) {
  return `kantor.pending-deposit.${userId}`;
}

export function normalizeAmount(value) {
  const text = value.trim().replace(",", ".");

  if (!/^(0|[1-9]\d{0,16})(\.\d{1,2})?$/.test(text)) {
    throw new Error(
      "Podaj dodatnią kwotę z maksymalnie dwoma miejscami po przecinku."
    );
  }

  const [whole, fraction = ""] = text.split(".");
  const amount = `${whole}.${fraction.padEnd(2, "0")}`;

  if (amount === "0.00") {
    throw new Error("Kwota wpłaty musi być większa od zera.");
  }

  return amount;
}

export async function getPendingDeposit(userId) {
  const saved = await SecureStore.getItemAsync(storageKey(userId));

  return saved ? JSON.parse(saved) : null;
}

export async function submitDeposit(session, amount) {
  const key = storageKey(session.user.id);
  let pending = await getPendingDeposit(session.user.id);

  if (pending && pending.amount !== amount) {
    throw new Error(
      "Najpierw ponów oczekującą wpłatę z jej wcześniejszą kwotą."
    );
  }

  if (!pending) {
    pending = {
      requestId: Crypto.randomUUID(),
      amount,
    };

    // Zapis musi zakończyć się przed wysłaniem wpłaty.
    await SecureStore.setItemAsync(key, JSON.stringify(pending));
  }

  let result;

  try {
    result = await apiRequest("/wallet/deposits", {
      method: "POST",
      token: session.token,
      requestId: pending.requestId,
      body: {
        amount: pending.amount,
      },
    });
  } catch (error) {
    // Odrzucone dane nie utworzyły wpłaty.
    if (error instanceof ApiError && error.status === 400) {
      await SecureStore.deleteItemAsync(key);
    }

    // Przy utracie połączenia zachowujemy żądanie do ponowienia.
    throw error;
  }

  await SecureStore.deleteItemAsync(key);

  return result.deposit;
}