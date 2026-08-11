import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  // Runs behind a reverse proxy (Nginx Proxy Manager) that terminates TLS -
  // without this, Koa treats the connection as plain HTTP and refuses to
  // set the secure session cookie (see SESSION_COOKIE_SECURE), 500ing login.
  proxy: {
    koa: true,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
