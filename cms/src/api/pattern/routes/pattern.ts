import { factories } from '@strapi/strapi';

/**
 * "create" wird über eine eigene Route (siehe pattern-create.ts) bedient:
 * Strapi 5 validiert den Body von auto-generierten Content-API-Routen gegen
 * ein Schema, das Relationen auf das User-Model (hier: author) generell
 * ausschließt – auch wenn der Controller den Wert serverseitig setzt, siehe
 * das gleiche Problem beim custom users-permissions-Registrierungs-Endpoint.
 */
export default factories.createCoreRouter('api::pattern.pattern', {
  except: ['create'],
});
