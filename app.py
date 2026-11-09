from __future__ import annotations

from math import isfinite, pi, sqrt
from typing import Any, cast

import numpy as np
from flask import Flask, Response, jsonify, render_template, request
from numpy.typing import NDArray
from scipy.integrate import solve_ivp

app = Flask(__name__)
# A valid body is about 200 bytes. Uncapped, Werkzeug hands the view a body of any
# size and np.array materialises it before the shape check can reject it: a 25 MB
# request peaked at 471 MB resident. Werkzeug now answers 413 before the view runs.
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024

REQUIRED_FIELDS = ("m1", "m2", "r1", "r2", "v1", "v2")
SIGNIFICANT_DIGITS = 7
T_END = 10.0
# Measured on an Apple M2: an orbit costs 4 ms of solving when circular and 42 ms at
# eccentricity 0.99999, so 100 orbits finish within 5 s. Past that the 1000 samples
# also drop below 10 points per orbit and the plot turns into chords.
MAX_ORBITS = 100

FloatArray = NDArray[np.float64]


# Define the equations of motion for a two-body system
def two_body_equations(t: float, y: FloatArray, m1: float, m2: float) -> FloatArray:
    r1, r2, v1, v2 = y.reshape((4, 2))
    r = np.linalg.norm(r2 - r1)
    dv1dt = m2 * (r2 - r1) / r**3
    dv2dt = m1 * (r1 - r2) / r**3
    return np.concatenate((v1, v2, dv1dt, dv2dt))


class ClosestApproach:
    """Radial velocity (r2-r1).(v2-v1) as a solve_ivp event. Only its negative to
    positive crossing is a closest approach, which is what direction = 1 selects; the
    other crossing is the far point. solve_ivp refines each root with Brentq, so the
    times come back exact instead of snapped to the nearest of the 1000 grid samples.

    A class and not a function because solve_ivp reads `direction` off the callable,
    and an attribute bolted onto a def has no type mypy --strict will accept.
    """

    direction = 1.0

    def __call__(self, t: float, y: FloatArray, m1: float, m2: float) -> float:
        r1, r2, v1, v2 = y.reshape((4, 2))
        return float((r2 - r1) @ (v2 - v1))


def orbital_energy(m1: float, m2: float, y0: FloatArray) -> tuple[float, float]:
    """Specific orbital energy v**2 / 2 - (m1 + m2) / r of the relative orbit, and the
    sum of both terms' sizes to judge it against. Lab-frame energy also carries the
    centre-of-mass kinetic term, which never vanishes, so a bound pair that drifts fast
    would read as an escape. Per unit of reduced mass, m1 * m2 never forms, so it cannot
    underflow to zero for tiny masses."""
    r1, r2, v1, v2 = y0.reshape((4, 2))
    relative_velocity = v2 - v1
    kinetic = 0.5 * float(relative_velocity @ relative_velocity)
    potential = (m1 + m2) / float(np.linalg.norm(r2 - r1))
    return kinetic - potential, kinetic + potential


def classify(energy: float, scale: float) -> str:
    """Bound, parabolic or escaping, from the orbital energy and its scale."""
    if abs(energy) <= 1e-9 * scale:
        return "parabolic"
    return "bound" if energy < 0 else "escape"


def orbit_count(mu: float, energy: float) -> float:
    """Orbits a bound pair completes in the window; 0 when it is not bound. Kepler's
    third law gives the period 2 * pi * mu / (-2 * energy) ** 1.5. The power is written
    with sqrt because float ** raises on overflow, while * returns inf."""
    if energy >= 0:
        return 0.0
    binding = -2 * energy
    return T_END * binding * sqrt(binding) / (2 * pi * mu)


def energy_drift(m1: float, m2: float, y: FloatArray) -> FloatArray:
    """|E(t) - E(0)| / |E(0)| along the solution. Total energy is conserved exactly in
    this system, so the curve reads the integrator's own error and nothing else."""
    r1x, r1y, r2x, r2y, v1x, v1y, v2x, v2y = y
    energy = (
        0.5 * m1 * (v1x**2 + v1y**2)
        + 0.5 * m2 * (v2x**2 + v2y**2)
        - m1 * m2 / np.hypot(r2x - r1x, r2y - r1y)
    )
    # Lab-frame energy can start at exactly zero; an infinity here would ship invalid JSON.
    reference = abs(float(energy[0])) or 1.0
    return cast("FloatArray", np.abs(energy - energy[0]) / reference)


