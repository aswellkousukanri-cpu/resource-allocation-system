"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface ProjectSummary {
    id: string;
    name: string;
    type: string;
    budget: number | null;
    startDate: string | null;
    endDate: string | null;
    assignments: {
        id: string;
        member: { name: string; hourlyRate: number };
        year: number;
        month: number;
        manMonth: number;
    }[];
    monthlyBudgets: {
        year: number;
        month: number;
        amount: number;
    }[];
}

export default function ProjectSummaryDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [project, setProject] = useState<ProjectSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Fetch the specific project from the list-capable endpoint
                const res = await fetch(`/api/summary/projects`);
                const data = await res.json();
                const found = data.find((p: any) => p.id === id);
                setProject(found);
            } catch (error) {
                console.error("Failed to fetch project detail", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("ja-JP");
    };

    if (loading) return <div className="py-10 text-center text-gray-500">読み込み中...</div>;
    if (!project) return <div className="py-10 text-center text-red-500">案件が見つかりません</div>;

    const HOURS_PER_MONTH = 160;

    const getProjectMonths = () => {
        if (!project) return [];

        const monthKeys = new Set<string>();

        // 1. Add months from date range if available
        if (project.startDate && project.endDate) {
            const start = new Date(project.startDate);
            const end = new Date(project.endDate);
            // Use UTC to avoid timezone shifts during month iteration
            let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
            const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
            let safety = 0;
            while (current <= stop && safety < 60) {
                monthKeys.add(`${current.getUTCFullYear()}-${current.getUTCMonth() + 1}`);
                current.setUTCMonth(current.getUTCMonth() + 1);
                safety++;
            }
        }

        // 2. Add months from assignments
        project.assignments.forEach(a => {
            monthKeys.add(`${a.year}-${a.month}`);
        });

        // 3. Add months from explicit monthly budgets
        project.monthlyBudgets?.forEach(b => {
            monthKeys.add(`${b.year}-${b.month}`);
        });

        // If no data points yet, fallback to current month
        if (monthKeys.size === 0) {
            const now = new Date();
            monthKeys.add(`${now.getFullYear()}-${now.getMonth() + 1}`);
        }

        return Array.from(monthKeys)
            .map(key => {
                const [y, m] = key.split("-").map(Number);
                return { year: y, month: m };
            })
            .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));
    };

    const projectMonths = getProjectMonths();

    const getBudgetForMonth = (year: number, month: number) => {
        const override = project.monthlyBudgets?.find(b => b.year === year && b.month === month);
        if (override) return override.amount;
        if (project.type === "保守") return project.budget || 0;
        return 0;
    };

    const handleBudgetChange = async (year: number, month: number, amount: string) => {
        if (!project) return;
        try {
            const res = await fetch(`/api/projects/${id}/monthly-budgets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year, month, amount }),
            });
            if (res.ok) {
                const updatedBudget = await res.json();
                setProject({
                    ...project,
                    monthlyBudgets: [
                        ...(project.monthlyBudgets || []).filter(b => !(b.year === year && b.month === month)),
                        updatedBudget
                    ]
                });
            }
        } catch (error) {
            console.error("Failed to update monthly budget", error);
        }
    };

    const distinctMembers = Array.from(new Set(project.assignments.map(a => a.member.name)));
    const totalProjectCost = project.assignments.reduce((sum, a) => sum + (a.member.hourlyRate * HOURS_PER_MONTH * a.manMonth), 0);

    const budget = project.type === "保守"
        ? projectMonths.reduce((sum, m) => sum + getBudgetForMonth(m.year, m.month), 0)
        : project.budget;

    const totalProfit = budget !== null ? budget - totalProjectCost : -totalProjectCost;
    const isTotalOverBudget = budget !== null && totalProfit < 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link href="/summary/projects">
                    <Button variant="outline" size="sm">
                        <ArrowLeft size={18} />
                    </Button>
                </Link>
                <h2 className="text-xl font-bold text-gray-900">案件収支詳細</h2>
                <div className="ml-auto">
                    <Link href={`/projects/${id}`}>
                        <Button variant="outline" size="sm" className="gap-2 text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                            <ExternalLink size={14} />
                            案件管理へ
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden flex flex-col">
                {/* ヘッダー情報 */}
                <div className="bg-gray-50 border-b p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{project.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-medium text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                                    {formatDate(project.startDate)} 〜 {formatDate(project.endDate)}
                                </span>
                                <span className="text-xs text-gray-400">計 {projectMonths.length} ヶ月</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="text-right border-l pl-6 border-gray-200">
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">案件総予算</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {budget !== null ? `¥${budget.toLocaleString()}` : <span className="text-gray-300 font-normal">未設定</span>}
                                </p>
                            </div>
                            <div className="text-right border-l pl-6 border-gray-200">
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">着地予想原価</p>
                                <p className={`text-xl font-bold ${isTotalOverBudget ? 'text-red-600' : 'text-gray-900'}`}>¥{totalProjectCost.toLocaleString()}</p>
                            </div>
                            <div className="text-right border-l pl-6 border-gray-200">
                                <p className={`text-[10px] uppercase font-black tracking-widest ${totalProfit < 0 ? 'text-red-400' : totalProfit > 0 ? 'text-green-400' : 'text-gray-400'}`}>予測粗利</p>
                                <p className={`text-xl font-black ${totalProfit < 0 ? 'text-red-700' : totalProfit > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {totalProfit > 0 ? '+' : totalProfit < 0 ? '-' : ''}¥{Math.abs(totalProfit).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* タイムラインテーブル */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100/50">
                                <th className="sticky left-0 z-20 bg-gray-50 px-6 py-4 text-left text-xs font-bold text-gray-500 border-r w-56 shadow-[4px_0_10px_rgba(0,0,0,0.05)]">メンバー（時給）</th>
                                {projectMonths.map(m => (
                                    <th key={`${m.year}-${m.month}`} className="px-4 py-4 text-center text-xs font-bold text-gray-500 border-r min-w-[120px]">
                                        <span className="block text-[10px] text-gray-300 font-normal">{m.year}</span>
                                        {m.month}月
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-center text-xs font-bold text-white bg-indigo-600/90">個人原価合計</th>
                            </tr>
                            {/* Monthly Budget Row */}
                            <tr className="bg-indigo-50/10">
                                <td className="sticky left-0 z-20 bg-indigo-50/30 px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-indigo-900 border-r shadow-[4px_0_10px_rgba(0,0,0,0.05)]">
                                    月別予算 (売上)
                                </td>
                                {projectMonths.map(m => {
                                    const b = getBudgetForMonth(m.year, m.month);
                                    return (
                                        <td key={`${m.year}-${m.month}`} className="px-2 py-2 border-r text-center">
                                            <div className="text-xs font-black text-indigo-700">
                                                ¥{b.toLocaleString()}
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-3 text-center bg-indigo-100/50 font-black text-indigo-900 text-xs">
                                    ¥{budget?.toLocaleString() || 0}
                                </td>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {distinctMembers.map(memberName => {
                                const mAssignments = project.assignments.filter(a => a.member.name === memberName);
                                const memberTotalCost = mAssignments.reduce((sum, a) => sum + (a.member.hourlyRate * HOURS_PER_MONTH * a.manMonth), 0);
                                const hourlyRate = mAssignments[0]?.member.hourlyRate || 0;

                                return (
                                    <tr key={memberName} className="hover:bg-gray-50 transition-colors">
                                        <td className="sticky left-0 z-10 bg-white px-6 py-4 text-sm font-bold text-gray-900 border-r shadow-[4px_0_10px_rgba(0,0,0,0.05)]">
                                            {memberName}
                                            <span className="block text-[10px] text-gray-400 font-normal mt-1">¥{hourlyRate.toLocaleString()}/h</span>
                                        </td>
                                        {projectMonths.map(m => {
                                            const a = mAssignments.find(ass => ass.year === m.year && ass.month === m.month);
                                            return (
                                                <td key={`${m.year}-${m.month}`} className="px-4 py-4 text-center border-r">
                                                    {a ? (
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-black text-gray-900 border-b border-gray-100 pb-1">{a.manMonth.toFixed(1)} <span className="text-[10px] font-normal text-gray-400">MM</span></div>
                                                            <div className="text-[11px] text-indigo-600 font-medium">¥{(a.member.hourlyRate * HOURS_PER_MONTH * a.manMonth).toLocaleString()}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-200">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-4 text-center bg-indigo-50/50 font-bold text-indigo-900 text-sm">
                                            ¥{memberTotalCost.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t-4 border-gray-100">
                            <tr className="bg-gray-900 text-white">
                                <td className="sticky left-0 z-10 bg-gray-900 px-6 py-5 text-xs font-black uppercase tracking-widest border-r shadow-[4px_0_10px_rgba(255,255,255,0.05)]">
                                    月間原価合計（¥）
                                </td>
                                {projectMonths.map(m => {
                                    const monthAssignments = project.assignments.filter(a => a.year === m.year && a.month === m.month);
                                    const monthCost = monthAssignments.reduce((sum, a) => sum + (a.member.hourlyRate * HOURS_PER_MONTH * a.manMonth), 0);
                                    return (
                                        <td key={`${m.year}-${m.month}`} className="px-4 py-5 text-center border-r border-gray-800">
                                            <div className="text-sm font-black text-white">¥{monthCost.toLocaleString()}</div>
                                            <div className="text-[9px] text-gray-400 mt-1">
                                                {monthAssignments.reduce((sum, a) => sum + a.manMonth, 0).toFixed(1)} MM 合計
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-5 text-center bg-indigo-700">
                                    <div className="text-sm font-black">¥{totalProjectCost.toLocaleString()}</div>
                                    <div className="text-[9px] text-indigo-200 mt-1 uppercase">全期間総原価</div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
