import { useEffect, useState } from "react";
import "./App.css";
import Login from "./Login";

const API_URL = "http://localhost:5000/api";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activePage, setActivePage] = useState("Ask");

  // =========================
  // Dashboard Statistics
  // =========================

  const [dashboardStats, setDashboardStats] = useState({
    projects: 0,
    documents: 0,
    chunks: 0,
    savedAnswers: 0,
  });

  const [statsLoading, setStatsLoading] =
    useState(false);

  // =========================
  // RAG
  // =========================

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================
  // Projects / Documents
  // =========================

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] =
    useState("");

  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] =
    useState("");

  const [projectsLoading, setProjectsLoading] =
    useState(false);

  const [documentsLoading, setDocumentsLoading] =
    useState(false);
// =========================
// Create Project
// =========================

const [showCreateProject, setShowCreateProject] =
  useState(false);

const [newProjectTitle, setNewProjectTitle] =
  useState("");

const [newProjectDescription, setNewProjectDescription] =
  useState("");

const [creatingProject, setCreatingProject] =
  useState(false);

const [projectMessage, setProjectMessage] =
  useState("");

const [projectError, setProjectError] =
  useState("");
  // =========================
  // Document Chunks
  // =========================

  const [showChunks, setShowChunks] =
    useState(false);

  const [selectedChunks, setSelectedChunks] =
    useState([]);

  const [chunksDocumentName, setChunksDocumentName] =
    useState("");

  const [chunksLoading, setChunksLoading] =
    useState(false);

  // =========================
  // History
  // =========================

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [selectedHistory, setSelectedHistory] =
    useState(null);

  // =========================
  // Saved Answers
  // =========================

  const [savedAnswers, setSavedAnswers] =
    useState([]);

  const [savedLoading, setSavedLoading] =
    useState(false);

  const [savedMessage, setSavedMessage] =
    useState("");

  // =========================
  // Upload
  // =========================

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const [uploadMessage, setUploadMessage] =
    useState("");

  const [uploadError, setUploadError] =
    useState("");

  // =========================
  // Login
  // =========================

  const handleLogin = () => {
    const savedUser =
      localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setIsLoggedIn(true);

    setActivePage("Ask");

    setSelectedProject("");
    setSelectedDocument("");

    setProjects([]);
    setDocuments([]);

    setQuestion("");
    setAnswer("");
    setSources([]);
    setError("");

    setDashboardStats({
      projects: 0,
      documents: 0,
      chunks: 0,
      savedAnswers: 0,
    });
  };

  // =========================
  // Logout
  // =========================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setIsLoggedIn(false);

    setActivePage("Ask");

    setProjects([]);
    setDocuments([]);

    setSelectedProject("");
    setSelectedDocument("");

    setQuestion("");
    setAnswer("");
    setSources([]);
    setError("");

    setUploadMessage("");
    setUploadError("");
    setSelectedFile(null);

    setHistory([]);
    setSavedAnswers([]);

    setDashboardStats({
      projects: 0,
      documents: 0,
      chunks: 0,
      savedAnswers: 0,
    });
  };

  // =========================
  // Load Dashboard Statistics
  // =========================

  const loadDashboardStats = async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        return;
      }

      setStatsLoading(true);

      const response = await fetch(
        `${API_URL}/dashboard/stats`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log(
        "Dashboard stats response:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to load dashboard statistics"
        );
      }

      setDashboardStats(
        data.stats || {
          projects: 0,
          documents: 0,
          chunks: 0,
          savedAnswers: 0,
        }
      );

    } catch (error) {
      console.error(
        "Load dashboard stats error:",
        error
      );

      setDashboardStats({
        projects: 0,
        documents: 0,
        chunks: 0,
        savedAnswers: 0,
      });

    } finally {
      setStatsLoading(false);
    }
  };

  // =========================
  // Load Projects
  // =========================

  const loadProjects = async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        return;
      }

      setProjectsLoading(true);

      const response = await fetch(
        `${API_URL}/projects`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to load projects"
        );
      }

      const uniqueProjects =
        Array.from(
          new Map(
            (data.projects || []).map(
              (project) => [
                project._id,
                project,
              ]
            )
          ).values()
        );

      setProjects(uniqueProjects);

      setSelectedProject(
        (currentProject) => {
          const stillExists =
            uniqueProjects.some(
              (project) =>
                project._id ===
                currentProject
            );

          if (stillExists) {
            return currentProject;
          }

          return uniqueProjects.length > 0
            ? uniqueProjects[0]._id
            : "";
        }
      );

    } catch (error) {
      console.error(
        "Load projects error:",
        error
      );

      setProjects([]);
      setSelectedProject("");

    } finally {
      setProjectsLoading(false);
    }
  };

  // =========================
  // Load Projects
  // =========================

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    if (
      activePage === "Ask" ||
      activePage === "Documents"
    ) {
      loadProjects();
    }

    if (activePage === "Ask") {
      loadDashboardStats();
    }

  }, [
    isLoggedIn,
    activePage,
  ]);
