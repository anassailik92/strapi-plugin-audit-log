'use strict';
// Compatibility shim — Strapi resolves this file when it finds "strapi-admin.js"
// at the root of the package. It simply re-exports the built admin bundle.
module.exports = require('./dist/admin/index.js');
