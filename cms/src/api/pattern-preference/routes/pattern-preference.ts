/**
 * Custom routes only (no `createCoreRouter`) - the standard content API
 * router would generally reject `user` (a relation to
 * plugin::users-permissions.user) in the create/update body, same issue
 * as with pattern/collection.
 */
export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/pattern-preferences/:patternId',
      handler: 'pattern-preference.get',
    },
    {
      method: 'PUT',
      path: '/pattern-preferences/:patternId',
      handler: 'pattern-preference.set',
    },
  ],
};
