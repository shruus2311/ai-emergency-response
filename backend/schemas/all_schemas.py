from datetime import datetime
from typing import Optional, List, Any, Dict, Union
from pydantic import BaseModel, EmailStr, Field

# ----------------- AUTH SCHEMAS -----------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: Optional[str] = "CITIZEN"
    phone: Optional[str] = None
    organization: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str
    role: Optional[str] = "CITIZEN"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    organization: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- REPORT & SOS SCHEMAS -----------------
class IncidentReportCreate(BaseModel):
    incident_type: Optional[str] = "Emergency"
    description: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    injuries_reported: Optional[int] = 0
    people_affected: Optional[int] = 0
    affected_people: Optional[int] = 0
    injuries: Optional[int] = 0
    hazards: Optional[Union[str, List[str]]] = None
    damage: Optional[str] = None
    infrastructure_damage: Optional[str] = None
    submitter_name: Optional[str] = None
    submitter_phone: Optional[str] = None
    reporter_phone: Optional[str] = None
    submitter_notes: Optional[str] = None
    is_anonymous: Optional[bool] = False
    voice_transcript: Optional[str] = None
    media_urls: Optional[List[str]] = []
    is_offline_synced: Optional[bool] = False
    sync_id: Optional[str] = None

class SOSRequest(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    notes: Optional[str] = "EMERGENCY SOS TRIGGERED"
    submitter_name: Optional[str] = None
    submitter_phone: Optional[str] = None
    is_anonymous: Optional[bool] = False

# ----------------- INCIDENT SCHEMAS -----------------
class IncidentStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class IncidentVerificationRequest(BaseModel):
    verification_status: str # VERIFIED, REJECTED
    verification_notes: Optional[str] = None
    confirmed_type: Optional[str] = None
    confirmed_severity: Optional[str] = None

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    incident_type: Optional[str] = None
    status: Optional[str] = None
    severity_class: Optional[str] = None
    severity_score: Optional[float] = None
    affected_people_estimate: Optional[int] = None
    injuries_count: Optional[int] = None
    hazards_description: Optional[str] = None
    infrastructure_damage: Optional[str] = None

# ----------------- RESOURCE SCHEMAS -----------------
class ResourceCreate(BaseModel):
    resource_name: str
    resource_type: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    capacity: Optional[int] = 1
    contact_number: Optional[str] = None
    station_name: Optional[str] = None

class ResourceAssignmentCreate(BaseModel):
    incident_id: str
    resource_id: Optional[str] = None
    responder_id: Optional[str] = None
    notes: Optional[str] = None

class ResourceAssignmentStatusUpdate(BaseModel):
    status: str # APPROVED, DISPATCHED, ARRIVED, RELEASED, CANCELLED
    notes: Optional[str] = None

class ResponderCreate(BaseModel):
    user_id: str
    responder_name: str
    badge_number: str
    specialization: str
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ResponderStatusUpdate(BaseModel):
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# ----------------- AI COPILOT & SITREP SCHEMAS -----------------
class CopilotQueryRequest(BaseModel):
    query: str
    incident_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SitrepGenerateRequest(BaseModel):
    incident_id: str
    title: Optional[str] = None

# ----------------- OFFLINE SYNC SCHEMAS -----------------
class OfflineSyncItem(BaseModel):
    operation_id: str
    operation_type: str # CREATE_REPORT, SOS, UPDATE_STATUS, ADD_NOTE
    entity_type: str
    payload: Dict[str, Any]
    created_at: str

class OfflineSyncBatch(BaseModel):
    items: List[OfflineSyncItem]

# ----------------- GEOFENCE ALERT SCHEMAS -----------------
class GeofenceAlertCreate(BaseModel):
    title: str
    message: str
    hazard_type: str
    severity: str = "URGENT"
    latitude: float
    longitude: float
    radius_km: float = 5.0
    channel: str = "IN_APP"

# ----------------- EMERGENCY PACKET SCHEMAS -----------------
class EmergencyPacketCreate(BaseModel):
    client_uuid: Optional[str] = None
    incident_uuid: Optional[str] = None
    emergency_type: Optional[str] = "SOS"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    battery_level: Optional[float] = None
    connectivity_type: Optional[str] = "GOOD"
    voice_transcript: Optional[str] = None
    voice_audio_base64: Optional[str] = None
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    affected_people: Optional[int] = None
    people_trapped: Optional[int] = None
    injuries: Optional[int] = 0
    is_trapped: Optional[bool] = False
    water_level: Optional[str] = None
    situation_summary: Optional[str] = None
    audio_transcript: Optional[str] = None
    device_mode: Optional[str] = None
    hazards: Optional[Union[str, List[str]]] = None
    damage: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    is_anonymous: Optional[bool] = False
    notes: Optional[str] = None
    is_offline_synced: Optional[bool] = False
    sync_id: Optional[str] = None

# ----------------- EXTERNAL SIGNALS SCHEMAS -----------------
class ExternalSignalResponse(BaseModel):
    id: str
    source: str
    source_type: str
    title: str
    description: Optional[str] = None
    event_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: float = 10.0
    severity: str
    published_at: datetime
    retrieved_at: datetime
    reference_url: Optional[str] = None
    confidence: float
    source_reliability: str
    processing_status: str
    correlated_incident_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SituationIntelligenceQuery(BaseModel):
    latitude: float
    longitude: float
    radius_km: Optional[float] = 50.0
    include_weather: Optional[bool] = True
    include_usgs: Optional[bool] = True
    include_gdacs: Optional[bool] = True
    include_news: Optional[bool] = True

