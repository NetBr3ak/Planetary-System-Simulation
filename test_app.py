"""Smoke test for the /simulate endpoint. Run with: pytest -q"""

from math import hypot

from app import app

VALID_BODY = {
    "m1": 10000,
    "m2": 1500,
    "r1": [0, 0],
    "r2": [4, 4],
    "v1": [5, 3],
    "v2": [45, -15],
}


def test_valid_request_returns_trajectory() -> None:
    client = app.test_client()
    resp = client.post("/simulate", json=VALID_BODY)
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body["positions"]) == 4  # r1x, r1y, r2x, r2y
    assert len(body["positions"][0]) == 1000  # t_eval points
    assert len(body["drift"]) == 1000


def test_energy_drift_stays_below_one_in_ten_million() -> None:
    """The reason the solver is DOP853 at rtol 1e-10. RK45 defaults drift by 186%."""
    client = app.test_client()
    body = client.post("/simulate", json=VALID_BODY).get_json()
    assert max(body["drift"]) < 1e-7


def test_bound_orbit_reports_closest_approaches() -> None:
    client = app.test_client()
    body = client.post("/simulate", json=VALID_BODY).get_json()
    assert body["classification"] == "bound"
    r1x, r1y, r2x, r2y = body["positions"]
    grid_minimum = min(hypot(r2x[i] - r1x[i], r2y[i] - r1y[i]) for i in range(len(r1x)))
    assert body["events"]
    for event in body["events"]:
        separation = hypot(
            event["r2"][0] - event["r1"][0], event["r2"][1] - event["r1"][1]
        )
        # Brentq refines each root, so an event never sits above the sampled minimum.
        assert separation <= grid_minimum + 1e-6, event


def test_fast_pair_is_classified_as_escape() -> None:
    client = app.test_client()
    body = client.post("/simulate", json={**VALID_BODY, "v2": [400, -400]}).get_json()
    assert body["classification"] == "escape"


def test_missing_field_returns_400() -> None:
    client = app.test_client()
    body = {k: v for k, v in VALID_BODY.items() if k != "m2"}
    resp = client.post("/simulate", json=body)
    assert resp.status_code == 400
    assert "error" in resp.get_json()


def test_malformed_vector_returns_400() -> None:
    client = app.test_client()
    body = {**VALID_BODY, "r1": [0, 0, 0]}
    resp = client.post("/simulate", json=body)
    assert resp.status_code == 400


def test_non_numeric_mass_returns_400() -> None:
    client = app.test_client()
    body = {**VALID_BODY, "m1": "not-a-number"}
    resp = client.post("/simulate", json=body)
    assert resp.status_code == 400


def test_non_finite_value_returns_400() -> None:
    """A typo in a position field reaches the server as [null, null]."""
    client = app.test_client()
    resp = client.post("/simulate", json={**VALID_BODY, "r1": [None, None]})
    assert resp.status_code == 400


def test_non_positive_mass_returns_400() -> None:
    client = app.test_client()
    for mass in (0, -10000):
        resp = client.post("/simulate", json={**VALID_BODY, "m1": mass})
        assert resp.status_code == 400, mass


def test_identical_positions_returns_400() -> None:
    """Coincident bodies used to stall the solver forever instead of failing."""
    client = app.test_client()
    resp = client.post("/simulate", json={**VALID_BODY, "r2": [0, 0]})
    assert resp.status_code == 400


def test_failed_integration_returns_422() -> None:
    """A near-singular start makes solve_ivp bail. That is not a malformed request."""
    client = app.test_client()
    resp = client.post("/simulate", json={**VALID_BODY, "r2": [1e-9, 0]})
    assert resp.status_code == 422
    assert "error" in resp.get_json()


def test_oversize_body_returns_413() -> None:
    """Werkzeug must reject the body before the view allocates it: a 25 MB request
    used to peak at 471 MB resident before the shape check turned it down."""
    client = app.test_client()
    resp = client.post(
        "/simulate", data=b"0" * (65 * 1024), content_type="application/json"
    )
    assert resp.status_code == 413
