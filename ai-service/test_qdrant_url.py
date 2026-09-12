import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

url = os.getenv("QDRANT_URL")

print("Qdrant URL loaded:", url)

client = QdrantClient(
    url=url,
    api_key=os.getenv("QDRANT_API_KEY"),
)

print(client.get_collections())