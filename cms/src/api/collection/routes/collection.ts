import { factories } from '@strapi/strapi';

/**
 * "create" läuft über eine eigene Route (siehe collection-custom.ts):
 * Strapi validiert den Body von auto-generierten Content-API-Routen gegen
 * ein Schema, das Relationen auf das User-Model (hier: owner) generell
 * ausschließt, siehe dasselbe Problem beim Pattern-Content-Type.
 */
export default factories.createCoreRouter('api::collection.collection', {
  except: ['create'],
});
