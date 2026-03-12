/**
 * src/server/services/audit-log.ts
 *
 * The single source of truth for all audit logging.
 *
 * ─── Public API ─────────────────────────────────────────────────────────────
 *
 *  Call from any controller / service / middleware / cron job:
 *
 *    await strapi.service('plugin::audit-log.audit-log').log({
 *      action      : 'create' | 'update' | 'delete',
 *      contentType : 'api::article.article',
 *      entityId    : record.id,
 *
 *      // All fields below are OPTIONAL and auto-detected from the request
 *      // context when omitted:
 *      userId    : '1',
 *      userEmail : 'admin@example.com',
 *      userName  : 'John Doe',
 *      ip        : '127.0.0.1',
 *      before    : { ...oldData },
 *      after     : { ...newData },
 *    });
 *
 * ─── Methods ────────────────────────────────────────────────────────────────
 *
 *  log(options)              Primary API — write a single audit entry
 *  logFromEvent(action, ev)  Used internally by the lifecycle subscriber
 *  getRequestMeta()          Extracts user + IP from the active Koa context
 *  shouldLog(uid)            Returns false for UIDs that must not be tracked
 *  safeJson(val)             Serialises a value to a plain JSON-safe object
 *  registerLifecycles()      Subscribes to all Strapi DB lifecycle events
 *                            (called once from plugin bootstrap)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLogOptions {
  action       : AuditAction;
  contentType  : string;
  entityId?    : string | number;
  userId?      : string;
  userEmail?   : string;
  userName?    : string;
  ip?          : string;
  before?      : Record<string, unknown> | null;
  after?       : Record<string, unknown> | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLUGIN_UID = 'plugin::audit-log.audit-log';

/** UIDs that must NEVER be logged to avoid infinite recursion or noise */
const EXCLUDED_UIDS = new Set<string>([PLUGIN_UID]);

// ─── Service ─────────────────────────────────────────────────────────────────

