# Planetary System Simulation

[![CI](https://github.com/NetBr3ak/Planetary-System-Simulation/actions/workflows/ci.yml/badge.svg)](https://github.com/NetBr3ak/Planetary-System-Simulation/actions/workflows/ci.yml)

Polish version: [README.pl.md](README.pl.md)

This web app simulates two planets that pull on each other with gravity. You enter
their masses, starting positions, and starting speeds. The app calculates and
draws each planet's path.

![The app after a run: the input panel on the left, the two paths around their
common centre of mass on the right, and the live readout of separation, time, step
and energy drift above the plot.](docs/screenshot.png)

## Features

- Simulation form. Enter the mass, starting position, and starting velocity of two planets.
- Trajectory prediction. The app calculates each planet's path from your input.
- Interactive plot. View the paths with Plotly. You can also play them back as a live animation.
- Reference frame. Watch the pair from the barycentre, from the lab frame, or from planet 1.
- Energy drift readout. The panel shows how far total energy has moved from its starting
  value. Energy is conserved exactly here, so the number measures the solver's own error.
- Orbit report. The app says whether the pair is bound and rings every closest approach.

## Physics

The app solves Newton's law of gravity for two bodies in a plane. Units are
dimensionless and the gravitational constant G is 1, so any unit system where G = 1
works. Planet 1 accelerates towards planet 2 at m2 / r², and planet 2 towards
planet 1 at m1 / r².

SciPy's `solve_ivp` integrates the equations with DOP853, an explicit Runge-Kutta
method of order 8 with adaptive step size. The relative tolerance is 1e-10 and the
absolute tolerance 1e-12. The response samples the path at 1000 evenly spaced times.
Closest approaches come from a root finder on the radial velocity. They can fall
between samples, and they are as accurate as the numerical solution.

The orbit report uses the specific orbital energy of the relative motion,
v² / 2 - (m1 + m2) / r. Below zero the pair is bound, above zero it escapes. Within
1e-9 of zero, relative to the size of the two terms, the report calls it parabolic.

DOP853 is not symplectic: its energy error grows a little with every orbit. The tests
measure that error and check the results against laws the solver does not know about:

| Check | Input | Measured | Test fails above |
|---|---|---|---|
| Energy drift, `max(dE/E)` | sample input, 13.7 orbits | 1.1e-8 | 1e-7 |
| Energy drift, `max(dE/E)` | 90 orbits, eccentricity 0.5 | 1.9e-8 | 1e-7 |
| Momentum: the centre of mass moves in a straight line | sample input | 8.5e-14 off | 1e-4 |
| Kepler's third law: closest approaches at t = 1, 3, 5, 7, 9 | orbit built with period 2 | 5.0e-9 off | 1e-6 |

The readout shows the drift at every step, so you can check it for your own input.

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
2. Create a virtual environment and install the dependencies:

   ```
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

   On Windows, activate it with `.venv\Scripts\activate`.

3. Start the app:

   ```
   python app.py
   ```

4. Open `http://127.0.0.1:8000` in your browser. The app does not use port 5000,
   because macOS gives that port to the AirPlay Receiver.

## How to use it

1. Enter the mass, starting position, and starting velocity for each planet.
2. Click "Run". The app draws both paths and reports the kind of orbit it found.
3. Click "Play" to watch the planets move along their paths. Click it again to stop.
4. Switch between "Barycentre", "Lab", and "Planet 1" to change the reference frame.
   The lab frame lets the centre of mass drift across the plot, which flattens most
   orbits. The other two hold it still.

## Known limits

- Each simulation always runs for 10 time units. You cannot change this from the form.
- A bound pair may complete at most 100 orbits in that time. A tighter orbit gets a
  422 error before the solver starts. On an Apple M2, 100 orbits take 0.4 s to solve
  when circular and 4.2 s at eccentricity 0.99999. Past 100 orbits, 1000 samples
  also give fewer than 10 points per orbit, and the plot turns into straight chords.
- Values too large or too small for 64-bit floats get an error message instead of a
  result.
- The page loads Plotly and two fonts from public CDNs, so it needs an internet
  connection.
- Request bodies are capped at 64 KB, but the app has no rate limit. Do not expose it
  to the public internet as is.
- There is no live demo. The physics runs in Python on the server, and a static page
  would need a second copy of it in JavaScript.

## Run the tests

```
pip install -r requirements-dev.txt
pytest -q
```

`test_app.py` checks the API. A valid input returns a trajectory. Bad input gets a
400, an oversized body a 413, and an input the solver cannot finish a 422.
`test_physics.py` checks the physics in the table above and the limits listed under
Known limits.

## Development tools

`pyproject.toml` configures a linter and a type checker. Both ship in
`requirements-dev.txt` next to pytest:

```
ruff check .
ruff format --check .
mypy .
```

The CI workflow runs these checks and the tests on Python 3.12 and 3.14.

## Licence and credits

The code is under the MIT licence; see [LICENSE](LICENSE).

The page loads these from public CDNs. None of them is stored in this repository.

| Asset | Source | Licence |
|---|---|---|
| Plotly.js 3.3.0, basic bundle | cdn.plot.ly | MIT |
| Archivo font | Google Fonts | SIL Open Font License 1.1 |
| Fira Code font | Google Fonts | SIL Open Font License 1.1 |

The screenshot in `docs/` is a capture of this app.

## Contributing

Contributions are welcome. Open an issue or a pull request with your suggestion,
bug report, or feature request.
