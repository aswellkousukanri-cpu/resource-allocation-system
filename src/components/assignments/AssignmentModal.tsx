"use client";

import { useState, useEffect } from "react";
import { Button, Input, Label } from "@/components/ui";
import { Member, Project, Assignment } from "@/types";
import { Plus, Trash2, Calendar } from "lucide-react";

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Partial<Assignment> | null;
    members: Member[];
    projects: Project[];
}

type Mode = "single" | "bulk" | "schedule";

export default function AssignmentModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
    members,
    projects,
}: AssignmentModalProps) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<Mode>("schedule");
    const [formData, setFormData] = useState({
        memberId: initialData?.memberId || "",
        projectId: initialData?.projectId || "",
        year: initialData?.year || new Date().getFullYear(),
        month: initialData?.month || new Date().getMonth() + 1,
        manMonth: initialData?.manMonth || 1.0,
        startDate: "",
        endDate: "",
    });
    const [confirmDelete, setConfirmDelete] = useState(false);

    // For schedule mode
    const [scheduleRows, setScheduleRows] = useState<{ memberId: string, values: { [key: string]: string } }[]>([
        { memberId: "", values: {} }
    ]);
    const [monthsRange, setMonthsRange] = useState<{ year: number, month: number, label: string, key: string }[]>([]);

    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({
                ...prev,
                memberId: initialData.memberId || prev.memberId,
                projectId: initialData.projectId || prev.projectId,
                year: initialData.year || prev.year,
                month: initialData.month || prev.month,
                manMonth: initialData.manMonth || prev.manMonth,
            }));

            const project = projects.find(p => p.id === initialData.projectId);
            if (project) {
                const sDate = project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "";
                const eDate = project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "";
                setFormData(prev => ({ ...prev, startDate: sDate, endDate: eDate }));
                if (sDate) calculateMonthsRange(sDate, eDate, project);
            }

            // Pre-populate scheduleRows if editing
            if (initialData.memberId && initialData.projectId) {
                const targetProject = projects.find(p => p.id === initialData.projectId) as any;
                const memberAssignments = targetProject?.assignments?.filter((a: any) => a.memberId === initialData.memberId) || [];

                const values: { [key: string]: string } = {};
                // First, fill existing assignments from the project data
                memberAssignments.forEach((a: any) => {
                    values[`${a.year}-${a.month}`] = String(a.manMonth);
                });

                // Ensure the specifically clicked cell's data is also there (though it should be in memberAssignments)
                if (initialData.year && initialData.month) {
                    const key = `${initialData.year}-${initialData.month}`;
                    if (!values[key]) {
                        values[key] = String(initialData.manMonth || "");
                    }
                }

                setScheduleRows([{ memberId: initialData.memberId, values }]);
            }
        }
    }, [initialData, projects]);

    const calculateMonthsRange = (start: string, end: string | null | undefined, project?: Project) => {
        const s = new Date(start);
        if (isNaN(s.getTime())) return;

        let e: Date;
        if (end) {
            e = new Date(end);
        } else if (project?.type === "保守") {
            // For maintenance with no end date, show 12 months from now or start date
            const now = new Date();
            e = new Date(Math.max(s.getTime(), now.getTime()));
            e.setMonth(e.getMonth() + 11); // Show 1 year (12 months total including current)
        } else {
            setMonthsRange([]);
            return;
        }

        const range = [];
        let curr = new Date(Date.UTC(s.getFullYear(), s.getMonth(), 1));
        const stop = new Date(Date.UTC(e.getFullYear(), e.getMonth(), 1));

        let count = 0;
        while (curr <= stop && count < 24) { // Max 2 years for bulk edit
            const year = curr.getUTCFullYear();
            const month = curr.getUTCMonth() + 1;
            range.push({
                year,
                month,
                label: `${month}月`,
                key: `${year}-${month}`
            });
            curr.setUTCMonth(curr.getUTCMonth() + 1);
            count++;
        }
        setMonthsRange(range);
    };

    const handleProjectChange = (pid: string) => {
        const project = projects.find(p => p.id === pid);
        const sDate = project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "";
        const eDate = project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "";

        setFormData({
            ...formData,
            projectId: pid,
            startDate: sDate,
            endDate: eDate,
        });

        if (sDate) {
            calculateMonthsRange(sDate, eDate, project);
        } else {
            setMonthsRange([]);
        }
    };

    const addScheduleRow = () => {
        setScheduleRows([...scheduleRows, { memberId: "", values: {} }]);
    };

    const removeScheduleRow = (index: number) => {
        setScheduleRows(scheduleRows.filter((_, i) => i !== index));
    };

    const updateScheduleRow = (index: number, field: string, value: string) => {
        const newRows = [...scheduleRows];
        if (field === "memberId") {
            newRows[index].memberId = value;
        }
        setScheduleRows(newRows);
    };

    const updateScheduleValue = (rowIndex: number, monthKey: string, value: string) => {
        const newRows = [...scheduleRows];
        newRows[rowIndex].values[monthKey] = value;
        setScheduleRows(newRows);
    };

    const handleDelete = async () => {
        if (!formData.memberId || !formData.projectId) return;
        setLoading(true);

        try {
            // Find all assignments for this member and project that fall within the monthsRange
            const targetProject = projects.find(p => p.id === formData.projectId) as any;
            const assignmentsInProject = targetProject?.assignments || [];
            const toDelete = assignmentsInProject.filter((a: any) =>
                a.memberId === formData.memberId &&
                monthsRange.some(m => m.year === a.year && m.month === a.month)
            );

            if (toDelete.length === 0) {
                alert("削除対象のアサインはありません");
                setLoading(false);
                setConfirmDelete(false);
                return;
            }

            await Promise.all(toDelete.map((a: any) =>
                fetch(`/api/assignments/${a.id}`, { method: "DELETE" })
            ));

            onSuccess();
        } catch (error) {
            console.error("Failed to delete assignments", error);
            alert("削除に失敗しました");
        } finally {
            setLoading(false);
            setConfirmDelete(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let res;
            if (mode === "schedule") {
                // Bulk Schedule Submit
                const rows = scheduleRows
                    .filter(r => r.memberId)
                    .map(r => ({
                        memberId: r.memberId,
                        values: monthsRange.map(m => ({
                            year: m.year,
                            month: m.month,
                            manMonth: parseFloat(r.values[m.key] || "0")
                        })).filter(v => v.manMonth > 0)
                    }))
                    .filter(r => r.values.length > 0);

                if (rows.length === 0) {
                    alert("アサインするメンバーと工数を入力してください");
                    setLoading(false);
                    return;
                }

                res = await fetch("/api/assignments/bulk-schedule", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: formData.projectId, rows }),
                });
            } else {
                // Single or Bulk Submit
                res = await fetch("/api/assignments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...formData,
                        mode,
                    }),
                });
            }

            if (res.ok) {
                onSuccess();
            } else {
                const err = await res.json();
                alert(err.error || "保存に失敗しました");
            }
        } catch (error) {
            alert("エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isEditing = !!(initialData as any)?.id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full ${mode === 'schedule' ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-8 shadow-2xl ring-1 ring-black/5`}>
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">
                        {isEditing ? "アサイン情報の編集" : "新規アサイン"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="projectId" className="text-sm font-bold text-gray-700">案件 *</Label>
                            <select
                                id="projectId"
                                required
                                disabled={isEditing}
                                className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 shadow-sm transition-focus focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                                value={formData.projectId}
                                onChange={(e) => handleProjectChange(e.target.value)}
                            >
                                <option value="">案件を選択してください</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {formData.startDate && formData.endDate && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                    <Calendar size={14} />
                                    期間: {formData.startDate} 〜 {formData.endDate}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">メンバーごとの工数配分</h4>
                            <Button type="button" size="sm" variant="outline" onClick={addScheduleRow} className="text-xs h-8 gap-1">
                                <Plus size={14} /> メンバーを追加
                            </Button>
                        </div>

                        {monthsRange.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/30">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="sticky left-0 z-10 bg-gray-100 px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">メンバー</th>
                                            {monthsRange.map(m => (
                                                <th key={m.key} className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{m.label}</th>
                                            ))}
                                            <th className="px-4 py-3 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {scheduleRows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                                                    <select
                                                        required
                                                        className="block w-48 rounded-lg border-gray-300 bg-gray-50 py-1.5 text-xs focus:ring-indigo-500"
                                                        value={row.memberId}
                                                        onChange={(e) => updateScheduleRow(idx, "memberId", e.target.value)}
                                                    >
                                                        <option value="">選択...</option>
                                                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                    </select>
                                                </td>
                                                {monthsRange.map(m => (
                                                    <td key={m.key} className="px-2 py-3">
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            max="1"
                                                            placeholder="0.0"
                                                            className="w-20 text-center text-xs h-8 border-gray-200 focus:border-indigo-500"
                                                            value={row.values[m.key] || ""}
                                                            onChange={(e) => updateScheduleValue(idx, m.key, e.target.value)}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeScheduleRow(idx)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50/30">
                                <Calendar className="mb-3 text-gray-300" size={40} />
                                <p className="text-sm font-medium text-gray-500">
                                    案件を選択すると、その期間に応じた<br />入力用のカレンダーが表示されます
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-10 flex justify-end items-center gap-4 border-t pt-8">
                        {isEditing && (
                            <div className="mr-auto flex items-center gap-2">
                                {confirmDelete ? (
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={handleDelete}
                                        className="bg-red-600 font-bold"
                                    >
                                        本当に削除しますか？ (再度クリック)
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setConfirmDelete(true)}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        <Trash2 size={14} className="mr-1.5" /> 表示期間内のアサインを削除
                                    </Button>
                                )}
                                {confirmDelete && (
                                    <button
                                        type="button"
                                        className="text-[10px] font-bold text-gray-400 hover:text-gray-600 underline"
                                        onClick={() => setConfirmDelete(false)}
                                    >
                                        キャンセル
                                    </button>
                                )}
                            </div>
                        )}
                        <Button
                            variant="outline"
                            type="button"
                            onClick={onClose}
                            className="bg-white px-8 py-2.5 font-bold text-gray-700 hover:bg-gray-50"
                        >
                            閉じる
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || (mode === 'schedule' && monthsRange.length === 0)}
                            className="bg-indigo-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? "保存中..." : mode === 'schedule' ? "一括アサインする" : "保存する"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
