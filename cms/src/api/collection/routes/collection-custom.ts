/**
 * Custom routes for everything the standard content API router doesn't
 * offer (see the comment in collection.ts): creating, loading own
 * collections/subscriptions, adding/removing patterns, subscribing/
 * unsubscribing. Order matters for overlapping paths - literal segments
 * come before the corresponding `:id` routes, so they aren't wrongly
 * interpreted as `:id`.
 */
export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/collections',
      handler: 'collection.create',
    },
    {
      method: 'GET',
      path: '/collections/mine',
      handler: 'collection.mine',
    },
    {
      method: 'GET',
      path: '/collections/subscriptions',
      handler: 'collection.mySubscriptions',
    },
    {
      method: 'POST',
      path: '/collections/:id/patterns/:patternId',
      handler: 'collection.addPattern',
    },
    {
      method: 'DELETE',
      path: '/collections/:id/patterns/:patternId',
      handler: 'collection.removePattern',
    },
    {
      method: 'POST',
      path: '/collections/:id/subscribe',
      handler: 'collection.subscribe',
    },
    {
      method: 'DELETE',
      path: '/collections/:id/subscribe',
      handler: 'collection.unsubscribe',
    },
  ],
};
