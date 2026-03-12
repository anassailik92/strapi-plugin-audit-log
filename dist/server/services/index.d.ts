declare const _default: {
    'audit-log': ({ strapi }: {
        strapi: any;
    }) => {
        shouldLog(uid: string): boolean;
        getRequestMeta(): {
            userId: string;
            userEmail: string;
            userName: string;
            ip: string;
        };
        safeJson(val: unknown): Record<string, unknown>;
        log(options: import("./audit-log").AuditLogOptions): Promise<void>;
        logFromEvent(action: import("./audit-log").AuditAction, event: any): Promise<void>;
        registerLifecycles(): void;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map