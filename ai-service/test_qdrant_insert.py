import os
import uuid

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from google import genai

load_dotenv()

# -------------------------
# Qdrant
# -------------------------

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

COLLECTION_NAME = "policy_documents"


# -------------------------
# Gemini
# -------------------------

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# -------------------------
# Test chunk
# -------------------------

chunk_text = """
Artificial intelligence can help governments develop better policies
by analyzing large amounts of data and identifying patterns that may
support evidence-based decision making.
"""


# -------------------------
# Create embedding
# -------------------------

response = gemini.models.embed_content(
    model="gemini-embedding-001",
    contents=chunk_text,
)

embedding = response.embeddings[0].values

print("Embedding created!")
print("Embedding dimensions:", len(embedding))


# -------------------------
# Store in Qdrant
# -------------------------

point_id = str(uuid.uuid4())

qdrant.upsert(
    collection_name=COLLECTION_NAME,
    points=[
        PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                "document_id": "test-document",
                "project_id": "test-project",
                "chunk_index": 0,
                "text": chunk_text,
            },
        )
    ],
)

print("Chunk inserted into Qdrant!")
print("Point ID:", point_id)