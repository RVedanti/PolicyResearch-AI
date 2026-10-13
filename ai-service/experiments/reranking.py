import os
import requests

from dotenv import load_dotenv
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder
from qdrant_client import QdrantClient
from google import genai


load_dotenv()


BACKEND_URL = "http://localhost:5000"
DOCUMENT_ID = "6a9940e7e1c235c342b4315a"

# Put your NEW JWT token here.
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTk4MTY2M2Q5ZTlhYjRhZGNmMTU5YmYiLCJpYXQiOjE3ODg0OTc4ODAsImV4cCI6MTc4OTEwMjY4MH0.L2A75SCLtVcvSOguNPJVej4bDtMV6cTypQE9Rawqg5g"

COLLECTION_NAME = "policy_documents"


qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


print("Loading reranker model...")

reranker = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)

print("Reranker model loaded.")


def get_document_chunks():

    url = f"{BACKEND_URL}/api/documents/{DOCUMENT_ID}/chunks"

    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}"
    }

    response = requests.get(
        url,
        headers=headers
    )

    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch chunks: {response.status_code}"
        )

    data = response.json()

    return data["document"]["chunks"]


def vector_search(question, limit=10):

    response = gemini.models.embed_content(
        model="gemini-embedding-001",
        contents=question,
    )

    query_embedding = response.embeddings[0].values

    results = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=limit,
        with_payload=True,
    )

    return results.points


def tokenize(text):
    return text.lower().split()


def build_bm25(chunks):

    tokenized_chunks = [
        tokenize(chunk)
        for chunk in chunks
    ]

    return BM25Okapi(tokenized_chunks)


def bm25_search(
    bm25,
    chunks,
    question,
    limit=10
):

    query_tokens = tokenize(question)

    scores = bm25.get_scores(query_tokens)

    ranked_indexes = sorted(
        range(len(scores)),
        key=lambda i: scores[i],
        reverse=True
    )

    results = []

    for index in ranked_indexes[:limit]:

        results.append({
            "chunk_index": index,
            "score": float(scores[index]),
            "text": chunks[index],
        })

    return results


def normalize_scores(results):

    if not results:
        return {}

    scores = [
        result["score"]
        for result in results
    ]

    min_score = min(scores)
    max_score = max(scores)

    normalized = {}

    for result in results:

        score = result["score"]

        if max_score == min_score:
            normalized_score = 1.0
        else:
            normalized_score = (
                (score - min_score)
                / (max_score - min_score)
            )

        normalized[
            result["chunk_index"]
        ] = normalized_score

    return normalized


def hybrid_search(
    question,
    chunks,
    bm25,
    limit=10
):

    vector_results = vector_search(
        question,
        limit=10
    )

    bm25_results = bm25_search(
        bm25,
        chunks,
        question,
        limit=10
    )

    vector_scores = normalize_scores([
        {
            "chunk_index":
                result.payload.get("chunk_index"),
            "score": result.score,
        }
        for result in vector_results
    ])

    bm25_scores = normalize_scores(
        bm25_results
    )

    combined_scores = {}

    for chunk_index in (
        set(vector_scores) |
        set(bm25_scores)
    ):

        vector_score = vector_scores.get(
            chunk_index,
            0
        )

        bm25_score = bm25_scores.get(
            chunk_index,
            0
        )

        hybrid_score = (
            0.5 * vector_score +
            0.5 * bm25_score
        )

        combined_scores[
            chunk_index
        ] = hybrid_score

    ranked_chunks = sorted(
        combined_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    results = []

    for chunk_index, score in ranked_chunks[:limit]:

        results.append({
            "chunk_index": chunk_index,
            "score": score,
            "text": chunks[chunk_index],
        })

    return results


def rerank_results(
    question,
    results,
    limit=5
):

    pairs = [
        [question, result["text"]]
        for result in results
    ]

    scores = reranker.predict(pairs)

    reranked = []

    for result, score in zip(
        results,
        scores
    ):

        reranked.append({
            "chunk_index":
                result["chunk_index"],
            "score": float(score),
            "text":
                result["text"],
        })

    reranked.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return reranked[:limit]


if __name__ == "__main__":

    question = input(
        "Enter your question: "
    ).strip()

    if not question:
        print("Question cannot be empty.")
        exit()

    print("\nFetching document chunks...")

    chunks = get_document_chunks()

    print(
        f"Loaded {len(chunks)} chunks."
    )

    print("\nBuilding BM25 index...")

    bm25 = build_bm25(chunks)

    print("BM25 index created.")

    print("\nRunning hybrid search...")

    hybrid_results = hybrid_search(
        question,
        chunks,
        bm25,
        limit=10
    )

    print(
        f"Hybrid candidates: "
        f"{len(hybrid_results)}"
    )

    print("\nReranking candidates...")

    results = rerank_results(
        question,
        hybrid_results,
        limit=5
    )

    print("\n================================")
    print("RERANKED RESULTS")
    print("================================")

    for i, result in enumerate(
        results,
        start=1
    ):

        print(f"\nResult {i}")

        print(
            "Chunk Index:",
            result["chunk_index"]
        )

        print(
            "Reranker Score:",
            round(
                result["score"],
                4
            )
        )

        print("Text:")

        print(
            result["text"][:500]
        )