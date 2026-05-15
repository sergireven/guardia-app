import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "HCV2026"; // Contrasenya per defecte per a tots

async function main() {
  console.log("🌱 Iniciant seed...");

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // ── USUARIS ──
  const users = await Promise.all([
    prisma.user.upsert({ where: { email: "neus.plaza@hcv.cat" },
      update: {}, create: { name: "Neus Plaza", email: "neus.plaza@hcv.cat", password: hash, color: "#D946A8", initials: "NP", role: "ADMIN", guardia: true } }),
    prisma.user.upsert({ where: { email: "berta.gauthier@hcv.cat" },
      update: {}, create: { name: "Berta Gauthier", email: "berta.gauthier@hcv.cat", password: hash, color: "#22A855", initials: "BG", role: "AUXILIAR", guardia: true } }),
    prisma.user.upsert({ where: { email: "montse.prieto@hcv.cat" },
      update: {}, create: { name: "Montse Prieto", email: "montse.prieto@hcv.cat", password: hash, color: "#0EA5E9", initials: "MP", role: "AUXILIAR", guardia: true } }),
    prisma.user.upsert({ where: { email: "judith.hernandez@hcv.cat" },
      update: {}, create: { name: "Judith Hernandez", email: "judith.hernandez@hcv.cat", password: hash, color: "#EA8C0F", initials: "JH", role: "AUXILIAR", guardia: true } }),
    prisma.user.upsert({ where: { email: "ana.otero@hcv.cat" },
      update: {}, create: { name: "Ana Otero", email: "ana.otero@hcv.cat", password: hash, color: "#C9A800", initials: "AO", role: "AUXILIAR", guardia: true } }),
    prisma.user.upsert({ where: { email: "andrea@hcv.cat" },
      update: {}, create: { name: "Andrea", email: "andrea@hcv.cat", password: hash, color: "#8B5CF6", initials: "AN", role: "AUXILIAR", guardia: false } }),
    prisma.user.upsert({ where: { email: "geoconda@hcv.cat" },
      update: {}, create: { name: "Geoconda", email: "geoconda@hcv.cat", password: hash, color: "#14B8A6", initials: "GE", role: "AUXILIAR", guardia: false } }),
    prisma.user.upsert({ where: { email: "paula@hcv.cat" },
      update: {}, create: { name: "Paula", email: "paula@hcv.cat", password: hash, color: "#F97316", initials: "PA", role: "AUXILIAR", guardia: false } }),
    prisma.user.upsert({ where: { email: "marta.p@hcv.cat" },
      update: {}, create: { name: "Marta P", email: "marta.p@hcv.cat", password: hash, color: "#EC4899", initials: "MA", role: "AUXILIAR", guardia: false } }),
    prisma.user.upsert({ where: { email: "sofia@hcv.cat" },
      update: {}, create: { name: "Sofia", email: "sofia@hcv.cat", password: hash, color: "#6366F1", initials: "SO", role: "AUXILIAR", guardia: false } }),
  ]);
  console.log(`✅ ${users.length} usuaris creats`);

  // ── POSICIONS ──
  const positions = [
    { id: "qm1", name: "Quiròfan M (1)", shortName: "QM1", displayOrder: 1 },
    { id: "qm2", name: "Quiròfan M (2)", shortName: "QM2", displayOrder: 2 },
    { id: "q1220", name: "Quiròfan 12-20", shortName: "Q12-20", displayOrder: 3 },
    { id: "cures", name: "Cures", shortName: "CUR", displayOrder: 4 },
    { id: "q1422", name: "Quiròfan 14-22", shortName: "Q14-22", displayOrder: 5 },
    { id: "q917", name: "Quiròfan 9-17", shortName: "Q9-17", displayOrder: 6 },
  ];
  for (const pos of positions) {
    await prisma.position.upsert({ where: { id: pos.id }, update: pos, create: pos });
  }
  console.log(`✅ ${positions.length} posicions creades`);

  // ── GUARDIES (dades de l'Excel) ──
  const neusId = users[0].id;
  const bertaId = users[1].id;
  const montseId = users[2].id;
  const judithId = users[3].id;
  const anaId = users[4].id;

  const guardiaData = [
    { userId: neusId, dates: ["2026-02-21","2026-03-28","2026-06-06","2026-07-11","2026-09-19","2026-10-24","2026-11-28"] },
    { userId: bertaId, dates: ["2026-01-24","2026-02-28","2026-04-25","2026-05-09","2026-07-18","2026-08-22","2026-09-26","2026-10-31","2026-12-05"] },
    { userId: montseId, dates: ["2026-01-31","2026-03-07","2026-05-02","2026-05-16","2026-06-13","2026-07-25","2026-08-29","2026-10-03","2026-11-07","2026-12-12"] },
    { userId: judithId, dates: ["2026-02-07","2026-03-21","2026-04-18","2026-05-23","2026-06-27","2026-07-04","2026-08-01","2026-09-05","2026-10-10","2026-11-14","2026-12-19"] },
    { userId: anaId, dates: ["2026-02-14","2026-03-14","2026-04-11","2026-05-30","2026-06-20","2026-08-08","2026-08-15","2026-09-12","2026-10-17","2026-11-21","2026-12-26"] },
  ];
  let guardiaCount = 0;
  for (const { userId, dates } of guardiaData) {
    for (const satDate of dates) {
      await prisma.guardia.upsert({ where: { satDate }, update: { userId }, create: { userId, satDate } });
      guardiaCount++;
    }
  }
  console.log(`✅ ${guardiaCount} guardies creades`);

  // ── FESTIUS 2026 ──
  const holidays = [
    { date: "2026-01-01", name: "Any Nou" },
    { date: "2026-01-06", name: "Reis" },
    { date: "2026-04-03", name: "Divendres Sant" },
    { date: "2026-04-06", name: "Dilluns de Pasqua" },
    { date: "2026-05-01", name: "Dia del Treball" },
    { date: "2026-06-24", name: "Sant Joan" },
    { date: "2026-08-15", name: "Assumpció" },
    { date: "2026-09-11", name: "Diada Nacional" },
    { date: "2026-09-24", name: "La Mercè" },
    { date: "2026-10-12", name: "Festa Nacional d'Espanya" },
    { date: "2026-11-01", name: "Tots Sants" },
    { date: "2026-12-08", name: "Immaculada Concepció" },
    { date: "2026-12-25", name: "Nadal" },
    { date: "2026-12-26", name: "Sant Esteve" },
  ];
  for (const h of holidays) {
    await prisma.holiday.upsert({ where: { date: h.date }, update: h, create: h });
  }
  console.log(`✅ ${holidays.length} festius creats`);

  // ── VACANCES ──
  await prisma.vacation.deleteMany({ where: { userId: { in: [neusId, bertaId, montseId] } } });

  const vacationData = [
    { userId: neusId, dates: [
      "2026-04-07","2026-04-08","2026-04-09","2026-04-10",
      "2026-07-20","2026-07-21","2026-07-22","2026-07-23","2026-07-24",
      "2026-07-27","2026-07-28","2026-07-29","2026-07-30","2026-07-31",
      "2026-08-03","2026-08-04","2026-08-05","2026-08-06","2026-08-07",
      "2026-08-31",
      "2026-09-01","2026-09-02","2026-09-03","2026-09-04",
      "2026-09-07","2026-09-08",
    ]},
    { userId: bertaId, dates: [
      "2026-03-30","2026-03-31",
      "2026-04-01","2026-04-02",
      "2026-07-13","2026-07-14","2026-07-15","2026-07-16","2026-07-17",
      "2026-08-10","2026-08-11","2026-08-12","2026-08-13","2026-08-14",
      "2026-08-17","2026-08-18","2026-08-19","2026-08-20","2026-08-21",
      "2026-08-24","2026-08-25","2026-08-26","2026-08-27","2026-08-28",
    ]},
    { userId: montseId, dates: [
      "2026-03-30","2026-03-31",
      "2026-04-01","2026-04-02",
      "2026-07-17",
      "2026-08-03","2026-08-04","2026-08-05","2026-08-06","2026-08-07",
      "2026-08-10","2026-08-11","2026-08-12","2026-08-13","2026-08-14",
      "2026-08-17","2026-08-18","2026-08-19","2026-08-20","2026-08-21",
      "2026-08-24","2026-08-25","2026-08-26","2026-08-27","2026-08-28",
    ]},
  ];

  for (const { userId, dates } of vacationData) {
    await prisma.vacation.create({ data: { userId, dates, status: "APPROVED" } });
  }
  console.log(`✅ ${vacationData.length} registres de vacances creats`);

  console.log("\n🎉 Seed completat!");
  console.log(`\n📋 Credencials per defecte per a tots els usuaris:`);
  console.log(`   Email: [nom.cognom]@hcv.cat`);
  console.log(`   Contrasenya: ${DEFAULT_PASSWORD}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
