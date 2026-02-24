import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      findings: { orderBy: { createdAt: "asc" } },
      reviewer: { select: { name: true, username: true } },
    },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json(review);
}

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

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Only allow updating specific fields
  const updateData: Record<string, unknown> = {};
  if (body.chartId !== undefined) updateData.chartId = body.chartId;
  if (body.providerName !== undefined) updateData.providerName = body.providerName;

  const updated = await prisma.review.update({
    where: { id },
    data: updateData,
    include: { findings: true },
  });

  return NextResponse.json(updated);
}
