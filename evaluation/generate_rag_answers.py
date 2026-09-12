import json
import os
import sys

from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from google import genai


# =========================
# PATHS / CONFIG
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / "ai-service" / ".env"

load_dotenv(ENV_PATH)

COLLECTION_NAME = "policy_documents"
TOP_K = 5


# =========================
# AUTH
# =========================

# JWT is no longer needed here because
# this script directly accesses Qdrant.
# Keep this section removed.


# =========================
# LOAD QUESTIONS
# =========================

EVALUATION_DIR = Path(__file__).parent

questions_path = EVALUATION_DIR / "questions_cleaned.json"
answers_path = EVALUATION_DIR / "rag_answers.json"

with open(questions_path, "r", encoding="utf-8") as file:
    questions = json.load(file)

print(f"Loaded {len(questions)} evaluation questions.")


# =========================
# LOAD EXISTING ANSWERS
# =========================

if answers_path.exists():

    with open(answers_path, "r", encoding="utf-8") as file:
        existing_answers = json.load(file)

else:
    existing_answers = []


# Convert existing results into dictionary by question ID
answers_by_id = {
    item["id"]: item
    for item in existing_answers
}

successful_count = sum(
    1 for item in existing_answers
    if item.get("answer")
)

failed_count = len(existing_answers) - successful_count

print(f"Existing successful answers: {successful_count}")
print(f"Existing failed answers: {failed_count}")


# =========================
# CLIENTS
# =========================

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# =========================
# RETRIEVAL
# =========================

def retrieve_documents(question):

    response = gemini.models.embed_content(
        model="gemini-embedding-001",
        contents=question,
    )

    query_embedding = response.embeddings[0].values

    results = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=TOP_K,
        with_payload=True,
    )

    return results.points


# =========================
# ANSWER GENERATION
# =========================

def generate_answer(question, results):

    context_parts = []

    for result in results:

        chunk_index = result.payload.get("chunk_index")
        text = result.payload.get("text", "")

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


# =========================
# SAVE FUNCTION
# =========================

def save_results():

    # Keep results in question order
    ordered_results = []

    for question in questions:

        question_id = question["id"]

        if question_id in answers_by_id:
            ordered_results.append(
                answers_by_id[question_id]
            )

    with open(answers_path, "w", encoding="utf-8") as file:
        json.dump(
            ordered_results,
            file,
            indent=2,
            ensure_ascii=False
        )


# =========================
# PROCESS ONLY FAILED
# =========================

remaining_questions = [
    question
    for question in questions
    if not answers_by_id.get(question["id"], {}).get("answer")
]

print(f"\nRemaining questions to process: {len(remaining_questions)}")


for position, item in enumerate(
    remaining_questions,
    start=1
):

    question_id = item["id"]
    question = item["question"]

    print(
        f"\n[{position}/{len(remaining_questions)}] "
        f"Processing Question {question_id}..."
    )

    try:

        # -------------------------
        # Retrieve
        # -------------------------

        retrieved = retrieve_documents(question)

        retrieved_chunks = []

        for result in retrieved:

            retrieved_chunks.append({
                "chunk_id": result.payload.get("chunk_index"),
                "score": result.score,
                "text": result.payload.get("text", "")
            })

        print(
            "Retrieved:",
            [
                result["chunk_id"]
                for result in retrieved_chunks
            ]
        )

        # -------------------------
        # Generate answer
        # -------------------------

        answer = generate_answer(
            question,
            retrieved
        )

        # -------------------------
        # Store result
        # -------------------------

        answers_by_id[question_id] = {
            "id": question_id,
            "question": question,
            "relevant_chunks": item.get(
                "relevant_chunks",
                []
            ),
            "retrieved_chunks": retrieved_chunks,
            "answer": answer
        }

        # Save immediately
        save_results()

        print("Answer generated successfully.")
        print("Progress saved.")

    except Exception as error:

        print("ERROR:", error)

        # Keep failed question in file
        answers_by_id[question_id] = {
            "id": question_id,
            "question": question,
            "relevant_chunks": item.get(
                "relevant_chunks",
                []
            ),
            "retrieved_chunks": [],
            "answer": "",
            "error": str(error)
        }

        save_results()

        print("Failure saved. Continuing...")


# =========================
# FINAL STATUS
# =========================

successful_count = sum(
    1
    for item in answers_by_id.values()
    if item.get("answer")
)

failed_count = len(questions) - successful_count

print("\n================================")
print("RAG ANSWER GENERATION COMPLETE")
print("================================")

print(f"Total questions: {len(questions)}")
print(f"Successful: {successful_count}")
print(f"Failed: {failed_count}")
print(f"Saved to: {answers_path}")