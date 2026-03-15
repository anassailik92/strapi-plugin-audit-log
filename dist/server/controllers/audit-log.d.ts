/**
 * audit-log controller
 *
 * Exposes find / findOne to the Content API (public-facing).
 * All write operations are intentionally blocked — entries are created
 * automatically by the service lifecycle subscriber.
 */
declare const controller: ({ strapi }: {
    strapi: any;
}) => {
    find(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<any>;
    deleteAll(ctx: any): Promise<void>;
    create(ctx: any): Promise<any>;
    update(ctx: any): Promise<any>;
    delete(ctx: any): Promise<any>;
};
export default controller;
//# sourceMappingURL=audit-log.d.ts.map