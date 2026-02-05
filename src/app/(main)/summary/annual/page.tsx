"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Assignment {
    id: string;
    projectId: string;
    year: number;
    month: number;
    manMonth: number;
    project: { name: string; status?: "CONFIRMED" | "PROSPECTIVE" };
}

interface MemberSummary {
    id: string;
    name: string;
    workCapacity: number;
    assignments: Assignment[];
}

export default function FiscalYearSummaryPage() {
    const [fiscalYear, setFiscalYear] = useState(new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1);
    const [data, setData] = useState<{ members: MemberSummary[], months: { year: number, month: number }[] } | null>(null);
    const [includeProspective, setIncludeProspective] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/summary/fiscal-year?fiscalYear=${fiscalYear}`);
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error("Failed to fetch fiscal year summary", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fiscalYear]);

    const handleOnDragEnd = async (result: DropResult) => {
        if (!result.destination || !data) return;

        const members = Array.from(data.members);
        const [reorderedItem] = members.splice(result.source.index, 1);
        members.splice(result.destination.index, 0, reorderedItem);

        setData({ ...data, members });

        // Persist to backend (global member order)
        try {
            const memberIds = members.map(m => m.id);
            await fetch("/api/members", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberIds }),
            });
        } catch (error) {
            console.error("Failed to persist new order", error);
        }
    };

    if (loading && !data) return <div className="py-10 text-center">読み込み中...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{fiscalYear}年度 年間稼働計画</h2>
                    <p className="text-sm text-gray-500">（{fiscalYear}年10月 〜 {fiscalYear + 1}年9月）</p>
                </div>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                            checked={includeProspective}
                            onChange={(e) => setIncludeProspective(e.target.checked)}
                        />
                        <span className="text-sm font-bold text-amber-800">見込みを含む</span>
                    </label>

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
            </div>

            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <table className="min-w-full divide-y divide-gray-200 border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    メンバー
                                </th>
                                {data?.months.map((m) => (
                                    <th key={`${m.year}-${m.month}`} className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-r min-w-[80px]">
                                        <span className="block text-[10px] text-gray-400 font-normal">{m.year}</span>
                                        {m.month}月
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <Droppable droppableId="summary-members">
                            {(provided) => (
                                <tbody
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="divide-y divide-gray-200"
                                >
                                    {data?.members.map((member, index) => (
                                        <Draggable key={member.id} draggableId={member.id} index={index}>
                                            {(provided, snapshot) => (
                                                <tr
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`${snapshot.isDragging ? "bg-indigo-50 shadow-lg z-30" : "hover:bg-gray-50"} transition-colors`}
                                                >
                                                    <td
                                                        className={`sticky left-0 z-10 ${snapshot.isDragging ? "bg-indigo-50" : "bg-white"} px-4 py-4 text-sm font-bold text-gray-900 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div {...provided.dragHandleProps} className="cursor-grab text-gray-300 hover:text-gray-500">
                                                                <GripVertical size={14} />
                                                            </div>
                                                            <div>
                                                                <Link href={`/members/${member.id}`} className="hover:text-indigo-600 hover:underline">
                                                                    {member.name}
                                                                </Link>
                                                                <span className="block text-[10px] text-gray-400 font-normal font-sans">Cap: {member.workCapacity.toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {data.months.map((m) => {
                                                        const monthAssignments = member.assignments.filter(a =>
                                                            a.year === m.year && a.month === m.month &&
                                                            (includeProspective || a.project.status !== 'PROSPECTIVE')
                                                        );

                                                        // Check if this month has prospective projects (for styling)
                                                        const hasProspective = monthAssignments.some(a => a.project.status === 'PROSPECTIVE');

                                                        const total = monthAssignments.reduce((sum, a) => sum + a.manMonth, 0);
                                                        const rate = total / member.workCapacity;
                                                        const isOver = rate > 1.0;
                                                        const isEmpty = total === 0;

                                                        return (
                                                            <td key={`${m.year}-${m.month}`} className={`px-2 py-2 text-center border-r relative group ${isOver ? 'bg-red-50' : ''}`}>
                                                                <div className={`text-sm font-bold 
                                                                    ${isOver ? 'text-red-600' : isEmpty ? 'text-gray-300' : hasProspective ? 'text-amber-600' : 'text-gray-900'}`}>
                                                                    {total > 0 ? total.toFixed(1) : "-"}
                                                                </div>
                                                                {total > 0 && (
                                                                    <div className={`text-[9px] ${isOver ? 'text-red-500' : 'text-gray-500'}`}>
                                                                        {(rate * 100).toFixed(0)}%
                                                                    </div>
                                                                )}

                                                                {/* Tooltip for assignments */}
                                                                {monthAssignments.length > 0 && (
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-48 bg-gray-900 text-white p-2 rounded text-[10px] shadow-lg pointer-events-none">
                                                                        {monthAssignments.map(a => (
                                                                            <div key={a.id} className="flex justify-between border-b border-gray-700 py-1 last:border-0">
                                                                                <span className={`truncate mr-2 ${a.project.status === 'PROSPECTIVE' ? 'text-amber-300' : 'text-gray-300'}`}>
                                                                                    {a.project.status === 'PROSPECTIVE' && "★"} {a.project.name}
                                                                                </span>
                                                                                <span className="font-bold">{a.manMonth.toFixed(1)}</span>
                                                                            </div>
                                                                        ))}
                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </tbody>
                            )}
                        </Droppable>
                    </table>
                </DragDropContext>
            </div>

            <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                    <span>過負荷 (100%超)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-gray-300">-</span>
                    <span>アサインなし</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 italic">
                    ※ オレンジ数字: 見込み案件を含む / ★: 見込み案件
                </div>
            </div>
        </div>
    );
}
