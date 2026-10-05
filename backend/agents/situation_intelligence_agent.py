import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.services.providers.weather_provider import WeatherProvider
from backend.services.providers.situation_feeds_provider import SituationFeedsProvider
from backend.services.providers.routing_provider import haversine_distance_km

class SituationIntelligenceAgent:
    """Agentic Situation Intelligence Engine fusing direct citizen distress with external live disaster feeds"""

    @classmethod
    async def analyze_area_situation(
        cls,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0,
        active_incidents: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        t0 = time.time()
        active_incidents = active_incidents or []
        
        # 1. OBSERVE & FETCH: Concurrent live external situational queries
        weather = await WeatherProvider.get_current_weather(latitude, longitude)
        usgs_events = await SituationFeedsProvider.fetch_usgs_earthquakes(latitude, longitude, radius_km=300.0)
        gdacs_events = await SituationFeedsProvider.fetch_gdacs_alerts(latitude, longitude, radius_km=500.0)
        news_signals = await SituationFeedsProvider.fetch_disaster_news(latitude, longitude)

        # 2. NORMALIZE & FUSE
        all_external_signals = []
        
        # Weather signal conversion
        is_heavy_rain = weather.get("rainfall_mm", 0) > 10.0 or "rain" in weather.get("condition", "").lower()
        is_high_wind = weather.get("wind_speed_kmh", 0) > 40.0
        if is_heavy_rain or is_high_wind:
            all_external_signals.append({
                "source": "Open-Meteo Weather API",
                "source_type": "WEATHER",
                "title": f"Adverse Meteorological Condition: {weather.get('condition')}",
                "description": f"Live rainfall: {weather.get('rainfall_mm')} mm, Wind speed: {weather.get('wind_speed_kmh')} km/h, Humidity: {weather.get('humidity_pct')}%.",
                "event_type": "Flood Warning" if is_heavy_rain else "Storm Alert",
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": 20.0,
                "severity": "CRITICAL" if weather.get("rainfall_mm", 0) > 25.0 else "HIGH",
                "published_at": datetime.now(timezone.utc).isoformat(),
                "confidence": 0.96,
                "source_reliability": "OFFICIAL",
                "metrics": weather
            })

        all_external_signals.extend(usgs_events)
        all_external_signals.extend(gdacs_events)
        all_external_signals.extend(news_signals)

        # 3. CORRELATE & CHECK PROACTIVE POTENTIAL INCIDENTS
        # If multiple high-severity signals cluster in a sector with no existing active incident
        potential_incidents = []
        
        flood_signals = [s for s in all_external_signals if "flood" in s.get("event_type", "").lower() or "rain" in s.get("title", "").lower()]
        seismic_signals = [s for s in all_external_signals if "earthquake" in s.get("event_type", "").lower()]

        # Flood proactive correlation
        if len(flood_signals) >= 1 and (is_heavy_rain or any(s.get("severity") in ["HIGH", "CRITICAL"] for s in flood_signals)):
            # Check if incident already reported in this zone
            has_near_incident = any(
                haversine_distance_km(latitude, longitude, inc.get("latitude", 0), inc.get("longitude", 0)) < 3.0
                for inc in active_incidents
            )
            if not has_near_incident:
                potential_incidents.append({
                    "potential_type": "Flood",
                    "title": f"Proactive Alert: Escalating Inundation Risk at Sector Coordinates",
                    "description": f"Automated Agentic fusion detected critical rainfall ({weather.get('rainfall_mm')} mm) correlated with external disaster bulletins. High flooding probability.",
                    "severity_class": "HIGH",
                    "severity_score": 7.8,
                    "confidence": 0.88,
                    "suggested_action": "Issue pre-emptive citizen geofence alert and deploy scout patrol.",
                    "evidence_sources": [s.get("source") for s in flood_signals] + ["Open-Meteo Live Sensor"],
                    "latitude": latitude,
                    "longitude": longitude
                })

        # Seismic proactive correlation
        if len(seismic_signals) >= 1:
            closest_eq = sorted(seismic_signals, key=lambda x: x.get("distance_km", 999))[0]
            if closest_eq.get("distance_km", 999) < 200.0:
                potential_incidents.append({
                    "potential_type": "Earthquake",
                    "title": f"Proactive Alert: Seismic Impact from {closest_eq.get('title')}",
                    "description": f"USGS detected {closest_eq.get('title')} approximately {closest_eq.get('distance_km')} km from sector. Structural integrity assessment recommended.",
                    "severity_class": closest_eq.get("severity", "MEDIUM"),
                    "severity_score": 7.5,
                    "confidence": 0.95,
                    "suggested_action": "Check vulnerable infrastructure and high-occupancy buildings.",
                    "evidence_sources": ["USGS Global Seismic Network"],
                    "latitude": latitude,
                    "longitude": longitude
                })

        # 4. FUSED SITUATION SUMMARY
        overall_threat = "CRITICAL" if any(s.get("severity") == "CRITICAL" for s in all_external_signals) else \
                         "HIGH" if any(s.get("severity") == "HIGH" for s in all_external_signals) else \
                         "MODERATE" if len(all_external_signals) > 0 else "NOMINAL"

        rainfall = weather.get("rainfall_mm", 0) if isinstance(weather, dict) else 0
        summary_text = f"Sector situational threat is {overall_threat}. Fused {len(all_external_signals)} external signal(s) from USGS, GDACS, and regional weather. Precipitation rate: {rainfall} mm/h. {len(potential_incidents)} potential proactive emergency pattern(s) identified."

        weather_dict = {
            "temperature": weather.get("temperature_c", 28.0),
            "temperature_c": weather.get("temperature_c", 28.0),
            "precipitation": weather.get("rainfall_mm", 0.0),
            "rainfall_mm": weather.get("rainfall_mm", 0.0),
            "windspeed": weather.get("wind_speed_kmh", 12.0),
            "wind_speed_kmh": weather.get("wind_speed_kmh", 12.0),
            "humidity": weather.get("humidity_pct", 75.0),
            "humidity_pct": weather.get("humidity_pct", 75.0),
            "condition": weather.get("condition", "Clear sky"),
            "pressure_hpa": weather.get("pressure_hpa", 1012.0),
            "status": weather.get("status", "ONLINE"),
            "provider": weather.get("provider", "Open-Meteo Global Meteorological Forecast API (Live)")
        }

        flags = [p["title"] for p in potential_incidents]
        if rainfall > 10.0:
            flags.append(f"Precipitation Warning ({rainfall} mm/h)")
        if weather.get("wind_speed_kmh", 0) > 40.0:
            flags.append(f"High Wind Alert ({weather.get('wind_speed_kmh')} km/h)")

        return {
            "status": "SUCCESS",
            "threat_level": overall_threat,
            "situation_summary": summary_text,
            "summary": summary_text,
            "external_signals_count": len(all_external_signals),
            "external_signals": all_external_signals,
            "signals": all_external_signals,
            "potential_incidents": potential_incidents,
            "proactive_flags": flags,
            "weather": weather_dict,
            "weather_observation": weather,
            "center": {"lat": latitude, "lon": longitude},
            "sector_context": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km,
                "correlated_active_incidents": len(active_incidents)
            },
            "active_incidents_in_zone": len(active_incidents),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "agent_metadata": {
                "agent": "SituationIntelligenceAgent",
                "version": "3.0.0",
                "execution_ms": int((time.time() - t0) * 1000),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
