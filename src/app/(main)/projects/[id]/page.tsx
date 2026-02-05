"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Edit, ArrowLeft, Plus, Calendar as CalendarIcon, User } from "lucide-react";
import AssignmentModal from "@/components/assignments/AssignmentModal";
import { Member, Project, Assignment } from "@/types";

export default function ProjectDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [project, setProject] = useState<Project & { assignments: (Assignment & { member: Member })[] } | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<any>(null);

    const fetchData = async () => {
        try {
            const [projectRes, membersRes] = await Promise.all([
                fetch(`/api/projects/${id}`),
                fetch("/api/members"),
            ]);
            const projectData = await projectRes.json();
            const membersData = await membersRes.json();
            setProject(projectData);
            setMembers(membersData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    if (loading) return <div className="py-10 text-center">読み込み中...</div>;
    if (!project) return <div className="py-10 text-center text-red-500">案件が見つかりません</div>;

    const formatDate = (dateStr: Date | string | null | undefined, type?: string) => {
        if (!dateStr) return type === "保守" ? "無期限" : "-";
        return new Date(dateStr).toLocaleDateString("ja-JP");
    };

    // Calculate months range for the project
    const getMonthsRange = () => {
        let start: Date;
        let end: Date;

        if (project.startDate) {
            start = new Date(project.startDate);
        } else if (project.assignments.length > 0) {
            const years = project.assignments.map(a => a.year);
            const months = project.assignments.map(a => a.month);
            start = new Date(Math.min(...years), Math.min(...months) - 1, 1);
        } else {
            start = new Date();
        }

        if (project.endDate) {
            end = new Date(project.endDate);
        } else {
            // If no end date (e.g. Maintenance), show up to 6 months after the last assignment OR 12 months from now
            const now = new Date();
            let lastAssignDate = now;
            if (project.assignments.length > 0) {
                const years = project.assignments.map(a => a.year);
                const months = project.assignments.map(a => a.month);
                lastAssignDate = new Date(Math.max(...years), Math.max(...months) - 1, 1);
            }
            end = new Date(Math.max(now.getTime(), lastAssignDate.getTime()));
            end.setMonth(end.getMonth() + 3); // Show 3 months buffer
        }

        const range = [];
        let curr = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1));
        const stop = new Date(Date.UTC(end.getFullYear(), end.getMonth(), 1));

        // Limit the range to a reasonable size if it's too long
        let count = 0;
        while (curr <= stop && count < 60) { // Max 5 years
            const y = curr.getUTCFullYear();
            const m = curr.getUTCMonth() + 1;
            range.push({ year: y, month: m, key: `${y}-${m}` });
            curr.setUTCMonth(curr.getUTCMonth() + 1);
            count++;
        }
        return range;
    };

    const monthsRange = getMonthsRange();

    // Group assignments by member
    const memberAssignmentsMap: { [memberId: string]: { [monthKey: string]: Assignment } } = {};
    const assignedMembers: Member[] = [];
    const memberIdSet = new Set<string>();

    project.assignments.forEach(a => {
        if (!memberAssignmentsMap[a.memberId]) {
            memberAssignmentsMap[a.memberId] = {};
            if (a.member && !memberIdSet.has(a.memberId)) {
                assignedMembers.push(a.member);
                memberIdSet.add(a.memberId);
            }
        }
        memberAssignmentsMap[a.memberId][`${a.year}-${a.month}`] = a;
    });

    const handleCellClick = (memberId: string, year: number, month: number, existingAssignment?: Assignment) => {
        setModalInitialData({
            id: existingAssignment?.id,
            memberId,
            projectId: project.id,
            year,
            month,
            manMonth: existingAssignment?.manMonth || 1.0,
        });
        setIsModalOpen(true);
    };

    const handleAddMemberClick = () => {
        setModalInitialData({
            projectId: project.id,
            year: monthsRange[0]?.year || new Date().getFullYear(),
            month: monthsRange[0]?.month || new Date().getMonth() + 1,
            manMonth: 1.0,
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/projects">
                        <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-full">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{project.name}</h2>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 font-medium">
                            <CalendarIcon size={14} />
                            <span>{formatDate(project.startDate, project.type)} 〜 {formatDate(project.endDate, project.type)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleAddMemberClick} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 font-bold">
                        <Plus size={18} />
                        メンバーをアサイン
                    </Button>
                    <Link href={`/projects/${id}/edit`}>
                        <Button variant="outline" className="flex items-center gap-2 font-bold">
                            <Edit size={18} />
                            案件情報の編集
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-8">
                {/* Project Info Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-2xl border bg-white p-6 shadow-sm ring-1 ring-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">予算</p>
                        <p className="text-2xl font-black text-gray-900">
                            {project.budget ? `¥${project.budget.toLocaleString()}` : "未設定"}
                        </p>
                    </div>
                    <div className="md:col-span-2 rounded-2xl border bg-white p-6 shadow-sm ring-1 ring-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">説明 / 技術スタック</p>
                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{project.description || "説明はありません"}</p>
                    </div>
                </div>

                {/* Calendar View for Assignments */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden ring-1 ring-black/5">
                    <div className="bg-gray-50 px-6 py-4 border-b">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <User size={20} className="text-indigo-600" />
                            アサイン状況（カレンダー）
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="sticky left-0 z-20 bg-gray-50 px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                        メンバー
                                    </th>
                                    {monthsRange.map((m) => (
                                        <th key={m.key} className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-r min-w-[100px]">
                                            <span className="block text-[10px] text-gray-400 font-normal">{m.year}</span>
                                            {m.month}月
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {assignedMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={monthsRange.length + 1} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center">
                                                <User size={40} className="text-gray-200 mb-2" />
                                                <p className="text-gray-400 font-medium">メンバーがアサインされていません</p>
                                                <Button variant="outline" className="mt-2 text-indigo-600 font-bold" onClick={handleAddMemberClick}>
                                                    最初のアサインを追加
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    assignedMembers.map((member) => (
                                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="sticky left-0 z-10 bg-white px-6 py-5 text-sm font-bold text-gray-900 border-r shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                                <div className="flex flex-col">
                                                    <span>{member.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-normal">{member.role}</span>
                                                </div>
                                            </td>
                                            {monthsRange.map((m) => {
                                                const assignment = memberAssignmentsMap[member.id]?.[m.key];
                                                return (
                                                    <td
                                                        key={m.key}
                                                        onClick={() => handleCellClick(member.id, m.year, m.month, assignment)}
                                                        className={`px-2 py-4 text-center border-r cursor-pointer transition-all hover:bg-indigo-50/50 ${assignment ? 'bg-indigo-50/20' : ''}`}
                                                    >
                                                        {assignment ? (
                                                            <div className="flex flex-col items-center justify-center">
                                                                <span className="text-sm font-black text-indigo-700">
                                                                    {assignment.manMonth.toFixed(1)}
                                                                </span>
                                                                <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-tighter mt-0.5">人月</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-200 font-light">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <AssignmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchData();
                    }}
                    members={members}
                    projects={[project]}
                    initialData={modalInitialData}
                />
            )}
        </div>
    );
}
