import os
import sys
import time
import requests

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from google import genai


# -------------------------
# Load environment variables
# -------------------------

load_dotenv()


# -------------------------
# Configuration
# -------------------------

DOCUMENT_ID = "6a9bbad0d9e733633c002d03"

BACKEND_URL = "http://localhost:5000"

COLLECTION_NAME = "policy_documents"

BATCH_SIZE = 10


# -------------------------
# Qdrant
# -------------------------

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)


# -------------------------
# Gemini
# -------------------------

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

# -------------------------
# Reset Qdrant collection
# -------------------------

if qdrant.collection_exists(COLLECTION_NAME):
    print("Deleting old Qdrant collection...")
    qdrant.delete_collection(COLLECTION_NAME)

print("Creating fresh Qdrant collection...")

qdrant.create_collection(
    collection_name=COLLECTION_NAME,
    vectors_config={
        "size": 3072,
        "distance": "Cosine",
    },
)
# -------------------------
# Generate embeddings
# -------------------------

def generate_embeddings_with_retry(texts):

    while True:

        try:

            response = gemini.models.embed_content(
                model="gemini-embedding-001",
                contents=texts,
            )

            return [
                embedding.values
                for embedding in response.embeddings
            ]

        except Exception as error:

            error_message = str(error)

            if (
                "429" in error_message
                or "RESOURCE_EXHAUSTED" in error_message
            ):

                print("\nGemini embedding quota reached.")
                print("Waiting 60 seconds before retrying...")

                time.sleep(60)

            else:
                raise


# -------------------------
# Get chunks from backend
# -------------------------

print("Fetching document chunks from backend...")

auth_token = os.getenv("AUTH_TOKEN")

if not auth_token:
    print("AUTH_TOKEN is not set in .env")
    sys.exit(1)


response = requests.get(
    f"{BACKEND_URL}/api/documents/{DOCUMENT_ID}/chunks",
    headers={
        "Authorization": f"Bearer {auth_token}"
    }
)


if response.status_code != 200:

    print("Failed to fetch document chunks.")
    print("Status code:", response.status_code)
    print("Response:", response.text)

    sys.exit(1)


data = response.json()


# -------------------------
# Extract chunks
# -------------------------

print("\nResponse type:", type(data))


if isinstance(data, dict):

    print("Response keys:", data.keys())

    if "chunks" in data:

        chunks = data["chunks"]

    elif (
        "document" in data
        and isinstance(data["document"], dict)
        and "chunks" in data["document"]
    ):

        chunks = data["document"]["chunks"]

    elif (
        "data" in data
        and isinstance(data["data"], dict)
        and "chunks" in data["data"]
    ):

        chunks = data["data"]["chunks"]

    else:

        print("Could not find chunks in backend response.")
        print("Response:", data)

        sys.exit(1)

else:

    print("Unexpected response format.")
    print("Response:", data)

    sys.exit(1)


print("Total chunks received:", len(chunks))


if not chunks:

    print("No chunks found.")
    sys.exit(1)


# -------------------------
# Process chunks in batches
# -------------------------

total_chunks = len(chunks)


for start in range(0, total_chunks, BATCH_SIZE):

    batch = chunks[start:start + BATCH_SIZE]

    print(
        f"\nProcessing chunks "
        f"{start + 1}-{start + len(batch)} "
        f"of {total_chunks}..."
    )


    # -------------------------
    # Extract text
    # -------------------------

    texts = []

    for chunk in batch:

        if isinstance(chunk, dict):

            text = chunk.get("text", "")

        else:

            text = str(chunk)

        texts.append(text)


    # -------------------------
    # Generate embeddings
    # -------------------------

    embeddings = generate_embeddings_with_retry(texts)

    print(
        "Embeddings generated:",
        len(embeddings)
    )


    # -------------------------
    # Create Qdrant points
    # -------------------------

    points = []

    for index, (text, embedding) in enumerate(
        zip(texts, embeddings)
    ):

        actual_index = start + index

        point = PointStruct(
            id=actual_index,
            vector=embedding,
            payload={
                "document_id": DOCUMENT_ID,
                "chunk_index": actual_index,
                "text": text,
            },
        )

        points.append(point)


    # -------------------------
    # Insert into Qdrant
    # -------------------------

    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
    )


    print(
        f"Inserted {len(points)} chunks into Qdrant."
    )


# -------------------------
# Completed
# -------------------------

print("\n================================")
print("Document ingestion completed!")
print("Total chunks:", total_chunks)
print("================================")