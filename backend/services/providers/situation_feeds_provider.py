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

    # Verified Free Indian News Media Outlets
    INDIAN_NEWS_SOURCES_WHITELIST = {
        'ndtv', 'times of india', 'the hindu', 'hindustan times', 'indian express', 
        'the indian express', 'deccan chronicle', 'deccan herald', 'dd news', 'pib', 
        'ani', 'ani news', 'zee news', 'india today', 'news18', 'the print', 'the wire', 
        'outlook india', 'the tribune', 'lokmat', 'mathrubhumi', 'daily excelsior', 
        'abp live', 'abp news', 'firstpost', 'republic world', 'millennium post', 
        'free press journal', 'mid-day', 'telangana today', 'pune mirror', 'mumbai mirror', 
        'economic times', 'financial express', 'the quint', 'the pioneer', 'the statesman', 
        'scroll.in', 'livemint', 'mint', 'ndtv 24x7', 'ndtv profit', 'etv bharat', 'amar ujala',
        'dainik bhaskar', 'navbharat times', 'prsindia', 'counterview'
    }

    INDIAN_GEO_TERMS = {
        'india', 'indian', 'pune', 'mumbai', 'delhi', 'chennai', 'bengaluru', 'bangalore', 
        'hyderabad', 'kolkata', 'kerala', 'maharashtra', 'assam', 'uttarakhand', 'himachal', 
        'gujarat', 'odisha', 'tamil nadu', 'karnataka', 'telangana', 'andhra', 'bihar', 
        'uttar pradesh', 'punjab', 'rajasthan', 'goa', 'jammu', 'kashmir', 'nagpur', 'thane', 
        'nashik', 'ahmedabad', 'surat', 'vadodara', 'kochi', 'coimbatore', 'visakhapatnam', 'vizag',
        'dehradun', 'shimla', 'guwahati', 'bhubaneswar', 'ndrf', 'sdrf', 'imd', 'cwc', 'nidm'
    }

    DISASTER_TERMS = {
        'flood', 'fire', 'rescue', 'disaster', 'landslide', 'cyclone', 'monsoon', 'drowning', 
        'building collapse', 'derailment', 'earthquake', 'blast', 'explosion', 'heavy rain', 
        'inundation', 'storm', 'ndrf', 'sdrf', 'evacuation', 'trapped', 'waterlogging', 
        'gas leak', 'toxic', 'cloudburst', 'lightning', 'casualties', 'blaze', 'train crash', 'train accident'
    }

    NON_INDIAN_OR_COMMERCIAL_EXCLUSIONS = {
        'ghana', 'china daily', 'chinadaily', 'australia', 'colorado', 'new york', 'california', 
        'texas', 'florida', 'united kingdom', 'london', 'pakistan', 'bangladesh', 'ukraine', 
        'russia', 'gaza', 'israel', 'trump', 'biden', 'white house', 'taiwan', 'philippines', 
        'canada', 'europe', 'africa', 'ifaw', 'cricket', 'ipl', 'match', 'asian games', 
        'box office', 'movie review', 'trailer', 'stocks', 'shares', 'crypto', 'gold rate',
        'tradingview', 'manufacturing today', 'al jazeera', 'aljazeera', 'howard kennedy'
    }

    @classmethod
    def _clean_text(cls, text: Optional[str]) -> str:
        if not text:
            return ""
        import re, html
        cleaned = re.sub(r'<[^>]+>', '', text)
        return html.unescape(cleaned).strip()

    @classmethod
    async def fetch_disaster_news(cls, target_lat: float, target_lng: float, query_keywords: str = "flood fire disaster rescue") -> List[Dict[str, Any]]:
        """Fetches and fuses verified FREE Indian emergency news feeds exclusively (NDTV, The Hindu, Times of India, Deccan Herald, etc.)"""
        import re
        results: List[Dict[str, Any]] = []
        seen_titles = set()

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ResQIntel-Emergency-Feeds/1.0"
        }

        # 1. Google News India Emergency RSS Query (Strictly India regionalized with Indian context)
        g_rss_url = "https://news.google.com/rss/search?q=India+(flood+OR+fire+OR+disaster+OR+rescue+OR+landslide+OR+cyclone+OR+NDRF+OR+cloudburst+OR+derailment)&hl=en-IN&gl=IN&ceid=IN:en"

        # 2. Direct Verified Free Indian National News RSS Feeds
        direct_indian_feeds = [
            ("NDTV News", "https://feeds.feedburner.com/ndtvnews-india-news"),
            ("The Hindu", "https://www.thehindu.com/news/national/feeder/default.rss"),
            ("Times of India", "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms"),
            ("Deccan Herald", "https://www.deccanherald.com/rss/national.rss")
        ]

        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True, headers=headers) as client:
            # A. Ingest from Google News India RSS filtered strictly for Indian outlets & topics
            try:
                res = await client.get(g_rss_url)
                if res.status_code == 200:
                    root = ET.fromstring(res.content)
                    channel = root.find("channel")
                    if channel is not None:
                        for item in channel.findall("item"):
                            raw_title = item.findtext("title", "")
                            title = cls._clean_text(raw_title)
                            link = item.findtext("link", "")
                            pub_date = item.findtext("pubDate", "")
                            source_el = item.find("source")
                            source_name = source_el.text if source_el is not None else "Indian Media"

                            t_lower = title.lower()
                            s_lower = source_name.lower()

                            # STRICT REQUIREMENT: Verified Indian media outlet & disaster topic, no foreign articles
                            is_indian_source = any(src in s_lower for src in cls.INDIAN_NEWS_SOURCES_WHITELIST)
                            has_disaster = any(d in t_lower for d in cls.DISASTER_TERMS)
                            is_excluded = any(ex in t_lower or ex in s_lower for ex in cls.NON_INDIAN_OR_COMMERCIAL_EXCLUSIONS)

                            if is_indian_source and has_disaster and not is_excluded:
                                norm_title = re.sub(r'[^a-zA-Z0-9]', '', title.lower()[:40])
                                if norm_title not in seen_titles:
                                    seen_titles.add(norm_title)
                                    event_type = "Flood" if "flood" in t_lower or "inundation" in t_lower else \
                                                 "Fire" if "fire" in t_lower or "blaze" in t_lower else \
                                                 "Landslide" if "landslide" in t_lower else \
                                                 "Cyclone" if "cyclone" in t_lower or "storm" in t_lower else \
                                                 "Building Collapse" if "collapse" in t_lower else "Disaster Alert"

                                    results.append({
                                        "source": f"{source_name} (India RSS)",
                                        "source_type": "NEWS_FEED",
                                        "title": title,
                                        "description": f"Indian emergency signal reported by {source_name}.",
                                        "event_type": event_type,
                                        "latitude": target_lat,
                                        "longitude": target_lng,
                                        "radius_km": 25.0,
                                        "severity": "HIGH" if any(w in t_lower for w in ["dead", "killed", "critical", "massive", "trapped", "emergency", "blast", "collapse"]) else "MEDIUM",
                                        "published_at": pub_date or datetime.now(timezone.utc).isoformat(),
                                        "reference_url": link,
                                        "confidence": 0.90,
                                        "source_reliability": "OFFICIAL_MEDIA",
                                        "raw_reference": {"source": source_name, "link": link}
                                    })
            except Exception:
                pass

            # B. Direct Feed Fallback / Enrichment
            for feed_name, feed_url in direct_indian_feeds:
                if len(results) >= 12:
                    break
                try:
                    res = await client.get(feed_url)
                    if res.status_code == 200:
                        root = ET.fromstring(res.content)
                        for item in root.findall(".//item")[:20]:
                            raw_title = item.findtext("title", "")
                            title = cls._clean_text(raw_title)
                            desc = cls._clean_text(item.findtext("description", ""))
                            link = item.findtext("link", "")
                            pub_date = item.findtext("pubDate", "")

                            combined = (title + " " + desc).lower()
                            has_disaster = any(d in combined for d in cls.DISASTER_TERMS)
                            is_excluded = any(ex in combined for ex in cls.NON_INDIAN_OR_COMMERCIAL_EXCLUSIONS)

                            if has_disaster and not is_excluded:
                                norm_title = re.sub(r'[^a-zA-Z0-9]', '', title.lower()[:40])
                                if norm_title not in seen_titles:
                                    seen_titles.add(norm_title)
                                    event_type = "Flood" if "flood" in combined else "Fire" if "fire" in combined else "Emergency Event"
                                    results.append({
                                        "source": f"{feed_name} (India RSS)",
                                        "source_type": "NEWS_FEED",
                                        "title": title,
                                        "description": desc[:250] if desc else f"Indian national emergency report from {feed_name}.",
                                        "event_type": event_type,
                                        "latitude": target_lat,
                                        "longitude": target_lng,
                                        "radius_km": 25.0,
                                        "severity": "HIGH" if any(w in combined for w in ["dead", "killed", "critical", "massive", "trapped"]) else "MEDIUM",
                                        "published_at": pub_date or datetime.now(timezone.utc).isoformat(),
                                        "reference_url": link,
                                        "confidence": 0.92,
                                        "source_reliability": "OFFICIAL_MEDIA",
                                        "raw_reference": {"source": feed_name, "link": link}
                                    })
                except Exception:
                    pass

        return results
