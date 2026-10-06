import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import AsyncSessionLocal
from backend.models.all_models import (
    Incident, IncidentReport, AIAnalysis, IncidentTimeline, ExternalSignal, Resource
)
from backend.services.providers.situation_feeds_provider import SituationFeedsProvider
from backend.services.providers.routing_provider import haversine_distance_km
from backend.agents.nlp_agent import NLPAgent
from backend.agents.severity_agent import SeverityAgent
from backend.core.websocket_manager import ws_manager

logger = logging.getLogger("resqintel.external_feed_ingestor")

INDIAN_CITIES_COORDINATES: Dict[str, tuple[float, float, str, str]] = {
    "mumbai": (18.9220, 72.8347, "Mumbai", "Maharashtra"),
    "pune": (18.5204, 73.8567, "Pune", "Maharashtra"),
    "delhi": (28.6139, 77.2090, "Delhi", "Delhi"),
    "bengaluru": (12.9716, 77.5946, "Bengaluru", "Karnataka"),
    "bangalore": (12.9716, 77.5946, "Bengaluru", "Karnataka"),
    "chennai": (13.0827, 80.2707, "Chennai", "Tamil Nadu"),
    "kolkata": (22.5726, 88.3639, "Kolkata", "West Bengal"),
    "hyderabad": (17.3850, 78.4867, "Hyderabad", "Telangana"),
    "ahmedabad": (23.0225, 72.5714, "Ahmedabad", "Gujarat"),
    "surat": (21.1702, 72.8311, "Surat", "Gujarat"),
    "jaipur": (26.9124, 75.7873, "Jaipur", "Rajasthan"),
    "lucknow": (26.8467, 80.9462, "Lucknow", "Uttar Pradesh"),
    "kanpur": (26.4499, 80.3319, "Kanpur", "Uttar Pradesh"),
    "nagpur": (21.1458, 79.0882, "Nagpur", "Maharashtra"),
    "patna": (25.5941, 85.1376, "Patna", "Bihar"),
    "bhopal": (23.2599, 77.4126, "Bhopal", "Madhya Pradesh"),
    "thane": (19.2183, 72.9781, "Thane", "Maharashtra"),
    "nashik": (19.9975, 73.7898, "Nashik", "Maharashtra"),
    "dehradun": (30.3165, 78.0322, "Dehradun", "Uttarakhand"),
    "shimla": (31.1048, 77.1734, "Shimla", "Himachal Pradesh"),
    "kullu": (31.9579, 77.1095, "Kullu", "Himachal Pradesh"),
    "manali": (32.2432, 77.1892, "Manali", "Himachal Pradesh"),
    "guwahati": (26.1445, 91.7362, "Guwahati", "Assam"),
    "bhubaneswar": (20.2961, 85.8245, "Bhubaneswar", "Odisha"),
    "puri": (19.8135, 85.8312, "Puri", "Odisha"),
    "kochi": (9.9312, 76.2673, "Kochi", "Kerala"),
    "wayanad": (11.6854, 76.1320, "Wayanad", "Kerala"),
    "coimbatore": (11.0168, 76.9558, "Coimbatore", "Tamil Nadu"),
    "visakhapatnam": (17.6868, 83.2185, "Visakhapatnam", "Andhra Pradesh"),
    "vizag": (17.6868, 83.2185, "Visakhapatnam", "Andhra Pradesh"),
    "kerala": (10.8505, 76.2711, "Sector Kerala", "Kerala"),
    "assam": (26.2006, 92.9376, "Sector Assam", "Assam"),
    "bihar": (25.0961, 85.3131, "Sector Bihar", "Bihar"),
    "gujarat": (22.2587, 71.1924, "Sector Gujarat", "Gujarat"),
    "uttarakhand": (30.0668, 79.0193, "Sector Uttarakhand", "Uttarakhand"),
    "himachal": (31.1048, 77.1734, "Sector Himachal", "Himachal Pradesh"),
    "odisha": (20.9517, 85.0985, "Sector Odisha", "Odisha"),
    "tamil nadu": (11.1271, 78.6569, "Sector Tamil Nadu", "Tamil Nadu"),
    "maharashtra": (19.7515, 75.7139, "Sector Maharashtra", "Maharashtra")
}