const auditLogService = ({ strapi }: { strapi: any }) => ({

  // ────────────────────────────────────────────────────────────────────────
  // shouldLog(uid)
  // ────────────────────────────────────────────────────────────────────────
  shouldLog(uid: string): boolean {
    if (EXCLUDED_UIDS.has(uid))     return false;
    if (uid.startsWith('strapi::')) return false;
    if (uid.startsWith('admin::'))  return false;
    return true;
  },

  // ────────────────────────────────────────────────────────────────────────
  // getRequestMeta()
  // Reads the active Koa request context and extracts user + IP.
  // Returns empty strings when called outside an HTTP request (e.g. cron).
  // ────────────────────────────────────────────────────────────────────────
  getRequestMeta(): { userId: string; userEmail: string; userName: string; ip: string } {
    try {
      const ctx         = strapi.requestContext?.get?.();
      const credentials = ctx?.state?.auth?.credentials;

      const userId    = credentials ? String(credentials.id ?? '') : '';
      const userEmail = credentials?.email ?? '';
      const userName  = credentials
        ? (
            [credentials.firstname, credentials.lastname].filter(Boolean).join(' ') ||
            credentials.username ||
            credentials.email ||
            ''
          )
        : '';
      const ip = ctx?.request?.ip ?? ctx?.ip ?? '';

      return { userId, userEmail, userName, ip };
    } catch {
      return { userId: '', userEmail: '', userName: '', ip: '' };
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // safeJson(val)
  // Serialises a value to a plain JSON-safe object.
  // Protects against circular references and non-serialisable values.
  // ────────────────────────────────────────────────────────────────────────
  safeJson(val: unknown): Record<string, unknown> | null {
    if (val == null) return null;
    try {
      return JSON.parse(JSON.stringify(val));
    } catch {
      return null;
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // log(options)  ← PRIMARY PUBLIC API
  // ────────────────────────────────────────────────────────────────────────
  async log(options: AuditLogOptions): Promise<void> {
    try {
      const meta = this.getRequestMeta();

      await strapi.db.query(PLUGIN_UID).create({
        data: {
          action      : options.action,
          contentType : options.contentType,
          entityId    : String(options.entityId ?? ''),
          userId      : options.userId    ?? meta.userId,
          userEmail   : options.userEmail ?? meta.userEmail,
          userName    : options.userName  ?? meta.userName,
          ip          : options.ip        ?? meta.ip,
          before      : options.before != null ? this.safeJson(options.before) : null,
          after       : options.after  != null ? this.safeJson(options.after)  : null,
        },
      });

      strapi.log.debug(
        `[AuditLog] ${options.action} · ${options.contentType} · id=${options.entityId ?? '—'}`
      );
    } catch (error) {
      strapi.log.error('[AuditLog] Failed to write log entry:', error);
      console.error('[AuditLog] Full error:', error);
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // logFromEvent(action, event)
  // Internal helper that extracts entityId / before / after from a raw
  // Strapi DB lifecycle event, then delegates to log().
  // ────────────────────────────────────────────────────────────────────────
  async logFromEvent(action: AuditAction, event: any): Promise<void> {
    const { result, params } = event;
    const state = event.state ?? {};

    const entityId = String(
      result?.id           ??
      result?.documentId   ??
      state.beforeData?.id ??
      params?.where?.id    ??
      params?.where?.documentId ??
      ''
    );

    await this.log({
      action,
      contentType : event.model?.uid ?? 'unknown',
      entityId,
      before : action !== 'create' ? this.safeJson(state.beforeData) : null,
      after  : action !== 'delete' ? this.safeJson(result)           : null,
      // userId / userEmail / userName / ip are auto-detected by log()
    });
  },

  // ────────────────────────────────────────────────────────────────────────
  // registerLifecycles()
  // Subscribes to ALL Strapi DB lifecycle events and writes an audit entry
  // for every create / update / delete across every content type.
  // Called once from src/server/index.ts → bootstrap().
  // ────────────────────────────────────────────────────────────────────────
  registerLifecycles(): void {
    const svc = this; // stable reference inside the closure

    strapi.db.lifecycles.subscribe({

      // ── Capture BEFORE snapshots ─────────────────────────────────────

      async beforeUpdate(event: any) {
        if (!svc.shouldLog(event.model?.uid)) return;
        if (!event.state) (event as any).state = {};
        try {
          const where = event.params?.where ?? {};
          if (Object.keys(where).length > 0) {
            event.state.beforeData = await strapi.db
              .query(event.model.uid)
              .findOne({ where });
          }
        } catch { /* beforeData stays undefined → treated as null */ }
      },

      async beforeDelete(event: any) {
        if (!svc.shouldLog(event.model?.uid)) return;
        if (!event.state) (event as any).state = {};
        try {
          const where = event.params?.where ?? {};
          if (Object.keys(where).length > 0) {
            event.state.beforeData = await strapi.db
              .query(event.model.uid)
              .findOne({ where });
          }
        } catch { /* ignore */ }
      },

      // ── Write audit entries AFTER operations succeed ─────────────────

      async afterCreate(event: any) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent('create', event);
      },

      // Strapi v5 Document Service publish/unpublish can use createMany
      async afterCreateMany(event: any) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent('create', { ...event, result: { count: event.result?.count } });
      },

      async afterUpdate(event: any) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent('update', event);
      },

      // Strapi v5 publish/unpublish uses updateMany internally
      async afterUpdateMany(event: any) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent('update', { ...event, result: { count: event.result?.count } });
      },

      async afterDelete(event: any) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent('delete', event);
      },

      async afterDeleteMany(event: any) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent('delete', { ...event, result: { count: event.result?.count } });
      },
    });

    strapi.log.info('[AuditLog] Global lifecycle subscriber registered ✓');
  },
});

export default auditLogService;
