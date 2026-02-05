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
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    try {
        const members = await prisma.member.findMany({
            include: {
                assignments: {
                    where: { year, month },
                    include: {
                        project: { select: { name: true, status: true } },
                    },
                },
            },
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" }
            ],
        });
        return NextResponse.json(members);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
