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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { chartId: { contains: search } },
      { providerName: { contains: search } },
      { pdfFilename: { contains: search } },
    ];
  }

  if (status === "questions_pending") {
    where.findings = { some: { questionStatus: "pending" } };
  } else if (status === "complete") {
    where.status = "complete";
  } else if (status && status !== "all") {
    where.status = status;
  }

  if (dateFrom) {
    where.createdAt = { ...(where.createdAt as object || {}), gte: new Date(dateFrom) };
  }
  if (dateTo) {
    where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(dateTo + "T23:59:59Z") };
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        reviewer: { select: { name: true, username: true } },
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({
    reviews,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
