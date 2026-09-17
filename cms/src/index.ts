import type { Core } from '@strapi/strapi';
import { computeDifficulty } from './utils/difficulty';

/**
 * Permissions logged-in users need out of the box to create and see their
 * own patterns. Set declaratively instead of manually in the admin panel,
 * so they're guaranteed to exist on every start (even after a fresh DB
 * setup). "create" and "mine" run via custom routes (see
 * api/pattern/routes/pattern-create.ts), but users-permissions' usual
 * action-permission check still applies, since it hangs off the
 * controller action name, not the route path.
 */
const AUTHENTICATED_ACTIONS = [
  'api::pattern.pattern.create',
  'api::pattern.pattern.update',
  'api::pattern.pattern.delete',
  'api::pattern.pattern.mine',
  'api::pattern.pattern.find',
  'api::pattern.pattern.findOne',
  'api::pattern.pattern.remix',
  'api::pattern.pattern.removeRemixLink',
  'api::collection.collection.create',
  'api::collection.collection.mine',
  'api::collection.collection.find',
  'api::collection.collection.findOne',
  'api::collection.collection.update',
  'api::collection.collection.delete',
  'api::collection.collection.addPattern',
  'api::collection.collection.removePattern',
  'api::collection.collection.subscribe',
  'api::collection.collection.unsubscribe',
  'api::collection.collection.mySubscriptions',
  'plugin::users-permissions.user.updatePreferences',
  'api::pattern-preference.pattern-preference.get',
  'api::pattern-preference.pattern-preference.set',
  'api::auth.auth.updateUsername',
  'api::auth.auth.updatePassword',
  'api::auth.auth.updateEmail',
  'api::auth.auth.deleteAccount',
];

/**
 * Published patterns can be browsed by logged-out visitors too (pattern
 * database), same for public collections. forgotPassword/resetPassword
 * set explicitly instead of relying on Strapi's default role settings.
 */
const PUBLIC_ACTIONS = [
  'api::pattern.pattern.find',
  'api::pattern.pattern.findOne',
  'api::collection.collection.find',
  'api::collection.collection.findOne',
  'api::article.article.find',
  'api::article.article.findOne',
  'plugin::users-permissions.auth.forgotPassword',
  'plugin::users-permissions.auth.resetPassword',
];

async function ensurePermissions(strapi: Core.Strapi, roleType: string, actions: string[]) {
  const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: roleType } });
  if (!role) return;

  for (const action of actions) {
    const existing = await strapi
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: role.id } });
    if (!existing) {
      await strapi
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: role.id } });
    }
  }
}

/**
 * Zeigt Strapis "Passwort vergessen"-Mail auf unser Frontend statt auf einen
 * Platzhalter. Greift erst, sobald ein E-Mail-Provider konfiguriert ist
 * (siehe config/plugins.ts) – aktuell ist noch keiner hinterlegt.
 */
async function ensureResetPasswordUrl(strapi: Core.Strapi) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5183';
  const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
  const settings = (await pluginStore.get({ key: 'advanced' })) as Record<string, unknown>;
  const resetUrl = `${clientUrl}/reset-password`;

  if (settings?.email_reset_password !== resetUrl) {
    await pluginStore.set({ key: 'advanced', value: { ...settings, email_reset_password: resetUrl } });
  }
}

function parseFromAddress(value: string): { name: string; email: string } {
  const match = value.match(/^(.*?)\s*<(.+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: '', email: value.trim() };
}

/**
 * Strapi's built-in "reset password"/"email confirmation" templates carry
 * their OWN shipper address in the plugin store (Settings > Email
 * Templates), separate from and NOT overridden by SMTP_FROM in
 * config/plugins.ts - it defaults to the placeholder
 * "Administration Panel" <no-reply@strapi.io> and stays that way forever
 * unless someone edits it by hand in the admin panel. Sending as
 * no-reply@strapi.io while authenticating as our actual SMTP account fails
 * SPF/DKIM alignment for the recipient, so the mail gets silently dropped
 * long before it would show up as an error in Strapi's own logs. Syncing
 * it from SMTP_FROM/SMTP_REPLY_TO on every boot keeps it correct without
 * relying on a manual admin-panel step.
 */
async function ensureResetPasswordEmailSender(strapi: Core.Strapi) {
  const fromRaw = process.env.SMTP_FROM;
  if (!fromRaw) return;
  const from = parseFromAddress(fromRaw);
  const replyTo = process.env.SMTP_REPLY_TO || '';

  const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
  const emailSettings = (await pluginStore.get({ key: 'email' })) as Record<string, any>;
  let changed = false;
  for (const templateKey of ['reset_password', 'email_confirmation']) {
    const options = emailSettings?.[templateKey]?.options;
    if (!options) continue;
    if (options.from?.email !== from.email || options.from?.name !== from.name || options.response_email !== replyTo) {
      options.from = { name: from.name, email: from.email };
      options.response_email = replyTo;
      changed = true;
    }
  }
  if (changed) {
    await pluginStore.set({ key: 'email', value: emailSettings });
  }
}

/**
 * One-time rename of existing default collections from the old German
 * default name to the new English one (see DEFAULT_COLLECTION_NAME in the
 * collection controller) - idempotent, becomes a no-op once no matches
 * are left.
 */
async function renameDefaultCollections(strapi: Core.Strapi) {
  const stale = await strapi.documents('api::collection.collection').findMany({
    filters: { isDefault: true, name: 'Gespeichert' },
  });
  for (const collection of stale) {
    await strapi.documents('api::collection.collection').update({
      documentId: collection.documentId,
      data: { name: 'Saved' } as any,
    });
  }
}

/**
 * One-time backfill for patterns saved before the `difficulty` field
 * existed (it's set automatically on every create/update from then on,
 * see pattern.ts controller) - idempotent, becomes a no-op once every row
 * has a value. Uses the raw query engine (not the document service) since
 * this is just a column backfill, not a new draft/published version.
 */
async function backfillPatternDifficulty(strapi: Core.Strapi) {
  const patterns = await strapi.db.query('api::pattern.pattern').findMany({
    where: { difficulty: null },
    select: ['id', 'threading', 'turningSequence'],
  });
  for (const pattern of patterns as any[]) {
    await strapi.db.query('api::pattern.pattern').update({
      where: { id: pattern.id },
      data: { difficulty: computeDifficulty(pattern.threading, pattern.turningSequence) },
    });
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensurePermissions(strapi, 'authenticated', AUTHENTICATED_ACTIONS);
    await ensurePermissions(strapi, 'public', PUBLIC_ACTIONS);
    await ensureResetPasswordUrl(strapi);
    await ensureResetPasswordEmailSender(strapi);
    await renameDefaultCollections(strapi);
    await backfillPatternDifficulty(strapi);
  },
};
