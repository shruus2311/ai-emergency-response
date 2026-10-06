import asyncio
import traceback
from backend.services.external_feed_ingestor import ExternalFeedIngestor
from backend.services.providers.situation_feeds_provider import SituationFeedsProvider

async def main():
    try:
        raw_signals = await SituationFeedsProvider.fetch_disaster_news(18.5204, 73.8567)
        print(f"Fetched {len(raw_signals)} raw signals from situation feeds provider")
        res = await ExternalFeedIngestor.ingest_external_news_reports(max_items=15)
        print("Ingest result:", res)
        for inc in res.get("created_incidents", []):
            print(f" -> [{inc['incident_number']}] {inc['incident_type']} | Severity: {inc['severity_score']}/10 ({inc['severity_class']}) | {inc['title'][:60]}")
    except Exception as e:
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
