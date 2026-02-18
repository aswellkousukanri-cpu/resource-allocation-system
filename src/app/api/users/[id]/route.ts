
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;

    if (session.user.id === id) {
        return NextResponse.json({ message: "自分自身を削除することはできません" }, { status: 400 });
    }

    try {
        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ message: "ユーザーを削除しました" });
    } catch (error) {
        return NextResponse.json({ message: "削除に失敗しました" }, { status: 500 });
    }
}

import bcrypt from "bcryptjs";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;
    const { role, name, password } = await req.json();

    try {
        const updateData: any = {
            role,
            name,
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                updatedAt: true,
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("User update error:", error);
        return NextResponse.json({ message: "更新に失敗しました" }, { status: 500 });
    }
}
