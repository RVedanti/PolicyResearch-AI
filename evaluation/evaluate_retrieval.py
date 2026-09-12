import json
import os

from dotenv import load_dotenv
from google import genai
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue


# -------------------------
# Load environment
# -------------------------

load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "ai-service",
        ".env"
    )
)


# -------------------------
# Configuration
# -------------------------

COLLECTION_NAME = "policy_documents"

EVALUATION_DOCUMENT_ID = (
    "6a9bbad0d9e733633c002d03"
)

TOP_K = 5


# -------------------------
# Clients
# -------------------------

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# -------------------------
# Load evaluation questions
# -------------------------

def load_questions():

    path = os.path.join(
        os.path.dirname(__file__),
        "questions_cleaned.json"
    )

    with open(
        path,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


# -------------------------
# Vector Search
# -------------------------

def vector_search(
    question,
    limit=TOP_K
):

    response = gemini.models.embed_content(
        model="gemini-embedding-001",
        contents=question,
    )

    query_embedding = (
        response.embeddings[0].values
    )

    results = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,

        query_filter=Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(
                        value=EVALUATION_DOCUMENT_ID
                    ),
                )
            ]
        ),

        limit=limit,
        with_payload=True,
    )

    return results.points


# -------------------------
# Recall@K
# -------------------------

def calculate_recall_at_k(
    retrieved_chunks,
    relevant_chunks,
    k
):

    retrieved = retrieved_chunks[:k]

    retrieved_set = set(retrieved)

    relevant = set(relevant_chunks)

    if not relevant:
        return 0.0

    hits = len(
        retrieved_set & relevant
    )

    return hits / len(relevant)


# -------------------------
# Precision@K
# -------------------------

def calculate_precision_at_k(
    retrieved_chunks,
    relevant_chunks,
    k
):

    retrieved = retrieved_chunks[:k]

    retrieved_set = set(retrieved)

    relevant = set(relevant_chunks)

    if not retrieved_set:
        return 0.0

    hits = len(
        retrieved_set & relevant
    )

    return hits / len(retrieved_set)


# -------------------------
# MRR
# -------------------------

def calculate_mrr(
    retrieved_chunks,
    relevant_chunks
):

    relevant = set(
        relevant_chunks
    )

    for rank, chunk in enumerate(
        retrieved_chunks,
        start=1
    ):

        if chunk in relevant:

            return 1 / rank

    return 0.0


# -------------------------
# Main
# -------------------------

def main():

    questions = load_questions()

    print(
        f"Loaded {len(questions)} "
        f"evaluation questions."
    )

    print(
        "Evaluation document:",
        EVALUATION_DOCUMENT_ID
    )

    total_recall = 0

    total_precision = 0

    total_mrr = 0

    question_results = []


    # -------------------------
    # Evaluate every question
    # -------------------------

    for item in questions:

        question = item["question"]

        relevant_chunks = item[
            "relevant_chunks"
        ]


        print(
            "\n================================"
        )

        print(
            f"Question {item['id']}"
        )

        print(
            "================================"
        )

        print(question)


        # -------------------------
        # Retrieve
        # -------------------------

        results = vector_search(
            question,
            limit=TOP_K
        )


        retrieved_chunks = [

            result.payload.get(
                "chunk_index"
            )

            for result in results

        ]


        print(
            "Retrieved:",
            retrieved_chunks
        )

        print(
            "Relevant:",
            relevant_chunks
        )


        # -------------------------
        # Metrics
        # -------------------------

        recall = calculate_recall_at_k(
            retrieved_chunks,
            relevant_chunks,
            TOP_K
        )


        precision = calculate_precision_at_k(
            retrieved_chunks,
            relevant_chunks,
            TOP_K
        )


        mrr = calculate_mrr(
            retrieved_chunks,
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


        # -------------------------
        # Add totals
        # -------------------------

        total_recall += recall

        total_precision += precision

        total_mrr += mrr


        # -------------------------
        # Save question result
        # -------------------------

        question_results.append({

            "id": item["id"],

            "question": question,

            "retrieved_chunks":
                retrieved_chunks,

            "relevant_chunks":
                relevant_chunks,

            "recall_at_5":
                recall,

            "precision_at_5":
                precision,

            "mrr":
                mrr

        })


    # -------------------------
    # Overall results
    # -------------------------

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


    print(
        "\n================================"
    )

    print(
        "VECTOR SEARCH OVERALL RESULTS"
    )

    print(
        "================================"
    )

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


    # -------------------------
    # Save results
    # -------------------------

    results = {

        "method": "Vector Search",

        "document_id":
            EVALUATION_DOCUMENT_ID,

        "top_k": TOP_K,

        "questions_count": count,

        "Recall@5":
            round(
                average_recall,
                4
            ),

        "Precision@5":
            round(
                average_precision,
                4
            ),

        "MRR":
            round(
                average_mrr,
                4
            ),

        "questions":
            question_results

    }


    output_path = os.path.join(
        os.path.dirname(__file__),
        "vector_results.json"
    )


    with open(
        output_path,
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
        "vector_results.json"
    )


# -------------------------
# Run
# -------------------------

if __name__ == "__main__":

    main()