"""Smoke test for the /simulate endpoint. Run with: python test_app.py"""

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
    sol = resp.get_json()
    assert len(sol) == 8  # r1x, r1y, r2x, r2y, v1x, v1y, v2x, v2y
    assert len(sol[0]) == 1000  # t_eval points


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


def test_failed_integration_returns_400() -> None:
    """A near-singular start makes solve_ivp bail; that must not read as success."""
    client = app.test_client()
    resp = client.post("/simulate", json={**VALID_BODY, "r2": [1e-9, 0]})
    assert resp.status_code == 400
    assert "error" in resp.get_json()


if __name__ == "__main__":
    test_valid_request_returns_trajectory()
    test_missing_field_returns_400()
    test_malformed_vector_returns_400()
    test_non_numeric_mass_returns_400()
    test_non_finite_value_returns_400()
    test_non_positive_mass_returns_400()
    test_identical_positions_returns_400()
    test_failed_integration_returns_400()
    print("All smoke tests passed.")
