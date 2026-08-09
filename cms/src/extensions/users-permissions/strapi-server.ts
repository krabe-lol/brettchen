/**
 * Extends the users-permissions plugin with a custom route that lets the
 * logged-in user save their display preferences (dark/light mode,
 * language) - Strapi's standard `user.update` is restricted to admin
 * permissions and not meant for this.
 */
export default (plugin: any) => {
  plugin.controllers.user.updatePreferences = async (ctx: any) => {
    if (!ctx.state.user) return ctx.unauthorized();

    const { themePreference, languagePreference, displaySettings } = ctx.request.body ?? {};
    const data: Record<string, unknown> = {};
    if (themePreference === 'light' || themePreference === 'dark') data.themePreference = themePreference;
    if (languagePreference === 'de' || languagePreference === 'en') data.languagePreference = languagePreference;
    if (displaySettings && typeof displaySettings === 'object' && !Array.isArray(displaySettings)) {
      data.displaySettings = displaySettings;
    }

    const updated = await strapi.documents('plugin::users-permissions.user').update({
      documentId: ctx.state.user.documentId,
      data,
    });
    if (!updated) return ctx.notFound();

    ctx.body = {
      id: updated.id,
      documentId: updated.documentId,
      username: updated.username,
      email: updated.email,
      themePreference: updated.themePreference,
      languagePreference: updated.languagePreference,
      displaySettings: updated.displaySettings,
    };
  };

  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/users/me/preferences',
    handler: 'user.updatePreferences',
    config: { prefix: '' },
  });

  return plugin;
};
