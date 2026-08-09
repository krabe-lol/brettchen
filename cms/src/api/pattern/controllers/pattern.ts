import { randomUUID } from 'node:crypto';
import { factories } from '@strapi/strapi';

/**
 * `/patterns/mine` and `/patterns/:slug` (findOne, because of draft
 * visibility for the creator) return different data for the same URL
 * depending on who's asking - without `no-store`, the browser could cache
 * a response for user A and later wrongly show it to user B under the
 * same URL (e.g. "my patterns" after switching users in the same tab).
 */
function noStore(ctx: any) {
  ctx.set('Cache-Control', 'no-store');
}

/** Purely random string, same as randomSlug() in the frontend (src/lib/strapi/patterns.ts). */
function randomSlug(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

/**
 * A pattern is twist-neutral when the twist (+1 per forward turn, -1 per
 * backward turn, summed over all rows) cancels out to 0 for EVERY tablet -
 * see computeTwistByTablet/isTwistNeutral in the frontend (render/twist.ts).
 * Same computation here server-side, so the field can never diverge from
 * the actual turning sequence (always set automatically, never
 * client-overridable).
 */
function computeIsTwistNeutral(turningSequence: number[][] | undefined): boolean {
  if (!turningSequence || turningSequence.length === 0) return true;
  const numTablets = turningSequence[0]?.length ?? 0;
  for (let t = 0; t < numTablets; t++) {
    let sum = 0;
    for (const row of turningSequence) sum += row[t] ?? 0;
    if (sum !== 0) return false;
  }
  return true;
}

/**
 * Deliberately NOT tied to our own `moderationStatus` field (that field
 * alone drives visibility, see find/findOne/mine) - every newly created
 * pattern still always gets a published version in Strapi itself, so it
 * doesn't wrongly show up as draft/unpublished in the admin panel.
 */
async function ensurePublished(strapi: any, documentId: string) {
  await strapi.documents('api::pattern.pattern').publish({ documentId });
}

/**
 * Minimum number of cells with a different turn direction sign compared
 * to the original before a remix link is allowed to break (see
 * `hasEnoughRemixDivergence`).
 */
const REMIX_TURN_DIVERGENCE_THRESHOLD = 3;

/** Number of cells where the turn direction (forward/backward/idle) differs from the source. */
function countTurnDivergence(a: number[][] | undefined, b: number[][] | undefined): number {
  const rows = Math.max(a?.length ?? 0, b?.length ?? 0);
  let count = 0;
  for (let r = 0; r < rows; r++) {
    const rowA = a?.[r] ?? [];
    const rowB = b?.[r] ?? [];
    const cols = Math.max(rowA.length, rowB.length);
    for (let c = 0; c < cols; c++) {
      if (Math.sign(rowA[c] ?? 0) !== Math.sign(rowB[c] ?? 0)) count++;
    }
  }
  return count;
}

/** Whether the threading (color assignment or S/Z card orientation) differs from the source anywhere. */
function hasThreadingDivergence(a: any[] | undefined, b: any[] | undefined): boolean {
  const length = Math.max(a?.length ?? 0, b?.length ?? 0);
  for (let i = 0; i < length; i++) {
    const tabletA = a?.[i];
    const tabletB = b?.[i];
    if (!tabletA || !tabletB) return true;
    if (tabletA.orientation !== tabletB.orientation) return true;
    const holes = Math.max(tabletA.holes?.length ?? 0, tabletB.holes?.length ?? 0);
    for (let h = 0; h < holes; h++) {
      if (tabletA.holes?.[h]?.colorSlotId !== tabletB.holes?.[h]?.colorSlotId) return true;
    }
  }
  return false;
}

/**
 * Changed enough to break the remix link to the original: at least
 * `REMIX_TURN_DIVERGENCE_THRESHOLD` cells with a different turn direction
 * AND at least one change in the threading - both together, not just either one.
 */
function hasEnoughRemixDivergence(
  threading: any[] | undefined,
  turningSequence: number[][] | undefined,
  sourceThreading: any[] | undefined,
  sourceTurningSequence: number[][] | undefined,
): boolean {
  return (
    countTurnDivergence(turningSequence, sourceTurningSequence) >= REMIX_TURN_DIVERGENCE_THRESHOLD &&
    hasThreadingDivergence(threading, sourceThreading)
  );
}

/**
 * `author` (a relation to plugin::users-permissions.user) is ALWAYS
 * stripped from the input by the standard content API sanitizer, whether
 * the client or the controller sets it (Strapi generally disallows
 * client-influenced relations to the User model). Hence no `super.create()`
 * here, but a direct document service call that fills the value
 * server-side from the authenticated user.
 */
export default factories.createCoreController('api::pattern.pattern', ({ strapi }) => ({
  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const { data } = ctx.request.body;
    const entity = await strapi.documents('api::pattern.pattern').create({
      data: { ...data, author: ctx.state.user.id, isTwistNeutral: computeIsTwistNeutral(data.turningSequence) },
      populate: ctx.query.populate as never,
    });
    await ensurePublished(strapi, entity.documentId);

    const sanitized = await strapi.contentAPI.sanitize.output(entity, strapi.getModel('api::pattern.pattern'));
    ctx.body = { data: sanitized, meta: {} };
  },

  /**
   * Dedicated route instead of `find` with `filters[author]`: the same
   * query schema validation that rejects `author` in the create body also
   * rejects filters on relations to the User model.
   */
  async mine(ctx) {
    noStore(ctx);
    if (!ctx.state.user) return ctx.unauthorized();

    const entities = await strapi.documents('api::pattern.pattern').findMany({
      filters: { author: ctx.state.user.id },
      sort: { createdAt: 'desc' },
      populate: { defaultPalette: true, author: { fields: ['username'] } },
      status: 'draft',
    });

    const sanitized = await strapi.contentAPI.sanitize.output(entities, strapi.getModel('api::pattern.pattern'));
    ctx.body = { data: sanitized, meta: {} };
  },

  /**
   * `find`/`findOne` are entirely custom (not `super.find(ctx)`) and
   * deliberately ignore all client query filters: they ALWAYS return only
   * `moderationStatus: 'published'`, no matter who's asking (public or
   * logged in) - otherwise anyone could see someone else's drafts via
   * their own filters. `status: 'draft'` here refers to Strapi's OWN
   * draft/publish (publishedAt) and deliberately always returns the
   * current state - our own `moderationStatus` field remains the single
   * source of truth for visibility, independent of Strapi's own status
   * (see `ensurePublished`).
   */
  async find(ctx) {
    const entities = await strapi.documents('api::pattern.pattern').findMany({
      filters: { moderationStatus: 'published' },
      sort: { createdAt: 'desc' },
      populate: { defaultPalette: true, author: { fields: ['username'] } },
      status: 'draft',
    });

    const sanitized = await strapi.contentAPI.sanitize.output(entities, strapi.getModel('api::pattern.pattern'));
    ctx.body = { data: sanitized, meta: {} };
  },

  /**
   * Looks up by `slug` (not `documentId`) - matches how the frontend
   * links patterns (/pattern/:slug). Published patterns are visible to
   * everyone; drafts only to their creator (e.g. to reopen a
   * just-saved pattern) - every other draft stays a 404.
   */
  async findOne(ctx) {
    noStore(ctx);
    const [entity] = await strapi.documents('api::pattern.pattern').findMany({
      filters: { slug: ctx.params.id },
      populate: {
        defaultPalette: true,
        author: { fields: ['id', 'username'] },
        remixOf: { fields: ['title', 'slug'] },
      },
      status: 'draft',
      limit: 1,
    });

    if (!entity) return ctx.notFound();

    const isOwner = Boolean(ctx.state.user) && entity.author?.id === ctx.state.user?.id;
    if (entity.moderationStatus !== 'published' && !isOwner) {
      return ctx.notFound();
    }

    const sanitized = await strapi.contentAPI.sanitize.output(entity, strapi.getModel('api::pattern.pattern'));
    ctx.body = { data: sanitized, meta: {} };
  },

  /**
   * Custom `update` action instead of `super.update(ctx)`: only the
   * creator may change a pattern (Strapi's standard `update` does NOT
   * check this automatically - without this check, any logged-in user
   * could overwrite any pattern). `author` is stripped from the body
   * before it's used as update data - same reason as in `create`, it
   * should never be client-settable. If the pattern is a remix and
   * diverges enough from the source (see `hasEnoughRemixDivergence`),
   * `remixOf` is cleared automatically - the link to the original then
   * breaks on its own, without the user having to do anything.
   */
  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await strapi.documents('api::pattern.pattern').findOne({
      documentId: ctx.params.id,
      populate: { author: { fields: ['id'] }, remixOf: { fields: ['id'] } },
      status: 'draft',
    });

    if (!existing) return ctx.notFound();
    if (existing.author?.id !== ctx.state.user.id) return ctx.forbidden();

    const { author, ...data } = ctx.request.body?.data ?? {};
    data.isTwistNeutral = computeIsTwistNeutral(data.turningSequence);

    const breakRemixLink =
      Boolean((existing as any).remixOf) &&
      hasEnoughRemixDivergence(
        data.threading,
        data.turningSequence,
        (existing as any).remixSourceThreading,
        (existing as any).remixSourceTurningSequence,
      );

    const entity = await strapi.documents('api::pattern.pattern').update({
      documentId: ctx.params.id,
      data: breakRemixLink ? { ...data, remixOf: null } : data,
      populate: {
        defaultPalette: true,
        author: { fields: ['username'] },
        remixOf: { fields: ['title', 'slug'] },
      },
    });
    if (!entity) return ctx.notFound();

    const sanitized = await strapi.contentAPI.sanitize.output(entity, strapi.getModel('api::pattern.pattern'));
    ctx.body = { data: sanitized, meta: {} };
  },

  /**
   * Copies a pattern as a new draft of the caller's own ("remix"):
   * threading, turning sequence, palette and style tags carry over,
   * deliberately NOT notes/source (those are personal to the creator).
   * `remixOf` links to the original, the `remixSource*` fields save the
   * state at copy time - used later to measure whether enough changed to
   * break the link (see `update`). Private drafts can ONLY be remixed by
   * their own creator (e.g. to branch off a variant without touching the
   * original) - other users' private patterns stay invisible and thus
   * unremixable, see `findOne`.
   */
  async remix(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const original = await strapi.documents('api::pattern.pattern').findOne({
      documentId: ctx.params.id,
      populate: { defaultPalette: true, author: { fields: ['id'] } },
      status: 'draft',
    });

    const isOwner = Boolean(original) && (original as any).author?.id === ctx.state.user.id;
    if (!original || (original.moderationStatus !== 'published' && !isOwner)) return ctx.notFound();

    const entity = await strapi.documents('api::pattern.pattern').create({
      data: {
        title: `Remix von ${original.title}`,
        slug: randomSlug(),
        summary: original.summary,
        numTablets: original.numTablets,
        holesPerTablet: original.holesPerTablet,
        numRows: original.numRows,
        threading: original.threading,
        turningSequence: original.turningSequence,
        isTwistNeutral: computeIsTwistNeutral(original.turningSequence as number[][] | undefined),
        defaultPalette: (original.defaultPalette ?? []).map(({ id, ...slot }: any) => slot),
        style: original.style,
        repeatFromRow: original.repeatFromRow,
        weftColorSlot: original.weftColorSlot,
        notes: '',
        source: '',
        moderationStatus: 'draft',
        author: ctx.state.user.id,
        remixOf: original.documentId,
        remixSourceThreading: original.threading,
        remixSourceTurningSequence: original.turningSequence,
      },
      populate: { defaultPalette: true, remixOf: { fields: ['title', 'slug'] } },
    });
    await ensurePublished(strapi, entity.documentId);

    const sanitized = await strapi.contentAPI.sanitize.output(entity, strapi.getModel('api::pattern.pattern'));
    ctx.body = { data: sanitized, meta: {} };
  },

  /**
   * Custom `delete` action instead of `super.delete(ctx)`: same reason as
   * `update`, Strapi's standard `delete` does NOT check ownership
   * automatically - without this check, any logged-in user could delete
   * any pattern. Deletes all versions (draft + published, if any) of the document.
   */
  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();

    const existing = await strapi.documents('api::pattern.pattern').findOne({
      documentId: ctx.params.id,
      populate: { author: { fields: ['id'] } },
      status: 'draft',
    });

    if (!existing) return ctx.notFound();
    if (existing.author?.id !== ctx.state.user.id) return ctx.forbidden();

    await strapi.documents('api::pattern.pattern').delete({ documentId: ctx.params.id });

    ctx.body = { data: null, meta: {} };
  },
}));
