import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.database import AsyncSessionLocal
from backend.models.all_models import User, Incident, ExternalSignal, IncidentReport
from backend.core.security import create_access_token
from sqlalchemy import select
import uuid
import random

@pytest.mark.asyncio
async def test_emergency_packet_submission():
    """Test Citizen Emergency Mode One-Tap Emergency Packet submission with multimodal & telemetry payload."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        test_lat = round(18.5204 + random.uniform(0.01, 0.1), 4)
        test_lng = round(73.8567 + random.uniform(0.01, 0.1), 4)
        
        packet_payload = {
            "latitude": test_lat,
            "longitude": test_lng,
            "address": "Flood Zone Sector 4, Pune",
            "battery_level": 14.5,
            "network_status": "WEAK",
            "is_charging": False,
            "immediate_sos": True,
            "people_trapped": 3,
            "water_level": "CHEST",
            "situation_summary": "Water level rising rapidly inside room, elderly person trapped",
            "audio_transcript": "Help us, the river breached the bund and water is entering first floor",
            "device_mode": "BATTERY_CRITICAL_FLOOD_MODE"
        }

        resp = await ac.post("/api/reports/emergency-packet", json=packet_payload)
        assert resp.status_code == 200, f"Emergency packet submission failed: {resp.text}"
        data = resp.json()

        assert data["status"] in ["EMERGENCY_PACKET_RECEIVED", "INGESTED", "PROCESSED"]
        assert "incident_id" in data
        assert "incident_number" in data
        assert data["latitude"] == test_lat
        assert data["longitude"] == test_lng

        # Verify DB record
        async with AsyncSessionLocal() as session:
            inc_stmt = select(Incident).where(Incident.id == data["incident_id"])
            inc = (await session.execute(inc_stmt)).scalar_one_or_none()
            assert inc is not None, "Emergency packet did not persist incident in database"
            assert inc.latitude == test_lat
            assert inc.longitude == test_lng
            assert inc.affected_people_estimate >= 3
            assert inc.priority_score is not None

@pytest.mark.asyncio
async def test_situation_intelligence_feed_query():
    """Test Situation Intelligence endpoint querying USGS, GDACS and weather fusion."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/ai/situation-intelligence?lat=18.5204&lon=73.8567")
        assert resp.status_code == 200, f"Situation intelligence query failed: {resp.text}"
        data = resp.json()

        assert "threat_level" in data
        assert "signals" in data
        assert isinstance(data["signals"], list)
        assert "situation_summary" in data
        assert len(data["situation_summary"]) > 0

@pytest.mark.asyncio
async def test_external_signals_list():
    """Test retrieving stored external signals from official providers."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/ai/external-signals?limit=10")
        assert resp.status_code == 200, f"External signals query failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)

@pytest.mark.asyncio
async def test_proactive_incident_detector():
    """Test Proactive Potential Incident Detector executing autonomous situational scan with dispatcher auth."""
    # Ensure dispatcher user exists
    disp_user_id = None
    async with AsyncSessionLocal() as session:
        disp_stmt = select(User).where(User.role == "DISPATCHER")
        disp_user = (await session.execute(disp_stmt)).scalars().first()
        if not disp_user:
            disp_user = User(
                email=f"disp_sit_{uuid.uuid4().hex[:6]}@resqintel.gov",
                hashed_password="dummy",
                full_name="Situation Dispatcher",
                role="DISPATCHER"
            )
            session.add(disp_user)
            await session.commit()
            await session.refresh(disp_user)
        disp_user_id = disp_user.id

    disp_token = create_access_token(subject=disp_user_id, role="DISPATCHER")
    auth_headers = {"Authorization": f"Bearer {disp_token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/ai/proactive-detect?latitude=18.5204&longitude=73.8567", headers=auth_headers)
        assert resp.status_code == 200, f"Proactive detection failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "SUCCESS"
        assert "created_potential_incidents" in data
        assert "threat_level" in data
