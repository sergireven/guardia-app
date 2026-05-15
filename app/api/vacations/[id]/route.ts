import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { status, dates } = await req.json();
  const { id: idStr } = await params;
  const vacation = await db.vacation.update({
    where: { id: parseInt(idStr) },
    data: { ...(status && { status }), ...(dates && { dates }) },
  });
  return NextResponse.json(vacation);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { id: idStr } = await params;
  await db.vacation.delete({ where: { id: parseInt(idStr) } });
  return NextResponse.json({ ok: true });
}
