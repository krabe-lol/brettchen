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
      // POST instead of DELETE: Strapi's body-parser middleware doesn't
      // reliably read the request body on DELETE (comes through empty even
      // though it was sent) - without currentPassword in the body, the
      // controller's own password check would otherwise wrongly fail.
      method: 'POST',
      path: '/auth/local/account/delete',
      handler: 'auth.deleteAccount',
    },
  ],
};
