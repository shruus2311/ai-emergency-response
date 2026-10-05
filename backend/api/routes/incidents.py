from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from backend.core.database import get_db
from backend.models.all_models import (
    Incident, IncidentReport, IncidentMedia, IncidentTimeline, 
    AIAnalysis, AIRecommendation, ResourceAssignment, User, Resource, Responder, Notification
)
from backend.schemas.all_schemas import (
    IncidentStatusUpdate, IncidentVerificationRequest, IncidentUpdate
)
from backend.api.deps import get_required_user, get_current_user, require_roles, log_audit_event
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/incidents", tags=["Incidents & Operational Lifecycle"])

# Valid state machine transitions
VALID_LIFECYCLE_TRANSITIONS = {
    "REPORTED": ["AI_ANALYZING", "PENDING_VERIFICATION", "VERIFIED", "CLOSED"],
    "AI_ANALYZING": ["PENDING_VERIFICATION", "VERIFIED", "CLOSED"],
    "PENDING_VERIFICATION": ["VERIFIED", "CLOSED", "REJECTED"],
    "VERIFIED": ["PRIORITIZED", "DISPATCHED", "RESPONDER_EN_ROUTE", "RESOLVED", "CLOSED"],
    "PRIORITIZED": ["DISPATCHED", "RESPONDER_EN_ROUTE", "RESOLVED", "CLOSED"],
    "DISPATCHED": ["RESPONDER_EN_ROUTE", "ON_SCENE", "RESOLVED", "CLOSED"],
    "RESPONDER_EN_ROUTE": ["ON_SCENE", "RESOLVED", "CLOSED"],
    "ON_SCENE": ["RESOLVED", "CLOSED"],
    "RESOLVED": ["CLOSED", "VERIFIED"],
    "CLOSED": ["VERIFIED"],
}

@router.get("/")
async def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    incident_type: Optional[str] = None,
    verification: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident).where(Incident.is_active == True).order_by(desc(Incident.created_at))
    
    if status:
        query = query.where(Incident.status == status)
    if severity:
        query = query.where(Incident.severity_class == severity)
    if incident_type:
        query = query.where(Incident.incident_type == incident_type)
    if verification:
        query = query.where(Incident.verification_status == verification)
        
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    incidents = result.scalars().all()
    
    output = []
    for inc in incidents:
        output.append({
            "id": inc.id,
            "incident_number": inc.incident_number,
            "title": inc.title,
            "description": inc.description,
            "incident_type": inc.incident_type,
            "status": inc.status,
            "severity_score": inc.severity_score,
            "severity_class": inc.severity_class,
            "priority_score": inc.priority_score,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "address": inc.address,
            "city": inc.city,
            "state": inc.state,
            "affected_people_estimate": inc.affected_people_estimate,
            "injuries_count": inc.injuries_count,
            "fatalities_count": inc.fatalities_count,
            "verification_status": inc.verification_status,
            "assigned_responder_id": inc.assigned_responder_id,
            "is_demo": inc.is_demo,
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
            "updated_at": inc.updated_at.isoformat() if inc.updated_at else None
        })
    return output

