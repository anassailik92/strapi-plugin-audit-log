/**
 * src/server/index.ts
 *
 * Plugin server entry-point.
 * Wires together content-types, services, controllers, routes, and bootstrap.
 */

import contentTypes from './content-types';
import services     from './services';
import controllers  from './controllers';
import routes       from './routes';

export default {
  register({ strapi }: { strapi: any }) {
    // Nothing needed at register phase
  },

  async bootstrap({ strapi }: { strapi: any }) {
    // Register the global lifecycle subscriber once Strapi is fully loaded
    strapi.service('plugin::audit-log.audit-log').registerLifecycles();
  },

  contentTypes,
  services,
  controllers,
  routes,
};
