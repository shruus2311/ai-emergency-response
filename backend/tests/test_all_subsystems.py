import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.agents.nlp_agent import NLPAgent
from backend.agents.severity_agent import SeverityAgent
from backend.services.providers.routing_provider import haversine_distance_km

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/health/")
        assert res.status_code == 200
        data = res.json()
        assert data["system_status"] in ["ONLINE", "DEGRADED"]
        assert "database" in data["services"]

@pytest.mark.asyncio
async def test_nlp_classification():
    text = "Massive fire outbreak with chemical drums exploding and toxic smoke"
    res = await NLPAgent.process(text)
    assert res["classification"]["prediction"].upper() == "FIRE"
    assert res["classification"]["confidence"] >= 0.8
    assert "CHEMICAL_SPILL" in res["entities"]["hazards"] or "FIRE" in res["classification"]["prediction"].upper()

@pytest.mark.asyncio
async def test_severity_calculation():
    sev = await SeverityAgent.process(
        incident_type="Fire",
        injuries=8,
        fatalities=2,
        people_affected=45,
        has_infra_damage=True,
        weather_info={"high_wind": True, "heavy_rain": False},
        report_count=3,
        cv_info={"detected_fire": True, "smoke_density": "HIGH"}
    )
    assert sev["severity_score"] >= 7.0
    assert sev["severity_class"] in ["CRITICAL", "HIGH"]

def test_haversine_formula():
    pune_lat, pune_lng = 18.5204, 73.8567
    mumbai_lat, mumbai_lng = 19.0760, 72.8777
    dist = haversine_distance_km(pune_lat, pune_lng, mumbai_lat, mumbai_lng)
    assert 110.0 <= dist <= 140.0
