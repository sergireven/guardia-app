import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const include = {
  user:    { select: { id:true, name:true, color:true, initials:true } },
  subUser: { select: { id:true, name:true, color:true, initials:true } },
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  const assignments = await db.positionAssignment.findMany({ include });
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { date, positionId, userId, subUserId } = await req.json();
  const uid  = userId    ? parseInt(userId)    : null;
  const suid = subUserId !== undefined ? (subUserId ? parseInt(subUserId) : null) : undefined;

  const assignment = await db.positionAssignment.upsert({
    where: { date_positionId: { date, positionId } },
    update: { userId: uid, ...(suid !== undefined && { subUserId: suid }) },
    create: { date, positionId, userId: uid, subUserId: suid ?? null },
    include,
  });

  return NextResponse.json(assignment, { status: 201 });
}
