import { z } from "zod";

const exchangeFields = {
  fromCurrency: z.enum(["PLN", "EUR", "USD", "GBP"]),
  toCurrency: z.enum(["PLN", "EUR", "USD", "GBP"]),
  amount: z.string()
    .regex(
      /^(0|[1-9]\d{0,16})\.\d{2}$/,
      "Kwota musi mieć format np. 100.00."
    )
    .refine(
      (amount) => amount !== "0.00",
      "Kwota musi być większa od zera."
    ),
};

function supportedPair({ fromCurrency, toCurrency }) {
  return (
    fromCurrency !== toCurrency &&
    (fromCurrency === "PLN" || toCurrency === "PLN")
  );
}

const pairError = {
  message: "Obsługujemy wyłącznie wymianę PLN na walutę obcą i odwrotnie.",
  path: ["toCurrency"],
};

export const exchangeSchema = z.object(exchangeFields)
  .strict()
  .refine(supportedPair, pairError);

export const executeExchangeSchema = z.object({
  ...exchangeFields,
  expectedRate: z.string()
    .regex(
      /^(0|[1-9]\d{0,10})(\.\d{1,8})?$/,
      "Nieprawidłowy oczekiwany kurs."
    )
    .refine(
      (rate) => /[1-9]/.test(rate),
      "Kurs musi być większy od zera."
    ),
}).strict().refine(supportedPair, pairError);