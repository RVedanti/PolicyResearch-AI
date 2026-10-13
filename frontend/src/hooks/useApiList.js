import { useEffect, useState } from "react";
import { api } from "../api";

// Loads a list from the backend once when the page opens.
export default function useApiList(path, field) {
  const [state, setState] = useState({ loading: true, items: [] });

  useEffect(() => {
    let cancelled = false;

    api(path)
      .then((data) => {
        if (!cancelled) setState({ loading: false, items: data[field] || [] });
      })
      .catch((error) => {
        console.error(`Load ${field} error:`, error);
        if (!cancelled) setState({ loading: false, items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [path, field]);

  const setItems = (update) =>
    setState((previous) => ({
      ...previous,
      items: typeof update === "function" ? update(previous.items) : update,
    }));

  return { ...state, setItems };
}
