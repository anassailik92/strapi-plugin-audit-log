'use strict';
// Compatibility shim — Strapi resolves this file when it finds "strapi-server.js"
// at the root of the package. It simply re-exports the built server bundle.
module.exports = require('./dist/server/index.js');
