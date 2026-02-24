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

  const where: Record<string, unknown> = {};
  if (dateFrom) {
    where.createdAt = { ...(where.createdAt as object || {}), gte: new Date(dateFrom) };
  }
  if (dateTo) {
    where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(dateTo + "T23:59:59Z") };
  }

  // Top abbreviation violations - findings in abbreviation_compliance category
  const abbreviationFindings = await prisma.finding.findMany({
    where: {
      ...where,
      reviewCategory: "abbreviation_compliance",
    },
    select: {
      flagComment: true,
      ruleCitation: true,
    },
  });

  // Extract abbreviation mentions from flag comments
  const abbrCounts = new Map<string, number>();
  for (const finding of abbreviationFindings) {
    // Try to extract the specific abbreviation from the flag comment
    const match = finding.flagComment.match(
      /["'"]([A-Za-z\/&]+)["'"]/
    );
    if (match) {
      const abbr = match[1];
      abbrCounts.set(abbr, (abbrCounts.get(abbr) || 0) + 1);
    }
  }

  const topAbbreviationViolations = Array.from(abbrCounts.entries())
    .map(([abbreviation, count]) => ({ abbreviation, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top protocol deviations - findings with protocol_compliance category
  const protocolFindings = await prisma.finding.findMany({
    where: {
      ...where,
      reviewCategory: "protocol_compliance",
    },
    select: {
      ruleCitation: true,
    },
  });

  const protocolCounts = new Map<string, number>();
  for (const finding of protocolFindings) {
    const citation = finding.ruleCitation || "Unspecified";
    protocolCounts.set(citation, (protocolCounts.get(citation) || 0) + 1);
  }

  const topProtocolDeviations = Array.from(protocolCounts.entries())
    .map(([citation, count]) => ({ citation, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    topAbbreviationViolations,
    topProtocolDeviations,
    totalAbbreviationFindings: abbreviationFindings.length,
    totalProtocolFindings: protocolFindings.length,
  });
}
