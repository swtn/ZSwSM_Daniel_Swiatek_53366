import Decimal from "decimal.js";

const Money = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

const foreignCurrencies = ["EUR", "USD", "GBP"];
const amountPattern = /^(0|[1-9]\d{0,16})\.\d{2}$/;
const maxAmount = new Money("99999999999999999.99");

export function calculateExchange({
  fromCurrency,
  toCurrency,
  amount,
  ratesTable,
}) {
  const buyingForeign =
    fromCurrency === "PLN" &&
    foreignCurrencies.includes(toCurrency);

  const sellingForeign =
    toCurrency === "PLN" &&
    foreignCurrencies.includes(fromCurrency);

  if (!buyingForeign && !sellingForeign) {
    throw new Error("Nieobsługiwana para walut.");
  }

  if (
    typeof amount !== "string" ||
    !amountPattern.test(amount) ||
    amount === "0.00"
  ) {
    throw new Error("Nieprawidłowa kwota wymiany.");
  }

  const foreignCurrency = buyingForeign
    ? toCurrency
    : fromCurrency;

  const rate = ratesTable.rates.find(
    (item) => item.currency === foreignCurrency
  );

  if (!rate) {
    throw new Error("Brak kursu wymaganej waluty.");
  }

  const rateType = buyingForeign ? "ask" : "bid";
  const exchangeRate = new Money(rate[rateType]);

  if (!exchangeRate.isFinite() || !exchangeRate.gt(0)) {
    throw new Error("Nieprawidłowy kurs wymiany.");
  }

  const sourceAmount = new Money(amount);

  const targetAmount = (
    buyingForeign
      ? sourceAmount.div(exchangeRate)
      : sourceAmount.mul(exchangeRate)
  ).toDecimalPlaces(2, Money.ROUND_HALF_UP);

  if (targetAmount.isZero()) {
    throw new Error("Kwota wymiany jest zbyt mała.");
  }

  if (targetAmount.gt(maxAmount)) {
    throw new Error("Kwota wynikowa przekracza dopuszczalny zakres.");
  }

  if (targetAmount.isZero()) {
  const error = new Error("Kwota wymiany jest zbyt mała.");
  error.code = "EXCHANGE_AMOUNT_TOO_SMALL";
  throw error;
}

if (targetAmount.gt(maxAmount)) {
  const error = new Error(
    "Kwota wynikowa przekracza dopuszczalny zakres."
  );
  error.code = "EXCHANGE_AMOUNT_TOO_LARGE";
  throw error;
}
  return {
    fromCurrency,
    toCurrency,
    sourceAmount: sourceAmount.toFixed(2),
    targetAmount: targetAmount.toFixed(2),
    exchangeRate: exchangeRate.toString(),
    rateType,
    tableNumber: ratesTable.tableNumber,
    effectiveDate: ratesTable.effectiveDate,
  };
}