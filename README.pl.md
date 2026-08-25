# Symulacja Układu Planetarnego

Wersja angielska: [README.md](README.md)

Ta aplikacja webowa symuluje dwie planety, które przyciągają się grawitacyjnie.
Podajesz ich masy, początkowe położenia i początkowe prędkości. Aplikacja
oblicza i rysuje tor każdej planety.

## Funkcje

- Formularz symulacji. Wpisujesz masę, położenie startowe i prędkość startową dwóch planet.
- Obliczanie toru lotu. Aplikacja wylicza tor każdej planety na podstawie danych wejściowych.
- Interaktywny wykres. Tor rysuje biblioteka Plotly. Można go też odtworzyć jako animację.
- Układ odniesienia. Parę można oglądać ze środka masy, z układu laboratoryjnego albo z planety 1.
- Odczyt dryfu energii. Panel pokazuje, o ile energia całkowita odeszła od wartości
  początkowej. Energia jest tu zachowana dokładnie, więc liczba mierzy błąd samego solvera.
- Opis orbity. Aplikacja podaje, czy para jest związana, i zaznacza każde największe zbliżenie.

## Technologia

- Backend działa w Pythonie z Flask.
- NumPy obsługuje tablice liczb.
- SciPy rozwiązuje równania ruchu.
- Plotly rysuje interaktywny wykres w przeglądarce.
- Strona to zwykły HTML, CSS i JavaScript.

## Wymagania

- Python 3.12 lub nowszy. NumPy 2.5 i SciPy 1.18 nie wspierają starszych wersji.

## Instalacja

1. Sklonuj to repozytorium.
2. Zainstaluj zależności:

   ```
   pip install -r requirements.txt
   ```

3. Uruchom aplikację:

   ```
   python app.py
   ```

4. Otwórz `http://localhost:5000` w przeglądarce.

## Jak korzystać

1. Wpisz masę, położenie startowe i prędkość startową obu planet.
2. Kliknij "Run". Aplikacja narysuje oba tory i opisze znalezioną orbitę.
3. Kliknij "Play", aby zobaczyć ruch planet po torze. Kliknij ponownie, aby zatrzymać.
4. Przełączaj "Barycentre", "Lab" i "Planet 1", aby zmienić układ odniesienia. W układzie
   laboratoryjnym środek masy przesuwa się przez wykres i spłaszcza większość orbit.
   Dwa pozostałe trzymają go w miejscu.

## Znane ograniczenia

- Każda symulacja trwa zawsze 10 jednostek czasu. Nie da się tego zmienić w formularzu.
- Rozmiar zapytania jest ograniczony do 64 KB, ale aplikacja nie ma limitu liczby zapytań.
  Nie udostępniaj jej publicznie w obecnej formie.

## Uruchamianie testów

```
pip install -r requirements-dev.txt
pytest -q
```

Testy sprawdzają, czy `/simulate` zwraca tor lotu dla poprawnych danych, odrzuca
niepoprawne błędem 400, zbyt duże zapytania błędem 413, a nierozwiązywalne błędem 422.
Pilnują też, by dryf energii przez cały bieg pozostał poniżej 1e-7.

## Narzędzia deweloperskie

`pyproject.toml` konfiguruje linter i kontrolę typów. Oba są w `requirements-dev.txt`
obok pytest:

```
ruff check .
ruff format --check .
mypy .
```

## Współpraca

Zgłoszenia i pull requesty są mile widziane. Otwórz issue lub pull request
z propozycją, zgłoszeniem błędu albo nową funkcją.
