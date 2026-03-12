/**
 * src/admin/pages/AuditLog/index.tsx
 *
 * Admin panel page for browsing audit logs.
 *
 * Features
 * ─────────
 * • Filterable by action, content-type UID, and user email
 * • Paginated (20 per page)
 * • Click "View" on any row to open a detail overlay with the
 *   full "before" / "after" JSON snapshots
 * • "Delete All" button with confirmation dialog
 * • "Refresh" button
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetchClient } from '@strapi/admin/strapi-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

type Action = 'create' | 'update' | 'delete';

interface AuditLogEntry {
  id         : number;
  documentId : string;
  action     : Action;
  contentType: string;
  entityId   : string;
  userId     : string;
  userEmail  : string;
  userName   : string;
  before     : Record<string, unknown> | null;
  after      : Record<string, unknown> | null;
  ip         : string;
  createdAt  : string;
}

interface Filters {
  action     : string;
  contentType: string;
  userEmail  : string;
}

interface PaginationState {
  page     : number;
  pageSize : number;
  pageCount: number;
  total    : number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** NOTE: plugin UID — different from the api:: version in a standalone project */
const COLLECTION_UID = 'plugin::audit-log.audit-log';

const ACTION_STYLE: Record<Action, React.CSSProperties> = {
  create: { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
  update: { background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' },
  delete: { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
};

const EMPTY_FILTERS: Filters = { action: '', contentType: '', userEmail: '' };

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ log, onClose }: { log: AuditLogEntry; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const infoRows: Array<[string, React.ReactNode]> = [
    ['Action',
      <span key="action" style={{ padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, ...ACTION_STYLE[log.action] }}>
        {log.action.toUpperCase()}
      </span>],
    ['Content Type', log.contentType],
    ['Entity ID',    log.entityId || '—'],
    ['User',
      log.userName
        ? `${log.userName}  (${log.userEmail || 'no email'})`
        : log.userEmail || 'Anonymous'],
    ['User ID',   log.userId || '—'],
    ['IP Address',log.ip     || '—'],
    ['Date',      new Date(log.createdAt).toLocaleString()],
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '8px', padding: '28px', width: '90%', maxWidth: '760px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Audit Log&nbsp;#{log.id}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '22px', lineHeight: 1, cursor: 'pointer', color: '#666' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: '24px', background: '#f8f9fb', borderRadius: '6px', padding: '16px' }}>
          {infoRows.map(([label, value]) => (
            <div key={String(label)}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>

        {[
          { label: '⬅ Before (old data)', data: log.before, color: '#856404' },
          { label: '➡ After (new data)',  data: log.after,  color: '#155724' },
        ].map(({ label, data, color }) =>
          data ? (
            <div key={label} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color, marginBottom: '6px' }}>{label}</div>
              <pre style={{ background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', fontSize: '12px', overflowX: 'auto', maxHeight: '220px', margin: 0, lineHeight: 1.6 }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { get, post } = useFetchClient();

  const [logs, setLogs]           = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 20, pageCount: 0, total: 0 });
  const [loading, setLoading]     = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [filters, setFilters]     = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected]   = useState<AuditLogEntry | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchLogs = useCallback(
    async (page: number, overrideFilters?: Filters) => {
      const f = overrideFilters ?? filtersRef.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: '20', sort: 'createdAt:desc' });
        if (f.action)       params.set('filters[action][$eq]',              f.action);
        if (f.contentType)  params.set('filters[contentType][$containsi]',  f.contentType);
        if (f.userEmail)    params.set('filters[userEmail][$containsi]',    f.userEmail);

        const { data } = await get(`/content-manager/collection-types/${COLLECTION_UID}?${params}`);
        setLogs(data.results ?? data.data ?? []);
        const meta: PaginationState = data.pagination ?? data.meta?.pagination ?? { page: 1, pageSize: 20, pageCount: 0, total: 0 };
        setPagination({ ...meta, page });
      } catch (err: any) {
        const msg    = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message ?? 'Failed to load audit logs';
        const status = err?.response?.status ? ` (HTTP ${err.response.status})` : '';
        setError(`${msg}${status}`);
        console.error('[AuditLog] fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [get]
  );

  useEffect(() => { fetchLogs(1); }, []); // eslint-disable-line

  const deleteAll = useCallback(async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL audit logs?\nThis action cannot be undone.')) return;
    setDeleting(true);
    setError(null);
    try {
      let page = 1;
      const allDocIds: string[] = [];
      while (true) {
        const { data } = await get(`/content-manager/collection-types/${COLLECTION_UID}?pageSize=200&page=${page}`);
        const results: AuditLogEntry[] = data.results ?? data.data ?? [];
        for (const r of results) if (r.documentId) allDocIds.push(r.documentId);
        const meta = data.pagination ?? data.meta?.pagination;
        if (!meta || page >= (meta.pageCount ?? 1)) break;
        page++;
      }
      if (allDocIds.length === 0) return;
      await post(`/content-manager/collection-types/${COLLECTION_UID}/actions/bulkDelete`, { documentIds: allDocIds });
      await fetchLogs(1);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to delete audit logs');
      console.error('[AuditLog] deleteAll error:', err);
    } finally {
      setDeleting(false);
    }
  }, [get, post, fetchLogs]);

  const applyFilters = () => fetchLogs(1);
  const clearFilters = () => { const c = EMPTY_FILTERS; setFilters(c); fetchLogs(1, c); };

  return (
    <div style={{ padding: '32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f6f6f9', minHeight: '100vh', color: '#212134' }}>
      {selected && <DetailModal log={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '28px', fontWeight: 700 }}>Audit Logs</h1>
          <p style={{ margin: 0, color: '#8e8ea9', fontSize: '14px' }}>
            Automatic record of every create, update, and delete operation.
            {pagination.total > 0 && <span style={{ marginLeft: '10px', color: '#4945ff', fontWeight: 600 }}>{pagination.total} total records</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => fetchLogs(pagination.page)} disabled={loading || deleting} style={{ ...btnPrimary, opacity: (loading || deleting) ? 0.6 : 1 }}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <button onClick={deleteAll} disabled={loading || deleting || pagination.total === 0}
            style={{ ...btnPrimary, background: deleting ? '#e53e3e' : '#c53030', opacity: (loading || deleting || pagination.total === 0) ? 0.5 : 1 }}>
            {deleting ? 'Deleting…' : '🗑 Delete All'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: '8px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 500 }}>
          Action
          <select value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} style={selectStyle}>
            <option value="">All</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 500 }}>
          Content Type
          <input type="text" placeholder="api::article.article" value={filters.contentType}
            onChange={(e) => setFilters((f) => ({ ...f, contentType: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()} style={{ ...inputStyle, width: '220px' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 500 }}>
          User Email
          <input type="text" placeholder="admin@example.com" value={filters.userEmail}
            onChange={(e) => setFilters((f) => ({ ...f, userEmail: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()} style={{ ...inputStyle, width: '220px' }} />
        </label>
        <button onClick={applyFilters} style={btnPrimary}>Apply</button>
        <button onClick={clearFilters} style={btnSecondary}>Clear</button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {error && <div style={{ padding: '14px 20px', background: '#fff5f5', borderBottom: '1px solid #fed7d7', color: '#c53030', fontSize: '14px' }}>⚠️ {error}</div>}

        {loading ? (
          <div style={{ padding: '72px', textAlign: 'center', color: '#8e8ea9', fontSize: '15px' }}>Loading…</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f6f6f9' }}>
                    {['#', 'Action', 'Content Type', 'Entity ID', 'User', 'IP', 'Date', ''].map((h, i) => (
                      <th key={i} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#666687', whiteSpace: 'nowrap', borderBottom: '1px solid #eaeaef' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '72px', textAlign: 'center', color: '#8e8ea9', fontSize: '14px' }}>No audit logs found</td></tr>
                  ) : logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f5' }}>
                      <td style={tdStyle}><span style={{ color: '#8e8ea9' }}>#{log.id}</span></td>
                      <td style={tdStyle}>
                        <span style={{ padding: '3px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, ...ACTION_STYLE[log.action] }}>
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.contentType}>{log.contentType}</td>
                      <td style={{ ...tdStyle, color: '#8e8ea9' }}>{log.entityId || '—'}</td>
                      <td style={tdStyle}>
                        {log.userName && <div style={{ fontSize: '13px', fontWeight: 500 }}>{log.userName}</div>}
                        <div style={{ fontSize: '12px', color: '#8e8ea9' }}>{log.userEmail || 'Anonymous'}</div>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#8e8ea9' }}>{log.ip || '—'}</td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#8e8ea9', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={tdStyle}>
                        {(log.before ?? log.after) ? <button onClick={() => setSelected(log)} style={btnView}>View</button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pageCount > 1 && (
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eaeaef' }}>
                <span style={{ fontSize: '13px', color: '#8e8ea9' }}>
                  Page {pagination.page} of {pagination.pageCount}&nbsp;
                  <span style={{ color: '#212134' }}>({pagination.total} records)</span>
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)} style={btnPage}>← Previous</button>
                  <button disabled={pagination.page >= pagination.pageCount} onClick={() => fetchLogs(pagination.page + 1)} style={btnPage}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: '4px', border: '1px solid #dcdce4', fontSize: '14px', outline: 'none' };
const selectStyle: React.CSSProperties = { ...inputStyle, background: '#fff', cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { padding: '9px 20px', background: '#4945ff', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { padding: '9px 16px', background: '#fff', border: '1px solid #dcdce4', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' };
const btnPage: React.CSSProperties = { padding: '6px 14px', borderRadius: '4px', border: '1px solid #dcdce4', fontSize: '13px', cursor: 'pointer', background: '#fff' };
const btnView: React.CSSProperties = { padding: '4px 12px', background: '#fff', border: '1px solid #4945ff', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', color: '#4945ff', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: '13px', verticalAlign: 'middle' };
