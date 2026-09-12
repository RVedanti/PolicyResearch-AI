import json
import sys
from pathlib import Path


# ==========================================
# Configuration
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

BASELINE_FILE = BASE_DIR / "baseline_results.json"

RESULT_FILES = {
    "Vector Search": "vector_results.json",
    "BM25": "bm25_results.json",
    "Hybrid": "hybrid_results.json",
    "Hybrid + Cross-Encoder": "reranking_results.json",
}


# ==========================================
# Load JSON
# ==========================================

def load_json(path):

    with open(
        path,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


# ==========================================
# Main
# ==========================================

def main():

    baseline = load_json(
        BASELINE_FILE
    )

    regression_found = False


    print("\n========================================")

    print("PERFORMANCE REGRESSION CHECK")

    print("========================================")


    for method, filename in RESULT_FILES.items():

        result_path = BASE_DIR / filename


        if not result_path.exists():

            print(
                f"\nERROR: Missing {filename}"
            )

            regression_found = True

            continue


        current = load_json(
            result_path
        )


        print(
            f"\n{method}"
        )

        print("-" * 40)


        for metric in [
            "Recall@5",
            "Precision@5",
            "MRR"
        ]:

            baseline_value = baseline[
                method
            ][metric]

            current_value = current[
                metric
            ]


            difference = (
                current_value
                - baseline_value
            )


            print(

                f"{metric}: "
                f"{current_value:.4f} "
                f"(baseline: "
                f"{baseline_value:.4f}, "
                f"change: "
                f"{difference:+.4f})"

            )


            # Any decrease is considered
            # a regression.

            if current_value < baseline_value:

                print(
                    f"WARNING: {metric} "
                    f"decreased."
                )

                regression_found = True


    print(
        "\n========================================"
    )


    if regression_found:

        print(
            "RESULT: PERFORMANCE REGRESSION DETECTED"
        )

        print(
            "========================================"
        )

        sys.exit(1)


    print(
        "RESULT: ALL METRICS PASSED"
    )

    print(
        "========================================"
    )


if __name__ == "__main__":

    main()