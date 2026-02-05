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
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const minBudget = searchParams.get("minBudget");
    const maxBudget = searchParams.get("maxBudget");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeEnded = searchParams.get("includeEnded") === "true";

    const where: any = {};

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }

    if (type) {
        where.type = type;
    }

    const status = searchParams.get("status");
    if (status) {
        where.status = status;
    }

    if (minBudget || maxBudget) {
        where.budget = {};
        if (minBudget) where.budget.gte = Number(minBudget);
        if (maxBudget) where.budget.lte = Number(maxBudget);
    }

    if (startDate || endDate) {
        if (startDate) where.startDate = { gte: new Date(startDate) };
        if (endDate) where.endDate = { lte: new Date(endDate) };
    }

    if (!includeEnded) {
        const now = new Date();
        where.OR = [
            ...(where.OR || []),
            { endDate: { gte: now } },
            { endDate: null },
        ];
    }

    try {
        const projects = await prisma.project.findMany({
            where,
            include: {
                assignments: {
                    include: {
                        member: { select: { name: true, hourlyRate: true } },
                    },
                },
                monthlyBudgets: true,
            },
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" }
            ],
        });
        return NextResponse.json(projects);
    } catch (error) {
        console.error("Summary Projects API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
