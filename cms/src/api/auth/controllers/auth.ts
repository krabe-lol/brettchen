const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Custom registration endpoint for username + password, email optional
 * (only used for later password reset, no confirmation requirement/2FA).
 * Strapi's built-in /api/auth/local/register stays untouched (requires
 * email, for users who register via email). Login works for both cases
 * via the built-in /api/auth/local (identifier = username OR email).
 * Password reset uses Strapi's built-in /auth/forgot-password and
 * /auth/reset-password - but that requires a configured email provider
 * (see cms/config/plugins.ts), which isn't set up yet.
 */
export default {
  async registerUsernameOnly(ctx: any) {
    const { username, password, email } = ctx.request.body ?? {};

    if (typeof username !== 'string' || username.length < 3) {
      return ctx.badRequest('username must be at least 3 characters long.');
    }
    if (typeof password !== 'string' || password.length < 6) {
      return ctx.badRequest('password must be at least 6 characters long.');
    }

    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return ctx.badRequest('email is invalid.');
    }

    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
    const settings = (await pluginStore.get({ key: 'advanced' })) as {
      allow_register: boolean;
      default_role: string;
    };

    if (!settings.allow_register) {
      return ctx.badRequest('Registration is currently disabled.');
    }

    const existingUsername = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (existingUsername) {
      return ctx.badRequest('Username is already taken.');
    }

    if (normalizedEmail) {
      const existingEmail = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: normalizedEmail } });

      if (existingEmail) {
        return ctx.badRequest('Email address is already taken.');
      }
    }

    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: settings.default_role } });

    if (!role) {
      return ctx.badRequest('Default role not found.');
    }

    const user = await strapi.plugin('users-permissions').service('user').add({
      username,
      password,
      email: normalizedEmail || null,
      provider: 'local',
      role: role.id,
      // No confirmation requirement (2FA/email verification not wanted here).
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

  /** Checks whether a username is still free - for live validation in the registration form. */
  async usernameAvailable(ctx: any) {
    const username = typeof ctx.query.username === 'string' ? ctx.query.username.trim() : '';

    if (username.length < 3) {
      return ctx.send({ available: false });
    }

    const existing = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { username } });
    ctx.send({ available: !existing });
  },

  /**
   * Changes username/password/email on the profile page ("edit account
   * credentials") - each requires the current password, so a stolen,
   * short-lived access token alone isn't enough to take over the account
   * (e.g. by changing the email to one the attacker controls and resetting
   * the password through it).
   */
  async updateUsername(ctx: any) {
    if (!ctx.state.user) return ctx.unauthorized();

    const { username, currentPassword } = ctx.request.body ?? {};
    if (typeof username !== 'string' || username.length < 3) {
      return ctx.badRequest('username must be at least 3 characters long.');
    }

    const record = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });
    const valid = await strapi
      .plugin('users-permissions')
      .service('user')
      .validatePassword(currentPassword ?? '', record.password);
    if (!valid) return ctx.badRequest('Current password is incorrect.');

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
      return ctx.badRequest('newPassword must be at least 6 characters long.');
    }

    const record = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });
    const valid = await strapi
      .plugin('users-permissions')
      .service('user')
      .validatePassword(currentPassword ?? '', record.password);
    if (!valid) return ctx.badRequest('Current password is incorrect.');

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
      return ctx.badRequest('email is invalid.');
    }

    const record = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: ctx.state.user.id } });
    const valid = await strapi
      .plugin('users-permissions')
      .service('user')
      .validatePassword(currentPassword ?? '', record.password);
    if (!valid) return ctx.badRequest('Current password is incorrect.');

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

  /** Deletes the account permanently. Patterns/collections are kept but lose their author/owner. */
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
    if (!valid) return ctx.badRequest('Current password is incorrect.');

    await strapi.documents('plugin::users-permissions.user').delete({ documentId: ctx.state.user.documentId });
    ctx.send({ ok: true });
  },
};
