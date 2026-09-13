import os
import requests
import sys
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from google import genai
from rank_bm25 import BM25Okapi


load_dotenv()

COLLECTION_NAME = "policy_documents"
BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "http://localhost:5000"
)

TOP_K = 5
CANDIDATE_K = 20


qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

AUTH_TOKEN = ""

# -----------------------------
# Fetch document chunks
# -----------------------------

def fetch_chunks(document_id):

    url = f"{BACKEND_URL}/api/documents/{document_id}/chunks"

    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}"
    }

    response = requests.get(
        url,
        headers=headers
    )

    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch chunks: "
            f"{response.status_code} - "
            f"{response.text}"
        )

    data = response.json()

    if not data.get("success"):
        raise Exception(
            data.get(
                "message",
                "Failed to fetch document chunks"
            )
        )

    return data["document"]["chunks"]
# -----------------------------
# BM25
# -----------------------------
def tokenize(text):
    return text.lower().split()


def normalize_scores(scores):
    if not scores:
        return []

    min_score = min(scores)
    max_score = max(scores)

    if max_score == min_score:
        return [1.0 for _ in scores]

    return [
        (score - min_score) / (max_score - min_score)
        for score in scores
    ]


# -----------------------------
# Hybrid Retrieval
# -----------------------------
def retrieve_documents(question, document_id, limit=TOP_K):

    chunks = fetch_chunks(document_id)

    # ---------- Vector Search ----------
    response = gemini.models.embed_content(
        model="gemini-embedding-001",
        contents=question,
    )

    query_embedding = response.embeddings[0].values

    vector_results = qdrant.query_points(
    collection_name=COLLECTION_NAME,
    query=query_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="document_id",
                match=MatchValue(value=document_id),
            )
        ]
    ),
    limit=CANDIDATE_K,
    with_payload=True,
).points

    vector_scores = {
        result.payload.get("chunk_index"): result.score
        for result in vector_results
    }

    # ---------- BM25 ----------
    tokenized_chunks = [
        tokenize(chunk)
        for chunk in chunks
    ]

    bm25 = BM25Okapi(tokenized_chunks)

    query_tokens = tokenize(question)

    bm25_scores = bm25.get_scores(query_tokens)

    # Top BM25 candidates
    bm25_top_indices = sorted(
        range(len(bm25_scores)),
        key=lambda i: bm25_scores[i],
        reverse=True
    )[:CANDIDATE_K]

    bm25_candidate_scores = {
        index: bm25_scores[index]
        for index in bm25_top_indices
    }

    # ---------- Normalize ----------
    vector_ids = list(vector_scores.keys())
    vector_values = [
        vector_scores[i]
        for i in vector_ids
    ]

    normalized_vector = normalize_scores(vector_values)

    vector_normalized = dict(
        zip(vector_ids, normalized_vector)
    )

    bm25_ids = list(bm25_candidate_scores.keys())
    bm25_values = [
        bm25_candidate_scores[i]
        for i in bm25_ids
    ]

    normalized_bm25 = normalize_scores(bm25_values)

    bm25_normalized = dict(
        zip(bm25_ids, normalized_bm25)
    )

    # ---------- Combine ----------
    all_ids = set(vector_normalized) | set(bm25_normalized)

    hybrid_scores = {}

    for chunk_id in all_ids:

        vector_score = vector_normalized.get(
            chunk_id,
            0
        )

        bm25_score = bm25_normalized.get(
            chunk_id,
            0
        )

        hybrid_scores[chunk_id] = (
            0.7 * vector_score +
            0.3 * bm25_score
        )

    # ---------- Top K ----------
    top_chunk_ids = sorted(
        hybrid_scores,
        key=hybrid_scores.get,
        reverse=True
    )[:limit]

    # ---------- Build results ----------
    results = []

    for chunk_id in top_chunk_ids:

        # Get Qdrant payload if available
        qdrant_result = next(
            (
                r for r in vector_results
                if r.payload.get("chunk_index") == chunk_id
            ),
            None
        )

        if qdrant_result:
            text = qdrant_result.payload.get(
                "text",
                ""
            )
        else:
            text = chunks[chunk_id]

        results.append({
            "chunk_index": chunk_id,
            "score": hybrid_scores[chunk_id],
            "text": text
        })

    return results


# -----------------------------
# Generate Answer
# -----------------------------
def generate_answer(question, results):

    context_parts = []

    for result in results:

        chunk_index = result["chunk_index"]
        text = result["text"]

        context_parts.append(
            f"[Chunk {chunk_index}]\n{text}"
        )

    context = "\n\n".join(context_parts)

    prompt = f"""
You are a research assistant helping users analyze policy documents.

Answer the user's question using ONLY the provided document context.

IMPORTANT RULES:
1. Do not use outside knowledge.
2. Do not invent facts.
3. Every important claim must have a citation.
4. Cite the chunk number using this format: [Chunk X].
5. If multiple chunks support a claim, cite all relevant chunks.
6. If the context does not contain enough information, clearly say so.

User Question:
{question}

Document Context:
{context}

Write a clear, concise research-oriented answer with citations.

Answer:
"""

    response = gemini.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text

# -----------------------------
# Main test
# 
if __name__ == "__main__":

    AUTH_TOKEN = input("Enter your JWT token: ").strip()

    if not AUTH_TOKEN:
        print("JWT token is required.")
        sys.exit()

    question = input(
        "Enter your question: "
    ).strip()

    if not question:
        print("Question cannot be empty.")
        sys.exit()

    document_id = input(
        "Enter Document ID: "
    ).strip()

    if not document_id:
        print("Document ID is required.")
        sys.exit()

    print("\nRetrieving relevant document chunks...")

    results = retrieve_documents(
        question,
        document_id
    )

    print(f"Retrieved {len(results)} chunks.")

    print("\nGenerating answer...")

    answer = generate_answer(
        question,
        results
    )

    print("\n================================")
    print("RAG ANSWER")
    print("================================")

    print(answer)

    print("\n================================")
    print("RETRIEVED SOURCES")
    print("================================")

    for i, result in enumerate(results, start=1):
        print(
            f"Source {i} | "
            f"Chunk {result['chunk_index']} | "
            f"Score: {result['score']:.4f}"
        )