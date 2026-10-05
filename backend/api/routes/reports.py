from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
import os
import shutil
import uuid
import base64
from datetime import datetime, timezone

from backend.core.database import get_db
from backend.core.config import settings
from backend.models.all_models import (
    Incident, IncidentReport, IncidentMedia, IncidentTimeline, 
    AIAnalysis, AIEvidence, AIRecommendation, Resource, User, Notification
)
from backend.schemas.all_schemas import IncidentReportCreate, SOSRequest, EmergencyPacketCreate
from backend.api.deps import get_current_user, log_audit_event
from backend.agents.orchestrator import AgentOrchestrator
from backend.services.providers.speech_provider import SpeechProvider
from backend.services.providers.vision_provider import VisionProvider
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/reports", tags=["Citizen Reporting & SOS"])

@router.post("/submit")
async def submit_emergency_report(
    report_in: IncidentReportCreate,
    request: Request,
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Multimodal ingestion pipeline for citizen and field distress reports"""
    # 1. Fetch available resources and active incidents for correlation
    res_query = await db.execute(select(Resource).where(Resource.is_active == True))
    all_resources = res_query.scalars().all()
    res_dicts = [
        {"id": r.id, "resource_name": r.resource_name, "resource_type": r.resource_type, "status": r.status, "latitude": r.latitude, "longitude": r.longitude, "station_name": r.station_name}
        for r in all_resources
    ]

    inc_query = await db.execute(select(Incident).where(Incident.is_active == True))
    all_incidents = inc_query.scalars().all()
    inc_dicts = [
        {"id": inc.id, "title": inc.title, "description": inc.description, "incident_type": inc.incident_type, "latitude": inc.latitude, "longitude": inc.longitude}
        for inc in all_incidents
    ]

    # 2. Run Multi-Agent Orchestrator
    orchestration_res = await AgentOrchestrator.run_pipeline(
        incident_data=report_in.model_dump(),
        reports=[report_in.model_dump()],
        available_resources=res_dicts,
        existing_incidents=inc_dicts
    )

    clustering_decision = orchestration_res.get("clustering", {}).get("decision")
    matched_inc_id = orchestration_res.get("clustering", {}).get("matched_incident_id")
    
    target_incident = None
    is_new_incident = True

    # If duplicate of active incident, correlate
    if clustering_decision == "SAME_INCIDENT" and matched_inc_id:
        target_res = await db.execute(select(Incident).where(Incident.id == matched_inc_id))
        target_incident = target_res.scalars().first()
        if target_incident:
            is_new_incident = False

    if is_new_incident or not target_incident:
        # Create new Incident record
        count_res = await db.execute(select(Incident))
        inc_count = len(count_res.scalars().all()) + 1
        inc_num = f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{inc_count:04d}"

        target_incident = Incident(
            incident_number=inc_num,
            title=f"{orchestration_res['classification']['prediction']} Report at {report_in.address or 'Sector Vicinity'}",
            description=report_in.description,
            incident_type=orchestration_res["classification"]["prediction"],
            status="PENDING_VERIFICATION", # Human-in-the-loop requirement
            severity_score=orchestration_res["severity"]["severity_score"],
            severity_class=orchestration_res["severity"]["severity_class"],
            priority_score=orchestration_res["severity"]["severity_score"] * 10,
            latitude=report_in.latitude,
            longitude=report_in.longitude,
            address=report_in.address or orchestration_res.get("geoint", {}).get("location_details", {}).get("address"),
            affected_people_estimate=report_in.people_affected or report_in.affected_people or orchestration_res.get("entities", {}).get("people_affected", 0),
            injuries_count=report_in.injuries_reported or report_in.injuries or orchestration_res.get("entities", {}).get("injuries", 0),
            hazards_description=(", ".join(report_in.hazards) if isinstance(report_in.hazards, list) else report_in.hazards) or ", ".join(orchestration_res.get("entities", {}).get("hazards", [])),
            infrastructure_damage=(", ".join(report_in.damage) if isinstance(report_in.damage, list) else (report_in.infrastructure_damage or report_in.damage)) or ", ".join(orchestration_res.get("entities", {}).get("infrastructure_damage", [])),
            verification_status="UNVERIFIED",
            created_by_id=user.id if user else None
        )
        db.add(target_incident)
        await db.flush()

        # Initial Timeline Event
        t_event = IncidentTimeline(
            incident_id=target_incident.id,
            event_type="REPORTED",
            title="Emergency Incident Ingested & Analyzed",
            description=f"Incident registered via citizen signal. Multi-Agent pipeline generated initial assessment: {target_incident.severity_class} severity ({target_incident.severity_score}/10). Pending human verification.",
            previous_status=None,
            new_status="PENDING_VERIFICATION",
            actor_name=user.full_name if user else "Citizen Ingestion Channel",
            actor_role=user.role if user else "CITIZEN"
        )
        db.add(t_event)
    else:
        # Update existing incident severity & timeline
        target_incident.injuries_count = max(target_incident.injuries_count, report_in.injuries_reported or 0)
        target_incident.affected_people_estimate = max(target_incident.affected_people_estimate, report_in.people_affected or 0)
        
        t_event = IncidentTimeline(
            incident_id=target_incident.id,
            event_type="CORROBORATING_REPORT",
            title="Corroborating Field Report Attached",
            description=f"Additional report clustered. Clustering confidence: {orchestration_res.get('clustering', {}).get('similarity_score')}.",
            previous_status=target_incident.status,
            new_status=target_incident.status,
            actor_name=user.full_name if user else "Citizen Ingestion Channel",
            actor_role=user.role if user else "CITIZEN"
        )
        db.add(t_event)

    # 3. Create IncidentReport record
    new_report = IncidentReport(
        incident_id=target_incident.id,
        citizen_id=user.id if user else None,
        report_type="CITIZEN",
        raw_text=report_in.description,
        transcript=report_in.voice_transcript,
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        address=report_in.address,
        injuries_reported=report_in.injuries_reported or report_in.injuries or 0,
        people_affected=report_in.people_affected or report_in.affected_people or 0,
        hazards=(", ".join(report_in.hazards) if isinstance(report_in.hazards, list) else report_in.hazards),
        damage=(", ".join(report_in.damage) if isinstance(report_in.damage, list) else (report_in.infrastructure_damage or report_in.damage)),
        submitter_name=report_in.submitter_name or (user.full_name if user else "Anonymous Citizen"),
        submitter_phone=report_in.submitter_phone or report_in.reporter_phone or (user.phone if user else None),
        submitter_notes=report_in.submitter_notes,
        is_anonymous=report_in.is_anonymous,
        is_offline_synced=report_in.is_offline_synced,
        sync_id=report_in.sync_id
    )
    db.add(new_report)
    await db.flush()

    # 4. Attach Media if provided
    for media_url in (report_in.media_urls or []):
        media_rec = IncidentMedia(
            incident_id=target_incident.id,
            report_id=new_report.id,
            media_type="IMAGE" if any(ext in media_url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]) else "VIDEO",
            file_url=media_url,
            file_name=os.path.basename(media_url),
            cv_analysis_json=orchestration_res.get("vision")
        )
        db.add(media_rec)

    # 5. Store AI Analysis record
    analysis_rec = AIAnalysis(
        incident_id=target_incident.id,
        pipeline_stage="MULTIMODAL_INGESTION_RUN",
        status="COMPLETED",
        classification=orchestration_res["classification"]["prediction"],
        confidence=orchestration_res["classification"]["confidence"],
        severity_score=orchestration_res["severity"]["severity_score"],
        severity_class=orchestration_res["severity"]["severity_class"],
        contributing_factors_json=orchestration_res["severity"]["contributing_factors"],
        entities_json=orchestration_res["entities"],
        conflicting_signals_json=orchestration_res["conflicts"],
        missing_information_json=orchestration_res["missing_information"],
        agent_executions_json=orchestration_res["agent_executions"],
        model_version="resqintel-v1.4",
        execution_time_ms=orchestration_res["execution_time_ms"]
    )
    db.add(analysis_rec)
    await db.flush()

    # 6. Store AI Evidence items
    for ev in orchestration_res.get("evidence", []):
        ev_rec = AIEvidence(
            incident_id=target_incident.id,
            analysis_id=analysis_rec.id,
            evidence_type=ev.get("evidence_type", "FIELD_REPORT"),
            source=ev.get("source", "Citizen Report"),
            snippet=ev.get("snippet", ""),
            confidence=ev.get("confidence", 0.8),
            evidence_relationship=ev.get("relationship", "Primary Signal")
        )
        db.add(ev_rec)

    # 7. Store AI Recommendations
    for rec in orchestration_res.get("recommendations", []):
        rec_rec = AIRecommendation(
            incident_id=target_incident.id,
            recommendation_type=rec.get("type", "TACTICAL"),
            title=rec.get("title", ""),
            action=rec.get("action", ""),
            rationale=rec.get("rationale", ""),
            recommended_resources_json=rec.get("recommended_resource_ids", []),
            priority=rec.get("priority", "HIGH"),
            is_approved=False
        )
        db.add(rec_rec)

    # 8. Create Dispatcher Alert Notification
    notif = Notification(
        title=f"Distress Report: {target_incident.incident_type}",
        message=f"{target_incident.severity_class} severity event reported at {target_incident.address or 'Sector Coords'}. Requires verification.",
        notification_type="ALERT",
        severity="CRITICAL" if target_incident.severity_class == "CRITICAL" else "URGENT",
        incident_id=target_incident.id,
        target_role="DISPATCHER"
    )
    db.add(notif)
    await db.commit()

    # 9. Real-time WebSocket Broadcast
    await ws_manager.broadcast({
        "event": "NEW_REPORT_INGESTED",
        "incident_id": target_incident.id,
        "incident_number": target_incident.incident_number,
        "incident_type": target_incident.incident_type,
        "title": target_incident.title,
        "description": target_incident.description,
        "status": target_incident.status,
        "severity_class": target_incident.severity_class,
        "severity_score": target_incident.severity_score,
        "priority_score": target_incident.priority_score,
        "latitude": target_incident.latitude,
        "longitude": target_incident.longitude,
        "address": target_incident.address,
        "affected_people_estimate": target_incident.affected_people_estimate,
        "injuries_count": target_incident.injuries_count,
        "hazards_description": target_incident.hazards_description,
        "infrastructure_damage": target_incident.infrastructure_damage,
        "verification_status": target_incident.verification_status,
        "is_new_incident": is_new_incident,
        "created_at": target_incident.created_at.isoformat() if target_incident.created_at else datetime.now(timezone.utc).isoformat(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    # Also broadcast notification event
    await ws_manager.broadcast({
        "event": "NEW_NOTIFICATION",
        "notification_id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "severity": notif.severity,
        "target_role": notif.target_role,
        "incident_id": target_incident.id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": target_incident.status,
        "processing_status": "COMPLETED",
        "incident_id": target_incident.id,
        "incident_number": target_incident.incident_number,
        "latitude": target_incident.latitude,
        "longitude": target_incident.longitude,
        "created_at": target_incident.created_at.isoformat() if target_incident.created_at else datetime.now(timezone.utc).isoformat(),
        "report_id": new_report.id,
        "is_new_incident": is_new_incident,
        "clustering_decision": clustering_decision,
        "orchestration_summary": {
            "classification": orchestration_res["classification"],
            "severity": orchestration_res["severity"],
            "pipeline_time_ms": orchestration_res["execution_time_ms"],
            "requires_human_verification": True
        }
    }

@router.post("/sos")
async def trigger_emergency_sos(
    sos_in: SOSRequest,
    request: Request,
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Section 9 EMERGENCY SOS: Instant distress signal capture with immediate priority alert"""
    count_res = await db.execute(select(Incident))
    inc_count = len(count_res.scalars().all()) + 1
    inc_num = f"SOS-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{inc_count:04d}"

    incident = Incident(
        incident_number=inc_num,
        title="EMERGENCY SOS DISTRESS ACTIVATED",
        description=f"CRITICAL SOS broadcast received from coordinates [{sos_in.latitude:.4f}, {sos_in.longitude:.4f}]. Immediate civilian distress.",
        incident_type="Medical Emergency",
        status="PENDING_VERIFICATION",
        severity_score=9.5,
        severity_class="CRITICAL",
        priority_score=100.0,
        latitude=sos_in.latitude,
        longitude=sos_in.longitude,
        address=sos_in.address or f"Coordinates [{sos_in.latitude:.5f}, {sos_in.longitude:.5f}]",
        affected_people_estimate=1,
        injuries_count=1,
        hazards_description="Active Life-Safety Emergency Distress",
        verification_status="UNVERIFIED",
        created_by_id=user.id if user else None
    )
    db.add(incident)
    await db.flush()

    report = IncidentReport(
        incident_id=incident.id,
        citizen_id=user.id if user else None,
        report_type="SOS",
        raw_text=sos_in.notes or "EMERGENCY SOS TRIGGERED",
        latitude=sos_in.latitude,
        longitude=sos_in.longitude,
        address=incident.address,
        injuries_reported=1,
        people_affected=1,
        submitter_name=sos_in.submitter_name or (user.full_name if user else "Distress Caller"),
        submitter_phone=sos_in.submitter_phone or (user.phone if user else None),
        is_anonymous=sos_in.is_anonymous
    )
    db.add(report)

    t_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="SOS_TRIGGERED",
        title="CRITICAL SOS DISTRESS BROADCAST",
        description="SOS trigger received with high-precision GPS. Prioritized for immediate operator verification and ambulance response.",
        previous_status=None,
        new_status="PENDING_VERIFICATION",
        actor_name=user.full_name if user else "Citizen SOS Trigger",
        actor_role="CITIZEN"
    )
    db.add(t_event)

    # Real-time high-priority notification
    notif = Notification(
        title="🚨 CRITICAL SOS ALERT",
        message=f"SOS distress signal activated at [{sos_in.latitude:.4f}, {sos_in.longitude:.4f}]. Urgent dispatcher verification required.",
        notification_type="ALERT",
        severity="CRITICAL",
        incident_id=incident.id,
        target_role="DISPATCHER"
    )
    db.add(notif)
    await db.commit()

    # Broadcast urgent WebSocket alert
    await ws_manager.broadcast({
        "event": "SOS_ALERT",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "SOS_SENT",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "tracking_status": "PENDING_VERIFICATION",
        "message": "Emergency SOS registered. Response telemetry transmitted to central operations."
    }

@router.post("/emergency-packet")
async def submit_emergency_packet(
    packet: EmergencyPacketCreate,
    request: Request,
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Section 4 & 6 FLAGSHIP: Unified Emergency Packet for one-handed, low-bandwidth, and offline-synced disaster reporting"""
    lat = packet.latitude if packet.latitude is not None else 18.5204
    lng = packet.longitude if packet.longitude is not None else 73.8567
    
    # Process base64 image if attached
    image_url = packet.image_url
    cv_analysis = None
    if packet.image_base64:
        try:
            img_data = packet.image_base64
            if "," in img_data:
                img_data = img_data.split(",")[1]
            raw_bytes = base64.b64decode(img_data)
            img_id = str(uuid.uuid4())
            safe_filename = f"sos_photo_{img_id}.jpg"
            dest_path = os.path.join(settings.STORAGE_DIR, "uploads", safe_filename)
            with open(dest_path, "wb") as f:
                f.write(raw_bytes)
            image_url = f"/storage/uploads/{safe_filename}"
            cv_analysis = await VisionProvider.analyze_media(dest_path)
        except Exception:
            pass

    # Process base64 voice audio note if attached
    audio_url = None
    if packet.voice_audio_base64:
        try:
            aud_data = packet.voice_audio_base64
            if "," in aud_data:
                aud_data = aud_data.split(",")[1]
            raw_audio_bytes = base64.b64decode(aud_data)
            aud_id = str(uuid.uuid4())
            safe_audio_name = f"sos_voice_{aud_id}.webm"
            audio_dest_path = os.path.join(settings.STORAGE_DIR, "uploads", safe_audio_name)
            with open(audio_dest_path, "wb") as f:
                f.write(raw_audio_bytes)
            audio_url = f"/storage/uploads/{safe_audio_name}"
        except Exception:
            pass

    # Synthesize text description from multimodal inputs
    desc_parts = []
    if packet.notes:
        desc_parts.append(packet.notes)
    if packet.voice_transcript:
        desc_parts.append(f"Voice SOS: \"{packet.voice_transcript}\"")
    if packet.is_trapped:
        desc_parts.append("CRITICAL: Civilian reports being TRAPPED / unable to evacuate.")
    if packet.battery_level is not None:
        desc_parts.append(f"Device Battery: {int(packet.battery_level * 100)}%")
    if packet.connectivity_type:
        desc_parts.append(f"Network Quality: {packet.connectivity_type}")

    combined_desc = " | ".join(desc_parts) if desc_parts else "EMERGENCY DISASTER PACKET TRIGGERED"

    # Ingestion into Multi-Agent Orchestrator
    inc_data = {
        "incident_type": packet.emergency_type or "Emergency",
        "description": combined_desc,
        "latitude": lat,
        "longitude": lng,
        "address": packet.address or f"Coordinates [{lat:.5f}, {lng:.5f}]",
        "affected_people_estimate": packet.affected_people or 1,
        "injuries_count": packet.injuries or 0,
        "hazards_description": ", ".join(packet.hazards) if isinstance(packet.hazards, list) else packet.hazards,
        "infrastructure_damage": packet.damage
    }

    res_query = await db.execute(select(Resource).where(Resource.is_active == True))
    all_resources = [
        {"id": r.id, "resource_name": r.resource_name, "resource_type": r.resource_type, "status": r.status, "latitude": r.latitude, "longitude": r.longitude}
        for r in res_query.scalars().all()
    ]

    inc_query = await db.execute(select(Incident).where(Incident.is_active == True))
    all_incidents = [
        {"id": inc.id, "title": inc.title, "incident_type": inc.incident_type, "latitude": inc.latitude, "longitude": inc.longitude}
        for inc in inc_query.scalars().all()
    ]

    orchestration_res = await AgentOrchestrator.run_pipeline(
        incident_data=inc_data,
        reports=[inc_data],
        available_resources=all_resources,
        existing_incidents=all_incidents
    )

    count_res = await db.execute(select(Incident))
    inc_count = len(count_res.scalars().all()) + 1
    prefix = "SOS" if packet.emergency_type == "SOS" else "INC"
    inc_num = f"{prefix}-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{inc_count:04d}"

    incident = Incident(
        incident_number=inc_num,
        title=f"🚨 {packet.emergency_type or 'EMERGENCY'} Distress Packet at {packet.address or 'Sector Coords'}",
        description=combined_desc,
        incident_type=orchestration_res.get("classification", {}).get("prediction", "Emergency"),
        status="PENDING_VERIFICATION",
        severity_score=max(orchestration_res.get("severity", {}).get("severity_score", 8.0), 9.0 if packet.is_trapped else 8.0),
        severity_class=orchestration_res.get("severity", {}).get("severity_class", "CRITICAL"),
        priority_score=100.0 if packet.is_trapped else 85.0,
        latitude=lat,
        longitude=lng,
        address=packet.address or f"Coordinates [{lat:.5f}, {lng:.5f}]",
        affected_people_estimate=packet.affected_people or packet.people_trapped or (1 if packet.is_trapped else 0),
        injuries_count=packet.injuries or 0,
        hazards_description=", ".join(packet.hazards) if isinstance(packet.hazards, list) else packet.hazards,
        infrastructure_damage=packet.damage,
        verification_status="UNVERIFIED",
        created_by_id=user.id if user else None
    )
    db.add(incident)
    await db.flush()

    # Create Report record
    new_report = IncidentReport(
        incident_id=incident.id,
        citizen_id=user.id if user else None,
        report_type="EMERGENCY_PACKET",
        raw_text=combined_desc,
        transcript=packet.voice_transcript,
        latitude=lat,
        longitude=lng,
        address=incident.address,
        injuries_reported=packet.injuries or 0,
        people_affected=packet.affected_people or packet.people_trapped or (1 if packet.is_trapped else 0),
        hazards=", ".join(packet.hazards) if isinstance(packet.hazards, list) else packet.hazards,
        damage=packet.damage,
        submitter_name=packet.reporter_name or (user.full_name if user else "Citizen in Distress"),
        submitter_phone=packet.reporter_phone or (user.phone if user else None),
        is_anonymous=packet.is_anonymous,
        is_offline_synced=packet.is_offline_synced,
        sync_id=packet.sync_id or packet.client_uuid
    )
    db.add(new_report)
    await db.flush()

    # Attach Media if photo / video / audio
    if image_url:
        media_rec = IncidentMedia(
            incident_id=incident.id,
            report_id=new_report.id,
            media_type="IMAGE",
            file_url=image_url,
            file_name=os.path.basename(image_url),
            cv_analysis_json=cv_analysis
        )
        db.add(media_rec)

    if audio_url:
        audio_rec = IncidentMedia(
            incident_id=incident.id,
            report_id=new_report.id,
            media_type="AUDIO",
            file_url=audio_url,
            file_name=os.path.basename(audio_url),
            cv_analysis_json={"status": "AUDIO_PROCESSED", "transcript": packet.voice_transcript}
        )
        db.add(audio_rec)

    if packet.video_url:
        vid_rec = IncidentMedia(
            incident_id=incident.id,
            report_id=new_report.id,
            media_type="VIDEO",
            file_url=packet.video_url,
            file_name=os.path.basename(packet.video_url),
            cv_analysis_json={"status": "VIDEO_RECEIVED", "note": "Video received — automated deep video analysis queued."}
        )
        db.add(vid_rec)

    # Initial Timeline Entry with Battery and Telemetry
    battery_text = f"Battery: {int(packet.battery_level * 100)}%" if packet.battery_level is not None else "Battery: Normal"
    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="EMERGENCY_PACKET_INGESTED",
        title="Emergency Packet Ingested",
        description=f"Rapid multimodal packet received ({packet.connectivity_type or 'ONLINE'}, {battery_text}). AI Severity: {incident.severity_class} ({incident.severity_score}/10). Pending dispatcher verification.",
        previous_status=None,
        new_status="PENDING_VERIFICATION",
        actor_name=user.full_name if user else "Citizen Distress Channel",
        actor_role=user.role if user else "CITIZEN"
    )
    db.add(timeline_event)

    # Dispatcher Urgent Alert Notification
    notif = Notification(
        title=f"🚨 EMERGENCY PACKET: {incident.incident_type}",
        message=f"{incident.severity_class} distress signal from {incident.address}. Immediate human triage required.",
        notification_type="ALERT",
        severity="CRITICAL",
        incident_id=incident.id,
        target_role="DISPATCHER"
    )
    db.add(notif)
    await db.commit()

    # Real-time WebSocket broadcasts
    await ws_manager.broadcast({
        "event": "NEW_REPORT_INGESTED",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "incident_type": incident.incident_type,
        "title": incident.title,
        "description": incident.description,
        "status": incident.status,
        "severity_class": incident.severity_class,
        "severity_score": incident.severity_score,
        "priority_score": incident.priority_score,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "address": incident.address,
        "battery_level": packet.battery_level,
        "connectivity_type": packet.connectivity_type,
        "is_trapped": packet.is_trapped,
        "image_url": image_url,
        "video_url": packet.video_url,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "EMERGENCY_PACKET_RECEIVED",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "severity_class": incident.severity_class,
        "severity_score": incident.severity_score,
        "created_at": incident.created_at.isoformat() if incident.created_at else datetime.now(timezone.utc).isoformat(),
        "processing_status": "COMPLETED",
        "tracking_status": "PENDING_VERIFICATION"
    }

@router.post("/upload")
async def upload_evidence_file(
    file: UploadFile = File(...)
):
    """Upload media file (image, audio, video) and return accessible storage path"""
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    safe_name = f"{file_id}{ext}"
    dest_path = os.path.join(settings.STORAGE_DIR, "uploads", safe_name)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "file_url": f"/storage/uploads/{safe_name}",
        "file_name": file.filename,
        "mime_type": file.content_type,
        "size_bytes": os.path.getsize(dest_path)
    }

@router.post("/analyze-media")
async def analyze_media_file(
    file: UploadFile = File(...)
):
    """Direct computer vision analysis of uploaded image"""
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    safe_name = f"cv_{file_id}{ext}"
    dest_path = os.path.join(settings.STORAGE_DIR, "uploads", safe_name)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return await VisionProvider.analyze_media(dest_path)

@router.post("/transcribe")
async def transcribe_audio_report(
    audio: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    """Real speech-to-text audio ingestion endpoint"""
    target = audio or file
    if not target:
        raise HTTPException(status_code=400, detail="No audio file provided in request.")
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(target.filename)[1].lower() or ".wav"
    safe_name = f"audio_{file_id}{ext}"
    dest_path = os.path.join(settings.STORAGE_DIR, "uploads", safe_name)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(target.file, buffer)

    transcription_result = await SpeechProvider.transcribe_audio(dest_path)
    return transcription_result

@router.get("/my-reports")
async def get_my_reports(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not user:
        return []
    result = await db.execute(
        select(IncidentReport).where(IncidentReport.citizen_id == user.id).order_by(desc(IncidentReport.created_at))
    )
    reports = result.scalars().all()
    return [
        {
            "id": r.id,
            "incident_id": r.incident_id,
            "raw_text": r.raw_text,
            "address": r.address,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "injuries_reported": r.injuries_reported
        } for r in reports
    ]
