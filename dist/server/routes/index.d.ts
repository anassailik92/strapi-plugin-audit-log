/**
 * audit-log routes
 * Only GET endpoints are exposed. Write operations are blocked at controller level.
 */
declare const _default: {
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
export default _default;
//# sourceMappingURL=index.d.ts.map