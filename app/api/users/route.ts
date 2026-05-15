import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const users = await db.user.findMany({
    orderBy: { name: "asc" },
    select: { id:true, name:true, email:true, color:true, initials:true, role:true, guardia:true, active:true },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const body = await req.json();
  const { name, email, color, initials, role, guardia } = body;

  if (!name || !email) return NextResponse.json({ error: "Nom i email obligatoris" }, { status: 400 });

  const password = await bcrypt.hash("HCV2026", 12);

  const user = await db.user.create({
    data: { name, email: email.toLowerCase(), password, color: color || "#6b7280", initials: initials || name.slice(0,2).toUpperCase(), role: role || "AUXILIAR", guardia: guardia || false },
    select: { id:true, name:true, email:true, color:true, initials:true, role:true, guardia:true, active:true },
  });

  return NextResponse.json(user, { status: 201 });
}
