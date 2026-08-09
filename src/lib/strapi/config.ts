const rawUrl = import.meta.env.VITE_STRAPI_URL

if (!rawUrl) {
  throw new Error(
    'VITE_STRAPI_URL ist nicht gesetzt. Siehe .env.example.',
  )
}

export const strapiConfig = {
  baseUrl: rawUrl.replace(/\/$/, ''),
}
