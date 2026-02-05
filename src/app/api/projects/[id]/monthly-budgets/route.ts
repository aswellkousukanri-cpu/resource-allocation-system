import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { year, month, amount } = body;

        if (!year || !month || amount === undefined) {
            return NextResponse.json({ error: "Year, month and amount are required" }, { status: 400 });
        }

        const monthlyBudget = await (prisma as any).monthlyBudget.upsert({
            where: {
                projectId_year_month: {
                    projectId,
                    year: Number(year),
                    month: Number(month),
                },
            },
            update: { amount: Number(amount) },
            create: {
                projectId,
                year: Number(year),
                month: Number(month),
                amount: Number(amount),
            },
        });

        return NextResponse.json(monthlyBudget);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
