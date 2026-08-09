/**
 * Eigene Routen für alles, was der Standard-Content-API-Router nicht bietet
 * (siehe Kommentar in collection.ts): Anlegen, eigene Sammlungen/Abos
 * laden, Muster hinzufügen/entfernen, abonnieren/kündigen. Reihenfolge
 * wichtig bei überlappenden Pfaden – literale Segmente (z. B. "default")
 * stehen vor den entsprechenden `:id`-Routen, damit sie nicht fälschlich
 * als `:id` interpretiert werden.
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
      path: '/collections/default/patterns/:patternId',
      handler: 'collection.addToDefaultCollection',
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
