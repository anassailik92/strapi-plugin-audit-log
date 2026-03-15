/**
 * src/server/index.ts
 *
 * Plugin server entry-point.
 * Wires together content-types, services, controllers, routes, and bootstrap.
 */
declare const _default: {
    register({ strapi }: {
        strapi: any;
    }): void;
    bootstrap({ strapi }: {
        strapi: any;
    }): Promise<void>;
    contentTypes: {
        'audit-log': {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                };
                attributes: {
                    action: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    contentType: {
                        type: string;
                        required: boolean;
                    };
                    entityId: {
                        type: string;
                    };
                    userId: {
                        type: string;
                    };
                    userEmail: {
                        type: string;
                    };
                    userName: {
                        type: string;
                    };
                    before: {
                        type: string;
                    };
                    after: {
                        type: string;
                    };
                    ip: {
                        type: string;
                    };
                };
            };
        };
    };
    services: {
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
            log(options: import("./services/audit-log").AuditLogOptions): Promise<void>;
            logFromEvent(action: import("./services/audit-log").AuditAction, event: any): Promise<void>;
            registerLifecycles(): void;
        };
    };
    controllers: {
        'audit-log': ({ strapi }: {
            strapi: any;
        }) => {
            find(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<any>;
            deleteAll(ctx: any): Promise<void>;
            create(ctx: any): Promise<any>;
            update(ctx: any): Promise<any>;
            delete(ctx: any): Promise<any>;
        };
    };
    routes: {
        'audit-log': {
            type: string;
            routes: {
                method: string;
                path: string;
                handler: string;
                config: {
                    policies: any[];
                };
            }[];
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map