import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startYear = searchParams.get("startYear");
    const startMonth = searchParams.get("startMonth");
    const endYear = searchParams.get("endYear");
    const endMonth = searchParams.get("endMonth");
    const memberIdsParam = searchParams.getAll("memberIds");
    const memberIdParam = searchParams.get("memberId");

    // Combine multiple and single memberId parameters
    const memberIds = [...memberIdsParam];
    if (memberIdParam) memberIds.push(memberIdParam);

    const projectId = searchParams.get("projectId");

    const where: any = {};

    // Member filter
    if (memberIds.length > 0) {
        where.memberId = { in: memberIds };
    }

    // Project filter
    if (projectId) {
        where.projectId = projectId;
    }

    // Date range filter
    if (startYear && startMonth && endYear && endMonth) {
        const sY = Number(startYear);
        const sM = Number(startMonth);
        const eY = Number(endYear);
        const eM = Number(endMonth);

        if (sY === eY) {
            where.year = sY;
            where.month = { gte: sM, lte: eM };
        } else {
            where.OR = [
                { year: sY, month: { gte: sM } },
                { year: eY, month: { lte: eM } },
                { year: { gt: sY, lt: eY } },
            ];
        }
    } else {
        // Fallback or specific year/month if provided (backwards compatibility or simple filter)
        const year = searchParams.get("year");
        const month = searchParams.get("month");
        if (year) where.year = Number(year);
        if (month) where.month = Number(month);
    }

    try {
        const assignments = await prisma.assignment.findMany({
            where,
            include: {
                member: true,
                project: true,
            },
            orderBy: [
                { year: "desc" },
                { month: "desc" },
                { member: { sortOrder: "asc" } } as any,
                { createdAt: "desc" }
            ],
        });
        return NextResponse.json(assignments);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { memberId, projectId, year, month, manMonth, mode, startDate, endDate } = body;

        if (!memberId || !projectId || manMonth === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (mode === "bulk" && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const assignments = [];

            let current = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1));
            const stop = new Date(Date.UTC(end.getFullYear(), end.getMonth(), 1));

            while (current <= stop) {
                const y = current.getUTCFullYear();
                const m = current.getUTCMonth() + 1;

                const a = await prisma.assignment.upsert({
                    where: {
                        memberId_projectId_year_month: {
                            memberId,
                            projectId,
                            year: y,
                            month: m,
                        },
                    },
                    update: { manMonth: Number(manMonth) },
                    create: {
                        memberId,
                        projectId,
                        year: y,
                        month: m,
                        manMonth: Number(manMonth),
                    },
                });
                assignments.push(a);
                current.setUTCMonth(current.getUTCMonth() + 1);
            }
            return NextResponse.json(assignments, { status: 201 });
        } else {
            if (!year || !month) {
                return NextResponse.json({ error: "Year and Month are required" }, { status: 400 });
            }
            const assignment = await prisma.assignment.upsert({
                where: {
                    memberId_projectId_year_month: {
                        memberId,
                        projectId,
                        year: Number(year),
                        month: Number(month),
                    },
                },
                update: { manMonth: Number(manMonth) },
                create: {
                    memberId,
                    projectId,
                    year: Number(year),
                    month: Number(month),
                    manMonth: Number(manMonth),
                },
            });
            return NextResponse.json(assignment, { status: 201 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
