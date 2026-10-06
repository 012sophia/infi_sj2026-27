// src/playlist.ts — Aufgabe 3: EINE Prisma-Query, die pro Playlist die Song-Anzahl liefert.
// Start: npm run playlist
//
// Statt einer SQL-Anweisung mit GROUP BY + COUNT + LEFT JOIN reicht hier ein
// findMany mit "select _count" — Prisma zählt die verknüpften Songs mit.
import { pathToFileURL } from "node:url";
import { prisma } from "./db.ts";

export async function playlistSongAnzahl() {
  const rows = await prisma.playlist.findMany({
    select: {
      name: true,
      _count: { select: { songs: true } },
    },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({ playlist: r.name, songs: r._count.songs }));
}

async function main() {
  const zeilen = await playlistSongAnzahl();
  console.log("Song-Anzahl pro Playlist:");
  for (const z of zeilen) {
    console.log(`  ${z.playlist}: ${z.songs}`);
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entrypoint) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
