# Planetary System Simulation

Polish version: [README.pl.md](README.pl.md)

This web app simulates two planets that pull on each other with gravity. You enter
their masses, starting positions, and starting speeds. The app calculates and
draws each planet's path.

## Features

- Simulation form. Enter the mass, starting position, and starting velocity of two planets.
- Trajectory prediction. The app calculates each planet's path from your input.
- Interactive plot. View the paths with Plotly. You can also play them back as a live animation.
- Reference frame. Watch the pair from the barycentre, from the lab frame, or from planet 1.
- Energy drift readout. The panel shows how far total energy has moved from its starting
  value. Energy is conserved exactly here, so the number measures the solver's own error.
- Orbit report. The app says whether the pair is bound and rings every closest approach.

## Technology

- Python and Flask run the backend.
- NumPy handles the number arrays.
- SciPy solves the equations of motion.
- Plotly draws the interactive chart in the browser.
- Plain HTML, CSS, and JavaScript build the page.

## Requirements

- Python 3.12 or newer. NumPy 2.5 and SciPy 1.18 do not support anything older.

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
2. Click "Run". The app draws both paths and reports the kind of orbit it found.
3. Click "Play" to watch the planets move along their paths. Click it again to stop.
4. Switch between "Barycentre", "Lab", and "Planet 1" to change the reference frame.
   The lab frame lets the centre of mass drift across the plot, which flattens most
   orbits. The other two hold it still.

## Known limits

- Each simulation always runs for 10 time units. You cannot change this from the form.
- Request bodies are capped at 64 KB, but the app has no rate limit. Do not expose it
  to the public internet as is.

## Run the tests

```
pip install -r requirements-dev.txt
pytest -q
```

The suite checks that `/simulate` returns a trajectory for valid input, rejects bad
input with a 400, oversized bodies with a 413, and unsolvable ones with a 422. It also
holds the solver to an energy drift below 1e-7 over the run.

## Development tools

`pyproject.toml` configures a linter and a type checker. Both ship in
`requirements-dev.txt` next to pytest:

```
ruff check .
ruff format --check .
mypy .
```

## Contributing

Contributions are welcome. Open an issue or a pull request with your suggestion,
bug report, or feature request.
