import type { Core } from '@strapi/strapi';

/**
 * Berechtigungen, die eingeloggte Nutzer:innen ab Werk brauchen, um eigene
 * Muster anzulegen und zu sehen. Deklarativ statt manuell im Admin-Panel
 * gesetzt, damit sie bei jedem Start (auch nach einem frischen DB-Setup)
 * garantiert vorhanden sind. "create" und "mine" laufen zwar über eigene
 * Routen (siehe api/pattern/routes/pattern-create.ts), der übliche
 * Action-Permission-Check von users-permissions greift aber trotzdem, weil
 * er am Controller-Aktionsnamen hängt, nicht am Routen-Pfad.
 */
const AUTHENTICATED_ACTIONS = [
  'api::pattern.pattern.create',
  'api::pattern.pattern.update',
  'api::pattern.pattern.delete',
  'api::pattern.pattern.mine',
  'api::pattern.pattern.find',
  'api::pattern.pattern.findOne',
  'api::pattern.pattern.remix',
  'api::collection.collection.create',
  'api::collection.collection.mine',
  'api::collection.collection.find',
  'api::collection.collection.findOne',
  'api::collection.collection.update',
  'api::collection.collection.delete',
  'api::collection.collection.addPattern',
  'api::collection.collection.removePattern',
  'api::collection.collection.addToDefaultCollection',
  'api::collection.collection.subscribe',
  'api::collection.collection.unsubscribe',
  'api::collection.collection.mySubscriptions',
  'plugin::users-permissions.user.updatePreferences',
  'api::pattern-preference.pattern-preference.get',
  'api::pattern-preference.pattern-preference.set',
  'api::pattern-preference.pattern-preference.unset',
  'api::auth.auth.updateUsername',
  'api::auth.auth.updatePassword',
  'api::auth.auth.updateEmail',
  'api::auth.auth.deleteAccount',
];

/**
 * Veröffentlichte Muster dürfen auch nicht eingeloggte Besucher:innen
 * durchstöbern (Musterdatenbank), genauso öffentliche Sammlungen.
 * forgotPassword/resetPassword explizit gesetzt statt uns auf Strapis
 * Standard-Rolleneinstellungen zu verlassen.
 */
const PUBLIC_ACTIONS = [
  'api::pattern.pattern.find',
  'api::pattern.pattern.findOne',
  'api::collection.collection.find',
  'api::collection.collection.findOne',
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
  },
};
