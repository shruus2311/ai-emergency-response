from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from datetime import datetime, timezone
from typing import List, Optional

from backend.core.database import get_db
from backend.models.all_models import (
    Responder, ResourceAssignment, Incident, IncidentTimeline, User, Resource, Notification
)
from backend.schemas.all_schemas import ResponderStatusUpdate, ResponderCreate
from backend.api.deps import get_required_user, require_roles
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/responders", tags=["Responder Field Coordination"])

@router.get("/")
async def list_responders(
    status: Optional[str] = None,
    specialization: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Responder)
    if status:
        query = query.where(Responder.status == status)
    if specialization:
        query = query.where(Responder.specialization == specialization)
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/my-assignment")
async def get_my_assignment(
    user: User = Depends(require_roles(["RESPONDER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve currently active incident dispatched to the logged-in responder"""
    resp_res = await db.execute(select(Responder).where(Responder.user_id == user.id))
    responder = resp_res.scalars().first()
    if not responder or not responder.current_incident_id:
        return {"assigned": False, "incident": None, "responder": responder}

    inc_res = await db.execute(select(Incident).where(Incident.id == responder.current_incident_id))
    incident = inc_res.scalars().first()
    if not incident:
        return {"assigned": False, "incident": None, "responder": responder}

    # Fetch assignment route details if any
    assign_res = await db.execute(
        select(ResourceAssignment).where(
            ResourceAssignment.incident_id == incident.id,
            ResourceAssignment.responder_id == responder.id
        ).order_by(desc(ResourceAssignment.created_at))
    )
    assignment = assign_res.scalars().first()

    return {
        "assigned": True,
        "responder": {
            "id": responder.id,
            "name": responder.responder_name,
            "badge_number": responder.badge_number,
            "specialization": responder.specialization,
            "status": responder.status,
            "latitude": responder.latitude,
            "longitude": responder.longitude
        },
        "incident": {
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
            "affected_people_estimate": incident.affected_people_estimate,
            "injuries_count": incident.injuries_count,
            "hazards_description": incident.hazards_description,
            "created_at": incident.created_at.isoformat() if incident.created_at else None
        },
        "route": {
            "distance_km": assignment.route_distance_km if assignment else None,
            "eta_minutes": assignment.route_eta_minutes if assignment else None,
            "geometry": assignment.route_geometry_geojson if assignment else None
        } if assignment else None
    }

@router.post("/heartbeat")
async def responder_heartbeat(
    status_in: ResponderStatusUpdate,
    user: User = Depends(require_roles(["RESPONDER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Updates responder live telemetry, GPS coordinates, and duty status"""
    resp_res = await db.execute(select(Responder).where(Responder.user_id == user.id))
    responder = resp_res.scalars().first()
    if not responder:
        responder = Responder(
            user_id=user.id,
            responder_name=user.full_name,
            badge_number=f"BDG-{user.id[:6].upper()}",
            specialization="Rapid Emergency Tactical Responder",
            status=status_in.status.upper()
        )
        db.add(responder)

    responder.status = status_in.status.upper()
    if status_in.latitude is not None:
        responder.latitude = status_in.latitude
    if status_in.longitude is not None:
        responder.longitude = status_in.longitude
    responder.last_heartbeat = datetime.now(timezone.utc)

    await db.commit()

    # Broadcast position update to dispatchers
    await ws_manager.broadcast({
        "event": "RESPONDER_LOCATION_UPDATE",
        "responder_id": responder.id,
        "responder_name": responder.responder_name,
        "latitude": responder.latitude,
        "longitude": responder.longitude,
        "status": responder.status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {"status": "SUCCESS", "current_duty_status": responder.status}

@router.post("/respond-assignment")
async def respond_to_assignment(
    action: str,  # ACCEPT, REJECT, EN_ROUTE, ON_SCENE, RESOLVE
    notes: Optional[str] = None,
    user: User = Depends(require_roles(["RESPONDER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Responder Operational Actions: ACCEPT, REJECT, EN_ROUTE, ON_SCENE, RESOLVE"""
    resp_res = await db.execute(select(Responder).where(Responder.user_id == user.id))
    responder = resp_res.scalars().first()
    if not responder or not responder.current_incident_id:
        raise HTTPException(status_code=400, detail="No active incident assigned to this responder")

    inc_res = await db.execute(select(Incident).where(Incident.id == responder.current_incident_id))
    incident = inc_res.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Assigned incident record not found")

    action_clean = action.upper()
    prev_status = incident.status

    if action_clean == "ACCEPT":
        responder.status = "EN_ROUTE"
        incident.status = "RESPONDER_EN_ROUTE"
        event_title = f"Responder {responder.responder_name} Accepted Assignment"
        event_desc = notes or "Tactical unit acknowledged emergency mission and initialized response."
        notif_msg = f"{responder.responder_name} accepted incident #{incident.incident_number}."

    elif action_clean in ["EN_ROUTE", "START_RESPONSE"]:
        responder.status = "EN_ROUTE"
        incident.status = "RESPONDER_EN_ROUTE"
        event_title = f"Responder {responder.responder_name} En Route"
        event_desc = notes or "Unit is actively traveling to the designated incident site."
        notif_msg = f"{responder.responder_name} is en route to #{incident.incident_number}."

    elif action_clean == "ON_SCENE":
        responder.status = "ON_SCENE"
        incident.status = "ON_SCENE"
        event_title = f"Responder {responder.responder_name} Arrived On Scene"
        event_desc = notes or "Tactical operative arrived on-site and initiated containment/triage operations."
        notif_msg = f"{responder.responder_name} arrived on scene at #{incident.incident_number}."

    elif action_clean == "RESOLVE":
        incident.status = "RESOLVED"
        responder.status = "ON_DUTY"
        responder.current_incident_id = None
        event_title = f"Incident Resolved by Responder {responder.responder_name}"
        event_desc = notes or "On-scene emergency stabilized and resolved. Field operative returning to duty standby."
        notif_msg = f"Incident #{incident.incident_number} has been resolved by {responder.responder_name}."

        # Release any assigned resource
        r_assignments_res = await db.execute(select(ResourceAssignment).where(ResourceAssignment.incident_id == incident.id))
        for a in r_assignments_res.scalars().all():
            a.status = "RELEASED"
            a.completion_time = datetime.now(timezone.utc)
            if a.resource_id:
                r_obj = (await db.execute(select(Resource).where(Resource.id == a.resource_id))).scalars().first()
                if r_obj:
                    r_obj.status = "AVAILABLE"
                    r_obj.current_incident_id = None

    elif action_clean == "REJECT":
        responder.status = "OFF_DUTY"
        responder.current_incident_id = None
        incident.assigned_responder_id = None
        incident.status = "VERIFIED"
        event_title = f"Responder {responder.responder_name} Declined / Unavailable"
        event_desc = notes or "Operative indicated unavailability. Incident returned to verified dispatch pool."
        notif_msg = f"Responder {responder.responder_name} declined assignment #{incident.incident_number}. Re-dispatch required."

    else:
        raise HTTPException(status_code=400, detail=f"Unrecognized action: {action}")

    # Add timeline event
    t_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="RESPONDER_ACTION",
        title=event_title,
        description=event_desc,
        previous_status=prev_status,
        new_status=incident.status,
        actor_id=user.id,
        actor_name=responder.responder_name,
        actor_role="RESPONDER"
    )
    db.add(t_event)

    # Add notification for Dispatcher
    notif = Notification(
        title=f"🚨 {event_title}",
        message=notif_msg,
        notification_type="STATUS_UPDATE",
        severity="INFO" if action_clean == "RESOLVE" else "URGENT",
        incident_id=incident.id,
        target_role="DISPATCHER"
    )
    db.add(notif)

    await db.commit()

    # Real-time WebSocket broadcast
    await ws_manager.broadcast({
        "event": "INCIDENT_STATUS_UPDATED",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "previous_status": prev_status,
        "new_status": incident.status,
        "responder_action": action_clean,
        "responder_name": responder.responder_name,
        "updated_by": user.full_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "SUCCESS",
        "action": action_clean,
        "incident_id": incident.id,
        "incident_status": incident.status,
        "responder_status": responder.status
    }
