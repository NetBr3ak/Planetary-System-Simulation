# Planetary System Simulation

Polish version: [README.pl.md](README.pl.md)

This web app simulates two planets that pull on each other with gravity. You enter
their masses, starting positions, and starting speeds. The app calculates and
draws each planet's path.

## Features

- Simulation form. Enter the mass, starting position, and starting velocity of two planets.
- Trajectory prediction. The app calculates each planet's path from your input.
- Interactive plot. View the paths with Plotly. You can also play them back as a live animation.

## Technology

- Python and Flask run the backend.
- NumPy handles the number arrays.
- SciPy solves the equations of motion.
- Plotly draws the interactive chart in the browser.
- Plain HTML, CSS, and JavaScript build the page.

## Requirements

- Python 3.9 or newer.

## Setup

1. Clone this repository.
2. Install the dependencies:

   ```
   pip install -r requirements.txt
   ```

3. Start the app:

   ```
   python app.py
   ```

4. Open `http://localhost:5000` in your browser.

## How to use it

1. Enter the mass, starting position, and starting velocity for each planet.
2. Click "Predict Trajectory". The app draws both paths.
3. Click "Show Live Simulation" to watch the planets move along their paths.

## Known limits

- Each simulation always runs for 10 time units. You cannot change this from the form.
- The app has no rate limit or input size cap. Do not expose it to the public internet as is.

## Run the tests

```
python test_app.py
```

This checks that `/simulate` returns a trajectory for valid input, and returns
a 400 error with a message for invalid input.

## Contributing

Contributions are welcome. Open an issue or a pull request with your suggestion,
bug report, or feature request.
