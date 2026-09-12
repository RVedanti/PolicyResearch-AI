import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from google import genai
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder


# ==========================================
# Environment
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / "ai-service" / ".env"

load_dotenv(ENV_PATH)


# ==========================================
# Configuration
# ==========================================

DOCUMENT_ID = "6a9bbad0d9e733633c002d03"

BACKEND_URL = "http://localhost:5000"

COLLECTION_NAME = "policy_documents"

CANDIDATE_K = 10
TOP_K = 5


# ==========================================
# JWT
# ==========================================

AUTH_TOKEN = input("Enter your JWT token: ").strip()

if not AUTH_TOKEN:
    print("JWT token is required.")
    sys.exit()


# ==========================================
# Load evaluation questions
# ==========================================

questions_path = (
    BASE_DIR
    / "evaluation"
    / "questions_cleaned.json"
)

with open(
    questions_path,
    "r",
    encoding="utf-8"
) as file:

    questions = json.load(file)


# ==========================================
# Fetch document chunks
# ==========================================

url = (
    f"{BACKEND_URL}/api/documents/"
    f"{DOCUMENT_ID}/chunks"
)

response = requests.get(
    url,
    headers={
        "Authorization": f"Bearer {AUTH_TOKEN}"
    },
)


if response.status_code != 200:

    print("Failed to fetch document chunks.")

    print("Status:", response.status_code)

    print(response.text)

    sys.exit()


data = response.json()


if not data.get("success"):

    print("Backend returned an error.")

    print(data)

    sys.exit()


chunks = data["document"]["chunks"]


print(
    f"\nLoaded {len(questions)} evaluation questions."
)

print(
    f"Loaded {len(chunks)} document chunks."
)

print(
    f"Evaluation document: {DOCUMENT_ID}"
)


# ==========================================
# Validate chunks
# ==========================================

if not chunks:

    print("No document chunks found.")

    sys.exit()


# ==========================================
# Initialize Qdrant + Gemini
# ==========================================

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# ==========================================
# BM25
# ==========================================

tokenized_chunks = [

    chunk.lower().split()

    for chunk in chunks

]

bm25 = BM25Okapi(tokenized_chunks)


# ==========================================
# Cross Encoder
# ==========================================

print("\nLoading reranker model...")

reranker = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)

print("Reranker model loaded.")


# ==========================================
# Normalize scores
# ==========================================

def normalize_scores(results):

    if not results:

        return {}


    scores = [

        score

        for _, score in results

    ]


    min_score = min(scores)

    max_score = max(scores)


    normalized = {}


    for chunk_id, score in results:

        if max_score == min_score:

            normalized[chunk_id] = 0

        else:

            normalized[chunk_id] = (

                (score - min_score)
                / (max_score - min_score)

            )


    return normalized


# ==========================================
# Hybrid candidates
# ==========================================

def get_hybrid_candidates(question):


    # --------------------------------------
    # Vector search
    # --------------------------------------

    embedding_response = (
        gemini.models.embed_content(

            model="gemini-embedding-001",

            contents=question,

        )
    )


    query_embedding = (

        embedding_response

        .embeddings[0]

        .values

    )


    # --------------------------------------
    # Document filter
    # --------------------------------------

    document_filter = Filter(

        must=[

            FieldCondition(

                key="document_id",

                match=MatchValue(

                    value=DOCUMENT_ID

                ),

            )

        ]

    )


    vector_results = qdrant.query_points(

        collection_name=COLLECTION_NAME,

        query=query_embedding,

        limit=CANDIDATE_K,

        query_filter=document_filter,

        with_payload=True,

    )


    vector_results_list = [

        (

            result.payload["chunk_index"],

            result.score

        )

        for result in vector_results.points

    ]


    # --------------------------------------
    # BM25 search
    # --------------------------------------

    query_tokens = question.lower().split()


    bm25_scores = bm25.get_scores(

        query_tokens

    )


    ranked_indices = sorted(

        range(len(bm25_scores)),

        key=lambda i: bm25_scores[i],

        reverse=True

    )


    bm25_results = [

        (

            index,

            bm25_scores[index]

        )

        for index in ranked_indices[
            :CANDIDATE_K
        ]

    ]


    # --------------------------------------
    # Normalize
    # --------------------------------------

    vector_normalized = normalize_scores(

        vector_results_list

    )


    bm25_normalized = normalize_scores(

        bm25_results

    )


    # --------------------------------------
    # Combine 50% Vector + 50% BM25
    # --------------------------------------

    combined_scores = {}


    for chunk_id, score in vector_normalized.items():

        combined_scores[chunk_id] = (

            0.5 * score

        )


    for chunk_id, score in bm25_normalized.items():

        combined_scores[chunk_id] = (

            combined_scores.get(
                chunk_id,
                0
            )

            + 0.5 * score

        )


    # --------------------------------------
    # Rank candidates
    # --------------------------------------

    ranked = sorted(

        combined_scores.items(),

        key=lambda x: x[1],

        reverse=True

    )


    return [

        chunk_id

        for chunk_id, score

        in ranked[:CANDIDATE_K]

    ]


