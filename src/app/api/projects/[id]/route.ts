import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                monthlyBudgets: true, // Include monthly budgets
                assignments: {
                    include: {
                        member: true,
                    },
                    orderBy: [
                        { year: "desc" },
                        { month: "desc" },
                    ],
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, type, status, description, budget, startDate, endDate, monthlyBudgets } = body;

        // Use transaction to update project and handle monthly budgets
        const project = await prisma.$transaction(async (tx) => {
            // 1. Update project basic info
            const p = await tx.project.update({
                where: { id },
                data: {
                    name,
                    type,
                    status,
                    description,
                    budget: (budget !== undefined && budget !== null && budget !== "") ? Number(budget) : null,
                    startDate: (startDate && startDate.trim() !== "") ? new Date(startDate) : null,
                    endDate: (endDate && endDate.trim() !== "") ? new Date(endDate) : null,
                },
            });

            // 2. Handle Monthly Budgets (Upsert/Delete approach)
            if (monthlyBudgets && Array.isArray(monthlyBudgets)) {
                // First, delete existing budgets for months not in the new list (or simply upsert all)
                // Strategy: Delete all for this project and recreate (simpler for now) or upsert loop.
                // Recreating is safer to remove deleted months.

                // However, deleting all might lose history if we only send partial data?
                // Assuming form sends ALL active monthly budgets.

                // Let's go with: Delete all, then Create all.
                // Note: If you want to keep IDs or other metadata, this might be destructive.
                // But MonthlyBudget is simple (Project, Year, Month, Amount).

                await tx.monthlyBudget.deleteMany({
                    where: { projectId: id }
                });

                if (monthlyBudgets.length > 0) {
                    await tx.monthlyBudget.createMany({
                        data: monthlyBudgets.map((mb: any) => ({
                            projectId: id,
                            year: mb.year,
                            month: mb.month,
                            amount: mb.amount
                        }))
                    });
                }
            }

            return p;
        });

        return NextResponse.json(project);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.project.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Project deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
