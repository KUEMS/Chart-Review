import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = { status: "complete" };
  if (dateFrom) {
    where.createdAt = { ...(where.createdAt as object || {}), gte: new Date(dateFrom) };
  }
  if (dateTo) {
    where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(dateTo + "T23:59:59Z") };
  }

  const reviews = await prisma.review.findMany({
    where,
    select: {
      createdAt: true,
      criticalCount: true,
      flagCount: true,
      suggestionCount: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by week
  const weeklyData = new Map<
    string,
    { critical: number; flag: number; suggestion: number; count: number }
  >();

  for (const review of reviews) {
    const date = new Date(review.createdAt);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split("T")[0];

    const existing = weeklyData.get(key) || {
      critical: 0,
      flag: 0,
      suggestion: 0,
      count: 0,
    };
    existing.critical += review.criticalCount;
    existing.flag += review.flagCount;
    existing.suggestion += review.suggestionCount;
    existing.count += 1;
    weeklyData.set(key, existing);
  }

  const trends = Array.from(weeklyData.entries()).map(([week, data]) => ({
    week,
    ...data,
  }));

  // Findings by flag type
  const byFlagType = await prisma.finding.groupBy({
    by: ["flagType", "severity"],
    _count: true,
    where: {
      review: where,
    },
  });

  // Findings by review category
  const byCategory = await prisma.finding.groupBy({
    by: ["reviewCategory"],
    _count: true,
    where: {
      review: where,
    },
  });

  return NextResponse.json({
    trends,
    byFlagType,
    byCategory,
  });
}
