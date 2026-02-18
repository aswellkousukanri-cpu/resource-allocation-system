
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// ユーザー一覧の取得 & 新規ユーザー作成
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "権限がありません" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return NextResponse.json(users);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "権限がありません" }, { status: 403 });
    }

    try {
        const { email, password, name, role } = await req.json();

        if (!email || !password || !role) {
            return NextResponse.json({ message: "必須項目が不足しています" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ message: "このメールアドレスは既に登録されています" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || "USER",
            },
        });

        return NextResponse.json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
        console.error("User creation error:", error);
        return NextResponse.json({ message: "サーバーエラーが発生しました" }, { status: 500 });
    }
}
