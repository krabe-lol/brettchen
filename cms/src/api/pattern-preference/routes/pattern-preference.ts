/**
 * Nur eigene Routen (kein `createCoreRouter`) – der Standard-Content-API-Router
 * würde `user` (Relation auf plugin::users-permissions.user) im Create/Update-Body
 * generell ablehnen, siehe dasselbe Problem bei Pattern/Collection.
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
    {
      method: 'DELETE',
      path: '/pattern-preferences/:patternId',
      handler: 'pattern-preference.unset',
    },
  ],
};
