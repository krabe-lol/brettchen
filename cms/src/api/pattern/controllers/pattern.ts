import { randomUUID } from 'node:crypto';
import { factories } from '@strapi/strapi';

/**
 * `/patterns/mine` und `/patterns/:slug` (findOne, wegen Entwurf-Sichtbarkeit
 * für die Ersteller-Person) liefern je nach anfragender Person andere Daten
 * für dieselbe URL – ohne `no-store` könnte der Browser eine Antwort von
 * Nutzer:in A cachen und sie später fälschlich Nutzer:in B unter derselben
 * URL zeigen (z. B. "Meine Muster" nach einem Nutzerwechsel im selben Tab).
 */
function noStore(ctx: any) {
  ctx.set('Cache-Control', 'no-store');
}

/** Rein zufällige Zeichenfolge, wie randomSlug() im Frontend (src/lib/strapi/patterns.ts). */
function randomSlug(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

/**
 * Ein Muster ist twist-neutral, wenn sich die Verdrillung (+1 je Vorwärts-,
 * -1 je Rückwärtsdrehung, aufsummiert über alle Reihen) bei JEDEM Brettchen
 * zu 0 aufhebt – siehe computeTwistByTablet/isTwistNeutral im Frontend
 * (render/twist.ts), hier serverseitig dieselbe Berechnung, damit das Feld
 * nie von der tatsächlichen Wendefolge abweichen kann (immer automatisch
 * gesetzt, nie clientseitig überschreibbar).
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
 * Bewusst NICHT an unser eigenes `moderationStatus`-Feld gekoppelt (das
 * bleibt allein für die Sichtbarkeitslogik zuständig, siehe find/findOne/
 * mine) – jedes neu angelegte Muster bekommt bei Strapi selbst trotzdem
 * immer eine veröffentlichte Version, damit es im Admin-Panel nicht
 * fälschlich als Draft/unveröffentlicht auftaucht.
 */
async function ensurePublished(strapi: any, documentId: string) {
  await strapi.documents('api::pattern.pattern').publish({ documentId });
}

/**
 * Mindestens so viele Reihen mit anderem Vorzeichen der Drehrichtung
 * gegenüber dem Original, bevor ein Remix-Link gebrochen werden darf (siehe
 * `hasEnoughRemixDivergence`).
 */
const REMIX_TURN_DIVERGENCE_THRESHOLD = 3;

/** Anzahl Zellen, in denen sich die Drehrichtung (Vorwärts/Rückwärts/Idle) gegenüber der Quelle unterscheidet. */
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

/** Ob sich Schärung (Farbzuweisung oder S/Z-Kartenstellung) irgendwo von der Quelle unterscheidet. */
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
 * Genug verändert, um den Remix-Link zum Original zu brechen: mindestens
 * `REMIX_TURN_DIVERGENCE_THRESHOLD` Zellen mit anderer Drehrichtung UND
 * mindestens eine Veränderung in der Schärpatrone – beides zusammen, nicht
 * nur eines von beidem.
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
 * `author` (Relation auf plugin::users-permissions.user) wird vom
 * Standard-Content-API-Sanitizer IMMER aus dem Input entfernt, egal ob der
 * Client oder der Controller ihn setzt (Strapi verbietet clientseitig
 * beeinflussbare Relationen auf das User-Model grundsätzlich). Daher hier
 * kein `super.create()`, sondern direkter Document-Service-Aufruf, der den
 * Wert serverseitig aus dem authentifizierten Nutzer ergänzt.
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
   * Eigene Route statt `find` mit `filters[author]`: dieselbe
   * Query-Schema-Validierung, die author im Create-Body ablehnt,
   * lehnt auch Filter auf Relationen zum User-Model ab.
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
   * `find`/`findOne` sind komplett eigenständig (nicht `super.find(ctx)`)
   * und ignorieren bewusst alle Query-Filter des Clients: sie liefern IMMER
   * nur `moderationStatus: 'published'`, egal wer fragt (public oder
   * eingeloggt) – sonst könnte jede:r über eigene Filter fremde
   * Entwürfe sehen. `status: 'draft'` hier bezieht sich auf Strapis EIGENES
   * Draft/Publish (publishedAt) und liefert bewusst immer den aktuellen
   * Stand – unser eigenes `moderationStatus`-Feld bleibt die einzige
   * Quelle der Wahrheit für die Sichtbarkeit, unabhängig von Strapis
   * eigenem Status (siehe `ensurePublished`).
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
   * Sucht per `slug` (nicht `documentId`) – so verlinkt das Frontend Muster
   * (/pattern/:slug). Veröffentlichte Muster sieht jede:r; Entwürfe nur die
   * Ersteller-Person selbst (z. B. um ein gerade gespeichertes Muster gleich
   * wieder aufrufen zu können) – alle anderen Entwürfe bleiben ein 404.
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
   * Eigene `update`-Aktion statt `super.update(ctx)`: nur der:die
   * Ersteller:in darf ein Muster ändern (Strapis Standard-`update` prüft das
   * NICHT automatisch – ohne diesen Check könnte jede:r eingeloggte Person
   * jedes Muster überschreiben). `author` wird aus dem Body entfernt,
   * bevor er in Update-Daten übernommen wird – aus demselben Grund wie bei
   * `create` sollte er nie clientseitig gesetzt werden können. Ist das
   * Muster ein Remix, wird bei genug Abweichung von der Quelle (siehe
   * `hasEnoughRemixDivergence`) `remixOf` automatisch entfernt – der Link
   * zum Original bricht dann von selbst, ohne dass die Person das aktiv tun
   * müsste.
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
   * Kopiert ein Muster als neuen, eigenen Entwurf ("Remix"): Schären,
   * Wendefolge, Palette und Stil werden übernommen, Freitext/Quelle bewusst
   * NICHT (das sind persönliche Angaben der Ersteller-Person). `remixOf`
   * verlinkt auf das Original, die `remixSource*`-Felder speichern den Stand
   * zum Kopierzeitpunkt – daran wird später gemessen, ob genug verändert
   * wurde, um den Link zu brechen (siehe `update`). Private Entwürfe können
   * NUR von der eigenen Ersteller-Person geremixt werden (z. B. um eine
   * Variante abzuspalten, ohne das Original zu verändern) – fremde private
   * Muster bleiben unsichtbar und damit auch nicht remixbar, siehe `findOne`.
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
   * Eigene `delete`-Aktion statt `super.delete(ctx)`: aus demselben Grund
   * wie bei `update` prüft Strapis Standard-`delete` die Ersteller:innenschaft
   * NICHT automatisch – ohne diesen Check könnte jede:r eingeloggte Person
   * jedes Muster löschen. Löscht alle Versionen (Draft + ggf. veröffentlicht)
   * des Dokuments.
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
