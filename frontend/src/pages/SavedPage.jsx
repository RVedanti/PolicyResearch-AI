import { useState } from "react";
import { api, formatDate } from "../api";
import SearchBox, { matchesQuery } from "../components/SearchBox";
import { useToast } from "../components/Toast";
import useApiList from "../hooks/useApiList";

// Plain-text preview of an answer: no Markdown symbols or citation markers.
function excerpt(text) {
  return (text || "")
    .replace(/\s*\[Chunks? [\d,\s]+\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function SavedCard({ item, onOpen, onRemove }) {
  return (
    <article className="index-card">
      <p className="eyebrow">{item.project?.title || "Unknown project"}</p>
      <h2>
        <button type="button" onClick={() => onOpen(item)}>
          {item.question}
        </button>
      </h2>
      <p className="index-card-excerpt">{excerpt(item.answer)}</p>
      <footer>
        <span className="index-card-meta">
          {(item.document?.originalName || "Document").replace(/_/g, " ")}
          <br />
          {formatDate(item.createdAt)}
        </span>
        <span className="index-card-actions">
          <button type="button" className="link-button" onClick={() => onOpen(item)}>
            Open →
          </button>
          <button type="button" className="link-button link-danger" onClick={() => onRemove(item)}>
            Remove
          </button>
        </span>
      </footer>
    </article>
  );
}

export default function SavedPage({ onOpenAnswer, onNavigate, onStatsChanged }) {
  const showToast = useToast();
  const { loading, items, setItems } = useApiList("/saved", "savedAnswers");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const handleRemove = async (item) => {
    setError("");
    try {
      await api(`/saved/${item._id}`, { method: "DELETE" });
      setItems((previous) => previous.filter((saved) => saved._id !== item._id));
      showToast("Removed from saved");
      onStatsChanged();
    } catch (err) {
      console.error("Delete saved answer error:", err);
      setError(err.message || "Failed to remove saved answer");
    }
  };

  const filtered = items.filter((item) => matchesQuery(item, query));

  return (
    <div className="page page-wide">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your collection</p>
          <h1>Saved answers</h1>
          <p>
            {loading
              ? "Answers you bookmarked to come back to."
              : `${items.length} answer${items.length === 1 ? "" : "s"} kept for later.`}
          </p>
        </div>
        {items.length > 0 && (
          <SearchBox
            value={query}
            onChange={setQuery}
            label="Search saved answers"
            placeholder="Search saved answers…"
          />
        )}
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="card-grid">
          {[0, 1, 2].map((key) => (
            <div key={key} className="index-card skeleton-row" aria-hidden="true" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty empty-large">
          <h2>Nothing saved yet</h2>
          <p>Use “Save answer” under an answer to keep it here.</p>
          <button type="button" className="button button-primary" onClick={() => onNavigate("Ask")}>
            Ask a question
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">Nothing matches “{query}”.</div>
      ) : (
        <div className="card-grid">
          {filtered.map((item) => (
            <SavedCard key={item._id} item={item} onOpen={onOpenAnswer} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
