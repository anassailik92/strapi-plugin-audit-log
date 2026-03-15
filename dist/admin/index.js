"use strict";
const jsxRuntime = require("react/jsx-runtime");
const AuditLogIcon = () => /* @__PURE__ */ jsxRuntime.jsx(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 32 32",
    width: "1.2em",
    height: "1.2em",
    fill: "currentColor",
    "aria-hidden": "true",
    children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 12H7v-2h10v2zm0-4H7v-2h10v2zm-3-4H7V8h7v2z" })
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
      Component: async () => Promise.resolve().then(() => require("../_chunks/index-CANpXNur.js")),
      permissions: []
    });
  },
  bootstrap() {
  }
};
module.exports = index;
//# sourceMappingURL=index.js.map
