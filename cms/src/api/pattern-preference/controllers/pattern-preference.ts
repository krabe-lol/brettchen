import { factories } from '@strapi/strapi';

/** Same as for patterns/collections: different responses per requesting user for the same URL, hence no caching. */
function noStore(ctx: any) {
  ctx.set('Cache-Control', 'no-store');
}

function pickSettings(body: any): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (typeof body?.highlightRow === 'boolean') data.highlightRow = body.highlightRow;
  if (Number.isInteger(body?.activeRow) && body.activeRow >= 1) data.activeRow = body.activeRow;
  if (typeof body?.highlightTablet === 'boolean') data.highlightTablet = body.highlightTablet;
  if (Number.isInteger(body?.activeTablet) && body.activeTablet >= 1) data.activeTablet = body.activeTablet;
  if (typeof body?.untwistMode === 'boolean') data.untwistMode = body.untwistMode;
  return data;
}

async function findExisting(strapi: any, userId: number, patternDocumentId: string) {
  const [existing] = await strapi.documents('api::pattern-preference.pattern-preference').findMany({
    filters: { user: userId, pattern: { documentId: patternDocumentId } },
    limit: 1,
  });
  return existing ?? null;
}

/**
 * Its own content type instead of extending the user's global
 * `displaySettings` field (see the users-permissions extension,
 * cms/src/extensions): these values apply per pattern, not globally -
 * highlighting/untwist mode for one pattern shouldn't automatically apply
 * to another. A record only exists at all once the user explicitly
 * enables saving for a pattern (see the frontend DisplaySettingsCard's
 * neighboring card); without one, the built-in defaults apply (everything
 * off, row/tablet 1).
 */
export default factories.createCoreController('api::pattern-preference.pattern-preference', ({ strapi }) => ({
  /** Returns the saved preference for the current pattern, or `data: null` if none exists. */
  async get(ctx) {
    noStore(ctx);
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await findExisting(strapi, ctx.state.user.id, ctx.params.patternId);
    if (!existing) {
      ctx.body = { data: null, meta: {} };
      return;
    }

    const sanitized = await strapi.contentAPI.sanitize.output(
      existing,
      strapi.getModel('api::pattern-preference.pattern-preference'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** Creates or updates the preference (upsert) - called as long as "save" is enabled for this pattern. */
  async set(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const pattern = await strapi.documents('api::pattern.pattern').findOne({ documentId: ctx.params.patternId });
    if (!pattern) return ctx.notFound();

    const data = pickSettings(ctx.request.body?.data ?? {});
    const existing = await findExisting(strapi, ctx.state.user.id, ctx.params.patternId);

    const entity = existing
      ? await strapi.documents('api::pattern-preference.pattern-preference').update({
          documentId: existing.documentId,
          data,
        })
      : await strapi.documents('api::pattern-preference.pattern-preference').create({
          data: { ...data, user: ctx.state.user.id, pattern: pattern.documentId } as any,
        });

    const sanitized = await strapi.contentAPI.sanitize.output(
      entity,
      strapi.getModel('api::pattern-preference.pattern-preference'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** Removes the preference again - called once "save" is disabled for this pattern. */
  async unset(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await findExisting(strapi, ctx.state.user.id, ctx.params.patternId);
    if (existing) {
      await strapi
        .documents('api::pattern-preference.pattern-preference')
        .delete({ documentId: existing.documentId });
    }

    ctx.body = { data: null, meta: {} };
  },
}));
