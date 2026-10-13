import { useState } from "react";
import AnswerItem from "../components/AnswerItem";
import SearchBox, { matchesQuery } from "../components/SearchBox";
import useApiList from "../hooks/useApiList";

function groupLabel(dateValue) {
  const date = new Date(dateValue);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.floor((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function groupByDate(items) {
  const groups = [];
  for (const item of items) {
    const label = groupLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export default function HistoryPage({ onOpenAnswer, onNavigate }) {
  const { loading, items } = useApiList("/history", "history");
  const [query, setQuery] = useState("");

  const filtered = items.filter((item) => matchesQuery(item, query));
  const groups = groupByDate(filtered);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your research</p>
          <h1>History</h1>
          <p>
            {loading
              ? "Every question you have asked, newest first."
              : `${items.length} question${items.length === 1 ? "" : "s"} asked so far.`}
          </p>
        </div>
        {items.length > 0 && (
          <SearchBox
            value={query}
            onChange={setQuery}
            label="Search history"
            placeholder="Search questions and answers…"
          />
        )}
      </header>

      {loading ? (
        <div className="list">
          {[0, 1, 2].map((key) => (
            <div key={key} className="row-card skeleton-row" aria-hidden="true" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty empty-large">
          <h2>No questions yet</h2>
          <p>Your questions and answers will appear here.</p>
          <button type="button" className="button button-primary" onClick={() => onNavigate("Ask")}>
            Ask a question
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">Nothing matches “{query}”.</div>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="history-group">
            <h2 className="group-label">
              {group.label}
              <span>{group.items.length}</span>
            </h2>
            <div className="list">
              {group.items.map((item) => (
                <AnswerItem key={item._id} item={item} onOpen={onOpenAnswer} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
