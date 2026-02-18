"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Edit, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

interface Member {
    id: string;
    name: string;
    role: string;
    workCapacity: number;
}

interface Project {
    id: string;
    name: string;
}

interface Assignment {
    id: string;
    projectId: string;
    project: Project;
    year: number;
    month: number;
    manMonth: number;
}

export default function MemberDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [member, setMember] = useState<Member | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    // 9月末決算なので、10月始まり
    const [fiscalYear, setFiscalYear] = useState(new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1);

    const fetchMemberData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/members/${id}`);
            const data = await res.json();
            setMember(data);

            const assRes = await fetch(`/api/assignments?memberId=${id}`);
            const assData = await assRes.json();
            setAssignments(assData);
        } catch (error) {
            console.error("Failed to fetch member data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchMemberData();
    }, [id]);

    if (loading && !member) return <div className="py-10 text-center">読み込み中...</div>;
    if (!member) return <div className="py-10 text-center text-red-500">メンバーが見つかりません</div>;

    // 生成12ヶ月分のラベル
    const months: { year: number, month: number }[] = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(fiscalYear, 9 + i, 1);
        months.push({ year: date.getFullYear(), month: date.getMonth() + 1 });
    }

    // 案件ごとにグルーピング
    const projectIds = Array.from(new Set(assignments.map(a => a.projectId)));
    const projectSchedules = projectIds.map(pid => {
        const projectName = assignments.find(a => a.projectId === pid)?.project?.name || "未知の案件";
        const monthlyValues = months.map(m => {
            const a = assignments.find(ass => ass.projectId === pid && ass.year === m.year && ass.month === m.month);
            return a ? a.manMonth : 0;
        });
        return { name: projectName, values: monthlyValues };
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/summary/members">
                        <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-full">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
                        <p className="text-sm text-gray-500">{member.role} / 稼働可能: {member.workCapacity.toFixed(1)}人月</p>
                    </div>
                </div>
                <Link href={`/members/${id}/edit`}>
                    <Button className="flex items-center gap-2">
                        <Edit size={18} />
                        編集
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{fiscalYear}年度 案件別アサイン状況</h3>
                        <p className="text-sm text-gray-500">{fiscalYear}年10月 〜 {fiscalYear + 1}年9月</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setFiscalYear(v => v - 1)}>
                            <ChevronLeft size={16} />
                        </Button>
                        <span className="text-lg font-bold px-4">{fiscalYear}年度</span>
                        <Button variant="outline" size="sm" onClick={() => setFiscalYear(v => v + 1)}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-60">案件名</th>
                                {months.map(m => (
                                    <th key={`${m.year}-${m.month}`} className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-r min-w-[80px]">
                                        <span className="block text-[10px] text-gray-400 font-normal">{m.year}</span>
                                        {m.month}月
                                    </th>
                                ))}
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-indigo-50/30">合計</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projectSchedules.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="px-6 py-10 text-center text-gray-500">この年度のアサインデータはありません</td>
                                </tr>
                            ) : (
                                projectSchedules.map((ps, idx) => {
                                    const projectTotal = ps.values.reduce((sum, v) => sum + v, 0);
                                    if (projectTotal === 0) return null; // 非表示（年度内データなし）

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                            <td className="sticky left-0 bg-white px-6 py-4 text-sm font-medium text-gray-900 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{ps.name}</td>
                                            {ps.values.map((val, midx) => (
                                                <td key={midx} className="px-3 py-4 text-center text-sm border-r">
                                                    <span className={val > 0 ? "font-bold text-gray-900" : "text-gray-300"}>
                                                        {val > 0 ? val.toFixed(1) : "-"}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="px-6 py-4 text-center text-sm font-bold bg-indigo-50/30">{projectTotal.toFixed(1)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td className="sticky left-0 bg-gray-50 px-6 py-4 text-sm text-gray-900 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">合計稼働率 (%)</td>
                                {months.map((m, midx) => {
                                    const total = projectSchedules.reduce((sum, ps) => sum + ps.values[midx], 0);
                                    const rate = total / member.workCapacity;
                                    const percent = Math.round(rate * 100);
                                    const isOver = percent > 100;
                                    const isExact = percent === 100;

                                    return (
                                        <td key={midx} className={`px-3 py-4 text-center border-r ${isOver ? 'bg-red-50' : isExact ? 'bg-emerald-50' : ''}`}>
                                            <div className={`text-sm font-bold ${isOver ? 'text-red-600' : isExact ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                {percent}%
                                            </div>
                                            <div className={`text-[10px] ${isOver ? 'text-red-400' : isExact ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                {total.toFixed(1)} / {member.workCapacity.toFixed(1)}
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="bg-gray-100"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
