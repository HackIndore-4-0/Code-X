import httpx
import pytest
from app.services.mitigation_service import (
    build_mitigation_payload,
    dispatch_viasocket_webhook,
)


def test_viasocket_payload_structure():
    graph_summary = {
        "nodes": [
            {"id": "USR-101", "type": "user"},
            {"id": "198.51.100.42", "type": "ip"},
            {"id": "finance_db", "type": "resource"},
        ],
        "node_count": 3,
    }

    payload = build_mitigation_payload(
        incident_id="INC-999",
        threat_weight=91.4,
        threshold=80.0,
        user_id="USR-101",
        flagged_ip="198.51.100.42",
        graph_summary=graph_summary,
        action="ISOLATE_ENTITY",
    )

    assert payload["incident_id"] == "INC-999"
    assert payload["threat_weight"] == 91.4
    assert payload["threshold"] == 80.0
    assert payload["user_id"] == "USR-101"
    assert payload["flagged_ip"] == "198.51.100.42"
    assert payload["action"] == "ISOLATE_ENTITY"
    assert payload["entity"] == {"type": "IP", "value": "198.51.100.42"}
    assert payload["graph"]["node_count"] == 3


def test_viasocket_mock_fallback(monkeypatch):
    monkeypatch.setenv("TRACEX_VIASOCKET_ENABLED", "true")
    monkeypatch.setenv("TRACEX_REMEDIATION_WEBHOOK_URL", "")

    payload = {
        "incident_id": "INC-001",
        "threat_weight": 90.0,
        "threshold": 80.0,
        "user_id": "USR-101",
        "flagged_ip": "10.0.0.15",
        "action": "ISOLATE_ENTITY",
        "entity": {"type": "IP", "value": "10.0.0.15"},
        "graph": {"nodes": [], "node_count": 0},
    }

    status, rem_status, resp, outcome = dispatch_viasocket_webhook(payload)
    assert status == "MOCK_SUCCESS"
    assert rem_status == "ISOLATED"
    assert outcome == "MOCK_REMEDIATION"
    assert resp["status"] == "ISOLATED"


def test_viasocket_webhook_success(monkeypatch):
    monkeypatch.setenv("TRACEX_VIASOCKET_ENABLED", "true")
    monkeypatch.setenv("TRACEX_REMEDIATION_WEBHOOK_URL", "https://viasocket.example.com/webhook/test")

    class MockResponse:
        status_code = 200
        def json(self):
            return {
                "success": True,
                "action": "ISOLATE_ENTITY",
                "entity_type": "IP",
                "entity_value": "10.0.0.15",
                "status": "ISOLATED",
            }

    class MockClient:
        def __init__(self, timeout=None):
            pass
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_val, exc_tb):
            pass
        def post(self, url, json):
            return MockResponse()

    monkeypatch.setattr(httpx, "Client", MockClient)

    payload = {"flagged_ip": "10.0.0.15", "action": "ISOLATE_ENTITY"}
    status, rem_status, resp, outcome = dispatch_viasocket_webhook(payload)

    assert status == "SUCCESS"
    assert rem_status == "ISOLATED"
    assert outcome == "VIA_SOCKET_SUCCESS"
    assert resp["success"] is True


def test_viasocket_webhook_http_error(monkeypatch):
    monkeypatch.setenv("TRACEX_VIASOCKET_ENABLED", "true")
    monkeypatch.setenv("TRACEX_REMEDIATION_WEBHOOK_URL", "https://viasocket.example.com/webhook/test")

    class MockResponse:
        status_code = 500
        text = "Internal Server Error"
        def json(self):
            raise ValueError("Not JSON")

    class MockClient:
        def __init__(self, timeout=None):
            pass
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_val, exc_tb):
            pass
        def post(self, url, json):
            return MockResponse()

    monkeypatch.setattr(httpx, "Client", MockClient)

    payload = {"flagged_ip": "10.0.0.15", "action": "ISOLATE_ENTITY"}
    status, rem_status, resp, outcome = dispatch_viasocket_webhook(payload)

    assert status == "HTTP_500"
    assert rem_status == "FAILED"
    assert outcome == "VIA_SOCKET_FAILED"


def test_viasocket_webhook_timeout(monkeypatch):
    monkeypatch.setenv("TRACEX_VIASOCKET_ENABLED", "true")
    monkeypatch.setenv("TRACEX_REMEDIATION_WEBHOOK_URL", "https://viasocket.example.com/webhook/test")

    class MockClient:
        def __init__(self, timeout=None):
            pass
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_val, exc_tb):
            pass
        def post(self, url, json):
            raise httpx.TimeoutException("Connection timed out")

    monkeypatch.setattr(httpx, "Client", MockClient)

    payload = {"flagged_ip": "10.0.0.15", "action": "ISOLATE_ENTITY"}
    status, rem_status, resp, outcome = dispatch_viasocket_webhook(payload)

    assert status == "CONNECTION_FAILED"
    assert rem_status == "FAILED"
    assert outcome == "VIA_SOCKET_FAILED"
    assert "timed out" in resp["error"]
