import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient
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
# User question
# -------------------------

question = "How can artificial intelligence help governments create better policies?"


# -------------------------
# Create question embedding
# -------------------------

response = gemini.models.embed_content(
    model="gemini-embedding-001",
    contents=question,
)

query_embedding = response.embeddings[0].values

print("Question embedding created!")
print("Embedding dimensions:", len(query_embedding))


# -------------------------
# Search Qdrant
# -------------------------

results = qdrant.query_points(
    collection_name=COLLECTION_NAME,
    query=query_embedding,
    limit=3,
    with_payload=True,
)


# -------------------------
# Display results
# -------------------------

print("\nSearch Results:")
print("========================")

for i, result in enumerate(results.points, start=1):
    print(f"\nResult {i}")
    print("Score:", result.score)
    print("Document ID:", result.payload.get("document_id"))
    print("Project ID:", result.payload.get("project_id"))
    print("Chunk Index:", result.payload.get("chunk_index"))
    print("Text:", result.payload.get("text"))