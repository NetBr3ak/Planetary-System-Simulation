"""Physics checks for /simulate: conservation laws, Kepler's third law, and the limits
that keep a request finite. Units are dimensionless with G = 1. Run with: pytest -q"""

from math import pi, sqrt
from typing import Any

import numpy as np

from app import app

SAMPLE: dict[str, Any] = {
    "m1": 10000,
    "m2": 1500,
    "r1": [0, 0],
    "r2": [4, 4],
    "v1": [5, 3],
    "v2": [45, -15],
}


def kepler_orbit(orbits: float, eccentricity: float) -> dict[str, object]:
    """Planet 2 starts at the far point of an orbit that repeats `orbits` times in the
    10 time units. The barycentre stays at rest."""
    m1, m2 = 10000.0, 1500.0
    mu = m1 + m2
    period = 10 / orbits
    semi_major_axis = (mu * (period / (2 * pi)) ** 2) ** (1 / 3)  # Kepler's third law
    distance = semi_major_axis * (1 + eccentricity)
    # Vis-viva at the far point.
    speed = sqrt(mu / semi_major_axis * (1 - eccentricity) / (1 + eccentricity))
    return {
        "m1": m1,
        "m2": m2,
        "r1": [0, 0],
        "r2": [distance, 0],
        "v1": [0, -speed * m2 / mu],
        "v2": [0, speed * m1 / mu],
    }


def simulate(body: object) -> tuple[int, dict[str, Any]]:
    resp = app.test_client().post("/simulate", json=body)
    return resp.status_code, resp.get_json()


def test_barycentre_moves_in_a_straight_line() -> None:
    """Total momentum is conserved, so the centre of mass keeps its starting velocity.
    The bound is twice the response's rounding step (4 decimals at a peak of 105)."""
    status, body = simulate(SAMPLE)
    assert status == 200
    m1, m2 = SAMPLE["m1"], SAMPLE["m2"]
    t = np.linspace(0, 10, 1000)
    r1x, r1y, r2x, r2y = (np.array(axis) for axis in body["positions"])
    for k, (axis1, axis2) in enumerate(((r1x, r2x), (r1y, r2y))):
        centre = (m1 * axis1 + m2 * axis2) / (m1 + m2)
        start = (m1 * SAMPLE["r1"][k] + m2 * SAMPLE["r2"][k]) / (m1 + m2)
        velocity = (m1 * SAMPLE["v1"][k] + m2 * SAMPLE["v2"][k]) / (m1 + m2)
        assert np.abs(centre - (start + velocity * t)).max() < 1e-4


def test_closest_approaches_repeat_at_the_kepler_period() -> None:
    """The orbit is built from Kepler's third law with a period of 2. The solver only
    knows Newton's law, so the near points must still land at t = 1, 3, 5, 7, 9."""
    status, body = simulate(kepler_orbit(orbits=5, eccentricity=0.5))
    assert status == 200
    times = [event["t"] for event in body["events"]]
    assert np.allclose(times, [1, 3, 5, 7, 9], rtol=0, atol=1e-6), times


def test_energy_drift_stays_small_over_ninety_orbits() -> None:
    """DOP853 is not symplectic, so its energy error grows with every orbit. This run
    measured 1.9e-8, under the same 1e-7 bound the sample input is held to."""
    status, body = simulate(kepler_orbit(orbits=90, eccentricity=0.5))
    assert status == 200
    assert max(body["drift"]) < 1e-7


def test_head_on_collision_returns_422() -> None:
    """An unbound pair aimed straight at each other reaches zero separation, which no
    step size resolves. This is the solver's own failure, not the orbit limit."""
    status, body = simulate({**SAMPLE, "v1": [0, 0], "v2": [-1000, -1000]})
    assert status == 422
    assert "too close" in body["error"]


def test_too_many_orbits_returns_422() -> None:
    """A tight orbit would keep the solver busy for minutes and leave the 1000 samples
    a few points per orbit, so it is refused before solving."""
    status, body = simulate(kepler_orbit(orbits=200, eccentricity=0))
    assert status == 422
    assert "orbits" in body["error"]


def test_tiny_masses_are_classified_as_escape() -> None:
    """At 1e-300 the product m1 * m2 underflows to zero. Gravity is negligible against
    a relative speed of 44, so the pair escapes."""
    status, body = simulate({**SAMPLE, "m1": 1e-300, "m2": 1e-300})
    assert status == 200
    assert body["classification"] == "escape"
