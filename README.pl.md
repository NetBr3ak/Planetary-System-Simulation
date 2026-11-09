# Symulacja Układu Planetarnego

[![CI](https://github.com/NetBr3ak/Planetary-System-Simulation/actions/workflows/ci.yml/badge.svg)](https://github.com/NetBr3ak/Planetary-System-Simulation/actions/workflows/ci.yml)

Wersja angielska: [README.md](README.md)

Ta aplikacja webowa symuluje dwie planety, które przyciągają się grawitacyjnie.
Podajesz ich masy, początkowe położenia i początkowe prędkości. Aplikacja
oblicza i rysuje tor każdej planety.

![Aplikacja po obliczeniu: panel danych po lewej, tory obu planet wokół wspólnego
środka masy po prawej, a nad wykresem bieżący odczyt odległości, czasu, kroku
i dryfu energii.](docs/screenshot.png)

## Funkcje

- Formularz symulacji. Wpisujesz masę, położenie startowe i prędkość startową dwóch planet.
- Obliczanie toru lotu. Aplikacja wylicza tor każdej planety na podstawie danych wejściowych.
- Interaktywny wykres. Tor rysuje biblioteka Plotly. Można go też odtworzyć jako animację.
- Układ odniesienia. Parę można oglądać ze środka masy, z układu laboratoryjnego albo z planety 1.
- Odczyt dryfu energii. Panel pokazuje, o ile energia całkowita odeszła od wartości
  początkowej. Energia jest tu zachowana dokładnie, więc liczba mierzy błąd samego solvera.
- Opis orbity. Aplikacja podaje, czy para jest związana, i zaznacza każde największe zbliżenie.

## Fizyka

Aplikacja rozwiązuje prawo grawitacji Newtona dla dwóch ciał na płaszczyźnie.
Jednostki są bezwymiarowe, a stała grawitacji G wynosi 1, więc pasuje każdy układ
jednostek, w którym G = 1. Planeta 1 przyspiesza w stronę planety 2 z przyspieszeniem
m2 / r², a planeta 2 w stronę planety 1 z przyspieszeniem m1 / r².

Funkcja `solve_ivp` z SciPy całkuje równania metodą DOP853. To jawna metoda
Rungego-Kutty rzędu 8 ze zmiennym krokiem. Tolerancja względna wynosi 1e-10,
a bezwzględna 1e-12. Odpowiedź zawiera tor w 1000 równo rozłożonych chwilach.
Największe zbliżenia wyznacza szukanie miejsc zerowych prędkości radialnej, więc są
dokładne, a nie przyciągnięte do najbliższej próbki.

Opis orbity korzysta z energii orbitalnej ruchu względnego na jednostkę masy,
v² / 2 - (m1 + m2) / r. Poniżej zera para jest związana, powyżej zera się rozbiega.
W granicy 1e-9 od zera, względem wielkości obu składników, opis podaje tor paraboliczny.

DOP853 nie jest metodą symplektyczną: jej błąd energii rośnie trochę z każdą orbitą.
Testy mierzą ten błąd i porównują wynik z prawami, których solver nie zna:

| Sprawdzenie | Dane | Zmierzone | Test nie przechodzi powyżej |
|---|---|---|---|
| Dryf energii, `max(dE/E)` | dane przykładowe, 13,7 orbity | 1,1e-8 | 1e-7 |
| Dryf energii, `max(dE/E)` | 90 orbit, mimośród 0,5 | 1,9e-8 | 1e-7 |
| Pęd: środek masy porusza się po prostej | dane przykładowe | odchyłka 8,5e-14 | 1e-4 |
| III prawo Keplera: największe zbliżenia w t = 1, 3, 5, 7, 9 | orbita zbudowana z okresem 2 | odchyłka 5,0e-9 | 1e-6 |

Odczyt pokazuje dryf w każdym kroku, więc można go sprawdzić dla własnych danych.

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
2. Utwórz środowisko wirtualne i zainstaluj zależności:

   ```
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

   W Windows środowisko włącza polecenie `.venv\Scripts\activate`.

3. Uruchom aplikację:

   ```
   python app.py
   ```

4. Otwórz `http://127.0.0.1:8000` w przeglądarce. Aplikacja nie używa portu 5000,
   bo macOS przydziela go odbiornikowi AirPlay.

## Jak korzystać

1. Wpisz masę, położenie startowe i prędkość startową obu planet.
2. Kliknij "Run". Aplikacja narysuje oba tory i opisze znalezioną orbitę.
3. Kliknij "Play", aby zobaczyć ruch planet po torze. Kliknij ponownie, aby zatrzymać.
4. Przełączaj "Barycentre", "Lab" i "Planet 1", aby zmienić układ odniesienia. W układzie
   laboratoryjnym środek masy przesuwa się przez wykres i spłaszcza większość orbit.
   Dwa pozostałe trzymają go w miejscu.

## Znane ograniczenia

- Każda symulacja trwa zawsze 10 jednostek czasu. Nie da się tego zmienić w formularzu.
- Para związana może w tym czasie wykonać najwyżej 100 orbit. Ciaśniejsza orbita
  dostaje błąd 422, zanim solver ruszy. Na Apple M2 100 orbit liczy się 0,4 s, gdy są
  kołowe, i 4,2 s przy mimośrodzie 0,99999. Powyżej 100 orbit 1000 próbek daje też
  mniej niż 10 punktów na orbitę, a wykres zamienia się w proste cięciwy.
- Wartości za duże lub za małe dla 64-bitowych liczb zmiennoprzecinkowych dają
  komunikat o błędzie zamiast wyniku.
- Strona pobiera Plotly i dwa kroje pisma z publicznych CDN, więc potrzebuje
  połączenia z internetem.
- Rozmiar zapytania jest ograniczony do 64 KB, ale aplikacja nie ma limitu liczby zapytań.
  Nie udostępniaj jej publicznie w obecnej formie.
- Nie ma wersji demo online. Fizyka działa w Pythonie na serwerze, a statyczna strona
  potrzebowałaby jej drugiej kopii w JavaScripcie.

## Uruchamianie testów

```
pip install -r requirements-dev.txt
pytest -q
```

`test_app.py` sprawdza API. Poprawne dane zwracają tor lotu. Niepoprawne dostają
błąd 400, zbyt duże zapytanie błąd 413, a dane, których solver nie może dokończyć,
błąd 422. `test_physics.py` sprawdza fizykę z tabeli powyżej i ograniczenia opisane
w części Znane ograniczenia.

## Narzędzia deweloperskie

`pyproject.toml` konfiguruje linter i kontrolę typów. Oba są w `requirements-dev.txt`
obok pytest:

```
ruff check .
ruff format --check .
mypy .
```

Workflow CI uruchamia te sprawdzenia i testy na Pythonie 3.12 i 3.14.

## Licencja i źródła

Kod jest na licencji MIT; zobacz [LICENSE](LICENSE).

Strona pobiera poniższe zasoby z publicznych CDN. Żaden z nich nie jest zapisany
w tym repozytorium.

| Zasób | Źródło | Licencja |
|---|---|---|
| Plotly.js 3.3.0, pakiet basic | cdn.plot.ly | MIT |
| Krój Archivo | Google Fonts | SIL Open Font License 1.1 |
| Krój Fira Code | Google Fonts | SIL Open Font License 1.1 |

Zrzut ekranu w `docs/` pochodzi z tej aplikacji.

## Współpraca

Zgłoszenia i pull requesty są mile widziane. Otwórz issue lub pull request
z propozycją, zgłoszeniem błędu albo nową funkcją.
