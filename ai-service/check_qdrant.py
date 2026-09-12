from qdrant_client import QdrantClient
from dotenv import load_dotenv
from collections import Counter
import os

load_dotenv()

client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)

counter = Counter()
offset = None
total = 0

while True:
    points, offset = client.scroll(
        collection_name="policy_documents",
        limit=1000,
        offset=offset,
        with_payload=True,
        with_vectors=False
    )

    for point in points:
        document_id = point.payload.get("document_id")
        counter[document_id] += 1

    total += len(points)

    if offset is None:
        break

print("\nTotal points:", total)
print("\nPoints by document:")

for document_id, count in counter.items():
    print(f"{document_id}: {count}")