# ==========================================
# Reranking
# ==========================================

def rerank(question, candidate_ids):

    pairs = [

        [

            question,

            chunks[chunk_id]

        ]

        for chunk_id in candidate_ids

    ]


    scores = reranker.predict(pairs)


    ranked = sorted(

        zip(candidate_ids, scores),

        key=lambda x: x[1],

        reverse=True

    )


    return [

        chunk_id

        for chunk_id, score

        in ranked[:TOP_K]

    ]


# ==========================================
# Metrics
# ==========================================

def calculate_metrics(retrieved, relevant):

    retrieved_set = set(retrieved)

    relevant_set = set(relevant)


    # Recall@5

    recall = (

        len(retrieved_set & relevant_set)
        / len(relevant_set)

        if relevant_set

        else 0

    )


    # Precision@5

    precision = (

        len(retrieved_set & relevant_set)
        / len(retrieved_set)

        if retrieved_set

        else 0

    )


    # MRR

    mrr = 0


    for rank, chunk_id in enumerate(

        retrieved,

        start=1

    ):

        if chunk_id in relevant_set:

            mrr = 1 / rank

            break


    return recall, precision, mrr


# ==========================================
# Evaluation
# ==========================================

total_recall = 0

total_precision = 0

total_mrr = 0


question_results = []


for question in questions:

    question_id = question["id"]

    query = question["question"]

    relevant_chunks = question[
        "relevant_chunks"
    ]


    # --------------------------------------
    # Hybrid candidates
    # --------------------------------------

    hybrid_candidates = (
        get_hybrid_candidates(query)
    )


    # --------------------------------------
    # Cross-Encoder reranking
    # --------------------------------------

    retrieved_chunks = rerank(

        query,

        hybrid_candidates

    )


    # --------------------------------------
    # Metrics
    # --------------------------------------

    recall, precision, mrr = calculate_metrics(

        retrieved_chunks,

        relevant_chunks

    )


    total_recall += recall

    total_precision += precision

    total_mrr += mrr


    # --------------------------------------
    # Save question result
    # --------------------------------------

    question_results.append({

        "id": question_id,

        "question": query,

        "hybrid_candidates": hybrid_candidates,

        "retrieved_chunks": retrieved_chunks,

        "relevant_chunks": relevant_chunks,

        "recall_at_5": recall,

        "precision_at_5": precision,

        "mrr": mrr

    })


    # --------------------------------------
    # Print
    # --------------------------------------

    print("\n================================")

    print(
        f"Question {question_id}"
    )

    print("================================")

    print(query)

    print(
        "Hybrid candidates:",
        hybrid_candidates
    )

    print(
        "Reranked:",
        retrieved_chunks
    )

    print(
        "Relevant:",
        relevant_chunks
    )

    print(
        "Recall@5:",
        round(recall, 4)
    )

    print(
        "Precision@5:",
        round(precision, 4)
    )

    print(
        "MRR:",
        round(mrr, 4)
    )


# ==========================================
# Final Results
# ==========================================

count = len(questions)


average_recall = (

    total_recall / count

)


average_precision = (

    total_precision / count

)


average_mrr = (

    total_mrr / count

)


print("\n================================")

print("HYBRID + RERANKING RESULTS")

print("================================")


print(

    "Average Recall@5:",

    round(
        average_recall,
        4
    )

)


print(

    "Average Precision@5:",

    round(
        average_precision,
        4
    )

)


print(

    "Average MRR:",

    round(
        average_mrr,
        4
    )

)


# ==========================================
# Save results
# ==========================================

results = {

    "method": "Hybrid + Cross-Encoder",

    "document_id": DOCUMENT_ID,

    "candidate_k": CANDIDATE_K,

    "top_k": TOP_K,

    "hybrid_vector_weight": 0.5,

    "hybrid_bm25_weight": 0.5,

    "questions_count": count,

    "Recall@5": round(
        average_recall,
        4
    ),

    "Precision@5": round(
        average_precision,
        4
    ),

    "MRR": round(
        average_mrr,
        4
    ),

    "questions": question_results

}


with open(

    "reranking_results.json",

    "w",

    encoding="utf-8"

) as file:

    json.dump(

        results,

        file,

        indent=2,

        ensure_ascii=False

    )


print(
    "\nResults saved to "
    "reranking_results.json"
)