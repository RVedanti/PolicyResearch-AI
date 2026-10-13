// Renders AI answers that use light Markdown (**bold**, "- " bullets,
// "1. " numbered lists, "## " headings) as proper elements, without
// using innerHTML.
//
// Citations written by the AI service as "[Chunk 3]" or "[Chunk 3, 7]"
// become small numbered links. When `sources` is given, the number shown
// is the source's position in the list, and clicking it calls `onCite`.

const CITATION = /(\[Chunks? [\d,\s]+\])/g;
const IS_CITATION = /^\[Chunks? [\d,\s]+\]$/;

function Citation({ chunkIds, sources, onCite }) {
  return (
    <span className="cite-group">
      {chunkIds.map((chunkId) => {
        const index = sources
          ? sources.findIndex((source) => String(source.chunk_id) === String(chunkId))
          : -1;

        if (index !== -1 && !onCite) {
          return (
            <span key={chunkId} className="cite" title={`Chunk ${chunkId}`}>
              {index + 1}
            </span>
          );
        }

        if (index === -1) {
          return (
            <span key={chunkId} className="cite cite-plain" title={`Chunk ${chunkId}`}>
              {chunkId}
            </span>
          );
        }

        return (
          <button
            key={chunkId}
            type="button"
            className="cite"
            onClick={() => onCite?.(index)}
            onMouseEnter={() => onCite?.(index, { preview: true })}
            onMouseLeave={() => onCite?.(null, { preview: true })}
            aria-label={`Source ${index + 1}, chunk ${chunkId}`}
          >
            {index + 1}
          </button>
        );
      })}
    </span>
  );
}

function renderCitations(text, keyPrefix, context) {
  const parts = text.split(CITATION);
  const output = [];

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];

    if (!IS_CITATION.test(part)) {
      output.push(part);
      continue;
    }

    // Keep punctuation right after a citation on the same line as it.
    const next = parts[index + 1] || "";
    const punctuation = next.match(/^[.,;:!?)]+/)?.[0] || "";
    if (punctuation) parts[index + 1] = next.slice(punctuation.length);

    // Drop the space before the citation so it sits against the word.
    if (typeof output[output.length - 1] === "string") {
      output[output.length - 1] = output[output.length - 1].replace(/\s+$/, "");
    }

    output.push(
      <span key={`${keyPrefix}-c${index}`} className="cite-wrap">
        <Citation chunkIds={part.match(/\d+/g) || []} {...context} />
        {punctuation}
      </span>
    );
  }

  return output;
}

function renderInline(text, keyPrefix, context) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyPrefix}-${index}`}>
        {renderCitations(part.slice(2, -2), `${keyPrefix}-${index}`, context)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${index}`}>
        {renderCitations(part, `${keyPrefix}-${index}`, context)}
      </span>
    )
  );
}

export default function FormattedText({ text, sources, onCite, className = "" }) {
  if (!text) return null;

  const context = { sources, onCite };
  const lines = String(text).split("\n");
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,4}\s+(.*)$/);

    if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((bullet || numbered)[1]);
      return;
    }

    flushList();

    if (!line) return;

    blocks.push(
      heading
        ? { type: "h", text: heading[1], key: index }
        : { type: "p", text: line, key: index }
    );
  });

  flushList();

  return (
    <div className={`formatted-text ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "ul" || block.type === "ol") {
          const ListTag = block.type;
          return (
            <ListTag key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `${index}-${itemIndex}`, context)}</li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "h") {
          return <h4 key={index}>{renderInline(block.text, index, context)}</h4>;
        }

        return <p key={index}>{renderInline(block.text, index, context)}</p>;
      })}
    </div>
  );
}