@router.get("/{incident_id}")
async def get_incident_detail(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident).where(Incident.id == incident_id).options(
        selectinload(Incident.reports),
        selectinload(Incident.media),
        selectinload(Incident.timeline),
        selectinload(Incident.analyses),
        selectinload(Incident.recommendations),
        selectinload(Incident.assignments)
    )
    result = await db.execute(query)
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    latest_analysis = incident.analyses[-1] if incident.analyses else None
    
    # Load assigned responder details if any
    assigned_responder = None
    if incident.assigned_responder_id:
        resp_res = await db.execute(select(Responder).where(Responder.id == incident.assigned_responder_id))
        r_obj = resp_res.scalars().first()
        if r_obj:
            assigned_responder = {
                "id": r_obj.id,
                "name": r_obj.responder_name,
                "badge": r_obj.badge_number,
                "specialization": r_obj.specialization,
                "status": r_obj.status,
                "latitude": r_obj.latitude,
                "longitude": r_obj.longitude,
                "phone": r_obj.phone
            }

    return {
        "id": incident.id,
        "incident_number": incident.incident_number,
        "title": incident.title,
        "description": incident.description,
        "incident_type": incident.incident_type,
        "status": incident.status,
        "severity_score": incident.severity_score,
        "severity_class": incident.severity_class,
        "priority_score": incident.priority_score,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "address": incident.address,
        "city": incident.city,
        "state": incident.state,
        "radius_meters": incident.radius_meters,
        "affected_people_estimate": incident.affected_people_estimate,
        "injuries_count": incident.injuries_count,
        "fatalities_count": incident.fatalities_count,
        "hazards_description": incident.hazards_description,
        "infrastructure_damage": incident.infrastructure_damage,
        "verification_status": incident.verification_status,
        "verified_at": incident.verified_at.isoformat() if incident.verified_at else None,
        "verification_notes": incident.verification_notes,
        "cluster_id": incident.cluster_id,
        "assigned_responder_id": incident.assigned_responder_id,
        "assigned_responder": assigned_responder,
        "is_demo": incident.is_demo,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "reports": [
            {
                "id": r.id,
                "report_type": r.report_type,
                "raw_text": r.raw_text,
                "transcript": r.transcript,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "address": r.address,
                "injuries_reported": r.injuries_reported,
                "people_affected": r.people_affected,
                "hazards": r.hazards,
                "damage": r.damage,
                "submitter_name": r.submitter_name if not r.is_anonymous else "Anonymous Citizen",
                "submitter_phone": r.submitter_phone if not r.is_anonymous else None,
                "is_offline_synced": r.is_offline_synced,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in incident.reports
        ],
        "media": [
            {
                "id": m.id,
                "media_type": m.media_type,
                "file_url": m.file_url,
                "file_name": m.file_name,
                "cv_analysis": m.cv_analysis_json,
                "created_at": m.created_at.isoformat() if m.created_at else None
            } for m in incident.media
        ],
        "timeline": [
            {
                "id": t.id,
                "event_type": t.event_type,
                "title": t.title,
                "description": t.description,
                "previous_status": t.previous_status,
                "new_status": t.new_status,
                "actor_name": t.actor_name,
                "actor_role": t.actor_role,
                "created_at": t.created_at.isoformat() if t.created_at else None
            } for t in incident.timeline
        ],
        "ai_analysis": {
            "classification": latest_analysis.classification if latest_analysis else incident.incident_type,
            "confidence": latest_analysis.confidence if latest_analysis else 0.85,
            "severity_score": latest_analysis.severity_score if latest_analysis else incident.severity_score,
            "severity_class": latest_analysis.severity_class if latest_analysis else incident.severity_class,
            "contributing_factors": latest_analysis.contributing_factors_json if latest_analysis else [],
            "conflicts": latest_analysis.conflicting_signals_json if latest_analysis else {},
            "missing_information": latest_analysis.missing_information_json if latest_analysis else {},
            "agent_executions": latest_analysis.agent_executions_json if latest_analysis else [],
            "model_version": latest_analysis.model_version if latest_analysis else "resqintel-v1.0"
        } if latest_analysis else None,
        "recommendations": [
            {
                "id": rec.id,
                "recommendation_type": rec.recommendation_type,
                "title": rec.title,
                "action": rec.action,
                "rationale": rec.rationale,
                "recommended_resource_ids": rec.recommended_resources_json,
                "priority": rec.priority,
                "is_approved": rec.is_approved,
                "created_at": rec.created_at.isoformat() if rec.created_at else None
            } for rec in incident.recommendations
        ],
        "assignments": [
            {
                "id": a.id,
                "resource_id": a.resource_id,
                "responder_id": a.responder_id,
                "status": a.status,
                "route_distance_km": a.route_distance_km,
                "route_eta_minutes": a.route_eta_minutes,
                "route_geometry": a.route_geometry_geojson,
                "notes": a.notes,
                "created_at": a.created_at.isoformat() if a.created_at else None
            } for a in incident.assignments
        ]
    }

@router.post("/{incident_id}/verify")
async def verify_incident(
    incident_id: str,
    verif: IncidentVerificationRequest,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER"])),
    db: AsyncSession = Depends(get_db)
):
    """HUMAN IN THE LOOP: Official verification or rejection of emergency incident"""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    prev_status = incident.status
    incident.verification_status = verif.verification_status.upper()
    incident.verified_by_id = user.id
    incident.verified_at = datetime.now(timezone.utc)
    incident.verification_notes = verif.verification_notes

    if verif.confirmed_type:
        incident.incident_type = verif.confirmed_type
    if verif.confirmed_severity:
        incident.severity_class = verif.confirmed_severity

    if verif.verification_status.upper() == "VERIFIED":
        incident.status = "VERIFIED"
    elif verif.verification_status.upper() == "REJECTED":
        incident.status = "CLOSED"

    # Add timeline event
    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="HUMAN_VERIFICATION",
        title=f"Incident {verif.verification_status.upper()} by Operator",
        description=f"Operator {user.full_name} ({user.role}) recorded verification: {verif.verification_notes or 'Standard human operator confirmation'}",
        previous_status=prev_status,
        new_status=incident.status,
        actor_id=user.id,
        actor_name=user.full_name,
        actor_role=user.role
    )
    db.add(timeline_event)

    # Create notification
    notif = Notification(
        title=f"Incident {incident.incident_number} {incident.verification_status}",
        message=f"{user.full_name} set verification status to {incident.verification_status}.",
        notification_type="STATUS_UPDATE",
        severity="URGENT" if incident.verification_status == "VERIFIED" else "INFO",
        incident_id=incident.id,
        target_role="ALL"
    )
    db.add(notif)
    await db.commit()

    # Log audit event
    await log_audit_event(
        db, action="HUMAN_INCIDENT_VERIFICATION", entity_type="INCIDENT", entity_id=incident.id,
        user=user, previous_state={"status": prev_status}, new_state={"status": incident.status, "verification": incident.verification_status},
        request=request
    )

    # Real-time WebSocket broadcast
    await ws_manager.broadcast({
        "event": "INCIDENT_VERIFIED",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "verification_status": incident.verification_status,
        "previous_status": prev_status,
        "new_status": incident.status,
        "verified_by": user.full_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "SUCCESS",
        "incident_id": incident.id,
        "verification_status": incident.verification_status,
        "new_status": incident.status
    }

@router.post("/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    status_in: IncidentStatusUpdate,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER", "RESPONDER"])),
    db: AsyncSession = Depends(get_db)
):
    """Enforces strict lifecycle state machine transitions with real database updates and resource cascades"""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    prev_status = incident.status
    new_st = status_in.status.upper()

    # Check state machine transition validity (allow idempotent transition or valid progression)
    allowed = VALID_LIFECYCLE_TRANSITIONS.get(prev_status, [])
    if new_st != prev_status and new_st not in allowed and user.role != "ADMIN":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lifecycle transition from {prev_status} to {new_st}. Allowed: {allowed}"
        )

    incident.status = new_st

    # Cascade resource releases on RESOLVED or CLOSED
    if new_st in ["RESOLVED", "CLOSED"]:
        # Release assigned resources
        r_assignments_res = await db.execute(select(ResourceAssignment).where(ResourceAssignment.incident_id == incident.id))
        assignments = r_assignments_res.scalars().all()
        for assign in assignments:
            if assign.status != "RELEASED":
                assign.status = "RELEASED"
                assign.completion_time = datetime.now(timezone.utc)
            if assign.resource_id:
                res_obj = (await db.execute(select(Resource).where(Resource.id == assign.resource_id))).scalars().first()
                if res_obj:
                    res_obj.status = "AVAILABLE"
                    res_obj.current_incident_id = None
            if assign.responder_id:
                resp_obj = (await db.execute(select(Responder).where(Responder.id == assign.responder_id))).scalars().first()
                if resp_obj:
                    resp_obj.status = "ON_DUTY"
                    resp_obj.current_incident_id = None

        if incident.assigned_responder_id:
            resp_obj = (await db.execute(select(Responder).where(Responder.id == incident.assigned_responder_id))).scalars().first()
            if resp_obj:
                resp_obj.status = "ON_DUTY"
                resp_obj.current_incident_id = None

    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="STATUS_CHANGE",
        title=f"Incident Status: {new_st}",
        description=status_in.notes or f"Operational status advanced to {new_st} by {user.full_name} ({user.role}).",
        previous_status=prev_status,
        new_status=new_st,
        actor_id=user.id,
        actor_name=user.full_name,
        actor_role=user.role
    )
    db.add(timeline_event)

    # Notification for relevant users
    notif = Notification(
        title=f"Incident {incident.incident_number} -> {new_st}",
        message=status_in.notes or f"Status updated to {new_st} by {user.full_name}.",
        notification_type="STATUS_UPDATE",
        severity="INFO" if new_st in ["RESOLVED", "CLOSED"] else "URGENT",
        incident_id=incident.id,
        target_role="ALL"
    )
    db.add(notif)
    await db.commit()

    await log_audit_event(
        db, action="INCIDENT_STATUS_CHANGE", entity_type="INCIDENT", entity_id=incident.id,
        user=user, previous_state={"status": prev_status}, new_state={"status": incident.status},
        request=request
    )

    # Broadcast real-time update to all dashboards
    await ws_manager.broadcast({
        "event": "INCIDENT_STATUS_UPDATED",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "previous_status": prev_status,
        "new_status": incident.status,
        "updated_by": user.full_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "SUCCESS",
        "incident_id": incident.id,
        "previous_status": prev_status,
        "current_status": incident.status
    }
