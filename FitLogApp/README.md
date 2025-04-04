# FitLog - Aplikacja do monitorowania kalorii

FitLog to prosta aplikacja mobilna stworzona w React Native z wykorzystaniem Expo, która pomaga użytkownikom monitorować ich dzienne spożycie kalorii.

## Funkcje

- Śledzenie dziennego spożycia kalorii
- Wyświetlanie postępu w formie paska postępu
- Przechowywanie danych użytkownika (waga, wzrost, dzienne zapotrzebowanie kaloryczne)
- Lista dzisiejszych posiłków
- Intuicyjny interfejs użytkownika

## Wymagania

- Node.js (zalecana wersja 16 lub nowsza)
- npm lub yarn
- Expo Go (aplikacja na telefon)
- Expo CLI (opcjonalnie)

## Instalacja

1. Sklonuj repozytorium:
```bash
git clone [URL_REPOZYTORIUM]
cd FitLogApp
```

2. Zainstaluj zależności:
```bash
npm install
```

## Uruchomienie aplikacji

1. Uruchom serwer deweloperski:
```bash
npx expo start
```

2. Zeskanuj kod QR:
- Na iOS: użyj aparatu w telefonie
- Na Androidzie: użyj aplikacji Expo Go

3. Alternatywnie możesz:
- Naciśnij `a` aby otworzyć na emulatorze Androida
- Naciśnij `w` aby otworzyć w przeglądarce

## Technologie

- React Native
- Expo
- TypeScript
- React Native Paper (UI komponenty)
- AsyncStorage (przechowywanie danych lokalnie)

## Struktura projektu

```
FitLogApp/
├── assets/           # Obrazy i ikony
├── App.tsx           # Główny komponent aplikacji
├── app.json          # Konfiguracja Expo
├── package.json      # Zależności projektu
└── tsconfig.json     # Konfiguracja TypeScript
```

## Licencja

MIT 