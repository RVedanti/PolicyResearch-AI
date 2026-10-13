import { useState } from "react";
import { formatDate } from "../api";
import FormattedText from "./FormattedText";

// One past question + answer, used on the History and Saved pages.
export default function AnswerItem({ item, onOpen, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="entry">
      <button
        type="button"
        className="entry-question"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {item.question}
      </button>

      <p className="entry-meta">
        {item.project?.title || "Unknown project"}
        <span aria-hidden="true"> · </span>
        {item.document?.originalName || "Document"}
        <span aria-hidden="true"> · </span>
        {formatDate(item.createdAt, true)}
      </p>

      {expanded && (
        <div className="entry-answer">
          <FormattedText text={item.answer} sources={item.sources} />
        </div>
      )}

      <div className="entry-actions">
        <button
          type="button"
          className="link-button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide answer" : "Read answer"}
        </button>
        <button type="button" className="link-button" onClick={() => onOpen(item)}>
          Open in Ask →
        </button>
        {onRemove && (
          <button
            type="button"
            className="link-button link-danger"
            onClick={() => onRemove(item)}
          >
            Remove
          </button>
        )}
      </div>
    </article>
  );
}
