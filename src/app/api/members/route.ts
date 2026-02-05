import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const members = await prisma.member.findMany({
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

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, role, hourlyRate, workCapacity, memo } = body;

        if (!name || !role || hourlyRate === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get max sortOrder to append to the end
        const maxMember = await prisma.member.findFirst({
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true }
        });
        const nextSortOrder = (maxMember?.sortOrder ?? -1) + 1;

        const member = await prisma.member.create({
            data: {
                name,
                role,
                hourlyRate: Number(hourlyRate),
                workCapacity: Number(workCapacity ?? 1.0),
                memo,
                sortOrder: nextSortOrder,
            },
        });

        return NextResponse.json(member, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { memberIds } = await req.json();
        if (!Array.isArray(memberIds)) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        // Use transaction to update all orders
        await prisma.$transaction(
            memberIds.map((id, index) =>
                prisma.member.update({
                    where: { id },
                    data: { sortOrder: index },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder members", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
