/**
 * audit-log routes
 * Only GET endpoints are exposed. Write operations are blocked at controller level.
 */

export default {
  'audit-log': {
    type: 'content-api',
    routes: [
      {
        method:  'GET',
        path:    '/audit-logs',
        handler: 'audit-log.find',
        config:  { policies: [], auth: false },
      },
      {
        method:  'GET',
        path:    '/audit-logs/:id',
        handler: 'audit-log.findOne',
        config:  { policies: [], auth: false },
      },
      {
        method:  'DELETE',
        path:    '/audit-logs',
        handler: 'audit-log.deleteAll',
        config:  { policies: [], auth: false },
      },
    ],
  },
};
