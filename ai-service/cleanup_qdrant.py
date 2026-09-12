from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from dotenv import load_dotenv
import os

load_dotenv()

client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
    timeout=120
)

COLLECTION_NAME = "policy_documents"

orphan_ids = [
    "6aa1710576a93060ea3fe878",
    "6aa2718ab0f8f07e9ca39864",
]

for document_id in orphan_ids:
    print(f"Deleting vectors for: {document_id}")

    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=document_id)
                )
            ]
        ),
        wait=True
    )

    print(f"Deleted: {document_id}")

print("\nCleanup complete.")