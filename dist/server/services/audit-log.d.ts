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
export type AuditAction = 'create' | 'update' | 'delete';
export interface AuditLogOptions {
    action: AuditAction;
    contentType: string;
    entityId?: string | number;
    userId?: string;
    userEmail?: string;
    userName?: string;
    ip?: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
}
declare const auditLogService: ({ strapi }: {
    strapi: any;
}) => {
    shouldLog(uid: string): boolean;
    getRequestMeta(): {
        userId: string;
        userEmail: string;
        userName: string;
        ip: string;
    };
    safeJson(val: unknown): Record<string, unknown> | null;
    log(options: AuditLogOptions): Promise<void>;
    logFromEvent(action: AuditAction, event: any): Promise<void>;
    registerLifecycles(): void;
};
export default auditLogService;
//# sourceMappingURL=audit-log.d.ts.map