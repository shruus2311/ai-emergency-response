from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from backend.core.database import get_db
from backend.models.all_models import (
    Resource, ResourceAssignment, Incident, IncidentTimeline, Responder, User, Notification
)
from backend.schemas.all_schemas import (
    ResourceCreate, ResourceAssignmentCreate, ResourceAssignmentStatusUpdate
)
from backend.api.deps import get_required_user, require_roles, log_audit_event
from backend.services.providers.routing_provider import RoutingProvider
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/resources", tags=["Emergency Resources & Fleet Deployment"])

@router.get("/")
async def list_resources(
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Resource).where(Resource.is_active == True)
    if resource_type:
        query = query.where(Resource.resource_type == resource_type)
    if status:
        query = query.where(Resource.status == status)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", status_code=201)
async def create_resource(
    res_in: ResourceCreate,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER"])),
    db: AsyncSession = Depends(get_db)
):
    new_res = Resource(
        resource_name=res_in.resource_name,
        resource_type=res_in.resource_type.upper(),
        latitude=res_in.latitude,
        longitude=res_in.longitude,
        address=res_in.address,
        capacity=res_in.capacity,
        contact_number=res_in.contact_number,
        station_name=res_in.station_name or "Station Central",
        status="AVAILABLE"
    )
    db.add(new_res)
    await db.commit()
    await db.refresh(new_res)
    return new_res

