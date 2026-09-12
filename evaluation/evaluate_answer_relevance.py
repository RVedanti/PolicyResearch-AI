import json
import os
import re
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


BASE_DIR = Path(__file__).resolve().parent

QUESTIONS_FILE = BASE_DIR / "questions_cleaned.json"
ANSWERS_FILE = BASE_DIR / "rag_answers.json"
OUTPUT_FILE = BASE_DIR / "answer_relevance.json"


def clean_text(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def calculate_score(question, answer):
    question_clean = clean_text(question)
    answer_clean = clean_text(answer)

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2)
    )

    vectors = vectorizer.fit_transform(
        [question_clean, answer_clean]
    )

    similarity = cosine_similarity(
        vectors[0:1],
        vectors[1:2]
    )[0][0]

    # Convert similarity to 1–5 relevance score
    if similarity >= 0.45:
        score = 5
    elif similarity >= 0.30:
        score = 4
    elif similarity >= 0.18:
        score = 3
    elif similarity >= 0.08:
        score = 2
    else:
        score = 1

    return score, similarity


# -----------------------------
# Load files
# -----------------------------

with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
    questions = json.load(f)

with open(ANSWERS_FILE, "r", encoding="utf-8") as f:
    answers = json.load(f)

if OUTPUT_FILE.exists():
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        existing_results = json.load(f)
else:
    existing_results = []


# -----------------------------
# Existing evaluations
# -----------------------------

evaluated_ids = {
    item["id"]
    for item in existing_results
}

print(f"Loaded {len(questions)} questions.")
print(f"Already evaluated: {len(evaluated_ids)}")


# -----------------------------
# Create answer lookup
# -----------------------------

answer_lookup = {
    item["id"]: item
    for item in answers
}


remaining = [
    q for q in questions
    if q["id"] not in evaluated_ids
]

print(f"Remaining questions: {len(remaining)}")
print()


# -----------------------------
# Evaluate remaining questions
# -----------------------------

for index, question_data in enumerate(remaining, start=1):

    question_id = question_data["id"]
    question = question_data["question"]

    answer_data = answer_lookup.get(question_id)

    if not answer_data:
        print(f"Question {question_id}: answer not found.")
        continue

    answer = answer_data.get("answer", "")

    print(
        f"[{index}/{len(remaining)}] "
        f"Evaluating Question {question_id}..."
    )

    score, similarity = calculate_score(
        question,
        answer
    )

    result = {
        "id": question_id,
        "question": question,
        "score": score,
        "similarity": round(float(similarity), 4),
        "reason": (
            "Local TF-IDF cosine similarity was used to estimate "
            "how closely the generated answer matches the question."
        )
    }

    existing_results.append(result)

    # Save after every question
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(
            existing_results,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        f"Score: {score}/5 "
        f"(similarity: {similarity:.4f})"
    )
    print("Progress saved.")
    print()


# -----------------------------
# Final summary
# -----------------------------

print("================================")
print("ANSWER RELEVANCE EVALUATION")
print("================================")
print(f"Evaluated: {len(existing_results)}/50")
print(f"Remaining: {50 - len(existing_results)}")
print(f"Saved to: {OUTPUT_FILE}")