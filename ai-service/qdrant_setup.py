import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PayloadSchemaType,
)

load_dotenv()

client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

COLLECTION_NAME = "policy_documents"


# =========================
# Create collection
# =========================

collections = client.get_collections().collections

collection_names = [
    collection.name
    for collection in collections
]

if COLLECTION_NAME not in collection_names:
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=3072,
            distance=Distance.COSINE,
        ),
    )

    print(
        f"Collection '{COLLECTION_NAME}' created successfully!"
    )

else:
    print(
        f"Collection '{COLLECTION_NAME}' already exists!"
    )


# =========================
# Create payload index
# =========================

client.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name="document_id",
    field_schema=PayloadSchemaType.KEYWORD,
)

print("Payload index for 'document_id' created successfully!")


# =========================
# Verify collection
# =========================

info = client.get_collection(
    COLLECTION_NAME
)

print(
    "Vector size:",
    info.config.params.vectors.size
)

print(
    "Distance:",
    info.config.params.vectors.distance
)

print("Qdrant setup complete!")