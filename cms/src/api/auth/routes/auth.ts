export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/auth/local/register-username-only',
      handler: 'auth.registerUsernameOnly',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/auth/local/username-available',
      handler: 'auth.usernameAvailable',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/auth/local/username',
      handler: 'auth.updateUsername',
    },
    {
      method: 'PUT',
      path: '/auth/local/password',
      handler: 'auth.updatePassword',
    },
    {
      method: 'PUT',
      path: '/auth/local/email',
      handler: 'auth.updateEmail',
    },
    {
      // POST statt DELETE: Strapis Body-Parser-Middleware liest den
      // Request-Body bei DELETE nicht zuverlässig ein (leerer Body, obwohl
      // gesendet) – ohne currentPassword im Body schlägt die eigene
      // Passwort-Prüfung im Controller sonst fälschlich fehl.
      method: 'POST',
      path: '/auth/local/account/delete',
      handler: 'auth.deleteAccount',
    },
  ],
};
