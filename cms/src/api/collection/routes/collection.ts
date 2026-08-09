import { factories } from '@strapi/strapi';

/**
 * "create" is served via a custom route (see collection-custom.ts):
 * Strapi validates the body of auto-generated content API routes against
 * a schema that generally excludes relations to the User model (here:
 * owner) - same issue as with the pattern content type.
 */
export default factories.createCoreRouter('api::collection.collection', {
  except: ['create'],
});
