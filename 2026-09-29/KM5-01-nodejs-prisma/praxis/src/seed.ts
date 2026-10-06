// src/seed.ts — Mini-Musik-DB befüllen (idempotent: erst leeren, dann neu).
// Reihenfolge wegen Fremdschlüsseln: Kinder zuerst.
import { prisma } from "./db.ts";

async function main() {
  await prisma.song.deleteMany();
  await prisma.kuenstler.deleteMany();
  await prisma.label.deleteMany();

  await prisma.label.createMany({
    data: [{ name: "Ohrwurm Records" }, { name: "Indie Nord" }],
  });
  const ohrwurm = await prisma.label.findUniqueOrThrow({ where: { name: "Ohrwurm Records" } });
  const indie = await prisma.label.findUniqueOrThrow({ where: { name: "Indie Nord" } });

  await prisma.kuenstler.createMany({
    data: [
      { name: "Nova", labelId: ohrwurm.id },
      { name: "Pixel", labelId: ohrwurm.id },
      { name: "Solveig", labelId: indie.id },
      { name: "Ohne Label", labelId: null }, // NULL -> für COUNT(*) vs. COUNT(labelId)
    ],
  });
  const nova = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Nova" } });
  const pixel = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Pixel" } });
  const solveig = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Solveig" } });
  const ohne = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Ohne Label" } });

  await prisma.song.createMany({
    data: [
      { titel: "Nordlicht", dauerSek: 245, kuenstlerId: nova.id },
      { titel: "Glut", dauerSek: 210, kuenstlerId: nova.id },
      { titel: "Funkeln", dauerSek: 198, kuenstlerId: nova.id },
      { titel: "Pixelstaub", dauerSek: 305, kuenstlerId: pixel.id },
      { titel: "Raster", dauerSek: 233, kuenstlerId: pixel.id },
      { titel: "Fjord", dauerSek: 260, kuenstlerId: solveig.id },
      { titel: "Kurz", dauerSek: 120, kuenstlerId: ohne.id },
    ],
  });

  const songId = async (titel: string) =>
    (await prisma.song.findFirstOrThrow({ where: { titel } })).id;

  await prisma.playlist.deleteMany();
  await prisma.playlist.createMany({
    data: [{ name: "Fokus" }, { name: "Ruhe" }],
  });

  const fokus = await prisma.playlist.findUniqueOrThrow({ where: { name: "Fokus" } });
  const ruhe = await prisma.playlist.findUniqueOrThrow({ where: { name: "Ruhe" } });

  await prisma.playlist.update({
    where: { id: fokus.id },
    data: {
      songs: {
        connect: [
          { id: await songId("Nordlicht") },
          { id: await songId("Glut") },
          { id: await songId("Raster") },
        ],
      },
    },
  });
  await prisma.playlist.update({
    where: { id: ruhe.id },
    data: { songs: { connect: [{ id: await songId("Kurz") }] } },
  });

  const songs = await prisma.song.count();
  const kuenstler = await prisma.kuenstler.count();
  const playlists = await prisma.playlist.count();
  console.log(`Seed fertig: ${kuenstler} Künstler, ${songs} Songs, ${playlists} Playlists.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
