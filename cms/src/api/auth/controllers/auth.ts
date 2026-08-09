const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Eigener Registrierungs-Endpoint für Username + Passwort, E-Mail optional
 * (nur fürs spätere Passwort-zurücksetzen, keine Bestätigungspflicht/2FA).
 * Strapis eingebautes /api/auth/local/register bleibt unverändert (E-Mail-Pflicht,
 * für Nutzer:innen, die sich per E-Mail registrieren). Login funktioniert für beide
 * Fälle über das eingebaute /api/auth/local (Identifier = Username ODER E-Mail).
 * Passwort-zurücksetzen läuft über Strapis eingebaute /auth/forgot-password und
 * /auth/reset-password – dafür muss aber ein E-Mail-Provider konfiguriert sein
 * (siehe cms/config/plugins.ts), was hier noch nicht der Fall ist.
 */
export default {
  async registerUsernameOnly(ctx: any) {
    const { username, password, email } = ctx.request.body ?? {};

    if (typeof username !== 'string' || username.length < 3) {
      return ctx.badRequest('username muss mindestens 3 Zeichen lang sein.');
    }
    if (typeof password !== 'string' || password.length < 6) {
      return ctx.badRequest('password muss mindestens 6 Zeichen lang sein.');
    }

    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return ctx.badRequest('email ist ungültig.');
    }

    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
    const settings = (await pluginStore.get({ key: 'advanced' })) as {
      allow_register: boolean;
      default_role: string;
    };

    if (!settings.allow_register) {
      return ctx.badRequest('Registrierung ist aktuell deaktiviert.');
    }

    const existingUsername = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (existingUsername) {
      return ctx.badRequest('Username ist bereits vergeben.');
    }

    if (normalizedEmail) {
      const existingEmail = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: normalizedEmail } });

      if (existingEmail) {
        return ctx.badRequest('E-Mail-Adresse ist bereits vergeben.');
      }
    }

    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: settings.default_role } });

    if (!role) {
      return ctx.badRequest('Standard-Rolle nicht gefunden.');
    }

    const user = await strapi.plugin('users-permissions').service('user').add({
      username,
      password,
      email: normalizedEmail || null,
      provider: 'local',
      role: role.id,
      // Ohne Bestätigungspflicht (keine 2FA/E-Mail-Verifizierung gewünscht).
      confirmed: true,
    });

    const sanitizedUser = await strapi.contentAPI.sanitize.output(
      user,
      strapi.getModel('plugin::users-permissions.user'),
    );

    const jwt = await strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });

    ctx.send({
      jwt,
      user: sanitizedUser,
    });
  },

  /** Prüft, ob ein Username noch frei ist – für die Live-Prüfung im Registrierungsformular. */
  async usernameAvailable(ctx: any) {
    const username = typeof ctx.query.username === 'string' ? ctx.query.username.trim() : '';

    if (username.length < 3) {
      return ctx.send({ available: false });
    }

    const existing = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { username } });
    ctx.send({ available: !existing });
  },

  /**
   * Ändert Username/Passwort/E-Mail auf der Profilseite ("Zugangsdaten
   * bearbeiten") – verlangt jeweils das aktuelle Passwort, damit ein
   * gestohlener, kurzlebiger Access-Token allein nicht reicht, um das
   * Konto zu übernehmen (z. B. E-Mail auf eine fremde Adresse umzustellen
   * und darüber das Passwort zurückzusetzen).
   */
  async updateUsername(ctx: any) {
    if (!ctx.state.user) return ctx.unauthorized();

    const { username, currentPassword } = ctx.request.body ?? {};
    if (typeof username !== 'string' || username.length < 3) {
      return ctx.badRequest('username muss mindestens 3 Zeichen lang sein.');
    }

    const record = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });
    const valid = await strapi
      .plugin('users-permissions')
      .service('user')
      .validatePassword(currentPassword ?? '', record.password);
    if (!valid) return ctx.badRequest('Aktuelles Passwort ist falsch.');

    if (username !== record.username) {
      const existing = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { username } });
      if (existing) return ctx.badRequest('Username ist bereits vergeben.');
    }

    const updated = await strapi.documents('plugin::users-permissions.user').update({
      documentId: ctx.state.user.documentId,
      data: { username } as any,
    });
    ctx.send({ id: updated!.id, documentId: updated!.documentId, username: updated!.username, email: updated!.email });
  },

  async updatePassword(ctx: any) {
    if (!ctx.state.user) return ctx.unauthorized();

    const { currentPassword, newPassword } = ctx.request.body ?? {};
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return ctx.badRequest('newPassword muss mindestens 6 Zeichen lang sein.');
    }

    const record = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });
    const valid = await strapi
      .plugin('users-permissions')
      .service('user')
      .validatePassword(currentPassword ?? '', record.password);
    if (!valid) return ctx.badRequest('Aktuelles Passwort ist falsch.');

    await strapi.documents('plugin::users-permissions.user').update({
      documentId: ctx.state.user.documentId,
      data: { password: newPassword } as any,
    });
    ctx.send({ ok: true });
  },

  async updateEmail(ctx: any) {
    if (!ctx.state.user) return ctx.unauthorized();

    const { email, currentPassword } = ctx.request.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return ctx.badRequest('email ist ungültig.');
    }

    const record = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });
    const valid = await strapi
      .plugin('users-permissions')
      .service('user')
      .validatePassword(currentPassword ?? '', record.password);
    if (!valid) return ctx.badRequest('Aktuelles Passwort ist falsch.');

    if (normalizedEmail && normalizedEmail !== record.email) {
      const existing = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: normalizedEmail } });
      if (existing) return ctx.badRequest('E-Mail-Adresse ist bereits vergeben.');
    }

    const updated = await strapi.documents('plugin::users-permissions.user').update({
      documentId: ctx.state.user.documentId,
      data: { email: normalizedEmail || null } as any,
    });
    ctx.send({ id: updated!.id, documentId: updated!.documentId, username: updated!.username, email: updated!.email });
  },

  /** Löscht das eigene Konto unwiderruflich. Muster/Sammlungen bleiben erhalten, verlieren aber die Zuordnung. */
  async deleteAccount(ctx: any) {
    if (!ctx.state.user) return ctx.unauthorized();

    const { currentPassword } = ctx.request.body ?? {};
    const record = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });
    const valid = await strapi
      .plugin('users-permissions')
      .service('user')
      .validatePassword(currentPassword ?? '', record.password);
    if (!valid) return ctx.badRequest('Aktuelles Passwort ist falsch.');

    await strapi.documents('plugin::users-permissions.user').delete({ documentId: ctx.state.user.documentId });
    ctx.send({ ok: true });
  },
};
