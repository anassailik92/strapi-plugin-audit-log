"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const React = require("react");
function getAuthHeader() {
  try {
    const raw = localStorage.getItem("jwtToken") ?? sessionStorage.getItem("jwtToken");
    if (raw) return { Authorization: `Bearer ${raw}` };
    const auth = localStorage.getItem("strapi-admin-token") ?? sessionStorage.getItem("strapi-admin-token");
    if (auth) return { Authorization: `Bearer ${auth}` };
  } catch {
  }
  return {};
}
const BASE = "/admin";
async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include"
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { response: res });
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: JSON.stringify(body)
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { response: res });
  return res.json();
}
const COLLECTION_UID = "plugin::audit-log.audit-log";
const ACTION_STYLE = {
  create: { background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" },
  update: { background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba" },
  delete: { background: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb" }
};
const EMPTY_FILTERS = { action: "", contentType: "", userEmail: "" };
function DetailModal({ log, onClose }) {
  React.useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  const infoRows = [
    [
      "Action",
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { padding: "2px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, ...ACTION_STYLE[log.action] }, children: log.action.toUpperCase() }, "action")
    ],
    ["Content Type", log.contentType],
    ["Entity ID", log.entityId || "—"],
    [
      "User",
      log.userName ? `${log.userName}  (${log.userEmail || "no email"})` : log.userEmail || "Anonymous"
    ],
    ["User ID", log.userId || "—"],
    ["IP Address", log.ip || "—"],
    ["Date", new Date(log.createdAt).toLocaleString()]
  ];
  return /* @__PURE__ */ jsxRuntime.jsx(
    "div",
    {
      onClick: onClose,
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
      children: /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: { background: "#fff", borderRadius: "8px", padding: "28px", width: "90%", maxWidth: "760px", maxHeight: "85vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" },
          children: [
            /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }, children: [
              /* @__PURE__ */ jsxRuntime.jsxs("h2", { style: { margin: 0, fontSize: "18px", fontWeight: 700 }, children: [
                "Audit Log #",
                log.id
              ] }),
              /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: onClose, "aria-label": "Close", style: { background: "none", border: "none", fontSize: "22px", lineHeight: 1, cursor: "pointer", color: "#666" }, children: "✕" })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: "24px", background: "#f8f9fb", borderRadius: "6px", padding: "16px" }, children: infoRows.map(([label, value]) => /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontSize: "11px", color: "#888", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }, children: label }),
              /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontSize: "14px", wordBreak: "break-all" }, children: value })
            ] }, String(label))) }),
            [
              { label: "⬅ Before (old data)", data: log.before, color: "#856404" },
              { label: "➡ After (new data)", data: log.after, color: "#155724" }
            ].map(
              ({ label, data, color }) => data ? /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginBottom: "16px" }, children: [
                /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontSize: "13px", fontWeight: 600, color, marginBottom: "6px" }, children: label }),
                /* @__PURE__ */ jsxRuntime.jsx("pre", { style: { background: "#f8f9fa", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px", fontSize: "12px", overflowX: "auto", maxHeight: "220px", margin: 0, lineHeight: 1.6 }, children: JSON.stringify(data, null, 2) })
              ] }, label) : null
            )
          ]
        }
      )
    }
  );
}
function AuditLogPage() {
  const [logs, setLogs] = React.useState([]);
  const [pagination, setPagination] = React.useState({ page: 1, pageSize: 20, pageCount: 0, total: 0 });
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [selected, setSelected] = React.useState(null);
  const filtersRef = React.useRef(filters);
  filtersRef.current = filters;
  const fetchLogs = React.useCallback(
    async (page, overrideFilters) => {
      const f = overrideFilters ?? filtersRef.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "20", sort: "createdAt:desc" });
        if (f.action) params.set("filters[action][$eq]", f.action);
        if (f.contentType) params.set("filters[contentType][$containsi]", f.contentType);
        if (f.userEmail) params.set("filters[userEmail][$containsi]", f.userEmail);
        const data = await apiGet(`/content-manager/collection-types/${COLLECTION_UID}?${params}`);
        setLogs(data.results ?? data.data ?? []);
        const meta = data.pagination ?? data.meta?.pagination ?? { page: 1, pageSize: 20, pageCount: 0, total: 0 };
        setPagination({ ...meta, page });
      } catch (err) {
        const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message ?? "Failed to load audit logs";
        const status = err?.response?.status ? ` (HTTP ${err.response.status})` : "";
        setError(`${msg}${status}`);
        console.error("[AuditLog] fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );
  React.useEffect(() => {
    fetchLogs(1);
  }, []);
  const deleteAll = React.useCallback(async () => {
    if (!window.confirm("⚠️ Are you sure you want to delete ALL audit logs?\nThis action cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      let page = 1;
      const allDocIds = [];
      while (true) {
        const data = await apiGet(`/content-manager/collection-types/${COLLECTION_UID}?pageSize=200&page=${page}`);
        const results = data.results ?? data.data ?? [];
        for (const r of results) if (r.documentId) allDocIds.push(r.documentId);
        const meta = data.pagination ?? data.meta?.pagination;
        if (!meta || page >= (meta.pageCount ?? 1)) break;
        page++;
      }
      if (allDocIds.length === 0) return;
      await apiPost(`/content-manager/collection-types/${COLLECTION_UID}/actions/bulkDelete`, { documentIds: allDocIds });
      await fetchLogs(1);
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? err?.message ?? "Failed to delete audit logs");
      console.error("[AuditLog] deleteAll error:", err);
    } finally {
      setDeleting(false);
    }
  }, [fetchLogs]);
  const applyFilters = () => fetchLogs(1);
  const clearFilters = () => {
    const c = EMPTY_FILTERS;
    setFilters(c);
    fetchLogs(1, c);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "32px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f9", minHeight: "100vh", color: "#212134" }, children: [
    selected && /* @__PURE__ */ jsxRuntime.jsx(DetailModal, { log: selected, onClose: () => setSelected(null) }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx("h1", { style: { margin: "0 0 6px", fontSize: "28px", fontWeight: 700 }, children: "Audit Logs" }),
        /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { margin: 0, color: "#8e8ea9", fontSize: "14px" }, children: [
          "Automatic record of every create, update, and delete operation.",
          pagination.total > 0 && /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { marginLeft: "10px", color: "#4945ff", fontWeight: 600 }, children: [
            pagination.total,
            " total records"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: "10px" }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => fetchLogs(pagination.page), disabled: loading || deleting, style: { ...btnPrimary, opacity: loading || deleting ? 0.6 : 1 }, children: loading ? "Loading…" : "↻ Refresh" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: deleteAll,
            disabled: loading || deleting || pagination.total === 0,
            style: { ...btnPrimary, background: deleting ? "#e53e3e" : "#c53030", opacity: loading || deleting || pagination.total === 0 ? 0.5 : 1 },
            children: deleting ? "Deleting…" : "🗑 Delete All"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "#fff", borderRadius: "8px", padding: "20px 24px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("label", { style: { display: "flex", flexDirection: "column", gap: "5px", fontSize: "13px", fontWeight: 500 }, children: [
        "Action",
        /* @__PURE__ */ jsxRuntime.jsxs("select", { value: filters.action, onChange: (e) => setFilters((f) => ({ ...f, action: e.target.value })), style: selectStyle, children: [
          /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "All" }),
          /* @__PURE__ */ jsxRuntime.jsx("option", { value: "create", children: "Create" }),
          /* @__PURE__ */ jsxRuntime.jsx("option", { value: "update", children: "Update" }),
          /* @__PURE__ */ jsxRuntime.jsx("option", { value: "delete", children: "Delete" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("label", { style: { display: "flex", flexDirection: "column", gap: "5px", fontSize: "13px", fontWeight: 500 }, children: [
        "Content Type",
        /* @__PURE__ */ jsxRuntime.jsx(
          "input",
          {
            type: "text",
            placeholder: "api::article.article",
            value: filters.contentType,
            onChange: (e) => setFilters((f) => ({ ...f, contentType: e.target.value })),
            onKeyDown: (e) => e.key === "Enter" && applyFilters(),
            style: { ...inputStyle, width: "220px" }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("label", { style: { display: "flex", flexDirection: "column", gap: "5px", fontSize: "13px", fontWeight: 500 }, children: [
        "User Email",
        /* @__PURE__ */ jsxRuntime.jsx(
          "input",
          {
            type: "text",
            placeholder: "admin@example.com",
            value: filters.userEmail,
            onChange: (e) => setFilters((f) => ({ ...f, userEmail: e.target.value })),
            onKeyDown: (e) => e.key === "Enter" && applyFilters(),
            style: { ...inputStyle, width: "220px" }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: applyFilters, style: btnPrimary, children: "Apply" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: clearFilters, style: btnSecondary, children: "Clear" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }, children: [
      error && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "14px 20px", background: "#fff5f5", borderBottom: "1px solid #fed7d7", color: "#c53030", fontSize: "14px" }, children: [
        "⚠️ ",
        error
      ] }),
      loading ? /* @__PURE__ */ jsxRuntime.jsx("div", { style: { padding: "72px", textAlign: "center", color: "#8e8ea9", fontSize: "15px" }, children: "Loading…" }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntime.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("thead", { children: /* @__PURE__ */ jsxRuntime.jsx("tr", { style: { background: "#f6f6f9" }, children: ["#", "Action", "Content Type", "Entity ID", "User", "IP", "Date", ""].map((h, i) => /* @__PURE__ */ jsxRuntime.jsx("th", { style: { padding: "11px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#666687", whiteSpace: "nowrap", borderBottom: "1px solid #eaeaef" }, children: h }, i)) }) }),
          /* @__PURE__ */ jsxRuntime.jsx("tbody", { children: logs.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx("tr", { children: /* @__PURE__ */ jsxRuntime.jsx("td", { colSpan: 8, style: { padding: "72px", textAlign: "center", color: "#8e8ea9", fontSize: "14px" }, children: "No audit logs found" }) }) : logs.map((log) => /* @__PURE__ */ jsxRuntime.jsxs("tr", { style: { borderBottom: "1px solid #f0f0f5" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("td", { style: tdStyle, children: /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { color: "#8e8ea9" }, children: [
              "#",
              log.id
            ] }) }),
            /* @__PURE__ */ jsxRuntime.jsx("td", { style: tdStyle, children: /* @__PURE__ */ jsxRuntime.jsx("span", { style: { padding: "3px 9px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, ...ACTION_STYLE[log.action] }, children: log.action.toUpperCase() }) }),
            /* @__PURE__ */ jsxRuntime.jsx("td", { style: { ...tdStyle, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: log.contentType, children: log.contentType }),
            /* @__PURE__ */ jsxRuntime.jsx("td", { style: { ...tdStyle, color: "#8e8ea9" }, children: log.entityId || "—" }),
            /* @__PURE__ */ jsxRuntime.jsxs("td", { style: tdStyle, children: [
              log.userName && /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontSize: "13px", fontWeight: 500 }, children: log.userName }),
              /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontSize: "12px", color: "#8e8ea9" }, children: log.userEmail || "Anonymous" })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx("td", { style: { ...tdStyle, fontSize: "12px", color: "#8e8ea9" }, children: log.ip || "—" }),
            /* @__PURE__ */ jsxRuntime.jsx("td", { style: { ...tdStyle, fontSize: "12px", color: "#8e8ea9", whiteSpace: "nowrap" }, children: new Date(log.createdAt).toLocaleString() }),
            /* @__PURE__ */ jsxRuntime.jsx("td", { style: tdStyle, children: log.before ?? log.after ? /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setSelected(log), style: btnView, children: "View" }) : null })
          ] }, log.id)) })
        ] }) }),
        pagination.pageCount > 1 && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #eaeaef" }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontSize: "13px", color: "#8e8ea9" }, children: [
            "Page ",
            pagination.page,
            " of ",
            pagination.pageCount,
            " ",
            /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { color: "#212134" }, children: [
              "(",
              pagination.total,
              " records)"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("button", { disabled: pagination.page <= 1, onClick: () => fetchLogs(pagination.page - 1), style: btnPage, children: "← Previous" }),
            /* @__PURE__ */ jsxRuntime.jsx("button", { disabled: pagination.page >= pagination.pageCount, onClick: () => fetchLogs(pagination.page + 1), style: btnPage, children: "Next →" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
const inputStyle = { padding: "8px 12px", borderRadius: "4px", border: "1px solid #dcdce4", fontSize: "14px", outline: "none" };
const selectStyle = { ...inputStyle, background: "#fff", cursor: "pointer" };
const btnPrimary = { padding: "9px 20px", background: "#4945ff", color: "#fff", border: "none", borderRadius: "4px", fontSize: "14px", fontWeight: 600, cursor: "pointer" };
const btnSecondary = { padding: "9px 16px", background: "#fff", border: "1px solid #dcdce4", borderRadius: "4px", fontSize: "14px", cursor: "pointer" };
const btnPage = { padding: "6px 14px", borderRadius: "4px", border: "1px solid #dcdce4", fontSize: "13px", cursor: "pointer", background: "#fff" };
const btnView = { padding: "4px 12px", background: "#fff", border: "1px solid #4945ff", borderRadius: "4px", fontSize: "12px", cursor: "pointer", color: "#4945ff", fontWeight: 600 };
const tdStyle = { padding: "12px 16px", fontSize: "13px", verticalAlign: "middle" };
exports.default = AuditLogPage;
//# sourceMappingURL=index-BD0j_IhD.js.map
