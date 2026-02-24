import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const finding = await prisma.finding.findUnique({ where: { id } });
  if (!finding) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  // Mark question as answered with response
  if (body.questionStatus !== undefined) {
    updateData.questionStatus = body.questionStatus;
  }
  if (body.questionResponse !== undefined) {
    updateData.questionResponse = body.questionResponse;
    if (!updateData.questionStatus) {
      updateData.questionStatus = "answered";
    }
  }

  const updated = await prisma.finding.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
