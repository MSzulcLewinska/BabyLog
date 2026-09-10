# Materiały do karty Google Play — BabyLog

## Nazwa aplikacji
Długie: **BabyLog — dziennik niemowlaka**

## Krótki opis (max 80 znaków — użyj jednego wariantu)

- Wariant A: `Dziennik niemowlaka i małego dziecka: karmienia, drzemki, pieluchy i rozwój.`
- Wariant B: `Notuj karmienia, drzemki i pieluchy dziecka. Plan dnia i wykresy w jednym miejscu.`

## Pełny opis (Polish, do wklejenia)

BabyLog to prosty i przyjazny dziennik opieki nad niemowlakiem i małym dzieckiem. Notuj wszystko, co ważne, i miej spokojną głowę — dane zawsze pod ręką, także bez internetu.

**Co możesz notować:**
- Karmienia (piersiowe, butelką, starte potrawy) wraz z ilością i uwagami,
- Drzemki i sen w nocy,
- Pieluchy (mokre, brudne, z pieluszkowego obserwowanego),
- Kąpiele i inne codzienne aktywności,
- Plan dnia i przypomnienia (otrzymasz powiadomienie, gdy zbliża się pora aktywności),
- Przyrosty: waga i wzrost w czasie.

**Dlaczego rodzice to lubią:**
- Przejrzysty ekran główny z aktualnym wiekiem dziecka i dniami pełnymi danych,
- Oś czasu dnia — jednym spojrzeniem widzisz, co i kiedy się działo,
- Proste wykresy i podsumowania dzienne,
- Możliwość udostępnienia dziennika drugiej osobie (partner, babcia, opiekun) przez krótki kod — każdy piesze notuje na swoim telefonie, a dane się synchronizują,
- Dodawanie zdjęcia profilowego dziecka,
- Aplikacja działa też bez zakładania konta — dane trzymane są lokalnie na Twoim telefonie.

BabyLog szanuje prywatność: nie wyświetla reklam, nie sprzedaje danych i nie wymaga konta bankowego ani Facebooka.

## Kategoria
Sugerowana: **Rodzina i dzieci** (Rodzicielstwo) — uwaga: ta kategoria wymaga dodatkowych deklaracji (Todas / oznaczenie „adresowane do rodzin”), sprawdź w konsoli. Alternatywna (bez dodatkowych wymogów): **Medycyna i zdrowie** lub **Lifestyle**.

## Zrzuty ekranu do wykonania (min. 2, zalecane 6–7)
Zainstaluj nową wersję APK na telefonie, wejdź w aplikację i zrób zrzuty (przycisk zasilania + głośność w dół):

1. **Ekran główny** z profilem dziecka (avatar, wiek, dzisiejsze notatki) — pokazuje najważniejszy widok,
2. **Dodawanie aktywności/karmienia** — ekran z formularzem,
3. **Oś czasu dnia** — dzień z wpisami,
4. **Statystyki/wykresy** — podsumowania,
5. **Plan dnia / przypomnienia** — lista planów,
6. **Ustawienia → Udostępnij dziecko** — ekran z kodem udostępniania (bez podawania prawdziwego kodu zrzut lepiej zamazać, jeśli używasz tego samego telefonu),
7. Możesz dodać widok **członków**.

Wskazówki: szerokość co najmniej 1080 px, ekran w pionie, bez powiadomień systemowych na górze.

## Pliki graficzne (już wygenerowane w tym folderze)
- `icon-512.png` — ikona karty sklepu (512×512),
- `feature-graphic.png` — baner reklamowy 1024×500.

## Formularz Data safety (krótkie wskazówki)
- Zbierane dane: imię dziecka, data urodzenia, waga, wzrost, zdjęcie, wpisy dziennika (karmienia, sen, pieluchy, aktywności), opcjonalnie e-mail i imię opiekuna, token powiadomień push.
- Wymagana deklaracja: dane **przekazywane** do podmiotu trzeciego: tylko dostawca usługi hostingowej (Supabase) i usługa powiadomień push (Expo). Nie sprzedajemy danych.
- Szyfrowanie w transmisji: **do zaznaczenia** (HTTPS). Oznacz „dane nie są usuwane na żądanie” — ale w polityce i poradniku zaznacz, że użytkownik może usunąć wszystkie dane przez „Ustawienia → Usuń moje dane”.

## Polityka prywatności
Gotowy plik `privacy.html` w tym folderze — opublikuj go na GitHub Pages pod adresem, którego oczekuje aplikacja:
`https://mszulclewinska.github.io/BabyLog/privacy.html`

### Jak opublikować na GitHub Pages
1. Załóż/dowiedz się, czy masz konto GitHub `mszulclewinska`,
2. Utwórz repozytorium o nazwie `BabyLog` (publiczne),
3. Wgraj do niego plik `privacy.html` (zainstaluj GitHub Desktop albo wgraj przez stronę github.com):
   - Dodaj plik → Upload files → wybierz `privacy.html` → Commit,
4. Ustaw strony: Repozytorium → **Settings → Pages** → Source: `Deploy from a branch` → gałąź `main` folder `/root` → Save,
5. Po minucie pod adresem `https://mszulclewinska.github.io/BabyLog/privacy.html` pojawi się polityka.

> Ważne: zanim podasz ten link w konsoli Google Play, sprawdź w przeglądarce, że strona się otwiera. Kontakt e-mail w polityce (`kontakt@przykladowy.pl`) podmienisz na swój, jeśli używasz innego adresu niż w aplikacji.