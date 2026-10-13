import { useRef, useState } from "react";
import { api, formatDate } from "../api";
import Icon from "../components/Icon";
import ProjectPicker from "../components/ProjectPicker";
import { useToast } from "../components/Toast";
import useDocuments from "../hooks/useDocuments";

const STEPS = [
  "PDF text is extracted",
  "Text is split into chunks",
  "Chunks become embeddings",
  "Embeddings are stored in Qdrant",
];

function isPdf(file) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

export default function DocumentsPage({
  projects,
  projectsLoading,
  selectedProject,
  onSelectProject,
  onNewProject,
  onStatsChanged,
}) {
  const showToast = useToast();
  const { documents, loading, reload } = useDocuments(selectedProject);
  const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunksCount || 0), 0);
  const fileInput = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [chunks, setChunks] = useState(null); // { name, items, loading }

  const pickFile = (picked) => {
    setMessage("");
    setError("");
    if (!picked) return;
    if (!isPdf(picked)) {
      setError("Only PDF files are allowed.");
      return;
    }
    setFile(picked);
  };

  const handleUpload = async () => {
    setMessage("");
    setError("");

    if (!selectedProject) {
      setError("Please select a project.");
      return;
    }
    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }

    const form = new FormData();
    form.append("projectId", selectedProject);
    form.append("file", file);

    setUploading(true);

    try {
      const data = await api("/documents/upload", { method: "POST", form });
      const count =
        data.indexing?.chunksIndexed || data.document?.chunksCount || 0;

      setMessage(`Uploaded and indexed. ${count} chunks created.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      reload();
      onStatsChanged();
    } catch (err) {
      console.error("Document upload error:", err);
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api(`/documents/${doc.id}`, { method: "DELETE" });
      setChunks(null);
      showToast(`Deleted ${doc.originalName}`);
      setError("");
      reload();
      onStatsChanged();
    } catch (err) {
      console.error("Delete document error:", err);
      setError(err.message || "Failed to delete document");
    }
  };

  const handleViewChunks = async (doc) => {
    setChunks({ name: doc.originalName, items: [], loading: true });

    try {
      const data = await api(`/documents/${doc.id}/chunks`);
      setChunks({
        name: doc.originalName,
        items: data.chunks || data.document?.chunks || [],
        loading: false,
      });
    } catch (err) {
      console.error("Load document chunks error:", err);
      setChunks(null);
      setError(err.message || "Failed to load document chunks");
    }
  };

  return (
    <div className="page page-wide">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your library</p>
          <h1>Documents</h1>
          <p>Upload policy PDFs into a project so you can ask questions about them.</p>
        </div>
        <ProjectPicker
          projects={projects}
          loading={projectsLoading}
          value={selectedProject}
          onChange={(projectId) => {
            onSelectProject(projectId);
            setChunks(null);
          }}
          onNewProject={onNewProject}
        />
      </header>

      <section className="card upload-card">
        <div
          className={`dropzone ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pickFile(event.dataTransfer.files?.[0]);
          }}
        >
          <div className="dropzone-icon">
            <Icon name={file ? "file" : "upload"} size={22} />
          </div>
          {file ? (
            <>
              <strong>{file.name}</strong>
              <span>{(file.size / 1024 / 1024).toFixed(2)} MB · ready to upload</span>
            </>
          ) : (
            <>
              <strong>Drop a PDF here</strong>
              <span>or choose one from your computer</span>
            </>
          )}

          <label className="button button-soft button-sm file-button">
            {file ? "Choose another" : "Choose PDF"}
            <input
              ref={fileInput}
              id="document-file"
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div className="upload-footer">
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="button button-primary"
            onClick={handleUpload}
            disabled={uploading || !file || !selectedProject}
          >
            <Icon name="upload" size={16} />
            {uploading ? "Uploading & indexing…" : "Upload document"}
          </button>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" size={16} />
            {error}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>In this project</h2>
          {!loading && selectedProject && (
            <span className="muted">
              {documents.length} document{documents.length === 1 ? "" : "s"} · {totalChunks} passages
            </span>
          )}
        </div>

        {!selectedProject ? (
          <div className="empty">Select or create a project to see its documents.</div>
        ) : loading ? (
          <div className="doc-grid">
            {[0, 1, 2].map((key) => (
              <div key={key} className="doc-card skeleton-row" aria-hidden="true" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="empty">No documents uploaded yet.</div>
        ) : (
          <div className="doc-grid">
            {documents.map((doc) => (
              <article className="doc-card" key={doc.id}>
                <div className="doc-sheet" aria-hidden="true">
                  <span>PDF</span>
                </div>
                <h3 className="doc-title" title={doc.originalName}>
                  {doc.originalName.replace(/\.pdf$/i, "").replace(/_/g, " ")}
                </h3>
                <p className="doc-meta">
                  {doc.chunksCount ?? 0} passages · {formatDate(doc.createdAt)}
                </p>
                <div className="doc-actions">
                  <button
                    type="button"
                    className="button button-outline button-sm"
                    onClick={() => handleViewChunks(doc)}
                  >
                    View passages
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    onClick={() => handleDelete(doc)}
                    aria-label={`Delete ${doc.originalName}`}
                    title="Delete"
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {chunks && (
        <div className="modal-overlay" onClick={() => setChunks(null)}>
          <div
            className="modal modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chunks-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="chunks-title">Indexed passages</h2>
                <p>{chunks.name}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setChunks(null)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="chunk-list">
              {chunks.loading ? (
                <div className="empty">Loading chunks…</div>
              ) : chunks.items.length === 0 ? (
                <div className="empty">No chunks found for this document.</div>
              ) : (
                chunks.items.map((chunk, index) => (
                  <div className="chunk" key={index}>
                    <span className="chunk-number">Passage {index + 1}</span>
                    <p>{typeof chunk === "string" ? chunk : chunk?.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
