import { jsx } from "react/jsx-runtime";
import React from "react";
const AuditLogIcon = () => /* @__PURE__ */ jsx(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 23 32",
    width: "1em",
    height: "1em",
    fill: "currentColor",
    "aria-hidden": "true",
    children: /* @__PURE__ */ jsx("path", { d: "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 12H7v-2h10v2zm0-4H7v-2h10v2zm-3-4H7V8h7v2z" })
  }
);
const index = {
  register(app) {
    app.addMenuLink({
      to: "/plugins/audit-log",
      icon: AuditLogIcon,
      intlLabel: {
        id: "audit-log.plugin.name",
        defaultMessage: "Audit Logs"
      },
      Component: React.lazy(() => import("../_chunks/index-yhHCN2kQ.mjs")),
      permissions: []
    });
  },
  bootstrap() {
  }
};
export {
  index as default
};
//# sourceMappingURL=index.mjs.map
