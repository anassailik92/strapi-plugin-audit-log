/**
 * audit-log controller
 *
 * Exposes find / findOne to the Content API (public-facing).
 * All write operations are intentionally blocked — entries are created
 * automatically by the service lifecycle subscriber.
 */

const PLUGIN_UID = 'plugin::audit-log.audit-log';

const controller = ({ strapi }: { strapi: any }) => ({
  async find(ctx: any) {
    const { page = 1, pageSize = 20, sort = 'createdAt:desc', filters } = ctx.query;

    const [field, direction] = String(sort).split(':');
    const where: Record<string, any> = {};

    if (filters?.action?.$eq)           where.action      = filters.action.$eq;
    if (filters?.contentType?.$containsi) where.contentType = { $containsi: filters.contentType.$containsi };
    if (filters?.userEmail?.$containsi)   where.userEmail   = { $containsi: filters.userEmail.$containsi };

    const results = await strapi.db.query(PLUGIN_UID).findPage({
      page:     Number(page),
      pageSize: Number(pageSize),
      orderBy:  { [field ?? 'createdAt']: (direction ?? 'desc').toLowerCase() },
      where,
    });

    ctx.body = results;
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const entry = await strapi.db.query(PLUGIN_UID).findOne({ where: { id } });
    if (!entry) return ctx.notFound();
    ctx.body = { data: entry };
  },

  async create(ctx: any) {
    return ctx.forbidden('Audit logs are created automatically and cannot be written via the API.');
  },

  async update(ctx: any) {
    return ctx.forbidden('Audit logs are immutable.');
  },

  async delete(ctx: any) {
    return ctx.forbidden('Audit logs cannot be deleted via the API.');
  },
});

export default controller;
