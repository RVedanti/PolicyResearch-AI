import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from google import genai

load_dotenv()

COLLECTION_NAME = "policy_documents"

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def search_documents(question, limit=5):
    # Convert the question into an embedding
    response = gemini.models.embed_content(
        model="gemini-embedding-001",
        contents=question,
    )

    query_embedding = response.embeddings[0].values

    # Search Qdrant
    results = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=limit,
        with_payload=True,
    )

    return results.points


if __name__ == "__main__":
    question = input("Enter your question: ")

    results = search_documents(question)

    print("\nSearch Results")
    print("========================")

    for i, result in enumerate(results, start=1):
        print(f"\nResult {i}")
        print("Score:", result.score)
        print("Chunk Index:", result.payload.get("chunk_index"))
        print("Text:")
        print(result.payload.get("text"))