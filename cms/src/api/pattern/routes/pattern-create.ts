/**
 * Custom routes for "create pattern", "load my patterns" and "remix
 * pattern", see the comment in pattern.ts: both the auto-generated create
 * and find routes validate body/query against a schema that generally
 * rejects author (a relation to the User model) - as a body field on
 * create just as much as a filter on find. Remix needs its own route
 * anyway (not a standard CRUD verb).
 */
export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/patterns',
      handler: 'pattern.create',
    },
    {
      method: 'GET',
      path: '/patterns/mine',
      handler: 'pattern.mine',
    },
    {
      method: 'POST',
      path: '/patterns/:id/remix',
      handler: 'pattern.remix',
    },
  ],
};
