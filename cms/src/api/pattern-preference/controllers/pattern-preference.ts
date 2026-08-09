import { factories } from '@strapi/strapi';

/** Wie bei Mustern/Sammlungen: pro anfragender Person unterschiedliche Antworten für dieselbe URL, daher kein Caching. */
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
 * Eigener Content-Type statt Erweiterung des globalen `displaySettings`-Felds
 * am User (siehe users-permissions-Erweiterung, cms/src/extensions): diese
 * Werte gelten pro Muster, nicht global – Hervorhebung/Untwist-Modus eines
 * Musters soll nicht automatisch für ein anderes gelten. Nur wenn die
 * Person das Speichern für ein Muster explizit aktiviert (siehe Frontend
 * DisplaySettingsCard-Nachbar-Card), existiert überhaupt ein Datensatz; ohne
 * einen solchen gelten die eingebauten Standardwerte (alles aus, Reihe/
 * Brettchen 1).
 */
export default factories.createCoreController('api::pattern-preference.pattern-preference', ({ strapi }) => ({
  /** Liefert die gespeicherte Präferenz für das aktuelle Muster, oder `data: null`, wenn keine existiert. */
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

  /** Legt die Präferenz an oder aktualisiert sie (upsert) – wird aufgerufen, solange "Speichern" für dieses Muster aktiviert ist. */
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

  /** Entfernt die Präferenz wieder – wird aufgerufen, sobald "Speichern" für dieses Muster deaktiviert wird. */
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
