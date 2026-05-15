import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  const requests = await db.request.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { type, fromDate, toDate, comment, workDates } = body;
  const userId = parseInt(session.user!.id!);

  // BUG-05: check duplicats abans de crear la sol·licitud de vacances
  if (type === "VACATION" && workDates?.length > 0) {
    const existing = await db.vacation.findMany({
      where: { userId, status: { in: ["PENDING", "APPROVED"] } },
    });
    const takenDates = new Set(existing.flatMap((v) => v.dates));
    const duplicates = (workDates as string[]).filter((d) => takenDates.has(d));
    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: `Aquests dies ja estan sol·licitats o aprovats: ${duplicates.join(", ")}` },
        { status: 409 }
      );
    }
  }

  const request = await db.request.create({
    data: { userId, type, fromDate, toDate, comment, status: "PENDING" },
  });

  // BUG-01+02: crear vacation vinculada al request (requestId), sense crida extra des del client
  let vacation = null;
  if (type === "VACATION" && workDates?.length > 0) {
    vacation = await db.vacation.create({
      data: { userId, dates: workDates, comment, status: "PENDING", requestId: request.id },
    });
  }

  return NextResponse.json({ request, vacation }, { status: 201 });
}
