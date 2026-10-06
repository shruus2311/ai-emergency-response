import asyncio
import httpx
import re
import html
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

INDIAN_SOURCES_WHITELIST = {
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

DISASTER_TERMS = {
    'flood', 'fire', 'rescue', 'disaster', 'landslide', 'cyclone', 'monsoon', 'drowning', 
    'building collapse', 'derailment', 'earthquake', 'blast', 'explosion', 'heavy rain', 
    'inundation', 'storm', 'ndrf', 'sdrf', 'evacuation', 'trapped', 'waterlogging', 
    'gas leak', 'toxic', 'cloudburst', 'lightning', 'casualties', 'blaze', 'train crash', 'train accident'
}

EXCLUSIONS = {
    'ghana', 'china daily', 'chinadaily', 'australia', 'colorado', 'new york', 'california', 
    'texas', 'florida', 'united kingdom', 'london', 'pakistan', 'bangladesh', 'ukraine', 
    'russia', 'gaza', 'israel', 'trump', 'biden', 'white house', 'taiwan', 'philippines', 
    'canada', 'europe', 'africa', 'ifaw', 'cricket', 'ipl', 'match', 'asian games', 
    'box office', 'movie review', 'trailer', 'stocks', 'shares', 'crypto', 'gold rate',
    'tradingview', 'manufacturing today', 'al jazeera', 'aljazeera', 'howard kennedy', 'shares'
}

def clean_text(text: str) -> str:
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', '', text)
    return html.unescape(text).strip()

async def fetch_all_indian_disaster_news(target_lat: float, target_lng: float):
    results = []
    seen_titles = set()
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ResQIntel-Emergency-Feeds/1.0'}
    
    # 1. Google News India Disaster-Specific RSS (strictly India regionalized)
    g_url = 'https://news.google.com/rss/search?q=India+(flood+OR+fire+OR+disaster+OR+rescue+OR+landslide+OR+cyclone+OR+NDRF+OR+cloudburst+OR+derailment)&hl=en-IN&gl=IN&ceid=IN:en'
    
    # 2. Direct Top Free Indian News RSS Feeds
    direct_indian_feeds = [
        ('NDTV News', 'https://feeds.feedburner.com/ndtvnews-india-news'),
        ('The Hindu', 'https://www.thehindu.com/news/national/feeder/default.rss'),
        ('Times of India', 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms'),
        ('Deccan Herald', 'https://www.deccanherald.com/rss/national.rss')
    ]
    
    async with httpx.AsyncClient(timeout=5.0, follow_redirects=True, headers=headers) as client:
        # A. Fetch from Google News India RSS with Indian source enforcement
        try:
            res = await client.get(g_url)
            if res.status_code == 200:
                root = ET.fromstring(res.content)
                for item in root.findall('.//item'):
                    raw_title = item.findtext('title', '')
                    title = clean_text(raw_title)
                    link = item.findtext('link', '')
                    pub_date = item.findtext('pubDate', '')
                    source_el = item.find('source')
                    source_name = source_el.text if source_el is not None else 'Indian News'
                    
                    t_lower = title.lower()
                    s_lower = source_name.lower()
                    
                    # STRICT: Must be a verified Indian news outlet
                    is_indian_source = any(src in s_lower for src in INDIAN_SOURCES_WHITELIST)
                    has_disaster = any(d in t_lower for d in DISASTER_TERMS)
                    is_excluded = any(ex in t_lower or ex in s_lower for ex in EXCLUSIONS)
                    
                    if is_indian_source and has_disaster and not is_excluded:
                        norm_title = re.sub(r'[^a-zA-Z0-9]', '', title.lower()[:40])
                        if norm_title not in seen_titles:
                            seen_titles.add(norm_title)
                            event_type = 'Flood' if 'flood' in t_lower or 'inundation' in t_lower else \
                                         'Fire' if 'fire' in t_lower or 'blaze' in t_lower else \
                                         'Landslide' if 'landslide' in t_lower else \
                                         'Cyclone' if 'cyclone' in t_lower or 'storm' in t_lower else \
                                         'Building Collapse' if 'collapse' in t_lower else 'Disaster Alert'
                            results.append({
                                'source': f'{source_name} (India RSS)',
                                'source_type': 'NEWS_FEED',
                                'title': title,
                                'description': f'Indian emergency signal reported by {source_name}.',
                                'event_type': event_type,
                                'latitude': target_lat,
                                'longitude': target_lng,
                                'radius_km': 25.0,
                                'severity': 'HIGH' if any(w in t_lower for w in ['dead', 'killed', 'critical', 'massive', 'trapped', 'emergency', 'blast', 'collapse']) else 'MEDIUM',
                                'published_at': pub_date or datetime.now(timezone.utc).isoformat(),
                                'reference_url': link,
                                'confidence': 0.90,
                                'source_reliability': 'OFFICIAL_MEDIA',
                                'raw_reference': {'source': source_name, 'link': link}
                            })
        except Exception:
            pass
            
        # B. Direct Feeds fallback / enrichment
        for feed_name, feed_url in direct_indian_feeds:
            if len(results) >= 12:
                break
            try:
                res = await client.get(feed_url)
                if res.status_code == 200:
                    root = ET.fromstring(res.content)
                    for item in root.findall('.//item')[:20]:
                        raw_title = item.findtext('title', '')
                        title = clean_text(raw_title)
                        desc = clean_text(item.findtext('description', ''))
                        link = item.findtext('link', '')
                        pub_date = item.findtext('pubDate', '')
                        
                        combined = (title + ' ' + desc).lower()
                        has_disaster = any(d in combined for d in DISASTER_TERMS)
                        is_excluded = any(ex in combined for ex in EXCLUSIONS)
                        
                        if has_disaster and not is_excluded:
                            norm_title = re.sub(r'[^a-zA-Z0-9]', '', title.lower()[:40])
                            if norm_title not in seen_titles:
                                seen_titles.add(norm_title)
                                event_type = 'Flood' if 'flood' in combined else 'Fire' if 'fire' in combined else 'Emergency Event'
                                results.append({
                                    'source': f'{feed_name} (India RSS)',
                                    'source_type': 'NEWS_FEED',
                                    'title': title,
                                    'description': desc[:250] if desc else f'Indian national emergency report from {feed_name}.',
                                    'event_type': event_type,
                                    'latitude': target_lat,
                                    'longitude': target_lng,
                                    'radius_km': 25.0,
                                    'severity': 'HIGH' if any(w in combined for w in ['dead', 'killed', 'critical', 'massive', 'trapped']) else 'MEDIUM',
                                    'published_at': pub_date or datetime.now(timezone.utc).isoformat(),
                                    'reference_url': link,
                                    'confidence': 0.92,
                                    'source_reliability': 'OFFICIAL_MEDIA',
                                    'raw_reference': {'source': feed_name, 'link': link}
                                })
            except Exception:
                pass
                
    return results

async def main():
    items = await fetch_all_indian_disaster_news(18.5204, 73.8567)
    print(f"Total Indian Disaster Signals fetched: {len(items)}")
    for i, itm in enumerate(items[:10]):
        clean_title = itm['title'].encode('ascii', 'ignore').decode()
        print(f"{i+1}. [{itm['source']}] {clean_title} ({itm['event_type']})")

if __name__ == '__main__':
    asyncio.run(main())
