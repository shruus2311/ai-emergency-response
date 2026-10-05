import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.database import AsyncSessionLocal
from backend.models.all_models import User, Incident, Resource, Responder, IncidentTimeline, Notification, AIAnalysis
from sqlalchemy import select

import uuid
import random

@pytest.mark.asyncio
async def test_full_end_to_end_realtime_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        test_lat = round(18.5204 + random.uniform(0.05, 0.5), 4)
        test_lng = round(73.8567 + random.uniform(0.05, 0.5), 4)
        test_desc = f"Massive factory explosion and structural fire with trapped personnel [{uuid.uuid4().hex[:6]}]"

        # Step 1: Citizen submits a live emergency report with explicit GPS coordinates
        report_payload = {
            "incident_type": "FIRE",
            "description": test_desc,
            "latitude": test_lat,
            "longitude": test_lng,
            "address": "Shivajinagar Industrial Area, Pune",
            "affected_people": 12,
            "injuries": 5,
            "hazards": ["CHEMICAL_SPILL", "STRUCTURAL_COLLAPSE", "HIGH_VOLTAGE"],
            "infrastructure_damage": "HEAVY",
            "reporter_phone": "+91-9876543210",
            "is_anonymous": False
        }
        
        create_resp = await ac.post("/api/reports/submit", json=report_payload)
        assert create_resp.status_code == 200, f"Submit failed: {create_resp.text}"
        report_data = create_resp.json()
        
        assert "incident_id" in report_data
        incident_id = report_data["incident_id"]
        assert report_data["latitude"] == test_lat
        assert report_data["longitude"] == test_lng
        assert report_data["status"] in ["PENDING_VERIFICATION", "AI_ANALYZING", "REPORTED", "PRIORITIZED"]

        # Step 2: Verify incident record in database and AI Analysis Agent results
        async with AsyncSessionLocal() as session:
            inc_stmt = select(Incident).where(Incident.id == incident_id)
            inc = (await session.execute(inc_stmt)).scalar_one_or_none()
            assert inc is not None, "Incident was not created in DB"
            assert inc.latitude == test_lat
            assert inc.longitude == test_lng
            assert inc.affected_people_estimate == 12
            assert inc.injuries_count == 5
            
            # Check AI Analysis
            ai_stmt = select(AIAnalysis).where(AIAnalysis.incident_id == incident_id)
            ai = (await session.execute(ai_stmt)).scalars().first()
            assert ai is not None, "AI Analysis record not created"
            assert ai.severity_score is not None and ai.severity_score >= 0.0

            # Find or seed available resource and responder for dispatch
            res_stmt = select(Resource)
            resource = (await session.execute(res_stmt)).scalars().first()
            if resource:
                resource.status = "AVAILABLE"
                resource.current_incident_id = None
            else:
                resource = Resource(
                    resource_name=f"Rescue Alpha-{uuid.uuid4().hex[:4]}",
                    resource_type="AMBULANCE",
                    status="AVAILABLE",
                    latitude=18.5204,
                    longitude=73.8567,
                    address="Pune Central Hub",
                    capacity=4
                )
                session.add(resource)
                await session.flush()
            
            resp_stmt = select(Responder)
            responder = (await session.execute(resp_stmt)).scalars().first()
            if responder:
                responder.status = "ON_DUTY"
                responder.current_incident_id = None
            else:
                u = User(email=f"resp_{uuid.uuid4().hex[:6]}@resqintel.gov", password_hash="dummy", full_name="Officer E2E", role="RESPONDER")
                session.add(u)
                await session.flush()
                responder = Responder(
                    user_id=u.id,
                    responder_name=u.full_name,
                    badge_number=f"UNIT-{random.randint(100, 999)}",
                    specialization="PARAMEDIC",
                    status="ON_DUTY",
                    latitude=18.5200,
                    longitude=73.8560
                )
                session.add(responder)
                await session.flush()

            # Find or seed dispatcher user
            disp_stmt = select(User).where(User.role == "DISPATCHER")
            disp_user = (await session.execute(disp_stmt)).scalars().first()
            if not disp_user:
                disp_user = User(email=f"dispatcher_{uuid.uuid4().hex[:6]}@resqintel.gov", password_hash="dummy", full_name="Dispatch Commander", role="DISPATCHER")
                session.add(disp_user)
                await session.flush()

            await session.commit()
            res_id = resource.id
            resp_id = responder.id
            disp_user_id = disp_user.id

            resp_user_id = responder.user_id

        from backend.core.security import create_access_token
        disp_token = create_access_token(subject=disp_user_id, role="DISPATCHER")
        auth_headers = {"Authorization": f"Bearer {disp_token}"}

        resp_token = create_access_token(subject=resp_user_id, role="RESPONDER")
        resp_headers = {"Authorization": f"Bearer {resp_token}"}

        # Step 3: Dispatcher verifies the incident
        verify_resp = await ac.post(f"/api/incidents/{incident_id}/verify", json={
            "verification_status": "VERIFIED",
            "verification_notes": "Confirmed by Dispatch Commander via CCTV and Sensor feeds"
        }, headers=auth_headers)
        assert verify_resp.status_code == 200, f"Verification failed: {verify_resp.text}"
        assert verify_resp.json()["verification_status"] == "VERIFIED"
        assert verify_resp.json()["new_status"] == "VERIFIED"

        # Step 4: Dispatcher authorizes & dispatches Resource & Responder Unit
        assign_resp = await ac.post("/api/resources/assign", json={
            "incident_id": incident_id,
            "resource_id": res_id,
            "responder_id": resp_id,
            "assignment_type": "PRIMARY",
            "priority": "HIGH",
            "notes": "Urgent immediate deployment to factory perimeter"
        }, headers=auth_headers)
        assert assign_resp.status_code == 200, f"Assignment failed: {assign_resp.text}"
        assign_data = assign_resp.json()
        assert "assignment_id" in assign_data
        assert assign_data["incident_status"] in ["DISPATCHED", "RESPONDER_EN_ROUTE"]
        assert assign_data["eta_minutes"] is not None

        # Verify DB states after dispatch
        async with AsyncSessionLocal() as session:
            db_res = (await session.execute(select(Resource).where(Resource.id == res_id))).scalar_one()
            assert db_res.status in ["ASSIGNED", "DISPATCHED"]
            
            db_resp = (await session.execute(select(Responder).where(Responder.id == resp_id))).scalar_one()
            assert db_resp.current_incident_id == incident_id

        # Step 5: Responder Unit accepts assignment & goes EN_ROUTE
        accept_resp = await ac.post("/api/responders/respond-assignment?action=ACCEPT&notes=Unit%20responding%20lights%20and%20sirens", headers=resp_headers)
        assert accept_resp.status_code == 200
        assert accept_resp.json()["incident_status"] == "RESPONDER_EN_ROUTE"

        # Step 6: Responder Unit arrives ON_SCENE
        on_scene_resp = await ac.post("/api/responders/respond-assignment?action=ON_SCENE&notes=Unit%20arrived%20on%20scene", headers=resp_headers)
        assert on_scene_resp.status_code == 200
        assert on_scene_resp.json()["incident_status"] == "ON_SCENE"

        # Step 7: Responder Unit Resolves incident & stands down
        resolve_resp = await ac.post("/api/responders/respond-assignment?action=RESOLVE&notes=Fire%20extinguished%2C%20all%20casualties%20triaged.", headers=resp_headers)
        assert resolve_resp.status_code == 200
        assert resolve_resp.json()["incident_status"] == "RESOLVED"

        # Step 8: Verify full system state cascading in database
        async with AsyncSessionLocal() as session:
            final_inc = (await session.execute(select(Incident).where(Incident.id == incident_id))).scalar_one()
            assert final_inc.status == "RESOLVED"

            final_res = (await session.execute(select(Resource).where(Resource.id == res_id))).scalar_one()
            assert final_res.status == "AVAILABLE", f"Resource status not reset to AVAILABLE: {final_res.status}"

            final_resp = (await session.execute(select(Responder).where(Responder.id == resp_id))).scalar_one()
            assert final_resp.current_incident_id is None, f"Responder current_incident_id not cleared: {final_resp.current_incident_id}"

            # Verify timeline events exist
            timeline_events = (await session.execute(
                select(IncidentTimeline).where(IncidentTimeline.incident_id == incident_id)
            )).scalars().all()
            assert len(timeline_events) >= 4, f"Expected at least 4 timeline events, got {len(timeline_events)}"

            # Verify notifications generated
            notifs = (await session.execute(
                select(Notification).where(Notification.incident_id == incident_id)
            )).scalars().all()
            assert len(notifs) >= 1, "Expected notifications for incident"
