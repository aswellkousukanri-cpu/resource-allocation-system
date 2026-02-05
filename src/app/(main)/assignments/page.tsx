"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { Plus, Edit, Trash2, Filter } from "lucide-react";
import AssignmentModal from "@/components/assignments/AssignmentModal";

import { Member, Project, Assignment } from "@/types";

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

    // Filters
    const now = new Date();
    const [startYear, setStartYear] = useState(now.getFullYear());
    const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
    const [endYear, setEndYear] = useState(now.getFullYear());
    const [endMonth, setEndMonth] = useState(now.getMonth() + 1);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [filterProjectId, setFilterProjectId] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                startYear: startYear.toString(),
                startMonth: startMonth.toString(),
                endYear: endYear.toString(),
                endMonth: endMonth.toString(),
                projectId: filterProjectId,
            });
            selectedMemberIds.forEach(id => params.append("memberIds", id));

            const [assRes, memRes, proRes] = await Promise.all([
                fetch(`/api/assignments?${params.toString()}`),
                fetch("/api/members"),
                fetch("/api/projects"),
            ]);
            const [assData, memData, proData] = await Promise.all([
                assRes.json(),
                memRes.json(),
                proRes.json(),
            ]);
            setAssignments(assData);
            setMembers(memData);
            setProjects(proData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startYear, startMonth, endYear, endMonth, selectedMemberIds, filterProjectId]);

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？")) return;
        try {
            const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
            if (res.ok) fetchData();
        } catch (error) {
            console.error("Failed to delete assignment", error);
        }
    };

    const handleOpenModal = (assignment: Assignment | null = null) => {
        setEditingAssignment(assignment);
        setIsModalOpen(true);
    };

    // Calculate work rates per member and per month
    const workRateMap = assignments.reduce((acc, a) => {
        const key = `${a.memberId}-${a.year}-${a.month}`;
        if (!acc[key]) {
            acc[key] = {
                total: 0,
                capacity: a.member?.workCapacity || 1.0,
            };
        }
        acc[key].total += a.manMonth;
        return acc;
    }, {} as Record<string, { total: number; capacity: number }>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">工数管理</h2>
                <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                    <Plus size={18} />
                    新規アサイン
                </Button>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex items-end gap-2">
                            <div className="w-28">
                                <Label>開始年</Label>
                                <select
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    value={startYear}
                                    onChange={(e) => setStartYear(Number(e.target.value))}
                                >
                                    {Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i).map(year => (
                                        <option key={year} value={year}>{year}年</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <Label>開始月</Label>
                                <select
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    value={startMonth}
                                    onChange={(e) => setStartMonth(Number(e.target.value))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}月</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center self-end pb-2">
                            <span className="text-gray-500">〜</span>
                        </div>

                        <div className="flex items-end gap-2">
                            <div className="w-28">
                                <Label>終了年</Label>
                                <select
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    value={endYear}
                                    onChange={(e) => setEndYear(Number(e.target.value))}
                                >
                                    {Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i).map(year => (
                                        <option key={year} value={year}>{year}年</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <Label>終了月</Label>
                                <select
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    value={endMonth}
                                    onChange={(e) => setEndMonth(Number(e.target.value))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}月</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="w-48 ml-auto">
                            <Label>案件</Label>
                            <select
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                value={filterProjectId}
                                onChange={(e) => setFilterProjectId(e.target.value)}
                            >
                                <option value="">すべて</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">メンバー</Label>
                        <div className="flex flex-wrap gap-4 rounded-md border border-gray-200 p-3 bg-gray-50">
                            {members.map((m) => (
                                <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={selectedMemberIds.includes(m.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedMemberIds([...selectedMemberIds, m.id]);
                                            } else {
                                                setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                                            }
                                        }}
                                    />
                                    <span className="text-sm">{m.name}</span>
                                </label>
                            ))}
                            {members.length === 0 && <span className="text-sm text-gray-500">メンバーがいません</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">メンバー</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">案件</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">年月</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">人月</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">稼働率(個人合計)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                            <tr><td colSpan={6} className="py-10 text-center">読み込み中...</td></tr>
                        ) : assignments.length === 0 ? (
                            <tr><td colSpan={6} className="py-10 text-center">データがありません</td></tr>
                        ) : (
                            assignments.map((a) => {
                                const workKey = `${a.memberId}-${a.year}-${a.month}`;
                                const work = workRateMap[workKey];
                                const rate = work ? work.total / work.capacity : 0;
                                const isOver = rate > 1.0;
                                return (
                                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.member?.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{a.project?.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{a.year}年{a.month}月</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-bold">{a.manMonth.toFixed(1)}</td>
                                        <td className={`px-6 py-4 text-sm font-bold ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
                                            {work ? (
                                                <>
                                                    {(rate * 100).toFixed(1)}% ({work.total.toFixed(1)} / {work.capacity.toFixed(1)})
                                                    {isOver && <span className="ml-2 text-xs font-normal">⚠️ 過負荷</span>}
                                                </>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(a)}>
                                                    <Edit size={16} />
                                                </Button>
                                                <Button variant="danger" size="sm" onClick={() => handleDelete(a.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <AssignmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { setIsModalOpen(false); fetchData(); }}
                    initialData={editingAssignment}
                    members={members}
                    projects={projects}
                />
            )}
        </div>
    );
}
