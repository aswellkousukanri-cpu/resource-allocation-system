import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { projectId, rows } = body;

        if (!projectId || !rows || !Array.isArray(rows)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // rows: [{ memberId: string, values: [{ year: number, month: number, manMonth: number }] }]

        const results = [];

        // Use a transaction to ensure all updates succeed or fail together
        await prisma.$transaction(
            rows.flatMap((row: any) => {
                const { memberId, values } = row;
                if (!memberId || !values || !Array.isArray(values)) return [];

                return values.map((val: any) => {
                    const { year, month, manMonth } = val;
                    // Skip if manMonth is 0 or null if you want, but normally let's just upsert
                    return prisma.assignment.upsert({
                        where: {
                            memberId_projectId_year_month: {
                                memberId,
                                projectId,
                                year,
                                month,
                            },
                        },
                        update: { manMonth: Number(manMonth) },
                        create: {
                            memberId,
                            projectId,
                            year,
                            month,
                            manMonth: Number(manMonth),
                        },
                    });
                });
            })
        );

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
