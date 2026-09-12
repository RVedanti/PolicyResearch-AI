import json
import sys

import requests
from rank_bm25 import BM25Okapi


# ==========================================
# Configuration
# ==========================================

DOCUMENT_ID = "6a9bbad0d9e733633c002d03"

BACKEND_URL = "http://localhost:5000"

TOP_K = 5


# ==========================================
# Get JWT token
# ==========================================

AUTH_TOKEN = input("Enter your JWT token: ").strip()

if not AUTH_TOKEN:
    print("JWT token is required.")
    sys.exit()


# ==========================================
# Load evaluation questions
# ==========================================

with open(
    "questions_cleaned.json",
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
    }
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
# Validate chunk count
# ==========================================

if len(chunks) == 0:

    print("No chunks found.")

    sys.exit()


# ==========================================
# Tokenize chunks
# ==========================================

tokenized_chunks = [

    chunk.lower().split()

    for chunk in chunks

]


# ==========================================
# Build BM25 index
# ==========================================

bm25 = BM25Okapi(tokenized_chunks)


# ==========================================
# Calculate metrics
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

    relevant_chunks = question["relevant_chunks"]


    # Tokenize query

    query_tokens = query.lower().split()


    # BM25 scores

    scores = bm25.get_scores(
        query_tokens
    )


    # Rank chunks

    ranked_indices = sorted(

        range(len(scores)),

        key=lambda i: scores[i],

        reverse=True

    )


    # Top 5

    retrieved_chunks = ranked_indices[
        :TOP_K
    ]


    # Metrics

    recall, precision, mrr = calculate_metrics(

        retrieved_chunks,

        relevant_chunks

    )


    total_recall += recall

    total_precision += precision

    total_mrr += mrr


    # Save question result

    question_results.append({

        "id": question_id,

        "question": query,

        "retrieved_chunks": retrieved_chunks,

        "relevant_chunks": relevant_chunks,

        "recall_at_5": recall,

        "precision_at_5": precision,

        "mrr": mrr

    })


    # Print result

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


# ==========================================
# Overall results
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


# ==========================================
# Print overall results
# ==========================================

print("\n================================")

print("BM25 OVERALL RESULTS")

print("================================")


print(
    "Average Recall@5:",
    round(average_recall, 4)
)


print(
    "Average Precision@5:",
    round(average_precision, 4)
)


print(
    "Average MRR:",
    round(average_mrr, 4)
)


# ==========================================
# Save results
# ==========================================

results = {

    "method": "BM25",

    "document_id": DOCUMENT_ID,

    "top_k": TOP_K,

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
    "bm25_results.json",
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
    "bm25_results.json"
)