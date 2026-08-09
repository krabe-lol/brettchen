/**
 * Eigene Routen für "Muster anlegen", "meine Muster laden" und "Muster
 * remixen", siehe Kommentar in pattern.ts: sowohl die auto-generierte
 * Create- als auch die Find-Route validieren Body/Query gegen ein Schema,
 * das author (Relation auf das User-Model) grundsätzlich ablehnt – als
 * Body-Feld beim Anlegen genauso wie als Filter beim Suchen. Remix braucht
 * ohnehin eine eigene Route (kein Standard-CRUD-Verb).
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
