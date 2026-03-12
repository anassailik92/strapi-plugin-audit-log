# strapi-plugin-audit-log

> Automatic audit logging (create / update / delete) for **Strapi v5** with a built-in Admin Panel page.

---

## Features

- 🔁 Records every **create**, **update**, and **delete** across all content types automatically
- 🧑 Captures **user** (name + email + ID) and **IP address** from the request context
- 📸 Stores a **before** snapshot (old data) and an **after** snapshot (new data)
- 🔒 Logs are **immutable** via the Content API — written only by the lifecycle subscriber
- 🖥️ Built-in **Admin Panel page** with filters, pagination, and a detail modal
- 🗑️ **Delete All** button in the admin page
- 🔧 **Service API** — call `strapi.service('plugin::audit-log.audit-log').log(...)` from anywhere

---

## Installation

### From npm
```bash
npm install strapi-plugin-audit-log
```

### From GitHub (latest commit)
```bash
npm install github:YOUR_USERNAME/strapi-plugin-audit-log
```

> **Note:** The `dist/` folder is committed to the repository so no build step
> is required when installing directly from GitHub.

---

## Setup

### 1. Enable the plugin

Add the plugin to your Strapi project's `config/plugins.ts`:

```ts
// config/plugins.ts
export default () => ({
  'audit-log': {
    enabled: true,
  },
});
```

### 2. Rebuild the admin panel

```bash
npm run build
npm run develop
```

That's it. Strapi will create the `audit_logs` table automatically and the
**"Audit Logs"** link will appear in the left-hand sidebar.

---

## Migrating from the standalone version

If you previously added audit logging directly to your project
(`src/api/audit-log/` + `src/index.ts` bootstrap), do the following:

1. **Install this plugin** (see above)
2. **Delete** `src/api/audit-log/` from your project
3. **Remove** the `registerLifecycles()` call from `src/index.ts`
   (the plugin's bootstrap does it automatically)
4. The database table `audit_logs` is reused as-is — no migration needed

---

## Manual Logging

Call the service from any controller, service, middleware, or cron job:

```ts
await strapi.service('plugin::audit-log.audit-log').log({
  action      : 'delete',          // 'create' | 'update' | 'delete'
  contentType : 'api::order.order',
  entityId    : order.id,

  // All fields below are OPTIONAL
  // When omitted they are auto-detected from the active HTTP request context
  userId    : '1',
  userEmail : 'admin@example.com',
  userName  : 'John Doe',
  ip        : '127.0.0.1',
  before    : { ...oldOrder },      // snapshot before the change
  after     : { ...newOrder },      // snapshot after the change
});
```

---

## Service API

| Method | Description |
|---|---|
| `log(options)` | **Primary API** — write a single audit entry |
| `logFromEvent(action, event)` | Internal — converts a lifecycle event to `log()` |
| `getRequestMeta()` | Reads user + IP from the active Koa request context |
| `shouldLog(uid)` | Returns `false` for UIDs that must not be tracked |
| `safeJson(val)` | Serialises a value safely (handles circular refs) |
| `registerLifecycles()` | Subscribes to all DB lifecycle events (called from bootstrap) |

---

## Admin Panel

Navigate to **Audit Logs** in the left sidebar.

| Feature | Description |
|---|---|
| **Filter by Action** | create / update / delete |
| **Filter by Content Type** | e.g. `api::article.article` |
| **Filter by User Email** | partial match |
| **View** | Opens a modal with full before/after JSON |
| **Refresh** | Reloads the current page |
| **Delete All** | Deletes all audit log entries (with confirmation) |

---

## Database Table

The plugin creates a `audit_logs` table with these columns:

| Column | Type | Description |
|---|---|---|
| `action` | enum | `create` / `update` / `delete` |
| `content_type` | string | Strapi UID e.g. `api::article.article` |
| `entity_id` | string | ID of the affected record |
| `user_id` | string | ID of the user who triggered the action |
| `user_email` | string | Email of the user |
| `user_name` | string | Full name of the user |
| `before` | json | Snapshot of the record before the change |
| `after` | json | Snapshot of the record after the change |
| `ip` | string | IP address of the HTTP request |

---

## Development

```bash
# Clone the plugin repo
git clone https://github.com/YOUR_USERNAME/strapi-plugin-audit-log
cd strapi-plugin-audit-log

# Install dependencies
npm install

# Build (outputs to dist/)
npm run build

# Watch mode
npm run watch
```

### Link to a local Strapi project for testing

```bash
# In the plugin folder
npm link

# In your Strapi project
npm link strapi-plugin-audit-log
```

Then add to `config/plugins.ts`:
```ts
export default () => ({
  'audit-log': {
    enabled: true,
    resolve: './node_modules/strapi-plugin-audit-log',
  },
});
```

---

## Publishing to npm

```bash
npm login
npm publish
```

---

## License

MIT
