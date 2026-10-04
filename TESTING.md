# Testy projektu

## Uruchamianie

Z katalogu głównego projektu:

```bash
npm --prefix server test
npm --prefix mobile test
npm --prefix server run test:integration
```

Pierwsze dwie komendy nie wymagają uruchomionej bazy, serwera ani dostępu do NBP. Testy integracyjne wymagają działającego PostgreSQL, wykonanych migracji oraz poprawnego `server/.env`. Serwer testowy uruchamia się automatycznie na losowym lokalnym porcie; nie trzeba zatrzymywać serwera developerskiego na porcie 3000.

Jeżeli baza jest zatrzymana:

```bash
docker compose up -d db
npm --prefix server run migrate:up
```

Testy integracyjne tworzą własne konta o losowych adresach `@example.invalid`. Po zakończeniu usuwają wyłącznie dane tych kont. Nie resetują bazy i nie usuwają danych użytkowników aplikacji. Zewnętrzne odpowiedzi NBP są zastąpione syntetycznymi danymi, więc testy nie zależą od aktualnego notowania, dnia tygodnia ani dostępności internetu.

W zwykłym `server test` trzy grupy integracyjne są celowo pomijane. `test:integration` włącza je i uruchamia także testy jednostkowe.

## Zakres automatyczny

- Kalkulator: kurs ask/bid, ROUND_HALF_UP, duże kwoty bez utraty precyzji, granice wyniku, walidacja wejścia.
- NBP: bieżące i archiwalne URL, każde żądanie pobiera dane ponownie, `no-store`, brak notowania, niepełne lub błędne dane.
- Finanse: kupno/sprzedaż, wpłaty, walidacja, równoczesne ponowienia tego samego identyfikatora, konkurujące wymiany, wpłata równocześnie z wymianą.
- Atomowość: błąd po obciążeniu źródła i błąd zapisu historii po zmianie obu sald wycofują operację.
- Awarie: błąd sieci, symulowany timeout, niedostępność i nieprawidłowa odpowiedź NBP nie zmieniają sald. Zmieniony kurs wymaga ponownego potwierdzenia. Historia i ponowienie zachowują kurs wykonanej operacji.
- Konta: rejestracja, profil, izolacja danych, haszowanie hasła, zmiana hasła, unieważnianie sesji, wylogowanie ze wszystkich sesji.
- Historia: filtry, pełne stronicowanie bez duplikatów przy identycznym czasie operacji, szczegóły dostępne wyłącznie właścicielowi.
- Mobile: klient HTTP, komunikaty błędów, przerwanie po timeout, normalizacja kwot, zapis oczekującej operacji przed wysłaniem, bezpieczne ponowienie i zachowanie identyfikatora po utracie odpowiedzi.
- Mobile: błędy zapisu/usunięcia lokalnego, rozdzielenie oczekujących operacji między kontami, PL/EN, format dat i kwot oraz kontrast motywów.

Testy mobilne wykonują rzeczywisty kod serwisów z zastąpionymi modułami natywnymi Expo i siecią. Używają modułów VM w Node 24; ostrzeżenie `ExperimentalWarning` dotyczy tego mechanizmu testowego. Nie są testami natywnego renderowania ani automatycznym klikaniem na telefonie.

## Kontrola ręczna na Androidzie

Poniższe scenariusze należy sprawdzić na emulatorze i telefonie; nie są oznaczone jako wykonane przez testy automatyczne.

| Scenariusz | Oczekiwany wynik |
| --- | --- |
| Rejestracja, logowanie, restart aplikacji | Konto działa, zapisana sesja zostaje przywrócona. |
| Formularze z otwartą klawiaturą | Pola i przyciski są osiągalne, modale można zamknąć. |
| Kupno i sprzedaż z potwierdzeniem | Podgląd zgadza się z wynikiem; portfel odświeża oba salda. |
| Utrata połączenia podczas operacji, ponowienie | Czytelny komunikat; wynik zostaje sprawdzony bez drugiej wpłaty/wymiany. |
| Historia z ponad 20 operacjami | Kolejne strony działają; filtry ograniczają wyniki; szczegóły zgadzają się z historią. |
| Archiwum: dzień roboczy, weekend, błędna data | Kursy albo właściwy komunikat; po opuszczeniu zakładki wynik zostaje usunięty z pamięci ekranu. |
| Zmiana hasła i zakończenie sesji | Inne sesje tracą dostęp; wylogowanie wszystkich wraca do logowania. |
| PL/EN, ponowne uruchomienie | Ekrany, modale, przyciski i komunikaty zmieniają język; ustawienie pozostaje zapisane. |
| Jasny, ciemny i systemowy motyw | Tekst i formularze są czytelne, dolny pasek oraz modale mają poprawne kolory. |

Oddzielny pomiar obciążenia i wymagania czasu odpowiedzi nie są częścią tego zestawu. Testy równoczesnych operacji sprawdzają spójność, a nie maksymalną wydajność.
