import { factories } from '@strapi/strapi';

/** Wie bei Mustern: pro anfragender Person unterschiedliche Antworten für dieselbe URL, daher kein Caching. */
function noStore(ctx: any) {
  ctx.set('Cache-Control', 'no-store');
}

/** Genug Felder, um sowohl PatternThumbnail als auch PatternCard direkt wiederzuverwenden. */
const PATTERN_THUMBNAIL_FIELDS = {
  fields: ['documentId', 'title', 'slug', 'style', 'numTablets', 'numRows', 'threading', 'turningSequence', 'moderationStatus'],
  populate: { defaultPalette: true, author: { fields: ['username'] } },
};

/**
 * `owner` braucht überall auch `id` (nicht nur `username`), damit das
 * Frontend zuverlässig erkennen kann, ob die anfragende Person selbst die
 * besitzende Person ist (siehe CollectionCard `isOwner`) – sonst zeigt z. B.
 * eine öffentliche eigene Sammlung fälschlich den "Abonnieren"-Button.
 */
const COLLECTION_POPULATE = {
  owner: { fields: ['id', 'username'] },
  patterns: PATTERN_THUMBNAIL_FIELDS,
  subscribers: { fields: ['id'] },
};

/**
 * Jedes Muster hat dank `ensurePublished` (siehe Pattern-Controller) IMMER
 * sowohl eine Draft- als auch eine veröffentlichte Strapi-Version – beim
 * Populaten der `patterns`-Relation kommt eine documentId deshalb doppelt
 * zurück (kein `status`-Filter innerhalb von `populate` möglich). Hier
 * nachträglich in JS dedupliziert, statt bei der Abfrage gefiltert.
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

/** Findet die Standard-Sammlung einer Person oder legt sie an, falls sie noch keine hat. */
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
 * `owner`/`subscribers` (Relationen auf plugin::users-permissions.user)
 * werden vom Standard-Content-API-Sanitizer immer aus dem Input entfernt –
 * dieselbe Einschränkung wie bei `author` im Pattern-Controller. Daher
 * überall eigene Document-Service-Aufrufe statt `super.*()`.
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

  /** Alle eigenen Sammlungen, unabhängig von der Sichtbarkeit. Legt die Standard-Sammlung an, falls noch keine existiert. */
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

  /** Öffentliche Sammlungen aller Personen, zum Durchstöbern/Abonnieren. */
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

  /** Öffentliche Sammlungen sieht jede:r, private nur die besitzende Person. */
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

  /** Fügt ein Muster zu einer eigenen Sammlung hinzu. */
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

  /** Entfernt ein Muster aus einer eigenen Sammlung. */
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

  /** Fügt ein Muster der eigenen Standard-Sammlung hinzu (legt sie bei Bedarf an). */
  async addToDefaultCollection(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const defaultCollection = await findOrCreateDefaultCollection(strapi, ctx.state.user.id);
    const entity = await strapi.documents('api::collection.collection').update({
      documentId: defaultCollection.documentId,
      data: { patterns: { connect: [ctx.params.patternId] } } as any,
      populate: COLLECTION_POPULATE,
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      dedupePatterns(entity),
      strapi.getModel('api::collection.collection'),
    );
    ctx.body = { data: sanitized, meta: {} };
  },

  /** Nur öffentliche Sammlungen können abonniert werden, nicht die eigenen. */
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

  /** Sammlungen anderer Personen, die die eigene Person abonniert hat. */
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
