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
    const future = new Date(now.getFullYear() + 1, now.getMonth(), 1);

    const [startYear, setStartYear] = useState(now.getFullYear());
    const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
    const [endYear, setEndYear] = useState(future.getFullYear());
    const [endMonth, setEndMonth] = useState(future.getMonth() + 1);
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

    const handleDeleteProjectAssignments = async (memberId: string, projectId: string) => {
        if (!confirm("この案件の表示範囲内のアサインをすべて削除しますか？")) return;

        const toDelete = assignments.filter(a => a.memberId === memberId && a.projectId === projectId);

        try {
            setLoading(true);
            await Promise.all(toDelete.map(a =>
                fetch(`/api/assignments/${a.id}`, { method: "DELETE" })
            ));
            fetchData();
        } catch (error) {
            console.error("Failed to delete assignments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (memberId?: string, projectId?: string, assignment?: Assignment | null) => {
        if (assignment) {
            setEditingAssignment(assignment);
        } else if (memberId && projectId) {
            setEditingAssignment({ memberId, projectId } as any);
        } else {
            setEditingAssignment(null);
        }
        setIsModalOpen(true);
    };

    const monthsRange: { year: number; month: number; key: string }[] = [];
    let curY = startYear;
    let curM = startMonth;
    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
        monthsRange.push({ year: curY, month: curM, key: `${curY}-${curM}` });
        curM++;
        if (curM > 12) {
            curM = 1;
            curY++;
        }
    }

    const displayedMembers = members.filter(m => selectedMemberIds.length === 0 || selectedMemberIds.includes(m.id));
    const groupedData = displayedMembers.map(member => {
        const memberAssignments = assignments.filter(a => a.memberId === member.id);
        const projectsInvolvedIds = Array.from(new Set(memberAssignments.map(a => a.projectId)));

        const projectRows = projectsInvolvedIds.map(pid => {
            const project = projects.find(p => p.id === pid);
            const projectAssignments = memberAssignments.filter(a => a.projectId === pid);
            return { project, assignments: projectAssignments };
        });

        return { member, projectRows };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">工数管理</h2>
                    <p className="text-sm text-gray-500">メンバーごとのアサイン状況を確認・編集します</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 shadow-lg shadow-indigo-100">
                    <Plus size={18} />
                    新規アサイン
                </Button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid gap-6">
                    <div className="flex flex-wrap items-end gap-6 pb-6 border-b border-gray-100">
                        <div className="flex items-end gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">開始年月</Label>
                                <div className="flex gap-2">
                                    <select
                                        className="h-10 rounded-xl border-gray-100 bg-gray-50 px-3 text-sm focus:bg-white focus:ring-indigo-500 transition-all cursor-pointer"
                                        value={startYear}
                                        onChange={(e) => setStartYear(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 11 }, (_, i) => now.getFullYear() - 2 + i).map(year => (
                                            <option key={year} value={year}>{year}年</option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-10 rounded-xl border-gray-100 bg-gray-50 px-3 text-sm focus:bg-white focus:ring-indigo-500 transition-all cursor-pointer"
                                        value={startMonth}
                                        onChange={(e) => setStartMonth(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}月</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center self-end pb-3 text-gray-300">〜</div>

                        <div className="flex items-end gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">終了年月</Label>
                                <div className="flex gap-2">
                                    <select
                                        className="h-10 rounded-xl border-gray-100 bg-gray-50 px-3 text-sm focus:bg-white focus:ring-indigo-500 transition-all cursor-pointer"
                                        value={endYear}
                                        onChange={(e) => setEndYear(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 11 }, (_, i) => now.getFullYear() - 2 + i).map(year => (
                                            <option key={year} value={year}>{year}年</option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-10 rounded-xl border-gray-100 bg-gray-50 px-3 text-sm focus:bg-white focus:ring-indigo-500 transition-all cursor-pointer"
                                        value={endMonth}
                                        onChange={(e) => setEndMonth(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}月</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="md:ml-auto space-y-1.5 min-w-[200px]">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">対象案件</Label>
                            <select
                                className="block h-10 w-full rounded-xl border-gray-100 bg-gray-50 px-4 text-sm focus:bg-white focus:ring-indigo-500 transition-all cursor-pointer"
                                value={filterProjectId}
                                onChange={(e) => setFilterProjectId(e.target.value)}
                            >
                                <option value="">すべての案件</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">表示メンバー（複数選択可）</Label>
                        <div className="flex flex-wrap gap-3 p-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                            {members.map((m) => (
                                <label key={m.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs font-bold ${selectedMemberIds.includes(m.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedMemberIds.includes(m.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedMemberIds([...selectedMemberIds, m.id]);
                                            } else {
                                                setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                                            }
                                        }}
                                    />
                                    <span>{m.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {loading && assignments.length === 0 ? (
                <div className="py-20 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent" />
                    <p className="mt-4 text-sm font-bold text-gray-500 uppercase tracking-widest">データを取得中...</p>
                </div>
            ) : groupedData.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl border border-gray-200">
                    <p className="text-gray-500 font-medium">表示可能なメンバー・案件がありません</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedData.map(({ member, projectRows }) => {
                        const totals = monthsRange.map(m => {
                            const val = assignments
                                .filter(a => a.memberId === member.id && a.year === m.year && a.month === m.month)
                                .reduce((sum, a) => sum + a.manMonth, 0);
                            return { ...m, total: val };
                        });

                        return (
                            <div key={member.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5">
                                <div className="bg-gray-50/80 px-6 py-4 flex items-center justify-between border-b">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-gray-900">{member.name}</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Capacity: {member.workCapacity.toFixed(1)}人月</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/30">
                                                <th className="sticky left-0 z-20 bg-gray-50 px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-r min-w-[200px] shadow-[4px_0_8px_rgba(0,0,0,0.02)]">案件 / プロジェクト</th>
                                                {monthsRange.map(m => (
                                                    <th key={m.key} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 border-r min-w-[100px]">
                                                        <span className="block text-[8px] opacity-60">{m.year}</span>
                                                        {m.month}月
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {projectRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={monthsRange.length + 1} className="px-6 py-10 text-center text-sm text-gray-400 font-medium">この期間のアサインはありません</td>
                                                </tr>
                                            ) : (
                                                projectRows.map(({ project, assignments: projectAss }) => (
                                                    <tr
                                                        key={project?.id}
                                                        className="group hover:bg-indigo-50/50 transition-colors cursor-pointer"
                                                        onClick={() => handleOpenModal(member.id, project?.id, projectAss[0])}
                                                    >
                                                        <td className="sticky left-0 z-10 bg-white group-hover:bg-indigo-50 px-6 py-4 border-r border-gray-100 shadow-[4px_0_8px_rgba(0,0,0,0.02)] transition-colors">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-black text-gray-900 truncate max-w-[150px]">{project?.name}</span>
                                                                    {project?.status === "PROSPECTIVE" && (
                                                                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[8px] font-black bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-600/20">
                                                                            見込み
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-400">{project?.type}</span>
                                                            </div>
                                                        </td>
                                                        {monthsRange.map(m => {
                                                            const a = projectAss.find(pa => pa.year === m.year && pa.month === m.month);
                                                            return (
                                                                <td key={m.key} className="px-2 py-2 text-center border-r border-gray-50">
                                                                    {a ? (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-sm font-black text-gray-900 leading-none mb-1">{a.manMonth.toFixed(1)}</span>
                                                                            {(() => {
                                                                                const percent = Math.round((a.manMonth / member.workCapacity) * 100);
                                                                                const isOver = percent > 100;
                                                                                const isExact = percent === 100;
                                                                                return (
                                                                                    <span className={`text-[9px] font-bold leading-none ${isOver ? 'text-red-500' : isExact ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                                                        {percent}%
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-200 font-black text-xs">-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-50/100 font-black border-t-2 border-gray-100">
                                                <td className="sticky left-0 z-10 bg-gray-50 px-6 py-4 border-r border-gray-100 text-xs text-gray-500 shadow-[4px_0_8px_rgba(0,0,0,0.02)] uppercase tracking-widest">合計稼働率</td>
                                                {totals.map(t => {
                                                    const rate = t.total / member.workCapacity;
                                                    return (
                                                        <td key={t.key} className={`px-2 py-4 text-center border-r border-gray-100 ${Math.round(rate * 100) > 100 ? 'bg-red-50/30' : Math.round(rate * 100) === 100 ? 'bg-emerald-50/30' : ''}`}>
                                                            <div className={`text-xs ${Math.round(rate * 100) > 100 ? 'text-red-600' : Math.round(rate * 100) === 100 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                                <span className="block text-[10px] font-black">{t.total.toFixed(1)}</span>
                                                                {Math.round(rate * 100)}%
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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
