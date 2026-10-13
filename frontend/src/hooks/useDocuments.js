import { useEffect, useState } from "react";
import { api, uniqueBy } from "../api";

// Loads the documents of one project. Call reload() after an upload or delete.
export default function useDocuments(projectId) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState({ key: null, documents: [] });

  const key = projectId ? `${projectId}:${reloadCount}` : null;

  useEffect(() => {
    if (!key) return undefined;

    let cancelled = false;

    api(`/documents/project/${projectId}`)
      .then((data) => {
        if (!cancelled) {
          setResult({ key, documents: uniqueBy(data.documents, "id") });
        }
      })
      .catch((error) => {
        console.error("Load documents error:", error);
        if (!cancelled) {
          setResult({ key, documents: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, projectId]);

  return {
    documents: key && result.key === key ? result.documents : [],
    loading: Boolean(key) && result.key !== key,
    reload: () => setReloadCount((count) => count + 1),
  };
}
