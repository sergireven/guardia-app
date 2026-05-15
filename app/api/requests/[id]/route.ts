import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { status } = await req.json();
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "ID invàlid" }, { status: 400 });

  const request = await db.request.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Sol·licitud no trobada" }, { status: 404 });

  if (status === "APPROVED") {
    if (request.type === "VACATION") {
      // BUG-01: filtrar per requestId per no aprovar vacances no relacionades
      await db.vacation.updateMany({
        where: { userId: request.userId, status: "PENDING", requestId: id },
        data: { status: "APPROVED" },
      });
    } else if (request.type === "GUARDIA") {
      if (request.fromDate) {
        await db.guardia.upsert({
          where: { satDate: request.fromDate },
          update: { userId: request.userId },
          create: { userId: request.userId, satDate: request.fromDate },
        });
      }
    } else if (request.type === "REMOVE") {
      // BUG-07: parseig de data sense conversió timezone
      const [y, m, d] = request.fromDate.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const dow = date.getDay();
      let satDate = request.fromDate;
      if (dow === 0) {
        date.setDate(date.getDate() - 1);
        satDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
      }
      await db.guardia.deleteMany({ where: { satDate } });
    }
  }

  if (status === "REJECTED" && request.type === "VACATION") {
    // BUG-01: filtrar per requestId
    await db.vacation.updateMany({
      where: { userId: request.userId, status: "PENDING", requestId: id },
      data: { status: "REJECTED" },
    });
  }

  const updated = await db.request.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}
