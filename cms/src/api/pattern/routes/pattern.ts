import { factories } from '@strapi/strapi';

/**
 * "create" is served via a custom route (see pattern-create.ts): Strapi 5
 * validates the body of auto-generated content API routes against a
 * schema that generally excludes relations to the User model (here:
 * author) - even though the controller sets the value server-side, same
 * issue as with the custom users-permissions registration endpoint.
 */
export default factories.createCoreRouter('api::pattern.pattern', {
  except: ['create'],
});
