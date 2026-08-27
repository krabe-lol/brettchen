/**
 * Custom routes for "create pattern", "load my patterns", "remix pattern"
 * and "remove remix link", see the comment in pattern.ts: both the
 * auto-generated create and find routes validate body/query against a
 * schema that generally rejects author (a relation to the User model) -
 * as a body field on create just as much as a filter on find. Remix and
 * remove-remix-link need their own routes anyway (not standard CRUD verbs).
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
    {
      method: 'POST',
      path: '/patterns/:id/remove-remix-link',
      handler: 'pattern.removeRemixLink',
    },
  ],
};
