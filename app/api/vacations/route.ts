import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ── VACANCES GET / POST ──
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  const vacations = await db.vacation.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(vacations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { userId, dates, comment, status } = body;

  const isAdmin = (session.user as any).role === "ADMIN";
  const targetUserId = isAdmin && userId ? parseInt(userId) : parseInt(session.user!.id!);

  // Comprova si algun dels dies ja existeix en una vacança existent
  const existing = await db.vacation.findMany({
    where: { userId: targetUserId, status: { in: ["PENDING", "APPROVED"] } },
  });
  const takenDates = new Set(existing.flatMap(v => v.dates));
  const duplicates = dates.filter((d: string) => takenDates.has(d));
  if (duplicates.length > 0) {
    return NextResponse.json(
      { error: `Aquests dies ja estan sol·licitats o aprovats: ${duplicates.join(", ")}` },
      { status: 409 }
    );
  }

  const vacation = await db.vacation.create({
    data: {
      userId: targetUserId,
      dates,
      comment,
      status: isAdmin ? (status || "APPROVED") : "PENDING",
    },
  });

  return NextResponse.json(vacation, { status: 201 });
}
