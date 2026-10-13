import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { api, uniqueBy, wakeServers } from "./api";
import CreateProjectModal from "./components/CreateProjectModal";
import Icon from "./components/Icon";
import Sidebar from "./components/Sidebar";
import AskPage from "./pages/AskPage";
import DocumentsPage from "./pages/DocumentsPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import SavedPage from "./pages/SavedPage";
import SettingsPage from "./pages/SettingsPage";

const EMPTY_STATS = { projects: 0, documents: 0, chunks: 0, savedAnswers: 0 };

function readStoredUser() {
  try {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("token")));
  const [user, setUser] = useState(readStoredUser);
  const [activePage, setActivePage] = useState("Ask");
  const [menuOpen, setMenuOpen] = useState(false);

  // Projects are shared by the Ask and Documents pages.
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);

  const [stats, setStats] = useState(EMPTY_STATS);

  // The question/answer shown on the Ask page. History and Saved can open one here.
  const [conversation, setConversation] = useState(null);

  // Start waking the free-tier servers as soon as the page opens.
  useEffect(() => {
    wakeServers();
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await api("/dashboard/stats");
      setStats(data.stats || EMPTY_STATS);
    } catch (error) {
      console.error("Load dashboard stats error:", error);
      setStats(EMPTY_STATS);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await api("/projects");
      const list = uniqueBy(data.projects, "_id");
      setProjects(list);
      setSelectedProject((current) =>
        list.some((project) => project._id === current) ? current : list[0]?._id || ""
      );
    } catch (error) {
      console.error("Load projects error:", error);
      setProjects([]);
      setSelectedProject("");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    if (activePage === "Ask" || activePage === "Documents") {
      loadProjects();
    }
  }, [isLoggedIn, activePage, loadProjects]);

  useEffect(() => {
    if (isLoggedIn) loadStats();
  }, [isLoggedIn, loadStats]);

  const resetWorkspace = () => {
    setActivePage("Ask");
    setProjects([]);
    setSelectedProject("");
    setConversation(null);
    setStats(EMPTY_STATS);
    setMenuOpen(false);
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser || readStoredUser());
    setIsLoggedIn(true);
    resetWorkspace();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsLoggedIn(false);
    resetWorkspace();
  };

  const navigate = (page) => {
    setActivePage(page);
    setMenuOpen(false);
  };

  const openAnswer = (item) => {
    setConversation({
      question: item.question,
      answer: item.answer,
      sources: item.sources || [],
      documentName: item.document?.originalName,
      askedAt: item.createdAt,
    });
    navigate("Ask");
  };

  const handleProjectCreated = async (project) => {
    await loadProjects();
    if (project?._id) setSelectedProject(project._id);
    loadStats();
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const projectProps = {
    projects,
    projectsLoading,
    selectedProject,
    onSelectProject: setSelectedProject,
    onNewProject: () => setShowCreateProject(true),
    onStatsChanged: loadStats,
  };

  let page;
  switch (activePage) {
    case "Documents":
      page = <DocumentsPage {...projectProps} />;
      break;
    case "History":
      page = <HistoryPage onOpenAnswer={openAnswer} onNavigate={navigate} />;
      break;
    case "Saved":
      page = (
        <SavedPage
          onOpenAnswer={openAnswer}
          onNavigate={navigate}
          onStatsChanged={loadStats}
        />
      );
      break;
    case "Settings":
      page = <SettingsPage user={user} onLogout={handleLogout} />;
      break;
    default:
      page = (
        <AskPage
          {...projectProps}
          user={user}
          stats={stats}
          conversation={conversation}
          setConversation={setConversation}
        />
      );
  }

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        onLogout={handleLogout}
        user={user}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="main">
        <header className="mobile-bar">
          <button
            type="button"
            className="icon-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <span className="wordmark">
            Policy<em>Research</em>
          </span>
          <span className="mobile-bar-page">{activePage}</span>
        </header>

        <main className="content">{page}</main>
      </div>

      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}
