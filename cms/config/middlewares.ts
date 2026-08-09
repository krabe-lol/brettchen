import type { Core } from '@strapi/strapi';

/**
 * `credentials: true` + eine konkrete Origin (kein "*") sind nötig, damit
 * der Browser den httpOnly Refresh-Token-Cookie (siehe config/plugins.ts,
 * jwtManagement: 'refresh') bei Cross-Origin-Requests vom Vite-Dev-Server
 * überhaupt setzt/mitschickt.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [env('CLIENT_URL', 'http://localhost:5183')],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
