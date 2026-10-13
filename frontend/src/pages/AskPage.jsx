import { useEffect, useRef, useState } from "react";
import { api, formatDate } from "../api";
import FormattedText from "../components/FormattedText";
import { useToast } from "../components/Toast";
import useApiList from "../hooks/useApiList";
import useDocuments from "../hooks/useDocuments";

const EXAMPLE_QUESTIONS = [
  "How can India prepare its workforce for artificial intelligence?",
  "What are the opportunities for AI in education?",
  "What challenges does India face in adopting AI?",
];

const RESEARCH_STEPS = [
  "Reading the document",
  "Finding the most relevant passages",
  "Writing a cited answer",
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function readingTime(text) {
  const words = (text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Shows which stage the research is at while waiting for the answer.
function ResearchProgress() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [setTimeout(() => setStep(1), 1500), setTimeout(() => setStep(2), 4000)];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <ol className="progress" aria-label="Research progress">
      {RESEARCH_STEPS.map((label, index) => (
        <li
          key={label}
          className={index < step ? "is-done" : index === step ? "is-active" : ""}
        >
          <span className="progress-mark" aria-hidden="true">
            {index < step ? "✓" : index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function Source({ source, index, active, onRef }) {
  const [expanded, setExpanded] = useState(false);
  const text = source.text || "";
  const isLong = text.length > 280;
  const score = typeof source.score === "number" ? source.score : null;

  return (
    <li ref={onRef} className={`source ${active ? "is-active" : ""}`} id={`source-${index + 1}`}>
      <div className="source-head">
        <span className="source-number">{index + 1}</span>
        <span className="source-label">Chunk {source.chunk_id ?? "—"}</span>
        {score !== null && (
          <span className="relevance" title={`Relevance score ${score.toFixed(3)}`}>
            <span className="relevance-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%` }} />
            </span>
            {Math.round(Math.min(1, Math.max(0, score)) * 100)}%
          </span>
        )}
      </div>
      <p className={`source-text ${expanded || !isLong ? "" : "is-clamped"}`}>{text}</p>
      {isLong && (
        <button type="button" className="link-button" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Read full passage"}
        </button>
      )}
    </li>
  );
}

export default function AskPage({
  user,
  stats,
  projects,
  projectsLoading,
  selectedProject,
  onSelectProject,
  onNewProject,
  conversation,
  setConversation,
  onStatsChanged,
}) {
  const showToast = useToast();
  const { documents, loading: documentsLoading } = useDocuments(selectedProject);
  const { items: history } = useApiList("/history", "history");

  const [pickedDocument, setPickedDocument] = useState("");
  const selectedDocument = documents.some((doc) => doc.id === pickedDocument)
    ? pickedDocument
    : documents[0]?.id || "";
  const documentName = documents.find((doc) => doc.id === selectedDocument)?.originalName;

  const [draft, setDraft] = useState(conversation?.question || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeSource, setActiveSource] = useState(null);
  const [previewSource, setPreviewSource] = useState(null);

  const sourceRefs = useRef([]);
  const answerRef = useRef(null);
  const textareaRef = useRef(null);

  const handleAsk = async (questionText = draft) => {
    const text = questionText.trim();
    setError("");

    if (!text) return setError("Please enter a question.");
    if (!selectedProject) return setError("Please select a project first.");
    if (!selectedDocument) return setError("Please select a document first.");

    setDraft(text);
    setConversation({ question: text, answer: "", sources: [], documentName });
    setSaved(false);
    setActiveSource(null);
    setLoading(true);
    requestAnimationFrame(() =>
      answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );

    try {
      const data = await api("/rag/ask", {
        method: "POST",
        body: { question: text, documentId: selectedDocument },
      });
      setConversation({
        question: text,
        answer: data.answer || "",
        sources: data.sources || [],
        documentName,
        askedAt: new Date().toISOString(),
      });
      onStatsChanged();
    } catch (err) {
      console.error("RAG error:", err);
      setError(err.message || "Something went wrong.");
      setConversation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!conversation?.answer || !selectedProject || !selectedDocument) {
      setError("Nothing available to save.");
      return;
    }
    try {
      await api("/saved", {
        method: "POST",
        body: {
          projectId: selectedProject,
          documentId: selectedDocument,
          question: conversation.question,
          answer: conversation.answer,
          sources: conversation.sources || [],
        },
      });
      setSaved(true);
      showToast("Answer saved");
      onStatsChanged();
    } catch (err) {
      setError(err.message || "Failed to save answer");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(conversation.answer);
      showToast("Answer copied");
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const handleCite = (index, options = {}) => {
    if (options.preview) {
      setPreviewSource(index);
      return;
    }
    setActiveSource(index);
    sourceRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const startNewQuestion = () => {
    setConversation(null);
    setDraft("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    textareaRef.current?.focus();
  };

  const canAsk = !loading && !documentsLoading && Boolean(selectedDocument);
  const hasAnswer = Boolean(conversation && (loading || conversation.answer));
  const firstName = user?.name?.split(" ")[0];
  const highlighted = previewSource ?? activeSource;
  const figures = [
    ["Projects", stats?.projects],
    ["Documents", stats?.documents],
    ["Passages indexed", stats?.chunks],
    ["Saved answers", stats?.savedAnswers],
  ];

  return (
    <div className="page page-ask">
      <header className="masthead">
        <p className="eyebrow">{todayLabel()}</p>
        <h1>
          {greeting()}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="masthead-sub">What would you like to research today?</p>
      </header>

      <dl className="figures">
        {figures.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ?? 0}</dd>
          </div>
        ))}
      </dl>

      <form
        className="desk"
        onSubmit={(event) => {
          event.preventDefault();
          handleAsk();
        }}
      >
        <div className="desk-top">
          <label className="desk-select">
            <span>Project</span>
            <select
              value={selectedProject}
              onChange={(e) => {
                onSelectProject(e.target.value);
                setPickedDocument("");
                setError("");
              }}
              disabled={projectsLoading}
            >
              {projectsLoading ? (
                <option value="">Loading…</option>
              ) : projects.length === 0 ? (
                <option value="">No projects yet</option>
              ) : (
                <>
                  {!selectedProject && <option value="">Choose a project</option>}
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.title}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>

          <label className="desk-select">
            <span>Document</span>
            <select
              value={selectedDocument}
              onChange={(e) => setPickedDocument(e.target.value)}
              disabled={!selectedProject || documentsLoading || documents.length === 0}
            >
              {!selectedProject ? (
                <option value="">Select a project first</option>
              ) : documentsLoading ? (
                <option value="">Loading documents…</option>
              ) : documents.length === 0 ? (
                <option value="">No documents yet</option>
              ) : (
                documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.originalName}
                  </option>
                ))
              )}
            </select>
          </label>

          <button type="button" className="link-button desk-new" onClick={onNewProject}>
            + New project
          </button>
        </div>

        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <textarea
          id="question"
          ref={textareaRef}
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              handleAsk();
            }
          }}
          placeholder="Ask a question about your policy documents…"
        />

        <div className="desk-bottom">
          <span className="kbd-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to ask
          </span>
          <button type="submit" className="button button-primary" disabled={!canAsk || !draft.trim()}>
            {loading ? "Researching…" : "Ask"}
          </button>
        </div>
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {selectedProject && !documentsLoading && documents.length === 0 && (
        <p className="note">
          This project has no documents yet. Upload a PDF on the Documents page to start asking
          questions.
        </p>
      )}

      <div ref={answerRef} className="answer-anchor" />

      {hasAnswer ? (
        <article className="answer" aria-busy={loading}>
          <header className="answer-head">
            <p className="eyebrow">Research answer</p>
            <h2>{conversation.question}</h2>
            {!loading && (
              <p className="answer-meta">
                {conversation.documentName && <span>{conversation.documentName}</span>}
                <span>
                  {conversation.sources?.length || 0} source
                  {conversation.sources?.length === 1 ? "" : "s"}
                </span>
                <span>{readingTime(conversation.answer)} min read</span>
                {conversation.askedAt && <span>{formatDate(conversation.askedAt, true)}</span>}
              </p>
            )}
          </header>

          {loading ? (
            <ResearchProgress />
          ) : (
            <div className="answer-grid">
              <div className="answer-main">
                <FormattedText
                  className="answer-text"
                  text={conversation.answer}
                  sources={conversation.sources}
                  onCite={handleCite}
                />

                <div className="answer-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={handleSave}
                    disabled={saved}
                  >
                    {saved ? "Saved ✓" : "Save answer"}
                  </button>
                  <button type="button" className="button button-outline" onClick={handleCopy}>
                    Copy
                  </button>
                  <button type="button" className="link-button" onClick={startNewQuestion}>
                    Ask another question
                  </button>
                </div>
              </div>

              {conversation.sources?.length > 0 && (
                <aside className="sources" aria-labelledby="sources-title">
                  <h3 id="sources-title" className="section-label">
                    Sources
                  </h3>
                  <ol>
                    {conversation.sources.map((source, index) => (
                      <Source
                        key={index}
                        source={source}
                        index={index}
                        active={highlighted === index}
                        onRef={(node) => {
                          sourceRefs.current[index] = node;
                        }}
                      />
                    ))}
                  </ol>
                </aside>
              )}
            </div>
          )}
        </article>
      ) : (
        <div className="ask-extras">
          <section aria-labelledby="examples-title">
            <h2 id="examples-title" className="section-label">
              Try asking
            </h2>
            <ol className="examples">
              {EXAMPLE_QUESTIONS.map((example, index) => (
                <li key={example}>
                  <button
                    type="button"
                    className="example"
                    onClick={() => handleAsk(example)}
                    disabled={!canAsk}
                  >
                    <span className="example-number">{String(index + 1).padStart(2, "0")}</span>
                    <span>{example}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          {history.length > 0 && (
            <section aria-labelledby="recent-title">
              <h2 id="recent-title" className="section-label">
                Recent research
              </h2>
              <ul className="recent">
                {history.slice(0, 4).map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      className="recent-item"
                      onClick={() =>
                        setConversation({
                          question: item.question,
                          answer: item.answer,
                          sources: item.sources || [],
                          documentName: item.document?.originalName,
                          askedAt: item.createdAt,
                        })
                      }
                    >
                      <span className="recent-question">{item.question}</span>
                      <span className="recent-meta">
                        {item.document?.originalName || "Document"} ·{" "}
                        {formatDate(item.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
