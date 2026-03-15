const kind = "collectionType";
const collectionName = "audit_logs";
const info = {
  singularName: "audit-log",
  pluralName: "audit-logs",
  displayName: "Audit Log",
  description: "Tracks all create, update, and delete operations across all content types"
};
const options = {
  draftAndPublish: false
};
const pluginOptions = {
  "content-manager": {
    visible: true
  }
};
const attributes = {
  action: {
    type: "enumeration",
    "enum": [
      "create",
      "update",
      "delete"
    ],
    required: true
  },
  contentType: {
    type: "string",
    required: true
  },
  entityId: {
    type: "string"
  },
  userId: {
    type: "string"
  },
  userEmail: {
    type: "string"
  },
  userName: {
    type: "string"
  },
  before: {
    type: "json"
  },
  after: {
    type: "json"
  },
  ip: {
    type: "string"
  }
};
const schema = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  "audit-log": { schema }
};
const PLUGIN_UID$1 = "plugin::audit-log.audit-log";
const EXCLUDED_UIDS = /* @__PURE__ */ new Set([PLUGIN_UID$1]);
const auditLogService = ({ strapi }) => ({
  // ────────────────────────────────────────────────────────────────────────
  // shouldLog(uid)
  // ────────────────────────────────────────────────────────────────────────
  shouldLog(uid) {
    if (EXCLUDED_UIDS.has(uid)) return false;
    if (uid.startsWith("strapi::")) return false;
    if (uid.startsWith("admin::")) return false;
    return true;
  },
  // ────────────────────────────────────────────────────────────────────────
  // getRequestMeta()
  // Reads the active Koa request context and extracts user + IP.
  // Returns empty strings when called outside an HTTP request (e.g. cron).
  // ────────────────────────────────────────────────────────────────────────
  getRequestMeta() {
    try {
      const ctx = strapi.requestContext?.get?.();
      const credentials = ctx?.state?.auth?.credentials;
      const userId = credentials ? String(credentials.id ?? "") : "";
      const userEmail = credentials?.email ?? "";
      const userName = credentials ? [credentials.firstname, credentials.lastname].filter(Boolean).join(" ") || credentials.username || credentials.email || "" : "";
      const ip = ctx?.request?.ip ?? ctx?.ip ?? "";
      return { userId, userEmail, userName, ip };
    } catch {
      return { userId: "", userEmail: "", userName: "", ip: "" };
    }
  },
  // ────────────────────────────────────────────────────────────────────────
  // safeJson(val)
  // Serialises a value to a plain JSON-safe object.
  // Protects against circular references and non-serialisable values.
  // ────────────────────────────────────────────────────────────────────────
  safeJson(val) {
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
  async log(options2) {
    try {
      const meta = this.getRequestMeta();
      await strapi.db.query(PLUGIN_UID$1).create({
        data: {
          action: options2.action,
          contentType: options2.contentType,
          entityId: String(options2.entityId ?? ""),
          userId: options2.userId ?? meta.userId,
          userEmail: options2.userEmail ?? meta.userEmail,
          userName: options2.userName ?? meta.userName,
          ip: options2.ip ?? meta.ip,
          before: options2.before != null ? this.safeJson(options2.before) : null,
          after: options2.after != null ? this.safeJson(options2.after) : null
        }
      });
      strapi.log.debug(
        `[AuditLog] ${options2.action} · ${options2.contentType} · id=${options2.entityId ?? "—"}`
      );
    } catch (error) {
      strapi.log.error("[AuditLog] Failed to write log entry:", error);
      console.error("[AuditLog] Full error:", error);
    }
  },
  // ────────────────────────────────────────────────────────────────────────
  // logFromEvent(action, event)
  // Internal helper that extracts entityId / before / after from a raw
  // Strapi DB lifecycle event, then delegates to log().
  // ────────────────────────────────────────────────────────────────────────
  async logFromEvent(action, event) {
    const { result, params } = event;
    const state = event.state ?? {};
    const entityId = String(
      result?.id ?? result?.documentId ?? state.beforeData?.id ?? params?.where?.id ?? params?.where?.documentId ?? ""
    );
    await this.log({
      action,
      contentType: event.model?.uid ?? "unknown",
      entityId,
      before: action !== "create" ? this.safeJson(state.beforeData) : null,
      after: action !== "delete" ? this.safeJson(result) : null
      // userId / userEmail / userName / ip are auto-detected by log()
    });
  },
  // ────────────────────────────────────────────────────────────────────────
  // registerLifecycles()
  // Subscribes to ALL Strapi DB lifecycle events and writes an audit entry
  // for every create / update / delete across every content type.
  // Called once from src/server/index.ts → bootstrap().
  // ────────────────────────────────────────────────────────────────────────
  registerLifecycles() {
    const svc = this;
    strapi.db.lifecycles.subscribe({
      // ── Capture BEFORE snapshots ─────────────────────────────────────
      async beforeUpdate(event) {
        if (!svc.shouldLog(event.model?.uid)) return;
        if (!event.state) event.state = {};
        try {
          const where = event.params?.where ?? {};
          if (Object.keys(where).length > 0) {
            event.state.beforeData = await strapi.db.query(event.model.uid).findOne({ where });
          }
        } catch {
        }
      },
      async beforeDelete(event) {
        if (!svc.shouldLog(event.model?.uid)) return;
        if (!event.state) event.state = {};
        try {
          const where = event.params?.where ?? {};
          if (Object.keys(where).length > 0) {
            event.state.beforeData = await strapi.db.query(event.model.uid).findOne({ where });
          }
        } catch {
        }
      },
      // ── Write audit entries AFTER operations succeed ─────────────────
      async afterCreate(event) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent("create", event);
      },
      // Strapi v5 Document Service publish/unpublish can use createMany
      async afterCreateMany(event) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent("create", { ...event, result: { count: event.result?.count } });
      },
      async afterUpdate(event) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent("update", event);
      },
      // Strapi v5 publish/unpublish uses updateMany internally
      async afterUpdateMany(event) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent("update", { ...event, result: { count: event.result?.count } });
      },
      async afterDelete(event) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent("delete", event);
      },
      async afterDeleteMany(event) {
        if (!svc.shouldLog(event.model?.uid)) return;
        await svc.logFromEvent("delete", { ...event, result: { count: event.result?.count } });
      }
    });
    strapi.log.info("[AuditLog] Global lifecycle subscriber registered ✓");
  }
});
const services = { "audit-log": auditLogService };
const PLUGIN_UID = "plugin::audit-log.audit-log";
const controller = ({ strapi }) => ({
  async find(ctx) {
    const { page = 1, pageSize = 20, sort = "createdAt:desc", filters } = ctx.query;
    const [field, direction] = String(sort).split(":");
    const where = {};
    if (filters?.action?.$eq) where.action = filters.action.$eq;
    if (filters?.contentType?.$containsi) where.contentType = { $containsi: filters.contentType.$containsi };
    if (filters?.userEmail?.$containsi) where.userEmail = { $containsi: filters.userEmail.$containsi };
    const results = await strapi.db.query(PLUGIN_UID).findPage({
      page: Number(page),
      pageSize: Number(pageSize),
      orderBy: { [field ?? "createdAt"]: (direction ?? "desc").toLowerCase() },
      where
    });
    ctx.body = results;
  },
  async findOne(ctx) {
    const { id } = ctx.params;
    const entry = await strapi.db.query(PLUGIN_UID).findOne({ where: { id } });
    if (!entry) return ctx.notFound();
    ctx.body = { data: entry };
  },
  async deleteAll(ctx) {
    await strapi.db.query(PLUGIN_UID).deleteMany({ where: {} });
    ctx.body = { message: "All audit logs deleted." };
  },
  async create(ctx) {
    return ctx.forbidden("Audit logs are created automatically and cannot be written via the API.");
  },
  async update(ctx) {
    return ctx.forbidden("Audit logs are immutable.");
  },
  async delete(ctx) {
    return ctx.forbidden("Audit logs cannot be deleted via the API.");
  }
});
const controllers = { "audit-log": controller };
const routes = {
  "audit-log": {
    type: "admin",
    routes: [
      {
        method: "GET",
        path: "/audit-logs",
        handler: "audit-log.find",
        config: { policies: [] }
      },
      {
        method: "GET",
        path: "/audit-logs/:id",
        handler: "audit-log.findOne",
        config: { policies: [] }
      },
      {
        method: "DELETE",
        path: "/audit-logs",
        handler: "audit-log.deleteAll",
        config: { policies: [] }
      }
    ]
  }
};
const index = {
  register({ strapi }) {
  },
  async bootstrap({ strapi }) {
    strapi.service("plugin::audit-log.audit-log").registerLifecycles();
  },
  contentTypes,
  services,
  controllers,
  routes
};
export {
  index as default
};
//# sourceMappingURL=index.mjs.map
