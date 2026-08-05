from __future__ import annotations

from typing import Any

import numpy as np
from flask import Flask, Response, jsonify, render_template, request
from numpy.typing import NDArray
from scipy.integrate import solve_ivp

app = Flask(__name__)

REQUIRED_FIELDS = ("m1", "m2", "r1", "r2", "v1", "v2")

FloatArray = NDArray[np.float64]


# Define the equations of motion for a two-body system
def two_body_equations(t: float, y: FloatArray, m1: float, m2: float) -> FloatArray:
    r1, r2, v1, v2 = y.reshape((4, 2))
    r = np.linalg.norm(r2 - r1)
    dv1dt = m2 * (r2 - r1) / r**3
    dv2dt = m1 * (r1 - r2) / r**3
    return np.concatenate((v1, v2, dv1dt, dv2dt))


def parse_simulation_request(
    data: dict[str, Any] | None,
) -> tuple[float, float, FloatArray, FloatArray, FloatArray, FloatArray]:
    """Validate and convert the raw request body. Raises (KeyError, TypeError, ValueError) on bad input."""
    if data is None or any(field not in data for field in REQUIRED_FIELDS):
        raise KeyError("missing required field")
    m1, m2 = float(data["m1"]), float(data["m2"])
    r1, r2, v1, v2 = (np.array(data[f], dtype=float) for f in ("r1", "r2", "v1", "v2"))
    if not (r1.shape == r2.shape == v1.shape == v2.shape == (2,)):
        raise ValueError("r1, r2, v1, v2 must each be [x, y] pairs")
    return m1, m2, r1, r2, v1, v2


# Route for simulating the two-body system
@app.route("/simulate", methods=["POST"])
def simulate() -> Response | tuple[Response, int]:
    try:
        m1, m2, r1, r2, v1, v2 = parse_simulation_request(request.get_json(silent=True))
    except (KeyError, TypeError, ValueError) as exc:
        return jsonify(error=str(exc) or "invalid request body"), 400
    y0 = np.concatenate((r1, r2, v1, v2))
    t_span = (0, 10)
    t_eval = np.linspace(*t_span, 1000)
    sol = solve_ivp(two_body_equations, t_span, y0, args=(m1, m2), t_eval=t_eval)
    return jsonify(sol.y.tolist())


# Route for rendering the index.html template
@app.route("/")
def index() -> str:
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=False)