// =========================
// Create New Project
// =========================

const handleCreateProject = async () => {
  setProjectMessage("");
  setProjectError("");

  if (!newProjectTitle.trim()) {
    setProjectError(
      "Please enter a project title."
    );
    return;
  }

  const token =
    localStorage.getItem("token");

  if (!token) {
    setProjectError(
      "Please login first."
    );
    return;
  }

  setCreatingProject(true);

  try {
    const response = await fetch(
      `${API_URL}/projects`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          title:
            newProjectTitle.trim(),

          description:
            newProjectDescription.trim(),
        }),
      }
    );

    const data =
      await response.json();

    console.log(
      "Create project response:",
      data
    );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
          "Failed to create project"
      );
    }

    const createdProject =
      data.project;

    setProjectMessage(
      "Project created successfully."
    );

    setNewProjectTitle("");
    setNewProjectDescription("");

    setShowCreateProject(false);

    // Refresh project list
    await loadProjects();

    // Select newly created project
    if (createdProject?._id) {
      setSelectedProject(
        createdProject._id
      );
    }

    // Refresh dashboard statistics
    await loadDashboardStats();

  } catch (error) {
    console.error(
      "Create project error:",
      error
    );

    setProjectError(
      error.message ||
        "Failed to create project"
    );

  } finally {
    setCreatingProject(false);
  }
};
  // =========================
  // Load Documents
  // =========================

  const loadDocuments = async (
    projectId
  ) => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token || !projectId) {
        setDocuments([]);
        setSelectedDocument("");
        return;
      }

      setDocumentsLoading(true);

      setDocuments([]);
      setSelectedDocument("");

      const response = await fetch(
        `${API_URL}/documents/project/${projectId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to load documents"
        );
      }

      const uniqueDocuments =
        Array.from(
          new Map(
            (data.documents || []).map(
              (document) => [
                document.id,
                document,
              ]
            )
          ).values()
        );

      setDocuments(uniqueDocuments);

      if (
        uniqueDocuments.length > 0
      ) {
        setSelectedDocument(
          uniqueDocuments[0].id
        );
      } else {
        setSelectedDocument("");
      }

    } catch (error) {
      console.error(
        "Load documents error:",
        error
      );

      setDocuments([]);
      setSelectedDocument("");

    } finally {
      setDocumentsLoading(false);
    }
  };

  // =========================
  // Load Documents when Project Changes
  // =========================

  useEffect(() => {
    if (
      !isLoggedIn ||
      activePage !== "Ask" ||
      !selectedProject
    ) {
      return;
    }

    loadDocuments(
      selectedProject
    );

  }, [
    isLoggedIn,
    activePage,
    selectedProject,
  ]);

  // =========================
  // View Document Chunks
  // =========================

  const viewDocumentChunks =
    async (documentId) => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        if (
          !token ||
          !documentId
        ) {
          return;
        }

        setChunksLoading(true);
        setShowChunks(true);
        setSelectedChunks([]);

        const document =
          documents.find(
            (item) =>
              item.id === documentId
          );

        setChunksDocumentName(
          document?.originalName ||
            "Document"
        );

        const response =
          await fetch(
            `${API_URL}/documents/${documentId}/chunks`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to load document chunks"
          );
        }

        setSelectedChunks(
          data.chunks ||
            data.document?.chunks ||
            []
        );

      } catch (error) {
        console.error(
          "Load document chunks error:",
          error
        );

        setSelectedChunks([]);

        setUploadError(
          error.message ||
            "Failed to load document chunks"
        );

      } finally {
        setChunksLoading(false);
      }
    };

  // =========================
  // Load History
  // =========================

  const loadHistory = async () => {
    try {
      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        return;
      }

      setHistoryLoading(true);

      const response =
        await fetch(
          `${API_URL}/history`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to load history"
        );
      }

      setHistory(
        data.history || []
      );

    } catch (error) {
      console.error(
        "Load history error:",
        error
      );

      setHistory([]);

    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (
      isLoggedIn &&
      activePage === "History"
    ) {
      loadHistory();
    }
  }, [
    isLoggedIn,
    activePage,
  ]);

  // =========================
  // Load Saved Answers
  // =========================

  const loadSavedAnswers =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          return;
        }

        setSavedLoading(true);

        const response =
          await fetch(
            `${API_URL}/saved`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to load saved answers"
          );
        }

        setSavedAnswers(
          data.savedAnswers || []
        );

      } catch (error) {
        console.error(
          "Load saved answers error:",
          error
        );

        setSavedAnswers([]);

      } finally {
        setSavedLoading(false);
      }
    };

  useEffect(() => {
    if (
      isLoggedIn &&
      activePage === "Saved"
    ) {
      loadSavedAnswers();
    }
  }, [
    isLoggedIn,
    activePage,
  ]);

  // =========================
  // Save Current Answer
  // =========================

  const saveCurrentAnswer =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          setError(
            "Please login first."
          );
          return;
        }

        if (
          !question.trim() ||
          !answer ||
          !selectedProject ||
          !selectedDocument
        ) {
          setError(
            "Nothing available to save."
          );
          return;
        }

        const response =
          await fetch(
            `${API_URL}/saved`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                projectId:
                  selectedProject,

                documentId:
                  selectedDocument,

                question:
                  question.trim(),

                answer,

                sources:
                  sources || [],
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to save answer"
          );
        }

        setSavedMessage(
          "Answer saved successfully."
        );

        await loadSavedAnswers();
        await loadDashboardStats();

      } catch (error) {
        console.error(
          "Save answer error:",
          error
        );

        setError(
          error.message ||
            "Failed to save answer"
        );
      }
    };

  // =========================
  // Delete Saved Answer
  // =========================

  const deleteSavedAnswer =
    async (savedId) => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        const response =
          await fetch(
            `${API_URL}/saved/${savedId}`,
            {
              method: "DELETE",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to remove saved answer"
          );
        }

        setSavedAnswers(
          (previous) =>
            previous.filter(
              (item) =>
                item._id !==
                savedId
            )
        );

        await loadDashboardStats();

      } catch (error) {
        console.error(
          "Delete saved answer error:",
          error
        );
      }
    };

  // =========================
  // Ask RAG Question
  // =========================

  const handleAskQuestion =
    async (
      questionText = question
    ) => {
      if (!questionText.trim()) {
        setError(
          "Please enter a question."
        );
        return;
      }

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setError(
          "Please login first."
        );
        return;
      }

      if (!selectedProject) {
        setError(
          "Please select a project first."
        );
        return;
      }

      if (!selectedDocument) {
        setError(
          "Please select a document first."
        );
        return;
      }

      setQuestion(questionText);
      setLoading(true);
      setError("");
      setAnswer("");
      setSources([]);

      try {
        const response =
          await fetch(
            `${API_URL}/rag/ask`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                question:
                  questionText,

                documentId:
                  selectedDocument,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to generate answer"
          );
        }

        setAnswer(
          data.answer || ""
        );

        setSources(
          data.sources || []
        );

        await loadHistory();

      } catch (error) {
        console.error(
          "RAG error:",
          error
        );

        setError(
          error.message ||
            "Something went wrong."
        );

      } finally {
        setLoading(false);
      }
    };

  // =========================
  // Upload Document
  // =========================

  const handleUploadDocument =
    async () => {
      setUploadMessage("");
      setUploadError("");

      if (!selectedProject) {
        setUploadError(
          "Please select a project."
        );
        return;
      }

      if (!selectedFile) {
        setUploadError(
          "Please select a PDF file."
        );
        return;
      }

      if (
        selectedFile.type !==
          "application/pdf" &&
        !selectedFile.name
          .toLowerCase()
          .endsWith(".pdf")
      ) {
        setUploadError(
          "Only PDF files are allowed."
        );
        return;
      }

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setUploadError(
          "Please login first."
        );
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "projectId",
        selectedProject
      );

      formData.append(
        "file",
        selectedFile
      );

      setUploading(true);

      try {
        const response =
          await fetch(
            `${API_URL}/documents/upload`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              body: formData,
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to upload document"
          );
        }

        setUploadMessage(
          `Document uploaded and indexed successfully. ${
            data.indexing
              ?.chunksIndexed ||
            data.document
              ?.chunksCount ||
            0
          } chunks indexed.`
        );

        setSelectedFile(null);

        const fileInput =
          document.getElementById(
            "document-file"
          );

        if (fileInput) {
          fileInput.value = "";
        }

        if (selectedProject) {
          await loadDocuments(
            selectedProject
          );
        }

        await loadDashboardStats();

      } catch (error) {
        console.error(
          "Document upload error:",
          error
        );

        setUploadError(
          error.message ||
            "Failed to upload document."
        );

      } finally {
        setUploading(false);
      }
    };

  // =========================
  // Example Questions
  // =========================

  const exampleQuestions = [
    "How can India prepare its workforce for artificial intelligence?",
    "What are the opportunities for AI in education?",
    "What challenges does India face in adopting AI?",
  ];

  // =========================
  // Create Project Modal
  // =========================

  const createProjectModal = showCreateProject && (
    <div className="project-modal-overlay">

      <div className="project-modal">

        <div className="project-modal-header">

          <div>
            <h2>
              Create New Project
            </h2>

            <p>
              Create a project to organize
              your policy documents.
            </p>
          </div>

          <button
            className="modal-close-button"
            onClick={() =>
              setShowCreateProject(false)
            }
          >
            ×
          </button>

        </div>

        <div className="project-form">

          <label>
            Project Title
          </label>

          <input
            type="text"
            value={newProjectTitle}
            onChange={(e) =>
              setNewProjectTitle(
                e.target.value
              )
            }
            placeholder="e.g. AI Healthcare Policy"
          />

          <label>
            Description
          </label>

          <textarea
            value={newProjectDescription}
            onChange={(e) =>
              setNewProjectDescription(
                e.target.value
              )
            }
            placeholder="Brief description of the project..."
            rows={4}
          />

          {projectError && (
            <div className="error-message">
              {projectError}
            </div>
          )}

          <div className="project-form-actions">

            <button
              className="cancel-project-button"
              onClick={() =>
                setShowCreateProject(false)
              }
            >
              Cancel
            </button>

            <button
              className="create-project-submit"
              onClick={handleCreateProject}
              disabled={creatingProject}
            >
              {creatingProject
                ? "Creating..."
                : "Create Project"}
            </button>

          </div>

        </div>

      </div>

    </div>
  );

  // =========================
  // Not Logged In
  // =========================

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  // =========================
  // Sidebar
  // =========================

  const Sidebar = () => (
    <aside className="sidebar">

      <div className="logo">

        <div className="logo-icon">
          AI
        </div>

        <div>
          <h2>
            PolicyResearch
          </h2>

          <span>
            AI Assistant
          </span>
        </div>

      </div>

      <nav className="sidebar-nav">

        {[
          ["Ask", "💬"],
          ["History", "🕘"],
          ["Saved", "🔖"],
          ["Documents", "📄"],
          ["Settings", "⚙️"],
        ].map(
          ([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${
                activePage === name
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActivePage(name)
              }
            >
              <span>
                {icon}
              </span>

              {name}
            </button>
          )
        )}

      </nav>

      <div className="sidebar-bottom">

        <div className="user-card">

          <div className="avatar">
            {user?.name
              ?.charAt(0)
              ?.toUpperCase() ||
              "U"}
          </div>

          <div>

            <strong>
              {user?.name ||
                "User"}
            </strong>

            <small>
              {user?.email || ""}
            </small>

          </div>

        </div>

        <button
          className="logout-button"
          onClick={
            handleLogout
          }
        >
          Logout
        </button>

      </div>

    </aside>
  );

  // =========================
  // Documents Page
  // =========================

  if (
    activePage === "Documents"
  ) {
    return (
      <div className="app-container">

        {createProjectModal}

        <Sidebar />

        <main className="main-content">

          <header className="topbar">

            <div>
              <h1>
                Documents
              </h1>

              <p>
                Upload policy documents
                for AI-powered research.
              </p>
            </div>

            <div className="profile">

              <div className="avatar">
                {user?.name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "U"}
              </div>

              <span>
                {user?.name ||
                  "User"}
              </span>

            </div>

          </header>

          <section className="documents-section">

            {/* Upload Card */}

            <div className="upload-card">

              <div className="upload-icon">
                📄
              </div>

              <h2>
                Upload a Policy Document
              </h2>

              <p>
                Select a project and
                upload a PDF document.
              </p>

              <div className="upload-form">

                <div className="project-selection-header">

                  <label>
                    Select Project
                  </label>

                  <button
                    type="button"
                    className="create-project-button"
                    onClick={() => {
                      setProjectMessage("");
                      setProjectError("");
                      setShowCreateProject(true);
                    }}
                  >
                    + New Project
                  </button>

                </div>

                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(
                      e.target.value
                    );
                  }}
                  disabled={
                    projectsLoading
                  }
                >

                  {projectsLoading ? (
                    <option value="">
                      Loading projects...
                    </option>
                  ) : (
                    <>
                      <option value="">
                        Select a project
                      </option>

                      {projects.map(
                        (project) => (
                          <option
                            key={
                              project._id
                            }
                            value={
                              project._id
                            }
                          >
                            {
                              project.title
                            }
                          </option>
                        )
                      )}
                    </>
                  )}

                </select>

                <label>
                  Select PDF
                </label>

                <input
                  id="document-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) =>
                    setSelectedFile(
                      e.target.files?.[0] ||
                        null
                    )
                  }
                />

                {selectedFile && (
                  <p className="selected-file">
                    Selected:{" "}
                    <strong>
                      {
                        selectedFile.name
                      }
                    </strong>
                  </p>
                )}

                <button
                  className="upload-button"
                  onClick={
                    handleUploadDocument
                  }
                  disabled={
                    uploading
                  }
                >
                  {uploading
                    ? "Uploading..."
                    : "Upload Document"}
                </button>

              </div>

              {uploadMessage && (
                <div className="success-message">
                  {uploadMessage}
                </div>
              )}

              {uploadError && (
                <div className="error-message">
                  {uploadError}
                </div>
              )}

            </div>

            {/* Documents List */}

            <section className="documents-list-section">

              <div className="documents-list-header">

                <div>
                  <h2>
                    Your Documents
                  </h2>

                  <p>
                    Documents uploaded to
                    the selected project.
                  </p>
                </div>

              </div>

              {!selectedProject ? (

                <div className="documents-empty">
                  Select a project to
                  view documents.
                </div>

              ) : documentsLoading ? (

                <div className="documents-empty">
                  Loading documents...
                </div>

              ) : documents.length ===
                0 ? (

                <div className="documents-empty">
                  No documents uploaded yet.
                </div>

              ) : (

                <div className="documents-list">

                  {documents.map(
                    (document) => (

                      <div
                        className="document-item"
                        key={
                          document.id
                        }
                      >

                        <div className="document-info">

                          <div className="document-icon">
                            📄
                          </div>

                          <div>

                            <h3>
                              {
                                document.originalName
                              }
                            </h3>

                            <p>
                              {
                                document.chunksCount
                              }{" "}
                              chunks
                            </p>

                            <span>
                              Uploaded:{" "}
                              {new Date(
                                document.createdAt
                              ).toLocaleDateString()}
                            </span>

                          </div>

                        </div>

                        <button
                          className="view-chunks-button"
                          onClick={() =>
                            viewDocumentChunks(
                              document.id
                            )
                          }
                        >
                          View Chunks
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>

            {/* Chunk Viewer */}

            {showChunks && (
              <div className="chunks-panel">

                <div className="chunks-panel-header">

                  <div>
                    <h2>
                      Document Chunks
                    </h2>

                    <p>
                      {
                        chunksDocumentName
                      }
                    </p>
                  </div>

                  <button
                    className="close-chunks-button"
                    onClick={() =>
                      setShowChunks(
                        false
                      )
                    }
                  >
                    Close
                  </button>

                </div>

                {chunksLoading ? (
                  <div className="documents-empty">
                    Loading chunks...
                  </div>
                ) : (
                  <div className="chunks-list">

                    {selectedChunks.map(
                      (
                        chunk,
                        index
                      ) => (

                        <div
                          className="chunk-item"
                          key={index}
                        >

                          <div className="chunk-number">
                            Chunk{" "}
                            {index + 1}
                          </div>

                          <p>
                            {chunk}
                          </p>

                        </div>

                      )
                    )}

                  </div>
                )}

              </div>
            )}

            {/* Processing Information */}

            <div className="info-card">

              <h3>
                How document processing works
              </h3>

              <div className="processing-steps">

                <div>
                  <span>1</span>
                  <p>
                    PDF text is extracted
                  </p>
                </div>

                <div>
                  <span>2</span>
                  <p>
                    Text is divided into chunks
                  </p>
                </div>

                <div>
                  <span>3</span>
                  <p>
                    Chunks are converted into embeddings
                  </p>
                </div>

                <div>
                  <span>4</span>
                  <p>
                    Embeddings are stored in Qdrant
                  </p>
                </div>

              </div>

            </div>

          </section>

        </main>

      </div>
    );
  }

  // =========================
  // History Page
  // =========================

  if (
    activePage === "History"
  ) {
    return (
      <div className="app-container">

        <Sidebar />

        <main className="main-content">

          <header className="topbar">

            <div>

              <h1>
                Research History
              </h1>

              <p>
                View your previous policy
                research questions and answers.
              </p>

            </div>

          </header>

          <section className="documents-section">

            {historyLoading ? (

              <div className="placeholder-page">

                <div className="placeholder-icon">
                  🔄
                </div>

                <h2>
                  Loading history...
                </h2>

              </div>

            ) : history.length === 0 ? (

              <div className="placeholder-page">

                <div className="placeholder-icon">
                  🕘
                </div>

                <h2>
                  No research history yet
                </h2>

                <p>
                  Your questions and AI
                  answers will appear here.
                </p>

              </div>

            ) : (

              <div className="sources-list">

                {history.map(
                  (item) => (

                    <div
                      className="source-card"
                      key={item._id}
                      style={{
                        cursor:
                          "pointer",
                      }}
                      onClick={() =>
                        setSelectedHistory(
                          item
                        )
                      }
                    >

                      <div className="source-header">

                        <span className="history-document-name">
                          {
                            item.document
                              ?.originalName ||
                            "Document"
                          }
                        </span>

                        <span>
                          {new Date(
                            item.createdAt
                          ).toLocaleString()}
                        </span>

                      </div>

                      <p>
                        <strong>
                          Question:
                        </strong>{" "}
                        {item.question}
                      </p>

                      <p>
                        <strong>
                          Project:
                        </strong>{" "}
                        {
                          item.project
                            ?.title ||
                          "Unknown project"
                        }
                      </p>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          setQuestion(
                            item.question
                          );

                          setAnswer(
                            item.answer
                          );

                          setSources(
                            item.sources ||
                              []
                          );

                          setSelectedHistory(
                            null
                          );

                          setActivePage(
                            "Ask"
                          );
                        }}
                      >
                        View Answer
                      </button>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

          {selectedHistory && (
            <div className="answer-section">

              <div className="section-heading">

                <h3>
                  Previous Answer
                </h3>

                <button
                  onClick={() =>
                    setSelectedHistory(
                      null
                    )
                  }
                >
                  Close
                </button>

              </div>

              <div className="answer-card">

                <div className="answer-text">

                  <p>
                    <strong>
                      Question:
                    </strong>
                  </p>

                  <p>
                    {
                      selectedHistory.question
                    }
                  </p>

                  <hr />

                  <p>
                    {
                      selectedHistory.answer
                    }
                  </p>

                </div>

              </div>

            </div>
          )}

        </main>

      </div>
    );
  }

  // =========================
  // Saved Page
  // =========================

  if (
    activePage === "Saved"
  ) {
    return (
      <div className="app-container">

        <Sidebar />

        <main className="main-content">

          <header className="topbar">

            <div>

              <h1>
                Saved Answers
              </h1>

              <p>
                Your saved policy research answers.
              </p>

            </div>

          </header>

          <section className="documents-section">

            {savedLoading ? (

              <div className="placeholder-page">

                <div className="placeholder-icon">
                  🔄
                </div>

                <h2>
                  Loading saved answers...
                </h2>

              </div>

            ) : savedAnswers.length ===
              0 ? (

              <div className="placeholder-page">

                <div className="placeholder-icon">
                  🔖
                </div>

                <h2>
                  No saved answers yet
                </h2>

                <p>
                  Save useful AI answers
                  to access them later.
                </p>

              </div>

            ) : (

              <div className="sources-list">

                {savedAnswers.map(
                  (item) => (

                    <div
                      className="source-card"
                      key={item._id}
                    >

                      <div className="source-header">

                        <span className="history-document-name">
                          {
                            item.document
                              ?.originalName ||
                            "Document"
                          }
                        </span>

                        <span>
                          {new Date(
                            item.createdAt
                          ).toLocaleString()}
                        </span>

                      </div>

                      <p>
                        <strong>
                          Question:
                        </strong>{" "}
                        {item.question}
                      </p>

                      <p>
                        <strong>
                          Project:
                        </strong>{" "}
                        {
                          item.project
                            ?.title ||
                          "Unknown project"
                        }
                      </p>

                      <div className="answer-actions">

                        <button
                          onClick={() => {
                            setQuestion(
                              item.question
                            );

                            setAnswer(
                              item.answer
                            );

                            setSources(
                              item.sources ||
                                []
                            );

                            setActivePage(
                              "Ask"
                            );
                          }}
                        >
                          View Answer
                        </button>

                        <button
                          onClick={() =>
                            deleteSavedAnswer(
                              item._id
                            )
                          }
                        >
                          Remove
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        </main>

      </div>
    );
  }

  // =========================
  // Settings Page
  // =========================

  if (
    activePage === "Settings"
  ) {
    return (
      <div className="app-container">

        <Sidebar />

        <main className="main-content">

          <header className="topbar">

            <div>

              <h1>
                Settings
              </h1>

              <p>
                Manage your profile and
                application information.
              </p>

            </div>

          </header>

          <section className="settings-section">

            {/* Profile */}

            <div className="settings-card">

              <h2>
                Profile
              </h2>

              <div className="setting-row">

                <div>

                  <span className="setting-label">
                    Name
                  </span>

                  <p>
                    {
                      user?.name ||
                      "User"
                    }
                  </p>

                </div>

              </div>

              <div className="setting-row">

                <div>

                  <span className="setting-label">
                    Email
                  </span>

                  <p>
                    {
                      user?.email ||
                      "Not available"
                    }
                  </p>

                </div>

              </div>

            </div>

            {/* Application */}

            <div className="settings-card">

              <h2>
                Application
              </h2>

              <div className="setting-row">

                <div>

                  <span className="setting-label">
                    Application
                  </span>

                  <p>
                    PolicyResearch AI
                  </p>

                </div>

              </div>

              <div className="setting-row">

                <div>

                  <span className="setting-label">
                    Description
                  </span>

                  <p>
                    AI-powered policy
                    research assistant
                  </p>

                </div>

              </div>

              <div className="setting-row">

                <div>

                  <span className="setting-label">
                    Version
                  </span>

                  <p>
                    1.0.0
                  </p>

                </div>

              </div>

            </div>

            {/* Account */}

            <div className="settings-card">

              <h2>
                Account
              </h2>

              <button
                className="settings-logout-button"
                onClick={
                  handleLogout
                }
              >
                Logout
              </button>

            </div>

          </section>

        </main>

      </div>
    );
  }

  // =========================
  // Main Ask Page
  // =========================

  return (
    <div className="app-container">

      {createProjectModal}

      <Sidebar />

      <main className="main-content">

        <header className="topbar">

          <div>

            <h1>
              Welcome back
              {user?.name
                ? `, ${user.name}`
                : ""}
            </h1>

            <p>
              Research policy documents
              with AI-powered answers.
            </p>

          </div>

          <div className="profile">

            <div className="avatar">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() ||
                "U"}
            </div>

            <span>
              {user?.name ||
                "User"}
            </span>

          </div>

        </header>

        {/* =========================
            Hero
        ========================= */}

        <section className="hero">

          <div>

            <span className="hero-badge">
              AI POLICY RESEARCH
            </span>

            <h2>
              Ask questions.
              <br />
              Get evidence-based answers.
            </h2>

            <p>
              Ask questions about your
              uploaded policy documents
              and get concise answers
              with source references.
            </p>

          </div>

        </section>

        {/* =========================
            Dashboard Statistics
        ========================= */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon">
              📁
            </div>

            <div>

              <span>
                Total Projects
              </span>

              <h3>
                {statsLoading
                  ? "..."
                  : dashboardStats.projects}
              </h3>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              📄
            </div>

            <div>

              <span>
                Total Documents
              </span>

              <h3>
                {statsLoading
                  ? "..."
                  : dashboardStats.documents}
              </h3>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              🧩
            </div>

            <div>

              <span>
                Total Chunks
              </span>

              <h3>
                {statsLoading
                  ? "..."
                  : dashboardStats.chunks}
              </h3>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              🔖
            </div>

            <div>

              <span>
                Saved Answers
              </span>

              <h3>
                {statsLoading
                  ? "..."
                  : dashboardStats.savedAnswers}
              </h3>

            </div>

          </div>

        </section>

        {/* =========================
            Question Card
        ========================= */}

        <section className="question-card">

          <div className="project-selection-header">

            <div>
              <label>
                Select Project
              </label>
            </div>

            <button
              className="create-project-button"
              onClick={() => {
                setProjectMessage("");
                setProjectError("");
                setShowCreateProject(true);
              }}
            >
              + New Project
            </button>

          </div>

          <div className="selection-row">

            {/* Project */}

            <select
              value={selectedProject}
              onChange={(e) => {

                const projectId =
                  e.target.value;

                setSelectedProject(
                  projectId
                );

                setSelectedDocument("");
                setDocuments([]);
                setError("");

              }}
              disabled={
                projectsLoading
              }
            >

              {projectsLoading ? (

                <option value="">
                  Loading projects...
                </option>

              ) : (

                <>

                  <option value="">
                    Select a project
                  </option>

                  {projects.map(
                    (project) => (

                      <option
                        key={
                          project._id
                        }
                        value={
                          project._id
                        }
                      >
                        {
                          project.title
                        }
                      </option>

                    )
                  )}

                </>

              )}

            </select>

            {/* Document */}

            <select
              value={selectedDocument}
              onChange={(e) =>
                setSelectedDocument(
                  e.target.value
                )
              }
              disabled={
                !selectedProject ||
                documentsLoading
              }
            >

              {!selectedProject ? (

                <option value="">
                  Select a project first
                </option>

              ) : documentsLoading ? (

                <option value="">
                  Loading documents...
                </option>

              ) : documents.length ===
                0 ? (

                <option value="">
                  No documents available
                </option>

              ) : (

                <>

                  <option value="">
                    Select a document
                  </option>

                  {documents.map(
                    (document) => (

                      <option
                        key={
                          document.id
                        }
                        value={
                          document.id
                        }
                      >
                        {
                          document.originalName
                        }
                      </option>

                    )
                  )}

                </>

              )}

            </select>

          </div>

          {/* Question Input */}

          <textarea
            value={question}
            onChange={(e) =>
              setQuestion(
                e.target.value
              )
            }
            placeholder="Ask a question about your policy documents..."
            rows={4}
          />

          <div className="question-footer">

            <span>
              Answers are generated from
              retrieved document sources.
            </span>

            <button
              onClick={() =>
                handleAskQuestion()
              }
              disabled={
                loading ||
                documentsLoading
              }
            >
              {loading
                ? "Researching..."
                : "Ask AI →"}
            </button>

          </div>

        </section>

        {/* =========================
            Error
        ========================= */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* =========================
            Examples
        ========================= */}

        <section className="examples-section">

          <div className="section-heading">

            <h3>
              Try an example
            </h3>

            <span>
              Sample research questions
            </span>

          </div>

          <div className="example-grid">

            {exampleQuestions.map(
              (
                example,
                index
              ) => (

                <button
                  key={index}
                  className="example-card"
                  onClick={() =>
                    handleAskQuestion(
                      example
                    )
                  }
                  disabled={
                    loading ||
                    documentsLoading ||
                    !selectedDocument
                  }
                >

                  <span>
                    ↗
                  </span>

                  <p>
                    {example}
                  </p>

                </button>

              )
            )}

          </div>

        </section>

        {/* =========================
            Answer
        ========================= */}

        {answer && (
          <section className="answer-section">

            <div className="section-heading">

              <h3>
                AI Answer
              </h3>

            </div>

            <div className="answer-card">

              <div className="answer-text">
                {answer}
              </div>

            </div>

            <div className="answer-actions">

              <button
                onClick={
                  saveCurrentAnswer
                }
              >
                🔖 Save Answer
              </button>

              {savedMessage && (
                <span>
                  {savedMessage}
                </span>
              )}

            </div>

            {/* Sources */}

            {sources.length > 0 && (
              <div className="sources-section">

                <h3>
                  Sources
                </h3>

                <div className="sources-list">

                  {sources.map(
                    (
                      source,
                      index
                    ) => (

                      <div
                        className="source-card"
                        key={index}
                      >

                        <div className="source-header">

                          <strong>
                            Chunk{" "}
                            {
                              source.chunk_id
                            }
                          </strong>

                          <span>
                            Score:{" "}
                            {
                              typeof source.score ===
                              "number"
                                ? source.score.toFixed(
                                    3
                                  )
                                : "N/A"
                            }
                          </span>

                        </div>

                        <p>
                          {source.text}
                        </p>

                      </div>

                    )
                  )}

                </div>

              </div>
            )}

          </section>
        )}

      </main>

    </div>
  );
}

export default App;