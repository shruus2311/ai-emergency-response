import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.services.providers.routing_provider import haversine_distance_km

class SituationFeedsProvider:
    """External Situational Signals Provider: USGS Earthquakes, GDACS Alerts, Open-Meteo, & Disaster News Feeds"""

    @classmethod
    async def fetch_usgs_earthquakes(cls, target_lat: float, target_lng: float, radius_km: float = 500.0) -> List[Dict[str, Any]]:
        """Fetches real USGS Earthquake events from official feed filtered by distance"""
        results = []
        try:
            url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    features = data.get("features", [])
                    for feat in features:
                        props = feat.get("properties", {})
                        geom = feat.get("geometry", {})
                        coords = geom.get("coordinates", [])
                        if len(coords) >= 2:
                            eq_lng, eq_lat = coords[0], coords[1]
                            dist_km = haversine_distance_km(target_lat, target_lng, eq_lat, eq_lng)
                            if dist_km <= radius_km:
                                epoch_ms = props.get("time", 0)
                                pub_time = datetime.fromtimestamp(epoch_ms / 1000.0, timezone.utc) if epoch_ms else datetime.now(timezone.utc)
                                mag = props.get("mag", 0.0)
                                sev = "CRITICAL" if mag >= 6.5 else "HIGH" if mag >= 5.0 else "MEDIUM" if mag >= 3.5 else "LOW"
                                results.append({
                                    "source": "USGS",
                                    "source_type": "USGS_EARTHQUAKE",
                                    "title": props.get("title") or f"M {mag} Earthquake",
                                    "description": f"Magnitude {mag} seismic event recorded at {props.get('place')}. Distance to sector: {dist_km:.1f} km.",
                                    "event_type": "Earthquake",
                                    "latitude": eq_lat,
                                    "longitude": eq_lng,
                                    "distance_km": round(dist_km, 1),
                                    "magnitude": mag,
                                    "radius_km": 50.0 + (mag * 20),
                                    "severity": sev,
                                    "published_at": pub_time.isoformat(),
                                    "reference_url": props.get("url"),
                                    "confidence": 0.98,
                                    "source_reliability": "OFFICIAL",
                                    "raw_reference": {"id": feat.get("id"), "mag": mag, "place": props.get("place")}
                                })
        except Exception as e:
            # Degraded or network timeout fallback
            pass
        return results

    @classmethod
    async def fetch_gdacs_alerts(cls, target_lat: float, target_lng: float, radius_km: float = 1000.0) -> List[Dict[str, Any]]:
        """Fetches Global Disaster Alert and Coordination System (GDACS) real-time disaster alerts"""
        results = []
        try:
            url = "https://www.gdacs.org/xml/rss.xml"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    root = ET.fromstring(res.content)
                    channel = root.find("channel")
                    if channel is not None:
                        for item in channel.findall("item"):
                            title = item.findtext("title", "")
                            desc = item.findtext("description", "")
                            link = item.findtext("link", "")
                            pub_date = item.findtext("pubDate", "")

                            # Extract geo coordinates if present in namespaces
                            geo_lat_el = item.find("{http://www.w3.org/2003/01/geo/wgs84_pos#}lat")
                            geo_lng_el = item.find("{http://www.w3.org/2003/01/geo/wgs84_pos#}long")

                            if geo_lat_el is not None and geo_lng_el is not None:
                                try:
                                    g_lat = float(geo_lat_el.text)
                                    g_lng = float(geo_lng_el.text)
                                    dist_km = haversine_distance_km(target_lat, target_lng, g_lat, g_lng)
                                    if dist_km <= radius_km:
                                        event_type = "Flood" if "flood" in title.lower() or "flood" in desc.lower() else \
                                                     "Cyclone" if "cyclone" in title.lower() or "storm" in desc.lower() else \
                                                     "Earthquake" if "earthquake" in title.lower() else "Severe Weather Alert"
                                        sev = "CRITICAL" if "red" in title.lower() or "red" in desc.lower() else \
                                              "HIGH" if "orange" in title.lower() or "orange" in desc.lower() else "MEDIUM"
                                        results.append({
                                            "source": "GDACS",
                                            "source_type": "GDACS_DISASTER",
                                            "title": title,
                                            "description": desc[:300] if desc else title,
                                            "event_type": event_type,
                                            "latitude": g_lat,
                                            "longitude": g_lng,
                                            "distance_km": round(dist_km, 1),
                                            "radius_km": 100.0,
                                            "severity": sev,
                                            "published_at": pub_date or datetime.now(timezone.utc).isoformat(),
                                            "reference_url": link,
                                            "confidence": 0.95,
                                            "source_reliability": "OFFICIAL",
                                            "raw_reference": {"link": link, "pubDate": pub_date}
                                        })
                                except (ValueError, TypeError):
                                    continue
        except Exception:
            pass
        return results

    @classmethod
    async def fetch_disaster_news(cls, target_lat: float, target_lng: float, query_keywords: str = "flood fire disaster rescue") -> List[Dict[str, Any]]:
        """Fetches public disaster news signals with location context"""
        results = []
        try:
            # Query public RSS/news sources
            rss_url = f"https://news.google.com/rss/search?q={query_keywords}&hl=en-IN&gl=IN&ceid=IN:en"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(rss_url)
                if res.status_code == 200:
                    root = ET.fromstring(res.content)
                    channel = root.find("channel")
                    if channel is not None:
                        for item in channel.findall("item")[:5]:
                            title = item.findtext("title", "")
                            link = item.findtext("link", "")
                            pub_date = item.findtext("pubDate", "")
                            source_el = item.find("source")
                            source_name = source_el.text if source_el is not None else "Public Media"
                            
                            event_type = "Flood" if "flood" in title.lower() else \
                                         "Fire" if "fire" in title.lower() else \
                                         "Building Collapse" if "collapse" in title.lower() else "Emergency Event"

                            results.append({
                                "source": f"{source_name} (RSS)",
                                "source_type": "NEWS_FEED",
                                "title": title,
                                "description": f"External media emergency signal reported by {source_name}.",
                                "event_type": event_type,
                                "latitude": target_lat,
                                "longitude": target_lng,
                                "radius_km": 25.0,
                                "severity": "HIGH" if any(w in title.lower() for w in ["dead", "killed", "critical", "massive", "trapped"]) else "MEDIUM",
                                "published_at": pub_date or datetime.now(timezone.utc).isoformat(),
                                "reference_url": link,
                                "confidence": 0.75,
                                "source_reliability": "REPORTED",
                                "raw_reference": {"source": source_name, "link": link}
                            })
        except Exception:
            pass
        return results
