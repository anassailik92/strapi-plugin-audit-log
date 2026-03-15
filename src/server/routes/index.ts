/**
 * audit-log routes
 * Only GET endpoints are exposed. Write operations are blocked at controller level.
 */

export default {
  'audit-log': {
    type: 'admin',
    routes: [
      {
        method:  'GET',
        path:    '/audit-logs',
        handler: 'audit-log.find',
        config:  { policies: [] },
      },
      {
        method:  'GET',
        path:    '/audit-logs/:id',
        handler: 'audit-log.findOne',
        config:  { policies: [] },
      },
      {
        method:  'DELETE',
        path:    '/audit-logs',
        handler: 'audit-log.deleteAll',
        config:  { policies: [] },
      },
    ],
  },
};
