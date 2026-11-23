/* =====================================================================
   Server sync. When the server exposes /api (window.APP_ENV.api), data lives
   in Postgres and this keeps the in-memory state S in step with it.
   Without an API, DB is null and the app falls back to localStorage.
   ===================================================================== */
const DB = window.APP_ENV && window.APP_ENV.api ? (() => {
  class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status } }

  async function req(method, path, body) {
    const r = await fetch("/api" + path, {
      method, credentials: "same-origin",
      headers: body ? {"Content-Type": "application/json"} : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(r.status, data.error || "Request failed");
    return data;
  }

  function apply(st) {
    // The admin panel only treats admins as signed in.
    const ok = !!st.user && st.user.role === "admin";
    S.user = ok ? st.user : null; S.signedIn = ok;
    S.courses = st.courses; S.enroll = st.enroll; S.last = st.last; S.prefs = st.prefs;
  }

  const hydrate = () => req("GET", "/state").then(apply);

  /* Re-read from the server and redraw: used after any failed write, so the screen never shows unsaved data. */
  const resync = () => hydrate().then(() => { if (typeof syncName === "function") syncName(); if (typeof render === "function") render(true) }).catch(() => {});

  /* Fire-and-check write for optimistic UI updates. Pass {sync:true} to re-read state once it lands. */
  function write(method, path, body, opts = {}) {
    return req(method, path, body).then(r => { if (opts.sync) resync(); return r }).catch(e => {
      toast(e.status === 401 ? "Your session ended. Sign in again." : `Not saved: ${e.message}`);
      resync(); throw e;
    });
  }

  return {req, apply, hydrate, resync, write, ApiError};
})() : null;
