/**
 * Erweitert das users-permissions-Plugin um eine eigene Route, mit der die
 * eingeloggte Person ihre Anzeigepräferenzen (Dark/Light-Mode, Sprache)
 * speichern kann – Strapis Standard-`user.update` ist auf Admin-Rechte
 * beschränkt und dafür nicht gedacht.
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
