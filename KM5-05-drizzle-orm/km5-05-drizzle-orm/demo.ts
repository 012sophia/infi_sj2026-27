// demo.ts — Drizzle ORM am Musik-Katalog: Lesen, Schreiben, Auswerten.
// Zeigt zu jeder Query das erzeugte SQL (toSQL()) — ein ORM ersetzt SQL
// nicht, es erzeugt es. Laufen mit:  deno task demo
import { and, asc, count, desc, eq, like } from "drizzle-orm";
import { oeffneDb } from "./db.ts";
import { album, artist, track } from "./schema.ts";

// Datei-DB im Projektordner — bei jedem Lauf neu anlegen.
await Deno.remove("musik.db").catch(() => {/* Datei fehlt: egal */});
const db = oeffneDb("musik.db");

// --- Schreiben: insert mit .returning() ------------------------------
const aera = await db.insert(artist)
  .values({ name: "Aera", gruendungsjahr: 1999 })
  .returning();
const nova = await db.insert(artist)
  .values({ name: "Nova", gruendungsjahr: 2012 })
  .returning();
const stille = await db.insert(album)
  .values({ titel: "Silent Lines", jahr: 2015, artistId: aera[0].id })
  .returning();
await db.insert(album)
  .values({ titel: "Night Ferry", jahr: 2012, artistId: nova[0].id });
await db.insert(track)
  .values({ titel: "Silent Lines", dauerSek: 215, albumId: stille[0].id });
await db.insert(track)
  .values({ titel: "Echo Room", dauerSek: 187, albumId: stille[0].id });

// --- Lesen: select .from() .where() ----------------------------------
const fragen = db.select().from(album).where(eq(album.artistId, aera[0].id));
console.log("Lesen, erzeugtes SQL:", fragen.toSQL().sql);
console.log("Lesen, Parameter:", fragen.toSQL().params);
console.log("Lesen, Ergebnis:", await fragen);

// --- Auswerten: orderBy, limit ---------------------------------------
const neueste = await db.select().from(album).orderBy(desc(album.jahr)).limit(
  1,
);
console.log("Neuestes Album:", neueste[0].titel, "(", neueste[0].jahr, ")");

// --- Aufgabe KM5-05: drei ergänzte Queries ---------------------------
// (1) ältestes Album: orderBy(asc) + limit(1) — Gegenstück zum neuesten oben.
const ältestes = await db.select().from(album).orderBy(asc(album.jahr)).limit(
  1,
);
console.log("Ältestes Album:", ältestes[0].titel, "(", ältestes[0].jahr, ")");

// (2) Tracks eines Albums, deren Titel mit "Echo" beginnt: and + eq + like.
const echo = db.select({ titel: track.titel, dauer: track.dauerSek })
  .from(track)
  .where(
    and(eq(track.albumId, stille[0].id), like(track.titel, "Echo%")),
  );
console.log("Echo-Tracks, erzeugtes SQL:", echo.toSQL().sql);
console.log("Echo-Tracks, Parameter:", echo.toSQL().params);
console.log("Echo-Tracks, Ergebnis:", await echo);

// (3) Anzahl Tracks je Album: count + groupBy — mit erzeugtem SQL (toSQL)
//     und demselben Query als rohem SQL zum Vergleich (Interleaving).
const proAlbum = db.select({ titel: album.titel, tracks: count() })
  .from(track)
  .innerJoin(album, eq(track.albumId, album.id))
  .groupBy(album.id);
console.log("Tracks je Album, erzeugtes SQL:", proAlbum.toSQL().sql);
console.log("Tracks je Album, Parameter:", proAlbum.toSQL().params);
console.log("Tracks je Album (Drizzle):", await proAlbum);

// Dieselbe Frage in rohem SQL über node:sqlite — dieselben Bausteine:
// JOIN ... ON, COUNT(*), GROUP BY.
const rohesProAlbum = db.$client.prepare(`
  SELECT a.titel AS titel, COUNT(*) AS tracks
  FROM track t JOIN album a ON t.album_id = a.id
  GROUP BY a.id
`).all();
console.log("Tracks je Album (rohes SQL):", rohesProAlbum);

// --- Ändern: update .set() .where() ----------------------------------
await db.update(track)
  .set({ dauerSek: 220 })
  .where(and(eq(track.albumId, stille[0].id), like(track.titel, "Silent%")));
const korrigiert = await db.select().from(track)
  .where(eq(track.titel, "Silent Lines"));
console.log("Nach update:", korrigiert[0].dauerSek, "Sekunden");

// --- Löschen: delete .where() ----------------------------------------
await db.delete(track).where(eq(track.titel, "Echo Room"));
const rest = await db.select({ anzahl: count() }).from(track);
console.log("Tracks nach delete:", rest[0].anzahl);

db.$client.close();
