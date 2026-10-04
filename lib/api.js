"use client";

export async function apiFetch(url, options = {}) {
  const sessionId = typeof window !== "undefined" ? localStorage.getItem("kmitlmap:session") : null;
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isParams = typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  if (body && typeof body === "object" && !isFormData && !isParams && !isBlob) {
    body = JSON.stringify(body);
    if (!headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    ...options,
    body,
    headers: {
      ...headers,
      ...(sessionId ? { "x-session-id": sessionId } : {}),
    },
  });

  let data = null;
  try { data = await res.clone().json(); } catch {}

  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("session-invalid", {
      detail: {
        code: data?.code || "SESSION_EXPIRED",
        message: data?.error || "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
        sessionId,
      },
    }));
  }

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data ?? res;
}

export function clearApiSessionCache() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("scimap-session-changed"));
}
