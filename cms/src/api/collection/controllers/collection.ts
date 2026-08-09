import { factories } from '@strapi/strapi';

/** Same as for patterns: different responses per requesting user for the same URL, hence no caching. */
function noStore(ctx: any) {
  ctx.set('Cache-Control', 'no-store');
}

/** Enough fields to directly reuse both PatternThumbnail and PatternCard. */
const PATTERN_THUMBNAIL_FIELDS = {
  fields: ['documentId', 'title', 'slug', 'style', 'numTablets', 'numRows', 'threading', 'turningSequence', 'moderationStatus'],
  populate: { defaultPalette: true, author: { fields: ['username'] } },
};

/**
 * `owner` always needs `id` too (not just `username`), so the frontend
 * can reliably tell whether the requesting user is the owner (see
 * CollectionCard `isOwner`) - otherwise e.g. a public collection the user
 * owns would wrongly show the "subscribe" button.
 */
const COLLECTION_POPULATE = {
  owner: { fields: ['id', 'username'] },
  patterns: PATTERN_THUMBNAIL_FIELDS,
  subscribers: { fields: ['id'] },
};

/**
 * Every pattern ALWAYS has both a draft and a published Strapi version
 * thanks to `ensurePublished` (see the pattern controller) - populating
 * the `patterns` relation therefore returns each documentId twice (no
 * `status` filter is possible inside `populate`). Deduplicated here in JS
 * afterward instead of filtered in the query.
 */
function dedupePatterns(entity: any): any {
  if (!entity?.patterns) return entity;
  const seen = new Set<string>();
  entity.patterns = entity.patterns.filter((pattern: any) => {
    if (seen.has(pattern.documentId)) return false;
    seen.add(pattern.documentId);
    return true;
  });
  return entity;
}

function dedupePatternsMany(entities: any[]): any[] {
  return entities.map(dedupePatterns);
}

const DEFAULT_COLLECTION_NAME = 'Gespeichert';

/** Finds a user's default collection, or creates it if they don't have one yet. */
async function findOrCreateDefaultCollection(strapi: any, userId: number) {
  const [existing] = await strapi.documents('api::collection.collection').findMany({
    filters: { owner: userId, isDefault: true },
    limit: 1,
  });
  if (existing) return existing;

  return strapi.documents('api::collection.collection').create({
    data: { name: DEFAULT_COLLECTION_NAME, isDefault: true, visibility: 'private', owner: userId } as any,
  });
}

/**
 * `owner`/`subscribers` (relations to plugin::users-permissions.user) are
 * always stripped from the input by the standard content API sanitizer -
 * same restriction as `author` in the pattern controller. Hence custom
 * document service calls everywhere instead of `super.*()`.
 */
