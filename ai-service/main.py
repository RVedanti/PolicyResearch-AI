
import os
import time
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI
from google import genai
from pydantic import BaseModel

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

from rag import retrieve_documents, generate_answer


load_dotenv()


# -------------------------
# Request Models
# -------------------------

class EmbeddingRequest(BaseModel):
    texts: list[str]


class RAGRequest(BaseModel):
    question: str
    jwt_token: str
    document_id: str


# -------------------------
# FastAPI
# -------------------------

app = FastAPI(
    title="PolicyResearch AI Service",
    description="AI service for embeddings, retrieval, and RAG",
    version="1.0.0",
)


# -------------------------
# Gemini
# -------------------------

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# -------------------------
# RAG
# -------------------------

@app.post("/rag")
def rag_answer(request: RAGRequest):

    if not request.question.strip():
        return {
            "success": False,
            "message": "Question cannot be empty",
        }

    try:

        # Pass JWT token to rag.py
        import rag

        rag.AUTH_TOKEN = request.jwt_token

        results = retrieve_documents(
    request.question,
    request.document_id
)

        answer = generate_answer(
            request.question,
            results
        )

        sources = [
            {
                "chunk_id": result["chunk_index"],
                "score": result["score"],
                "text": result["text"],
            }
            for result in results
        ]

        return {
            "success": True,
            "question": request.question,
            "answer": answer,
            "sources": sources,
        }

    except Exception as e:

        import traceback

        print("RAG ERROR:")
        traceback.print_exc()

        return {
            "success": False,
            "message": str(e),
        }


# -------------------------
# Health Check
# -------------------------

@app.get("/health")
def health_check():

    return {
        "success": True,
        "message": "AI service is running",
    }


# -------------------------
# Test Embedding
# -------------------------

@app.get("/test-embedding")
def test_embedding():

    try:

        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=(
                "Artificial intelligence "
                "is transforming education."
            ),
        )

        embedding = response.embeddings[0].values

        return {
            "success": True,
            "dimensions": len(embedding),
            "embedding": embedding,
        }

    except Exception as e:

        return {
            "success": False,
            "message": str(e),
        }


# -------------------------
# Generate Embeddings
# -------------------------

@app.post("/embed")
def create_embeddings(request: EmbeddingRequest):

    if not request.texts:

        return {
            "success": False,
            "message": "No texts provided",
        }

    BATCH_SIZE = 50

    all_embeddings = []

    try:

        # -------------------------
        # Process texts in batches
        # -------------------------

        for start in range(
            0,
            len(request.texts),
            BATCH_SIZE
        ):

            batch_texts = request.texts[
                start:start + BATCH_SIZE
            ]

            print(
                f"Embedding texts "
                f"{start + 1}-"
                f"{start + len(batch_texts)} "
                f"of {len(request.texts)}"
            )

            # -------------------------
            # Generate embeddings
            # -------------------------

            response = client.models.embed_content(
                model="gemini-embedding-001",
                contents=batch_texts,
            )

            batch_embeddings = [
                embedding.values
                for embedding in response.embeddings
            ]

            all_embeddings.extend(
                batch_embeddings
            )

            print(
                f"Completed batch "
                f"{start + 1}-"
                f"{start + len(batch_texts)}"
            )

            # -------------------------
            # Wait before next batch
            # -------------------------

            if start + BATCH_SIZE < len(request.texts):

                print(
                    "Waiting 35 seconds "
                    "before next batch..."
                )

                time.sleep(35)

        return {
            "success": True,
            "count": len(all_embeddings),
            "dimensions": len(all_embeddings[0]),
            "embeddings": all_embeddings,
        }

    except Exception as e:

        print(
            "Embedding error:",
            str(e)
        )

        return {
            "success": False,
            "message": str(e),
        }


# -------------------------
# Index Document in Qdrant
# -------------------------

