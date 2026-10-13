// Single place for talking to the backend.
// Set VITE_API_URL in frontend/.env to point at a local backend, e.g.
// VITE_API_URL=http://localhost:5000/api
export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://policyresearch-ai-1.onrender.com/api";

export async function api(path, { method = "GET", body, form } = {}) {
  const token = localStorage.getItem("token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: payload,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON response (e.g. server down); handled below.
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

// Remove duplicate items that share the same id field.
export function uniqueBy(items, key) {
  return Array.from(
    new Map((items || []).map((item) => [item[key], item])).values()
  );
}

export function formatDate(value, withTime = false) {
  if (!value) return "";
  const date = new Date(value);
  return withTime
    ? date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
