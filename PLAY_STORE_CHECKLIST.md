# Publikacja BabyLog w Google Play — Lista kontrolna

## 1. GitHub Pages (polityka prywatności) — ZROBIĆ
1. Wejdź na https://github.com/MSzulcLewinska/BabyLog/settings/pages
2. Sekcja "Build and deployment" → Source wybierz **Deploy from a branch**
3. Branch: **main**, folder: **/docs**
4. Zapisz. Po ~2 minutach polityka będzie dostępna pod:
   **https://mszulclewinska.github.io/BabyLog/privacy.html**
   (sprawdź czy dokładnie ta nazwa użytkownika — jeśli inna, podmień w aplikacji)
5. Otwórz ten link na telefonie, aby potwierdzić, że strona się ładuje.

> Uwaga: adres `mszulclewinska.github.io` musi odpowiadać dokładnej (ma-łej literze) nazwie konta GitHub. Jeśli nazwa konta to np. `MSzulcLewinska`, URL może być `https://mszulclewinska.github.io/BabyLog/privacy.html` — GitHub ignoruje wielkość liter w nazwie użytkownika.

## 2. Supabase — ustaw bucket zdjęć na PRYWATNY
1. Otwórz Supabase Dashboard → projekt
2. **SQL Editor** → wklej TEN fragment i uruchom (przełącza bucket na prywatny + dodaje politykę odczytu):
```sql
update storage.buckets set public = false where id = 'photos';

drop policy if exists "photos_member_select" on storage.objects;
create policy "photos_member_select" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_member_child ()::text
  );
```
3. Alternatywnie: Storage → photos → ustawienia (⚙️) → odznacz "Public bucket".

## 3. Play Console — nowa aplikacja
1. Wejdź na https://play.google.com/console/ → Utwórz aplikację
2. Nazwa: **BabyLog**, język: polski, aplikacja darmowa
3. Wypełnij formularz kontaktu z testerami i wszystkie wymagane pola.

## 4. Data Safety (formularz bezpieczeństwa danych) — wypełnij tak:
- Zbierane dane: NIE przesyłamy żadnych typów danych z listy "osobiste i finansowe",
  ale ZAZNACZ poniższe w sekcji "Inne":
  - **Informacje o zdrowiu i kondycji** (temperatura, leki, sen, karmienie)
  - **Zdjęcia/wideo** (zdjęcie dziecka)
- Kategorie szczegółowe (w sekcji "Inne"):
  - Informacje o zdrowiu i kondycji — TAK
  - Zdjęcia — TAK
- Czy dane są zbierane/udostępniane: dane są **przechowywane** (nie udostępniane reklamodawcom)
- Szyfrowanie: dane są szyfrowane podczas przesyłania (HTTPS)
- Usuwanie danych:
  - Zaznacz "Użytkownicy mogą zażądać usunięcia danych" — TAK (jest opcja "Usuń konto i dane" w aplikacji)
  - "Użytkownicy mogą zażądać danych" — TAK (jest "Pobierz moje dane")
- "Dane osobowe i poufne" — przetwarzane jako "dane użytkownika" (nie sprzedawane)
- Dołączenie do "Program przeznaczony dla rodzin" — ROZWAŻ, jeśli aplikacja kierowana jest do rodzin (children data)

## 5. Polityka prywatności w Play Console
- W sekcji "Ustawienia aplikacji" → dane kontaktowe
- W polu "Polityka prywatności" wklej adres z punktu 1.

## 6. Budowanie AAB (do sklepu)
Build EAS w nowym profilu `production` (AAB zamiast APK):
```bash
eas build --platform android --profile production
```

## 7. Przesłanie do Play Console
1. Pobierz AAB z EAS i prześlij w Play Console (sekcja Wersje → Wersja produkcyjna)
2. Wypełnij "Zawartość aplikacji" (App content):
   - Privacy Policy → link
   - Data Safety → sekcja 4
   - Families → ocena/deklaracja

---

## Źródła do wypełnienia kontaktu/skarg
- Google Play Console: https://play.google.com/console/
- Identyfikator projektu EAS: fe168d73-bfda-44d0-a102-98422e2c4c65
- Pakiet (Package name): com.msulclewinska.babylog
