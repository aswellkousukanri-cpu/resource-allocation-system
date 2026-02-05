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
    const fiscalYear = Number(searchParams.get("fiscalYear"));

    if (!fiscalYear) {
        return NextResponse.json({ error: "fiscalYear is required" }, { status: 400 });
    }

    // 決算期が9月末なので、10月〜翌年9月を取得
    // 年度 2024 -> 2024/10 〜 2025/9
    const months = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(fiscalYear, 9 + i, 1);
        months.push({ year: date.getFullYear(), month: date.getMonth() + 1 });
    }

    try {
        const members = await prisma.member.findMany({
            include: {
                assignments: {
                    where: {
                        OR: months.map(m => ({ year: m.year, month: m.month }))
                    },
                    include: {
                        project: { select: { name: true, status: true } }
                    }
                }
            },
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" }
            ]
        });

        return NextResponse.json({ members, months });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
