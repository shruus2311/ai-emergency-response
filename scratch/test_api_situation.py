import asyncio
import httpx

async def test_api():
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get('http://127.0.0.1:8000/api/ai/situation-intelligence?latitude=18.5204&longitude=73.8567')
        print(f"Status: {res.status_code}")
        data = res.json()
        print(f"Summary: {data.get('summary')}")
        signals = data.get('signals', [])
        print(f"Total signals returned: {len(signals)}")
        for i, s in enumerate(signals[:10]):
            clean_title = s.get('title', '').encode('ascii', 'ignore').decode()
            print(f" {i+1}. [{s.get('source')}] {clean_title} ({s.get('event_type')})")

if __name__ == '__main__':
    asyncio.run(test_api())
