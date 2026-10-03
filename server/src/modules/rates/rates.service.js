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

export async function getCurrentRates() {
  const response = await fetch(
    "https://api.nbp.pl/api/exchangerates/tables/C/?format=json",
    {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    }
  );

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