def compact(values: FloatArray) -> list[Any]:
    """Round to SIGNIFICANT_DIGITS figures of the array's own peak. On the sample input
    that is a rounding error under a hundredth of a plotted pixel, and it cuts the
    response from 148,539 bytes to 42,774."""
    peak = float(np.abs(values).max())
    decimals = SIGNIFICANT_DIGITS
    if peak > 0:
        decimals -= int(np.ceil(np.log10(peak)))
    return cast("list[Any]", np.round(values, decimals).tolist())


def parse_simulation_request(
    data: object,
) -> tuple[float, float, FloatArray, FloatArray, FloatArray, FloatArray]:
    """Validate and convert the raw request body. Raises TypeError or ValueError on bad input."""
    if not isinstance(data, dict):
        raise TypeError("the body must be a JSON object")
    missing = [field for field in REQUIRED_FIELDS if field not in data]
    if missing:
        raise ValueError(f"missing field: {', '.join(missing)}")
    m1, m2 = float(data["m1"]), float(data["m2"])
    r1, r2, v1, v2 = (np.array(data[f], dtype=float) for f in ("r1", "r2", "v1", "v2"))
    if not (r1.shape == r2.shape == v1.shape == v2.shape == (2,)):
        raise ValueError("r1, r2, v1, v2 must each be [x, y] pairs")
    if not (isfinite(m1) and isfinite(m2)) or not all(
        np.isfinite(vec).all() for vec in (r1, r2, v1, v2)
    ):
        raise ValueError("every value must be a finite number")
    if m1 <= 0 or m2 <= 0:
        raise ValueError("both masses must be greater than zero")
    # Coincident bodies make the 1/r**3 term NaN, which stalls solve_ivp forever.
    if np.array_equal(r1, r2):
        raise ValueError("the two planets must start at different positions")
    return m1, m2, r1, r2, v1, v2


# Route for simulating the two-body system
@app.route("/simulate", methods=["POST"])
def simulate() -> Response | tuple[Response, int]:
    try:
        m1, m2, r1, r2, v1, v2 = parse_simulation_request(request.get_json(silent=True))
    except (TypeError, ValueError) as exc:
        return jsonify(error=str(exc) or "invalid request body"), 400
    y0 = np.concatenate((r1, r2, v1, v2))
    energy, scale = orbital_energy(m1, m2, y0)
    if not isfinite(scale):
        message = "the values are too large to compute with; use smaller numbers or start the planets further apart"
        return jsonify(error=message), 400
    if orbit_count(m1 + m2, energy) > MAX_ORBITS:
        message = (
            f"the planets would complete more than {MAX_ORBITS} orbits in {T_END:g} time "
            "units; lower a mass or start them further apart"
        )
        return jsonify(error=message), 422
    t_span = (0, T_END)
    # DOP853 holds total energy on the sample input to 1.1e-8 over the span, against
    # 4.1e-7 for the RK45 / rtol 1e-8 / atol 1e-10 pair it replaces: 37 times tighter,
    # and it still solves that input in well under a tenth of a second.
    sol = solve_ivp(
        two_body_equations,
        t_span,
        y0,
        args=(m1, m2),
        t_eval=np.linspace(*t_span, 1000),
        method="DOP853",
        rtol=1e-10,
        atol=1e-12,
        events=ClosestApproach(),
    )
    if sol.status != 0:
        # A step-size failure means a near collision the integrator cannot resolve on
        # an otherwise well-formed body, so it does not share 400 with the parse errors.
        message = "the planets pass too close together for the solver to follow; start them further apart"
        return jsonify(error=message), 422
    drift = energy_drift(m1, m2, sol.y)
    # Lab-frame energy can overflow where the relative orbit does not, and NaN is not JSON.
    if not (np.isfinite(sol.y).all() and np.isfinite(drift).all()):
        message = "the values are too large to compute with; use smaller numbers"
        return jsonify(error=message), 422
    return jsonify(
        positions=compact(sol.y[:4]),
        drift=compact(drift),
        events=[
            {"t": float(t), "r1": state[:2].tolist(), "r2": state[2:4].tolist()}
            for t, state in zip(sol.t_events[0], sol.y_events[0], strict=True)
        ],
        classification=classify(energy, scale),
    )


# Route for rendering the index.html template
@app.route("/")
def index() -> str:
    return render_template("index.html")


if __name__ == "__main__":
    # macOS gives port 5000 to the AirPlay Receiver, which answers 403 to the browser.
    app.run(port=8000, debug=False)
