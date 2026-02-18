"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Users,
    Briefcase,
    CalendarClock,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Clock,
    ArrowRight,
    ChevronRight,
    Search
} from "lucide-react";
import { Button } from "@/components/ui";

interface DashboardData {
    summary: {
        activeProjects: number;
        prospectiveProjects: number;
        overallUtilization: number;
        overAllocatedCount: number;
        totalBudget: number;
        totalCost: number;
    };
    alerts: {
        overAllocated: any[];
        lowUtilization: any[];
    };
    projects: {
        prospective: any[];
        upcomingEnd: any[];
    };
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/dashboard");
                const json = await res.json();
                // Defensive check for API response data structure
                if (!res.ok || !json || !json.summary || !json.alerts || !json.projects) {
                    throw new Error(json.message || "Invalid dashboard data structure received from API");
                }
                setData(json);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                // Improved error reporting for client-side
                setData({ error: "Failed to load data", message: error instanceof Error ? error.message : String(error) } as any);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent" />
            </div>
        );
    }

    if (!data || ("error" in data)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900">データ取得エラー</h3>
                    <p className="text-sm text-gray-500">ダッシュボードデータの取得に失敗しました</p>
                    {data && "message" in (data as any) && (
                        <p className="mt-2 text-xs text-red-400 font-mono">{(data as any).message}</p>
                    )}
                </div>
                <Button onClick={() => window.location.reload()} variant="outline">
                    再試行
                </Button>
            </div>
        );
    }

    const { summary, alerts, projects } = data;

    const summaryCards = [
        {
            label: "稼働率平均",
            value: `${summary.overallUtilization}%`,
            icon: TrendingUp,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            desc: "全メンバーの平均"
        },
        {
            label: "稼働超過メンバー",
            value: summary.overAllocatedCount,
            icon: AlertTriangle,
            color: summary.overAllocatedCount > 0 ? "text-red-600" : "text-gray-500",
            bg: summary.overAllocatedCount > 0 ? "bg-red-50" : "bg-gray-50",
            desc: "100%を超えている数"
        },
        {
            label: "進行中の案件",
            value: summary.activeProjects,
            icon: Briefcase,
            color: "text-green-600",
            bg: "bg-green-50",
            desc: "稼働中プロジェクト"
        },
        {
            label: "見込み案件",
            value: summary.prospectiveProjects,
            icon: Search,
            color: "text-blue-600",
            bg: "bg-blue-50",
            desc: "PROSPECTIVEステータス"
        },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">ダッシュボード</h2>
                <p className="mt-1 text-sm font-medium text-gray-400 uppercase tracking-widest">リソース・アサイン状況の俯瞰</p>
            </div>

            {/* Top Metrics Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-gray-100 p-6 shadow-sm bg-white hover:shadow-md transition-shadow ring-1 ring-black/5">
                        <div className="flex items-center justify-between">
                            <div className={`rounded-xl p-3 ${card.bg} ${card.color}`}>
                                <card.icon size={24} />
                            </div>
                            <p className={`text-3xl font-black ${card.color}`}>
                                {card.value}
                            </p>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-black text-gray-900 leading-none">{card.label}</p>
                            <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{card.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* 1. Alerts & Utilization */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Over-allocation Alerts */}
                    <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm ring-1 ring-black/5">
                        <div className="px-6 py-4 flex items-center justify-between bg-gray-50/50 border-b">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={18} className="text-red-500" />
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">稼働アラート (100%超)</h3>
                            </div>
                            <Link href="/assignments" className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                                工数管理で調整 <ArrowRight size={12} />
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {alerts.overAllocated.length === 0 ? (
                                <div className="p-10 text-center text-sm text-gray-400 font-medium">警告対象のメンバーはいません</div>
                            ) : (
                                alerts.overAllocated.map(mu => (
                                    <div key={mu.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-xs">
                                                {mu.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{mu.name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Capacity: {mu.workCapacity}人月</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-red-600">{mu.utilization.toFixed(0)}%</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Total: {mu.totalManMonth.toFixed(1)}人月</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Financial Summary Widget */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ring-1 ring-black/5">
                        <div className="flex items-center gap-2 mb-6">
                            <DollarSign size={18} className="text-gray-900" />
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">プロジェクト全体の収支概況 (試算)</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-8 border-b pb-6 mb-6">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">想定総売上 (全予算合計)</p>
                                <p className="text-2xl font-black text-gray-900">¥{summary.totalBudget.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">推定総コスト (全人件費)</p>
                                <p className="text-2xl font-black text-red-600">¥{summary.totalCost.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">想定利益率</p>
                                <p className="text-xl font-black text-indigo-600">
                                    {summary.totalBudget > 0
                                        ? (((summary.totalBudget - summary.totalCost) / summary.totalBudget) * 100).toFixed(1)
                                        : 0}%
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">想定利益額</p>
                                <p className="text-xl font-black text-gray-900">¥{(summary.totalBudget - summary.totalCost).toLocaleString()}</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* 2. Sidebars: Prospective & Upcoming End */}
                <div className="space-y-8">
                    {/* Prospective Projects List */}
                    <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm ring-1 ring-black/5">
                        <div className="px-6 py-4 bg-blue-50/50 border-b flex items-center justify-between">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">見込み案件 (PROSPECTIVE)</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {projects.prospective.length === 0 ? (
                                <div className="p-8 text-center text-[10px] text-gray-400 font-bold uppercase">登録された案件はありません</div>
                            ) : (
                                projects.prospective.map(p => (
                                    <Link key={p.id} href={`/projects/${p.id}`} className="block px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                                            <ChevronRight size={14} className="text-gray-300" />
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                                            <span>{p.type}</span>
                                            <span>¥{p.budget?.toLocaleString() || "0"}</span>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Upcoming Transitions */}
                    <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm ring-1 ring-black/5">
                        <div className="px-6 py-4 bg-orange-50/50 border-b flex items-center justify-between">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">30日以内に終了する案件</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {projects.upcomingEnd.length === 0 ? (
                                <div className="p-8 text-center text-[10px] text-gray-400 font-bold uppercase">対象案件はありません</div>
                            ) : (
                                projects.upcomingEnd.map(p => (
                                    <Link key={p.id} href={`/projects/${p.id}`} className="block px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                                            <ChevronRight size={14} className="text-gray-300" />
                                        </div>
                                        <div className="mt-1 flex items-center justify-between">
                                            <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase">
                                                <Clock size={10} /> {new Date(p.endDate).toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400">
                                                アサイン: {p._count.assignments}名
                                            </span>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
