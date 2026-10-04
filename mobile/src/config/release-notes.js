import appConfig from "../../app.json";

export const appVersion = appConfig.expo.version;

// X: duże zmiany funkcjonalne. Y: poprawki i zmiany interfejsu.
export const releases = [
  {
    version: "1.1.1",
    changes: {
      pl: [
        "Informacja o wersji i historia zmian dostępne na ekranie Konto.",
        "Poprawiona obsługa zbyt małych i zbyt dużych kwot wymiany.",
        "Testy operacji finansowych, awarii połączenia i bezpiecznych ponowień.",
      ],
      en: [
        "App version and release notes available on the Account screen.",
        "Improved handling of exchange amounts outside the supported range.",
        "Tests for financial operations, connection failures and safe retries.",
      ],
    },
  },
  {
    version: "1.1.0",
    changes: {
      pl: [
        "Rejestracja oraz profil użytkownika z edycją imienia i nazwiska.",
        "Dolna nawigacja, nowa kolorystyka i jasny, ciemny oraz systemowy motyw.",
        "Podgląd archiwalnych kursów NBP bez ich trwałego przechowywania.",
        "Filtry historii, kolejne strony oraz szczegóły wpłat i wymian.",
        "Zmiana hasła i zarządzanie aktywnymi sesjami.",
        "Polski i angielski interfejs oraz formatowanie dat i kwot.",
        "Poprawiony układ portfela i formularzy z otwartą klawiaturą.",
      ],
      en: [
        "Registration and user profiles with first and last name editing.",
        "Bottom navigation, refreshed colours and light, dark and system themes.",
        "Historical NBP rates without persistent storage.",
        "History filters, pagination and deposit and exchange details.",
        "Password changes and active session management.",
        "Polish and English interface with localised dates and amounts.",
        "Improved wallet layout and forms when the keyboard is open.",
      ],
    },
  },
  {
    version: "1.0.0",
    changes: {
      pl: [
        "Pierwsza wersja aplikacji mobilnej, serwera i bazy PostgreSQL.",
        "Logowanie, portfel i zasilanie wirtualnymi środkami w PLN.",
        "Bieżące kursy NBP, kupno i sprzedaż walut oraz historia transakcji.",
      ],
      en: [
        "Initial mobile app, server and PostgreSQL database.",
        "Sign-in, wallet and virtual deposits in PLN.",
        "Current NBP rates, currency purchases and sales, and transaction history.",
      ],
    },
  },
];
