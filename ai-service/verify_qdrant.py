import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

COLLECTION_NAME = "policy_documents"

info = qdrant.get_collection(COLLECTION_NAME)

print("Qdrant collection verified!")
print("Collection:", COLLECTION_NAME)
print("Vectors stored:", info.points_count)
print("Vector size:", info.config.params.vectors.size)
print("Distance:", info.config.params.vectors.distance)