@router.post("/assign")
async def assign_resource_to_incident(
    assign_in: ResourceAssignmentCreate,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER"])),
    db: AsyncSession = Depends(get_db)
):
    """HUMAN IN THE LOOP: Consequential Dispatcher approval to deploy emergency asset and/or tactical responder"""
    inc_res = await db.execute(select(Incident).where(Incident.id == assign_in.incident_id))
    incident = inc_res.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    resource = None
    if assign_in.resource_id:
        r_res = await db.execute(select(Resource).where(Resource.id == assign_in.resource_id))
        resource = r_res.scalars().first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

    responder = None
    if assign_in.responder_id:
        resp_res = await db.execute(select(Responder).where(Responder.id == assign_in.responder_id))
        responder = resp_res.scalars().first()
        if not responder:
            # Check if user_id was passed
            resp_res2 = await db.execute(select(Responder).where(Responder.user_id == assign_in.responder_id))
            responder = resp_res2.scalars().first()

    # Determine route origin (from resource or responder)
    origin_lat = resource.latitude if resource else (responder.latitude if responder and responder.latitude else incident.latitude - 0.01)
    origin_lng = resource.longitude if resource else (responder.longitude if responder and responder.longitude else incident.longitude - 0.01)

    route_data = await RoutingProvider.get_route(
        origin_lat, origin_lng,
        incident.latitude, incident.longitude
    )

    if resource:
        resource.status = "ASSIGNED"
        resource.current_incident_id = incident.id

    if responder:
        responder.status = "EN_ROUTE"
        responder.current_incident_id = incident.id
        incident.assigned_responder_id = responder.id

    assignment = ResourceAssignment(
        incident_id=incident.id,
        resource_id=resource.id if resource else None,
        responder_id=responder.id if responder else None,
        status="APPROVED",
        dispatch_time=datetime.now(timezone.utc),
        route_distance_km=route_data.get("distance_km"),
        route_eta_minutes=route_data.get("eta_minutes"),
        route_geometry_geojson=route_data.get("geometry"),
        assigned_by_id=user.id,
        notes=assign_in.notes
    )
    db.add(assignment)

    # Advance incident status
    if incident.status in ["REPORTED", "AI_ANALYZING", "PENDING_VERIFICATION", "VERIFIED", "PRIORITIZED"]:
        incident.status = "DISPATCHED"

    unit_name = resource.resource_name if resource else (responder.responder_name if responder else "Emergency Response Unit")
    
    # Add timeline event
    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="DISPATCH_APPROVED",
        title=f"Deployment Authorized: {unit_name}",
        description=f"Dispatcher {user.full_name} authorized deployment. Estimated Route: {route_data.get('distance_km')} km (~{route_data.get('eta_minutes')} min ETA).",
        previous_status="VERIFIED",
        new_status=incident.status,
        actor_id=user.id,
        actor_name=user.full_name,
        actor_role=user.role
    )
    db.add(timeline_event)

    # Notifications
    notif_resp = Notification(
        title=f"🚨 EMERGENCY ASSIGNMENT: {incident.incident_number}",
        message=f"You have been assigned to {incident.incident_type} at {incident.address or 'target location'}. Route ETA: ~{route_data.get('eta_minutes')} min.",
        notification_type="DISPATCH",
        severity="CRITICAL" if incident.severity_class == "CRITICAL" else "URGENT",
        incident_id=incident.id,
        target_role="RESPONDER"
    )
    db.add(notif_resp)

    notif_all = Notification(
        title=f"Unit Dispatched to #{incident.incident_number}",
        message=f"{unit_name} dispatched to {incident.address or 'incident site'}.",
        notification_type="STATUS_UPDATE",
        severity="INFO",
        incident_id=incident.id,
        target_role="ALL"
    )
    db.add(notif_all)

    await db.commit()
    await db.refresh(assignment)

    # Log audit event
    await log_audit_event(
        db, action="RESOURCE_DISPATCH_AUTHORIZED", entity_type="RESOURCE_ASSIGNMENT", entity_id=assignment.id,
        user=user, new_state={"resource_id": resource.id if resource else None, "responder_id": responder.id if responder else None, "incident_id": incident.id},
        request=request
    )

    # Real-time WebSocket broadcast to all roles
    await ws_manager.broadcast({
        "event": "RESOURCE_DISPATCHED",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "resource_id": resource.id if resource else None,
        "resource_name": unit_name,
        "responder_id": responder.id if responder else None,
        "responder_name": responder.responder_name if responder else None,
        "route_distance_km": route_data.get("distance_km"),
        "route_eta_minutes": route_data.get("eta_minutes"),
        "route_geometry": route_data.get("geometry"),
        "incident_status": incident.status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    # Targeted broadcast to responder
    await ws_manager.broadcast_to_role("RESPONDER", {
        "event": "NEW_ASSIGNMENT",
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "incident_type": incident.incident_type,
        "title": incident.title,
        "description": incident.description,
        "severity_class": incident.severity_class,
        "severity_score": incident.severity_score,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "address": incident.address,
        "affected_people_estimate": incident.affected_people_estimate,
        "injuries_count": incident.injuries_count,
        "hazards_description": incident.hazards_description,
        "route_distance_km": route_data.get("distance_km"),
        "route_eta_minutes": route_data.get("eta_minutes"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "DISPATCHED",
        "assignment_id": assignment.id,
        "incident_id": incident.id,
        "incident_status": incident.status,
        "resource_name": unit_name,
        "eta_minutes": route_data.get("eta_minutes"),
        "route": route_data
    }

@router.put("/assignments/{assignment_id}/status")
async def update_assignment_status(
    assignment_id: str,
    status_in: ResourceAssignmentStatusUpdate,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER", "RESPONDER"])),
    db: AsyncSession = Depends(get_db)
):
    """Tracks: APPROVED -> ACCEPTED -> DISPATCHED -> EN_ROUTE -> ARRIVED (ON_SCENE) -> RELEASED"""
    res = await db.execute(select(ResourceAssignment).where(ResourceAssignment.id == assignment_id))
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    new_status = status_in.status.upper()
    prev_status = assignment.status
    assignment.status = new_status
    if status_in.notes:
        assignment.notes = status_in.notes

    inc_res = await db.execute(select(Incident).where(Incident.id == assignment.incident_id))
    inc = inc_res.scalars().first()

    if new_status in ["ARRIVED", "ON_SCENE"]:
        assignment.arrival_time = datetime.now(timezone.utc)
        if inc and inc.status != "RESOLVED":
            inc.status = "ON_SCENE"
        if assignment.responder_id:
            resp_obj = (await db.execute(select(Responder).where(Responder.id == assignment.responder_id))).scalars().first()
            if resp_obj:
                resp_obj.status = "ON_SCENE"

    elif new_status in ["EN_ROUTE", "RESPONDER_EN_ROUTE"]:
        if inc and inc.status not in ["ON_SCENE", "RESOLVED"]:
            inc.status = "RESPONDER_EN_ROUTE"
        if assignment.responder_id:
            resp_obj = (await db.execute(select(Responder).where(Responder.id == assignment.responder_id))).scalars().first()
            if resp_obj:
                resp_obj.status = "EN_ROUTE"

    elif new_status in ["RELEASED", "RESOLVED"]:
        assignment.completion_time = datetime.now(timezone.utc)
        if assignment.resource_id:
            r_res = await db.execute(select(Resource).where(Resource.id == assignment.resource_id))
            resource = r_res.scalars().first()
            if resource:
                resource.status = "AVAILABLE"
                resource.current_incident_id = None
        if assignment.responder_id:
            resp_obj = (await db.execute(select(Responder).where(Responder.id == assignment.responder_id))).scalars().first()
            if resp_obj:
                resp_obj.status = "ON_DUTY"
                resp_obj.current_incident_id = None

    elif new_status in ["REJECTED", "CANCELLED"]:
        if assignment.resource_id:
            r_res = await db.execute(select(Resource).where(Resource.id == assignment.resource_id))
            resource = r_res.scalars().first()
            if resource:
                resource.status = "AVAILABLE"
                resource.current_incident_id = None
        if assignment.responder_id:
            resp_obj = (await db.execute(select(Responder).where(Responder.id == assignment.responder_id))).scalars().first()
            if resp_obj:
                resp_obj.status = "ON_DUTY"
                resp_obj.current_incident_id = None
        if inc and inc.assigned_responder_id == assignment.responder_id:
            inc.assigned_responder_id = None

    # Timeline event
    if inc:
        t_event = IncidentTimeline(
            incident_id=inc.id,
            event_type="ASSIGNMENT_STATUS",
            title=f"Deployment Status: {new_status}",
            description=status_in.notes or f"Assignment status advanced to {new_status} by {user.full_name}.",
            previous_status=prev_status,
            new_status=new_status,
            actor_id=user.id,
            actor_name=user.full_name,
            actor_role=user.role
        )
        db.add(t_event)

    await db.commit()

    # WebSocket broadcast
    await ws_manager.broadcast({
        "event": "ASSIGNMENT_STATUS_CHANGED",
        "assignment_id": assignment.id,
        "incident_id": assignment.incident_id,
        "previous_status": prev_status,
        "status": new_status,
        "incident_status": inc.status if inc else None,
        "updated_by": user.full_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {"status": "UPDATED", "assignment_status": new_status, "incident_status": inc.status if inc else None}
