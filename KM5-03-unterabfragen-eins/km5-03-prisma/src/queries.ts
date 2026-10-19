// src/queries.ts — Aufgabe KM5-03, ersetzt die frühere Datei unterabfragen.sql:
// dieselben fünf Abfragen (Vorhersage + drei Subquery-Formen + Interleaving),
// je Abfrage EIN Kommentar, jetzt über Prisma 7.
// Wo die Prisma-API die Verschachtelung nicht abbilden kann, wird rohes SQL
// per $queryRaw benutzt — der bekannte Fluchtweg aus KM5-01.
import { prisma } from "./db.ts";

declare const process: {
  argv: string[];
  exit(code?: number): never;
};

type SongZeile = { titel: string; dauerSek: number };
type LabelZeile = { name: string; n: number };

// 1) VORHERSAGE + Durchschnitts-Abfrage (Skalar-Subquery in WHERE): der innere
//    Ausdruck liefert genau einen Wert (212.5) — geliefert werden die 4 Songs
//    darüber: Freies Feld (250), Hafenlicht (240), Dust Choir (230), TalEcho (220).
export async function durchschnittsSongs(): Promise<SongZeile[]> {
  return prisma.$queryRaw<SongZeile[]>`
    SELECT titel, dauerSek
    FROM Song
    WHERE dauerSek > (SELECT AVG(dauerSek) FROM Song)
    ORDER BY dauerSek DESC
  `;
}

// 1b) DERSSELBE Frage in reinem Prisma-API (kein SQL): erster Schritt
//     `aggregate` (ein Wert), zweiter Schritt `findMany` mit `gt` — zwei
//     Roundtrips statt einer Abfrage, aber typsicher und ohne $queryRaw.
export async function durchschnittsSongsPrisma(): Promise<SongZeile[]> {
  const schnitt = await prisma.song.aggregate({ _avg: { dauerSek: true } });
  const avg = schnitt._avg.dauerSek ?? 0;
  const songs = await prisma.song.findMany({
    where: { dauerSek: { gt: avg } },
    orderBy: { dauerSek: "desc" },
    select: { titel: true, dauerSek: true },
  });
  return songs;
}

// 2a) SKALAR-SUBQUERY in WHERE: nur Auer-Songs über dem Gesamtdurchschnitt —
//     Ergebnis: Hafenlicht (240); Silent Lines (210) und Night Ferry (185) fehlen.
export async function auerUeberSchnitt(): Promise<SongZeile[]> {
  return prisma.$queryRaw<SongZeile[]>`
    SELECT titel, dauerSek
    FROM Song
    WHERE kuenstlerId = 1
      AND dauerSek > (SELECT AVG(dauerSek) FROM Song)
  `;
}

// 2b) TABELLEN-SUBQUERY in FROM (abgeleitete Tabelle, Alias Pflicht): erst innen
//     pro Label gezählt, dann außen auf mehr als 2 Songs gefiltert —
//     Nordklang (4) und Suedton (4); Westbeat hat keine Songs.
//     Achtung Falle: $queryRaw liefert COUNT(*) aus SQLite als BigInt (4n) —
//     deshalb wird hier auf number umgerechnet, sonst kracht der Vergleich mit
//     der Prisma-API-Variante (die number liefert).
export async function labelsMitMehrAls2Songs(): Promise<LabelZeile[]> {
  const rows = await prisma.$queryRaw<{ name: string; n: bigint }[]>`
    SELECT t.name, t.n
    FROM (
      SELECT l.name AS name, COUNT(*) AS n
      FROM Label l
      JOIN Kuenstler k ON k.labelId = l.id
      JOIN Song s ON s.kuenstlerId = k.id
      GROUP BY l.id
    ) AS t
    WHERE t.n > 2
    ORDER BY t.n DESC, t.name
  `;
  return rows.map((r) => ({ name: r.name, n: Number(r.n) }));
}

// 2c) ZEILEN-SUBQUERY (Tupelvergleich): der längste Song des Künstlers "Frei" —
//     kuenstlerId UND dauerSek werden in einem Schritt verglichen: Freies Feld (250).
export async function laengsterSongFrei(): Promise<SongZeile & { kuenstlerId: number }> {
  const rows = await prisma.$queryRaw<(SongZeile & { kuenstlerId: number })[]>`
    SELECT titel, dauerSek, kuenstlerId
    FROM Song
    WHERE (kuenstlerId, dauerSek) =
          (SELECT kuenstlerId, MAX(dauerSek) FROM Song WHERE kuenstlerId = 6)
  `;
  return rows[0];
}

// 3) INTERLEAVING: dieselbe Frage wie 2b ("Labels mit mehr als 2 Songs"), aber als
//    JOIN mit GROUP BY + HAVING — ein Statement statt Verschachtelung; gleiche
//    Ergebnisse (Nordklang 4, Suedton 4). Vergleich in den Antworten.md.
export async function labelsJoinHaving(): Promise<LabelZeile[]> {
  const rows = await prisma.$queryRaw<{ name: string; n: bigint }[]>`
    SELECT l.name AS name, COUNT(*) AS n
    FROM Label l
    JOIN Kuenstler k ON k.labelId = l.id
    JOIN Song s ON s.kuenstlerId = k.id
    GROUP BY l.id
    HAVING COUNT(*) > 2
    ORDER BY n DESC, l.name
  `;
  return rows.map((r) => ({ name: r.name, n: Number(r.n) }));
}

// 3b) Dieselbe Frage über die Prisma-API: _count liefert die Song-Anzahl je
//     Kuenstler, das Label-Filtern passiert im Code — Prisma kann HAVING auf
//     relationen-Counts nicht ausdrücken, deshalb Zählung außerhalb der DB.
export async function labelsMitMehrAls2SongsPrisma(): Promise<LabelZeile[]> {
  const kuenstler = await prisma.kuenstler.findMany({
    select: { label: { select: { name: true } }, _count: { select: { songs: true } } },
  });
  const proLabel = new Map<string, number>();
  for (const k of kuenstler) {
    if (!k.label) continue; // Independent (Frei) zählt nicht mit
    proLabel.set(k.label.name, (proLabel.get(k.label.name) ?? 0) + k._count.songs);
  }
  return [...proLabel.entries()]
    .map(([name, n]) => ({ name, n }))
    .filter((l) => l.n > 2)
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}

async function main() {
  console.log("1) Über dem Durchschnitt:        ", await durchschnittsSongs());
  console.log("1b) Dito als Prisma-API:         ", await durchschnittsSongsPrisma());
  console.log("2a) Auer über dem Durchschnitt:  ", await auerUeberSchnitt());
  console.log("2b) Labels mit 2+ Songs (FROM):  ", await labelsMitMehrAls2Songs());
  console.log("2c) Freis längster Song:         ", await laengsterSongFrei());
  console.log("3) Labels mit 2+ Songs (JOIN):   ", await labelsJoinHaving());
  console.log("3b) Dito als Prisma-API:         ", await labelsMitMehrAls2SongsPrisma());
}

// Nur ausführen, wenn die Datei direkt gestartet wird (nicht beim Import im Test).
const entrypoint = process.argv[1] ?? "";
if (entrypoint.endsWith("queries.ts")) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
