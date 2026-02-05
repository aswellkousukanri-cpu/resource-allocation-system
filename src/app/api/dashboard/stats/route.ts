import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
        const [memberCount, projectCount, assignments, members] = await Promise.all([
            prisma.member.count(),
            prisma.project.count(),
            prisma.assignment.findMany({
                where: { year, month },
            }),
            prisma.member.findMany({
                select: { id: true, workCapacity: true },
            }),
        ]);

        // Calculate warnings
        const memberManMonths: Record<string, number> = {};
        assignments.forEach((a) => {
            memberManMonths[a.memberId] = (memberManMonths[a.memberId] || 0) + a.manMonth;
        });

        let warnings = 0;
        members.forEach((m) => {
            const total = memberManMonths[m.id] || 0;
            if (total > m.workCapacity) {
                warnings++;
            }
        });

        return NextResponse.json({
            memberCount,
            projectCount,
            activeAssignments: assignments.length,
            warnings,
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
