export default function SearchBox({ value, onChange, placeholder, label }) {
  return (
    <label className="search">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

// True when every word of the query appears somewhere in the item's text.
export function matchesQuery(item, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [
    item.question,
    item.answer,
    item.project?.title,
    item.document?.originalName,
  ]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}
