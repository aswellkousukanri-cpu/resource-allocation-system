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
    const type = searchParams.get("type"); // New type filter
    const status = searchParams.get("status"); // New status filter
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
        (where as any).type = type;
    }

    if (status) {
        (where as any).status = status;
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

    // Default: only show projects that haven't ended yet
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
                _count: {
                    select: { assignments: true },
                },
                assignments: {
                    include: {
                        member: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" }
            ],
        });
        return NextResponse.json(projects);
    } catch (error) {
        console.error("Projects API Error:", error);
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
        const { name, type, status, description, budget, startDate, endDate, monthlyBudgets } = body;

        if (!name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get max sortOrder to append to the end
        const maxProject = await prisma.project.findFirst({
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true }
        });
        const nextSortOrder = (maxProject?.sortOrder ?? -1) + 1;

        const project = await prisma.project.create({
            data: {
                name,
                type: type || "開発",
                status: status || "CONFIRMED",
                description,
                budget: (budget !== undefined && budget !== null && budget !== "") ? Number(budget) : null,
                startDate: (startDate && startDate.trim() !== "") ? new Date(startDate) : null,
                endDate: (endDate && endDate.trim() !== "") ? new Date(endDate) : null,
                sortOrder: nextSortOrder,
                monthlyBudgets: {
                    create: (monthlyBudgets || []).map((mb: any) => ({
                        year: mb.year,
                        month: mb.month,
                        amount: mb.amount
                    }))
                }
            },
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error("Project Create Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { projectIds } = await req.json();
        if (!Array.isArray(projectIds)) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        // Use transaction to update all orders
        await prisma.$transaction(
            projectIds.map((id, index) =>
                prisma.project.update({
                    where: { id },
                    data: { sortOrder: index },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder projects", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
