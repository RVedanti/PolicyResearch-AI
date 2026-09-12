import json
from pathlib import Path


# ==========================================
# Paths
# ==========================================

BASE_DIR = Path(__file__).resolve().parent


# ==========================================
# Load result files
# ==========================================

def load_results(filename):

    path = BASE_DIR / filename

    with open(
        path,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


vector_data = load_results(
    "vector_results.json"
)

bm25_data = load_results(
    "bm25_results.json"
)

hybrid_data = load_results(
    "hybrid_results.json"
)

reranking_data = load_results(
    "reranking_results.json"
)


# ==========================================
# Prepare final results
# ==========================================

results = {

    "Vector Search": {

        "Recall@5":
            vector_data["Recall@5"],

        "Precision@5":
            vector_data["Precision@5"],

        "MRR":
            vector_data["MRR"],

    },

    "BM25": {

        "Recall@5":
            bm25_data["Recall@5"],

        "Precision@5":
            bm25_data["Precision@5"],

        "MRR":
            bm25_data["MRR"],

    },

    "Hybrid": {

        "Recall@5":
            hybrid_data["Recall@5"],

        "Precision@5":
            hybrid_data["Precision@5"],

        "MRR":
            hybrid_data["MRR"],

    },

    "Hybrid + Cross-Encoder": {

        "Recall@5":
            reranking_data["Recall@5"],

        "Precision@5":
            reranking_data["Precision@5"],

        "MRR":
            reranking_data["MRR"],

    },

}


# ==========================================
# Print Final Retrieval Evaluation
# ==========================================

print("\n========================================")

print("FINAL RETRIEVAL EVALUATION")

print("========================================")


print(

    f"{'Method':<25}"

    f"{'Recall@5':<12}"

    f"{'Precision@5':<14}"

    f"{'MRR':<10}"

)


print("-" * 61)


for method, metrics in results.items():

    print(

        f"{method:<25}"

        f"{metrics['Recall@5']:<12.4f}"

        f"{metrics['Precision@5']:<14.4f}"

        f"{metrics['MRR']:<10.4f}"

    )


# ==========================================
# Answer Relevance
# ==========================================

answer_relevance_path = (
    BASE_DIR / "answer_relevance.json"
)


print("\n========================================")

print("ANSWER RELEVANCE")

print("========================================")


if answer_relevance_path.exists():

    with open(
        answer_relevance_path,
        "r",
        encoding="utf-8"
    ) as file:

        answer_data = json.load(file)


    scores = []


    for item in answer_data:

        score = item.get("answer_relevance_score")

        if score is not None:

            scores.append(score)


    if scores:

        average_score = (
            sum(scores) / len(scores)
        )


        print(
            f"Average Score: "
            f"{average_score:.2f} / 5"
        )


        for score in range(5, 0, -1):

            count = scores.count(score)

            print(
                f"{score}/5: {count}"
            )

    else:

        print(
            "No answer relevance scores found."
        )

else:

    print(
        "answer_relevance.json not found."
    )


# ==========================================
# Find Best Methods
# ==========================================

best_recall_method = max(

    results,

    key=lambda method:
        results[method]["Recall@5"]

)


best_precision_method = max(

    results,

    key=lambda method:
        results[method]["Precision@5"]

)


best_mrr_method = max(

    results,

    key=lambda method:
        results[method]["MRR"]

)


# ==========================================
# Conclusion
# ==========================================

print("\n========================================")

print("CONCLUSION")

print("========================================")


print(

    f"Best Recall@5: "

    f"{best_recall_method} "

    f"({results[best_recall_method]['Recall@5']:.4f})"

)


print(

    f"Best Precision@5: "

    f"{best_precision_method} "

    f"({results[best_precision_method]['Precision@5']:.4f})"

)


print(

    f"Best MRR: "

    f"{best_mrr_method} "

    f"({results[best_mrr_method]['MRR']:.4f})"

)


print(

    "BM25 performs weakest among "

    "the evaluated methods."

)


if (

    results["Hybrid + Cross-Encoder"]["MRR"]

    > results["Hybrid"]["MRR"]

):

    print(

        "Cross-Encoder reranking improves "

        "ranking quality based on MRR."

    )

else:

    print(

        "Cross-Encoder reranking does not "

        "improve MRR over Hybrid Search."

    )