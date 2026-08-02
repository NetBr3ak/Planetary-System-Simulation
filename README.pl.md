# Symulacja Układu Planetarnego

Wersja angielska: [README.md](README.md)

Ta aplikacja webowa symuluje dwie planety, które przyciągają się grawitacyjnie.
Podajesz ich masy, początkowe położenia i początkowe prędkości. Aplikacja
oblicza i rysuje tor każdej planety.

## Funkcje

- Formularz symulacji. Wpisujesz masę, położenie startowe i prędkość startową dwóch planet.
- Obliczanie toru lotu. Aplikacja wylicza tor każdej planety na podstawie danych wejściowych.
- Interaktywny wykres. Tor rysuje biblioteka Plotly. Można go też odtworzyć jako animację.

## Technologia

- Backend działa w Pythonie z Flask.
- NumPy obsługuje tablice liczb.
- SciPy rozwiązuje równania ruchu.
- Plotly rysuje interaktywny wykres w przeglądarce.
- Strona to zwykły HTML, CSS i JavaScript.

## Wymagania

- Python 3.9 lub nowszy.

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
2. Kliknij "Predict Trajectory". Aplikacja narysuje oba tory.
3. Kliknij "Show Live Simulation", aby zobaczyć ruch planet po torze.

## Znane ograniczenia

- Każda symulacja trwa zawsze 10 jednostek czasu. Nie da się tego zmienić w formularzu.
- Aplikacja nie ma limitu zapytań ani limitu rozmiaru danych wejściowych. Nie udostępniaj jej publicznie w obecnej formie.

## Uruchamianie testów

```
python test_app.py
```

Test sprawdza, czy `/simulate` zwraca tor lotu dla poprawnych danych i błąd 400
z opisem dla danych niepoprawnych.

## Współpraca

Zgłoszenia i pull requesty są mile widziane. Otwórz issue lub pull request
z propozycją, zgłoszeniem błędu albo nową funkcją.
