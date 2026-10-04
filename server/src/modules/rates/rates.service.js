import { z } from "zod";

const supportedCurrencies = ["EUR", "USD", "GBP"];

const tableSchema = z.array(
  z.object({
    table: z.literal("C"),
    no: z.string().min(1),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rates: z.array(
      z.object({
        code: z.string(),
        currency: z.string(),
        bid: z.number().finite().positive(),
        ask: z.number().finite().positive(),
      }).refine(
        (rate) => rate.ask >= rate.bid,
        "Kurs sprzedaży nie może być niższy od kursu kupna."
      )
    ),
  })
).length(1);

async function fetchRates(date) {
  const url = date
    ? `https://api.nbp.pl/api/exchangerates/tables/C/${date}/?format=json`
    : "https://api.nbp.pl/api/exchangerates/tables/C/?format=json";
  const response = await fetch(
    url,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }
  );

  if (date && response.status === 404) {
    const error = new Error("Brak tabeli NBP dla wybranej daty.");
    error.code = "RATES_NOT_FOUND";
    throw error;
  }

  if (!response.ok) {
    throw new Error(`API NBP zwróciło status ${response.status}.`);
  }

  const [table] = tableSchema.parse(await response.json());

  const rates = supportedCurrencies.map((code) => {
    const matchingRates = table.rates.filter(
      (rate) => rate.code === code
    );

    if (matchingRates.length !== 1) {
      throw new Error(`Nieprawidłowe dane kursu ${code} z NBP.`);
    }

    const rate = matchingRates[0];

    return {
      currency: rate.code,
      name: rate.currency,
      bid: String(rate.bid),
      ask: String(rate.ask),
    };
  });

  return {
    source: "NBP",
    table: table.table,
    tableNumber: table.no,
    effectiveDate: table.effectiveDate,
    baseCurrency: "PLN",
    rates,
  };
}

export function getCurrentRates() {
  return fetchRates();
}

export function getHistoricalRates(date) {
  return fetchRates(date);
}