@app.post("/index-document")
def index_document(request: dict):

    document_id = request.get("document_id")
    chunks = request.get("chunks", [])

    if not document_id:
        return {
            "success": False,
            "message": "Document ID is required",
        }

    if not chunks:
        return {
            "success": False,
            "message": "No chunks provided",
        }

    try:

        # -------------------------
        # Extract chunk text
        # -------------------------

        texts = [
            chunk["text"]
            if isinstance(chunk, dict)
            else str(chunk)
            for chunk in chunks
        ]

        # -------------------------
        # Batch size
        # -------------------------

        BATCH_SIZE = 50

        # -------------------------
        # Connect to Qdrant
        # -------------------------

        qdrant = QdrantClient(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY"),
            timeout=120,
        )

        total_indexed = 0
        total_skipped = 0

        # -------------------------
        # Check existing chunks
        # -------------------------

        existing_ids = set()

        for actual_index in range(len(texts)):

            point_id = str(
                uuid.uuid5(
                    uuid.NAMESPACE_URL,
                    f"{document_id}_{actual_index}"
                )
            )

            try:

                point = qdrant.retrieve(
                    collection_name="policy_documents",
                    ids=[point_id],
                )

                if point:
                    existing_ids.add(actual_index)

            except Exception:
                pass

        print(
            f"Already indexed: "
            f"{len(existing_ids)} chunks"
        )

        print(
            f"Missing chunks: "
            f"{len(texts) - len(existing_ids)}"
        )

        total_skipped = len(existing_ids)

        # -------------------------
        # Process only missing chunks
        # -------------------------

        missing_indices = [
            index
            for index in range(len(texts))
            if index not in existing_ids
        ]

        for batch_start in range(
            0,
            len(missing_indices),
            BATCH_SIZE
        ):

            batch_indices = missing_indices[
                batch_start:
                batch_start + BATCH_SIZE
            ]

            batch_texts = [
                texts[index]
                for index in batch_indices
            ]

            print(
                f"Indexing missing chunks "
                f"{batch_indices[0] + 1}-"
                f"{batch_indices[-1] + 1} "
                f"of {len(texts)}"
            )

            # -------------------------
            # Generate embeddings
            # -------------------------

            response = client.models.embed_content(
                model="gemini-embedding-001",
                contents=batch_texts,
            )

            embeddings = [
                embedding.values
                for embedding in response.embeddings
            ]

            # -------------------------
            # Create Qdrant points
            # -------------------------

            points = []

            for actual_index, (
                text,
                embedding
            ) in zip(
                batch_indices,
                zip(
                    batch_texts,
                    embeddings
                )
            ):

                points.append(
                    PointStruct(
                        id=str(
                            uuid.uuid5(
                                uuid.NAMESPACE_URL,
                                f"{document_id}_{actual_index}"
                            )
                        ),
                        vector=embedding,
                        payload={
                            "document_id": document_id,
                            "chunk_index": actual_index,
                            "text": text,
                        },
                    )
                )

            # -------------------------
            # Insert into Qdrant
            # -------------------------

            qdrant.upsert(
                collection_name="policy_documents",
                points=points,
            )

            total_indexed += len(points)

            print(
                f"Inserted {len(points)} chunks"
            )

            # -------------------------
            # Wait before next batch
            # -------------------------

            if (
                batch_start + BATCH_SIZE
                < len(missing_indices)
            ):

                print(
                    "Waiting 35 seconds "
                    "before next batch..."
                )

                time.sleep(35)

        # -------------------------
        # Final result
        # -------------------------

        return {
            "success": True,
            "document_id": document_id,
            "chunks_total": len(texts),
            "chunks_indexed": total_indexed,
            "chunks_skipped": total_skipped,
            "message": (
                "Document indexing completed."
            ),
        }

    except Exception as e:

        print(
            "Document indexing error:",
            str(e)
        )

        return {
            "success": False,
            "message": str(e),
        }