export default factories.createCoreController('api::collection.collection', ({ strapi }) => ({
  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const { name, description, visibility } = ctx.request.body?.data ?? {};
    if (!name || typeof name !== 'string') return ctx.badRequest('name ist erforderlich');

    const entity = await strapi.documents('api::collection.collection').create({
      data: {
        name,
        description: typeof description === 'string' ? description.slice(0, 500) : undefined,
        visibility: visibility === 'public' ? 'public' : 'private',
        isDefault: false,
        owner: ctx.state.user.id,
      } as any,
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatterns(entity),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** All of the user's own collections, regardless of visibility. Creates the default collection if none exists yet. */
  async mine(ctx) {
    noStore(ctx);
    if (!ctx.state.user) return ctx.unauthorized();

    await findOrCreateDefaultCollection(strapi, ctx.state.user.id);

    const entities = await strapi.documents('api::collection.collection').findMany({
      filters: { owner: ctx.state.user.id },
      sort: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatternsMany(entities),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** Public collections from everyone, for browsing/subscribing. */
  async find(ctx) {
    const entities = await strapi.documents('api::collection.collection').findMany({
      filters: { visibility: 'public' },
      sort: { createdAt: 'desc' },
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatternsMany(entities),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** Public collections are visible to everyone, private ones only to the owner. */
  async findOne(ctx) {
    noStore(ctx);
    const entity = await strapi.documents('api::collection.collection').findOne({
      documentId: ctx.params.id,
      populate: COLLECTION_POPULATE,
    });

    if (!entity) return ctx.notFound();

    const isOwner = Boolean(ctx.state.user) && (entity as any).owner?.id === ctx.state.user?.id;
    if (entity.visibility !== 'public' && !isOwner) return ctx.notFound();

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatterns(entity),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await strapi.documents('api::collection.collection').findOne({
      documentId: ctx.params.id,
      populate: { owner: { fields: ['id'] } },
    });
    if (!existing) return ctx.notFound();
    if ((existing as any).owner?.id !== ctx.state.user.id) return ctx.forbidden();

    const { name, description, visibility } = ctx.request.body?.data ?? {};
    const data: Record<string, unknown> = {};
    if (typeof name === 'string') data.name = name;
    if (typeof description === 'string') data.description = description.slice(0, 500);
    if (visibility === 'public' || visibility === 'private') data.visibility = visibility;

    const entity = await strapi.documents('api::collection.collection').update({
      documentId: ctx.params.id,
      data: data as any,
      populate: COLLECTION_POPULATE,
    });
    if (!entity) return ctx.notFound();

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatterns(entity),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await strapi.documents('api::collection.collection').findOne({
      documentId: ctx.params.id,
      populate: { owner: { fields: ['id'] } },
    });
    if (!existing) return ctx.notFound();
    if ((existing as any).owner?.id !== ctx.state.user.id) return ctx.forbidden();
    if ((existing as any).isDefault) return ctx.badRequest('Die Standard-Sammlung kann nicht gelöscht werden.');

    await strapi.documents('api::collection.collection').delete({ documentId: ctx.params.id });
    ctx.body = { data: null, meta: {} };
  },

  /** Adds a pattern to one of the user's own collections. */
  async addPattern(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await strapi.documents('api::collection.collection').findOne({
      documentId: ctx.params.id,
      populate: { owner: { fields: ['id'] } },
    });
    if (!existing) return ctx.notFound();
    if ((existing as any).owner?.id !== ctx.state.user.id) return ctx.forbidden();

    const entity = await strapi.documents('api::collection.collection').update({
      documentId: ctx.params.id,
      data: { patterns: { connect: [ctx.params.patternId] } } as any,
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatterns(entity),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** Removes a pattern from one of the user's own collections. */
  async removePattern(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await strapi.documents('api::collection.collection').findOne({
      documentId: ctx.params.id,
      populate: { owner: { fields: ['id'] } },
    });
    if (!existing) return ctx.notFound();
    if ((existing as any).owner?.id !== ctx.state.user.id) return ctx.forbidden();

    const entity = await strapi.documents('api::collection.collection').update({
      documentId: ctx.params.id,
      data: { patterns: { disconnect: [ctx.params.patternId] } } as any,
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatterns(entity),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** Only public collections can be subscribed to, not the user's own. */
  async subscribe(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await strapi.documents('api::collection.collection').findOne({
      documentId: ctx.params.id,
      populate: { owner: { fields: ['id'] } },
    });
    if (!existing) return ctx.notFound();
    if (existing.visibility !== 'public') return ctx.forbidden();
    if ((existing as any).owner?.id === ctx.state.user.id) return ctx.badRequest('Eigene Sammlungen können nicht abonniert werden.');

    const entity = await strapi.documents('api::collection.collection').update({
      documentId: ctx.params.id,
      data: { subscribers: { connect: [ctx.state.user.id] } } as any,
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatterns(entity),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  async unsubscribe(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await strapi.documents('api::collection.collection').findOne({ documentId: ctx.params.id });
    if (!existing) return ctx.notFound();

    const entity = await strapi.documents('api::collection.collection').update({
      documentId: ctx.params.id,
      data: { subscribers: { disconnect: [ctx.state.user.id] } } as any,
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatterns(entity),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** Other users' collections that the current user has subscribed to. */
  async mySubscriptions(ctx) {
    noStore(ctx);
    if (!ctx.state.user) return ctx.unauthorized();

    const entities = await strapi.documents('api::collection.collection').findMany({
      filters: { subscribers: ctx.state.user.id },
      sort: { createdAt: 'desc' },
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatternsMany(entities),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },
}));
