import json
import os
import sys

import requests

from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from google import genai
from rank_bm25 import BM25Okapi


# =========================================
# PATH & ENVIRONMENT
# =========================================

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / "ai-service" / ".env"

load_dotenv(ENV_PATH)


# =========================================
# CONFIGURATION
# =========================================

DOCUMENT_ID = "6a9bbad0d9e733633c002d03"

BACKEND_URL = "http://localhost:5000"

COLLECTION_NAME = "policy_documents"

TOP_K = 5
CANDIDATE_K = 20


# =========================================
# JWT TOKEN
# =========================================

AUTH_TOKEN = input("Enter your JWT token: ").strip()

if not AUTH_TOKEN:
    print("JWT token is required.")
    sys.exit()


# =========================================
# LOAD QUESTIONS
# =========================================

with open(
    "questions_cleaned.json",
    "r",
    encoding="utf-8"
) as file:

    questions = json.load(file)


# =========================================
# FETCH DOCUMENT CHUNKS
# =========================================

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


# =========================================
# VALIDATE CHUNKS
# =========================================

if len(chunks) == 0:

    print("No document chunks found.")

    sys.exit()


# =========================================
# CONNECT TO QDRANT
# =========================================

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)


# =========================================
# CONNECT TO GEMINI
# =========================================

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# =========================================
# PREPARE BM25
# =========================================

tokenized_chunks = [

    chunk.lower().split()

    for chunk in chunks

]

bm25 = BM25Okapi(tokenized_chunks)


# =========================================
# METRIC CALCULATION
# =========================================

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


# =========================================
# SCORE NORMALIZATION
# =========================================

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


# =========================================
# HYBRID SEARCH
# =========================================

def hybrid_search(question):


    # -------------------------------------
    # VECTOR SEARCH
    # -------------------------------------

    embedding_response = gemini.models.embed_content(

        model="gemini-embedding-001",

        contents=question,

    )


    query_embedding = (

        embedding_response

        .embeddings[0]

        .values

    )


    # -------------------------------------
    # DOCUMENT FILTER
    # -------------------------------------

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


    vector_scores = [

        (

            result.payload["chunk_index"],

            result.score

        )

        for result in vector_results.points

    ]


    # -------------------------------------
    # BM25 SEARCH
    # -------------------------------------

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


    # -------------------------------------
    # NORMALIZE SCORES
    # -------------------------------------

    vector_normalized = normalize_scores(

        vector_scores

    )


    bm25_normalized = normalize_scores(

        bm25_results

    )


    # -------------------------------------
    # COMBINE SCORES
    # 70% Vector + 30% BM25
    # -------------------------------------

    combined_scores = {}


    # Vector contribution

    for chunk_id, score in vector_normalized.items():

        combined_scores[chunk_id] = (

            0.7 * score

        )


    # BM25 contribution

    for chunk_id, score in bm25_normalized.items():

        combined_scores[chunk_id] = (

            combined_scores.get(
                chunk_id,
                0
            )

            + 0.3 * score

        )


    # -------------------------------------
    # FINAL RANKING
    # -------------------------------------

    ranked = sorted(

        combined_scores.items(),

        key=lambda x: x[1],

        reverse=True

    )


    # -------------------------------------
    # RETURN TOP 5
    # -------------------------------------

    return [

        chunk_id

        for chunk_id, score

        in ranked[:TOP_K]

    ]


# =========================================
# EVALUATION
# =========================================

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


    # -------------------------------------
    # HYBRID RETRIEVAL
    # -------------------------------------

    retrieved_chunks = hybrid_search(

        query

    )


    # -------------------------------------
    # CALCULATE METRICS
    # -------------------------------------

    recall, precision, mrr = calculate_metrics(

        retrieved_chunks,

        relevant_chunks

    )


    # -------------------------------------
    # ADD TO TOTALS
    # -------------------------------------

    total_recall += recall

    total_precision += precision

    total_mrr += mrr


    # -------------------------------------
    # SAVE QUESTION RESULT
    # -------------------------------------

    question_results.append({

        "id": question_id,

        "question": query,

        "retrieved_chunks": retrieved_chunks,

        "relevant_chunks": relevant_chunks,

        "recall_at_5": recall,

        "precision_at_5": precision,

        "mrr": mrr

    })


    # -------------------------------------
    # PRINT RESULTS
    # -------------------------------------

    print("\n================================")

    print(
        f"Question {question_id}"
    )

    print("================================")

    print(query)

    print(
        "Retrieved:",
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


# =========================================
# OVERALL RESULTS
# =========================================

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


# =========================================
# PRINT OVERALL RESULTS
# =========================================

print("\n================================")

print("HYBRID OVERALL RESULTS")

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


# =========================================
# SAVE RESULTS
# =========================================

results = {

    "method": "Hybrid",

    "document_id": DOCUMENT_ID,

    "top_k": TOP_K,

    "candidate_k": CANDIDATE_K,

    "vector_weight": 0.7,

    "bm25_weight": 0.3,

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

    "hybrid_results.json",

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
    "hybrid_results.json"
)