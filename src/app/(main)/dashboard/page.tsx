"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Briefcase, CalendarClock, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
    const [stats, setStats] = useState({
        memberCount: 0,
        projectCount: 0,
        activeAssignments: 0,
        warnings: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/dashboard/stats");
                const data = await res.json();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const cards = [
        { label: "登録メンバー", value: stats.memberCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/members" },
        { label: "進行中の案件", value: stats.projectCount, icon: Briefcase, color: "text-green-600", bg: "bg-green-50", href: "/projects" },
        { label: "今月の有効アサイン", value: stats.activeAssignments, icon: CalendarClock, color: "text-indigo-600", bg: "bg-indigo-50", href: "/assignments" },
        { label: "稼働率警告数", value: stats.warnings, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/summary/members" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
                <p className="mt-1 text-gray-500">システムの概況を確認できます</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <Link key={card.label} href={card.href} className="group transition-transform hover:-translate-y-1">
                        <div className={`rounded-xl border border-gray-100 p-6 shadow-sm transition-shadow group-hover:shadow-md bg-white`}>
                            <div className="flex items-center justify-between">
                                <div className={`rounded-lg p-3 ${card.bg} ${card.color}`}>
                                    <card.icon size={24} />
                                </div>
                                <p className={`text-3xl font-bold ${card.color}`}>
                                    {loading ? "..." : card.value}
                                </p>
                            </div>
                            <p className="mt-4 text-sm font-medium text-gray-500">{card.label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">クイックアクション</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Link href="/members/new">
                            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                                <span className="text-sm font-medium text-gray-700">メンバーを追加</span>
                            </div>
                        </Link>
                        <Link href="/projects/new">
                            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                                <span className="text-sm font-medium text-gray-700">案件を追加</span>
                            </div>
                        </Link>
                        <Link href="/assignments">
                            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                                <span className="text-sm font-medium text-gray-700">工数をアサイン</span>
                            </div>
                        </Link>
                        <Link href="/summary">
                            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                                <span className="text-sm font-medium text-gray-700">サマリーを確認</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