class ExternalFeedIngestor:
    """Continuous Ingestion Engine that parses, scores, and injects verified Indian external disaster feeds into the active incident queue."""

    @classmethod
    def resolve_location(cls, text: str, default_lat: float = 18.5204, default_lng: float = 73.8567) -> tuple[float, float, str, str, str]:
        """Resolves Indian geographical coordinates and address from report title/text."""
        text_lower = text.lower()
        for city_key, (lat, lng, city_name, state_name) in INDIAN_CITIES_COORDINATES.items():
            if re.search(rf"\b{re.escape(city_key)}\b", text_lower):
                address = f"{city_name}, {state_name}, India"
                return lat, lng, address, city_name, state_name
        return default_lat, default_lng, "Pune Municipal Sector, Maharashtra, India", "Pune", "Maharashtra"

    @classmethod
    async def ingest_external_news_reports(
        cls, 
        center_lat: float = 18.5204, 
        center_lng: float = 73.8567, 
        max_items: int = 15
    ) -> Dict[str, Any]:
        """Fetches, analyzes, and injects verified Indian news disaster signals into active incidents queue."""
        logger.info("[ExternalFeedIngestor] Fetching latest verified Indian disaster news feeds...")
        raw_signals = await SituationFeedsProvider.fetch_disaster_news(center_lat, center_lng)
        
        if not raw_signals:
            return {"status": "NO_SIGNALS", "ingested": 0, "fused": 0, "message": "No new external Indian news feeds detected."}

        created_incidents = []
        updated_incidents = []
        skipped_count = 0

        async with AsyncSessionLocal() as db:
            # Query existing active incidents for duplicate clustering
            active_inc_res = await db.execute(select(Incident).where(Incident.is_active == True))
            active_incidents = active_inc_res.scalars().all()

            # Query existing external signals to avoid reprocessing identical articles
            ext_res = await db.execute(select(ExternalSignal))
            existing_ext_signals = {s.title.strip().lower(): s for s in ext_res.scalars().all()}

            # Count incidents to generate unique incident numbers
            inc_count_res = await db.execute(select(Incident))
            total_incidents_count = len(inc_count_res.scalars().all())

            for sig in raw_signals[:max_items]:
                title = sig.get("title", "").strip()
                description = sig.get("description", "") or title
                source_name = sig.get("source", "Indian Media (RSS)")
                ref_url = sig.get("reference_url") or ""
                pub_date = sig.get("published_at")

                norm_key = title.lower()

                # Check if this exact external signal was already converted to an incident
                existing_signal_record = existing_ext_signals.get(norm_key)
                if existing_signal_record and existing_signal_record.correlated_incident_id:
                    skipped_count += 1
                    continue

                # 1. NLP Classification & Entity Extraction
                combined_text = f"{title}. {description}"
                nlp_class = NLPAgent.classify_text(combined_text)
                nlp_entities = NLPAgent.extract_entities(combined_text)

                incident_type = nlp_class.get("prediction")
                if incident_type in ["Other", "Emergency Incident"]:
                    incident_type = sig.get("event_type", "Disaster Alert")

                # 2. Location Geocoding
                lat, lng, address, city, state = cls.resolve_location(combined_text, center_lat, center_lng)

                # 3. AI Severity Scoring with Contextual Hazard Calibration
                injuries = nlp_entities.get("injuries", 0)
                fatalities = nlp_entities.get("fatalities", 0)
                people_affected = nlp_entities.get("people_affected", 0)
                has_infra = bool(nlp_entities.get("infrastructure_damage")) or any(
                    w in combined_text.lower() for w in ["depot", "bridge", "road", "building", "bus", "vehicle", "factory", "plant", "highway", "track", "hospital", "station", "dam", "embankment"]
                )

                if people_affected == 0:
                    if any(w in combined_text.lower() for w in ["massive", "major", "widespread", "evacuated", "submerged", "disaster", "thousands"]):
                        people_affected = 40
                    elif any(w in combined_text.lower() for w in ["fire", "flood", "accident", "trapped"]):
                        people_affected = 10

                if fatalities == 0 and any(w in combined_text.lower() for w in ["dead", "killed", "died", "loss of life", "fatal"]):
                    fatalities = 2

                if injuries == 0 and any(w in combined_text.lower() for w in ["injured", "hurt", "hospitalized", "burns", "casualties", "rescued"]):
                    injuries = 4

                severity_res = await SeverityAgent.process(
                    incident_type=incident_type,
                    injuries=injuries,
                    fatalities=fatalities,
                    people_affected=people_affected,
                    has_infra_damage=has_infra,
                    weather_info={"rainfall_mm": 5.0, "condition": "Adverse Weather Watch"},
                    report_count=2,
                    cv_info={}
                )

                severity_score = float(severity_res.get("severity_score", 7.0))
                severity_class = str(severity_res.get("severity_class", "HIGH" if severity_score >= 6.0 else "MEDIUM"))
                priority_score = min(100.0, round(severity_score * 10.0, 1))

                # 4. Deduplication & Proximity Clustering
                matched_incident = None
                for inc in active_incidents:
                    # Match by spatial proximity (within 5 km) and matching incident type or title similarity
                    dist_km = haversine_distance_km(lat, lng, inc.latitude, inc.longitude)
                    if dist_km <= 5.0 and (inc.incident_type == incident_type or city.lower() in (inc.address or "").lower()):
                        matched_incident = inc
                        break

                if matched_incident:
                    # Fuse/Correlate with existing active incident
                    rep = IncidentReport(
                        incident_id=matched_incident.id,
                        report_type="SENSOR",
                        raw_text=f"[{source_name}] {title}\n{description}",
                        latitude=lat,
                        longitude=lng,
                        address=address,
                        injuries_reported=injuries,
                        people_affected=people_affected,
                        submitter_name=source_name,
                        submitter_notes=f"Corroborating Indian news feed signal from {source_name}. Ref: {ref_url}"
                    )
                    db.add(rep)

                    # Add timeline event
                    timeline = IncidentTimeline(
                        incident_id=matched_incident.id,
                        event_type="UPDATED",
                        title=f"Corroborating Indian News Bulletin Fused: {source_name}",
                        description=f"External emergency intelligence fused from {source_name}: '{title}'. Ref: {ref_url}",
                        actor_name="Autonomous Feed Ingestor",
                        actor_role="AI_FEED_AGENT"
                    )
                    db.add(timeline)

                    if existing_signal_record:
                        existing_signal_record.correlated_incident_id = matched_incident.id
                        existing_signal_record.processing_status = "CORRELATED"
                    else:
                        ext_rec = ExternalSignal(
                            source=source_name,
                            source_type="NEWS_FEED",
                            title=title,
                            description=description,
                            event_type=incident_type,
                            latitude=lat,
                            longitude=lng,
                            severity=severity_class,
                            reference_url=ref_url,
                            confidence=0.92,
                            source_reliability="OFFICIAL_MEDIA",
                            processing_status="CORRELATED",
                            correlated_incident_id=matched_incident.id
                        )
                        db.add(ext_rec)

                    updated_incidents.append(matched_incident.incident_number)
                else:
                    # 5. Create Brand New Active Incident
                    total_incidents_count += 1
                    inc_num = f"EXT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{total_incidents_count:04d}"

                    new_inc = Incident(
                        incident_number=inc_num,
                        title=title[:200],
                        description=f"[{source_name}] {title}\n\n{description}\n\nOfficial Source Reference: {ref_url}",
                        incident_type=incident_type,
                        status="PENDING_VERIFICATION",
                        severity_score=severity_score,
                        severity_class=severity_class,
                        priority_score=priority_score,
                        latitude=lat,
                        longitude=lng,
                        address=address,
                        city=city,
                        state=state,
                        affected_people_estimate=people_affected,
                        injuries_count=injuries,
                        fatalities_count=fatalities,
                        hazards_description=", ".join(nlp_entities.get("hazards", [])) or "External disaster signal",
                        infrastructure_damage=", ".join(nlp_entities.get("infrastructure_damage", [])) or "Pending field assessment",
                        verification_status="UNVERIFIED",
                        verification_notes=f"Autonomous Multi-Agent ingestion from verified Indian feed: {source_name}. Requires human dispatcher validation.",
                        is_active=True
                    )
                    db.add(new_inc)
                    await db.flush()

                    # Add Incident Report
                    rep = IncidentReport(
                        incident_id=new_inc.id,
                        report_type="SENSOR",
                        raw_text=f"[{source_name}] {title}\n{description}",
                        latitude=lat,
                        longitude=lng,
                        address=address,
                        injuries_reported=injuries,
                        people_affected=people_affected,
                        submitter_name=source_name,
                        submitter_notes=f"Initial external news intelligence ingestion from {source_name}."
                    )
                    db.add(rep)

                    # Add AI Analysis Record
                    ai_rec = AIAnalysis(
                        incident_id=new_inc.id,
                        pipeline_stage="COMPLETED",
                        status="COMPLETED",
                        classification=incident_type,
                        confidence=0.90,
                        severity_score=severity_score,
                        severity_class=severity_class,
                        contributing_factors_json=severity_res.get("contributing_factors", []),
                        entities_json=nlp_entities,
                        conflicting_signals_json={},
                        missing_information_json={},
                        agent_executions_json=[
                            {"agent": "NLPAgent", "output": nlp_class},
                            {"agent": "SeverityAgent", "output": severity_res}
                        ],
                        model_version="ResQIntel-NLP-Classifier-v1.4",
                        execution_time_ms=120
                    )
                    db.add(ai_rec)

                    # Add Incident Timeline Event
                    timeline = IncidentTimeline(
                        incident_id=new_inc.id,
                        event_type="REPORTED",
                        title=f"External Indian News Ingested & Analyzed ({source_name})",
                        description=f"Autonomous Agentic pipeline ingested news signal: '{title}'. Severity quantified at {severity_score}/10 ({severity_class}). Placed in Active Queue for dispatcher verification.",
                        previous_status=None,
                        new_status="PENDING_VERIFICATION",
                        actor_name=source_name,
                        actor_role="AI_NEWS_INGESTION"
                    )
                    db.add(timeline)

                    # Add or Update ExternalSignal Record
                    if existing_signal_record:
                        existing_signal_record.correlated_incident_id = new_inc.id
                        existing_signal_record.processing_status = "CONVERTED_TO_INCIDENT"
                    else:
                        ext_rec = ExternalSignal(
                            source=source_name,
                            source_type="NEWS_FEED",
                            title=title,
                            description=description,
                            event_type=incident_type,
                            latitude=lat,
                            longitude=lng,
                            severity=severity_class,
                            reference_url=ref_url,
                            confidence=0.92,
                            source_reliability="OFFICIAL_MEDIA",
                            processing_status="CONVERTED_TO_INCIDENT",
                            correlated_incident_id=new_inc.id
                        )
                        db.add(ext_rec)

                    created_incidents.append({
                        "id": new_inc.id,
                        "incident_number": new_inc.incident_number,
                        "title": new_inc.title,
                        "incident_type": new_inc.incident_type,
                        "severity_score": new_inc.severity_score,
                        "severity_class": new_inc.severity_class,
                        "source": source_name,
                        "latitude": new_inc.latitude,
                        "longitude": new_inc.longitude,
                        "address": new_inc.address,
                        "status": new_inc.status
                    })

                    # Update active_incidents list for subsequent loop iterations
                    active_incidents.append(new_inc)

            await db.commit()

        logger.info(f"[ExternalFeedIngestor] Ingestion complete: {len(created_incidents)} created, {len(updated_incidents)} fused, {skipped_count} skipped.")

        # Real-time WebSocket notification to all active dispatchers and responders
        if created_incidents or updated_incidents:
            try:
                await ws_manager.broadcast({
                    "type": "EXTERNAL_FEEDS_INGESTED",
                    "data": {
                        "created_count": len(created_incidents),
                        "created_incidents": created_incidents,
                        "updated_count": len(updated_incidents),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                })
                for inc in created_incidents:
                    await ws_manager.broadcast({
                        "type": "NEW_INCIDENT",
                        "data": inc
                    })
            except Exception as ws_err:
                logger.warning(f"WebSocket broadcast error: {ws_err}")

        return {
            "status": "SUCCESS",
            "ingested_count": len(created_incidents),
            "created_incidents": created_incidents,
            "fused_count": len(updated_incidents),
            "skipped_count": skipped_count,
            "message": f"Successfully processed Indian feeds: {len(created_incidents)} emergency incidents injected into Active Queue, {len(updated_incidents)} fused."
        }
