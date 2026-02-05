"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui";
import { GripVertical } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MemberSummary {
    id: string;
    name: string;
    role: string;
    workCapacity: number;
    assignments: {
        id: string;
        project: { name: string; status?: "CONFIRMED" | "PROSPECTIVE" };
        manMonth: number;
    }[];
}

interface SortableRowProps {
    m: MemberSummary;
}

function SortableMemberRow({ m }: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: m.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    const totalManMonth = m.assignments.reduce((sum, a) => sum + a.manMonth, 0);
    const confirmedTotal = m.assignments
        .filter(a => a.project.status !== 'PROSPECTIVE')
        .reduce((sum, a) => sum + a.manMonth, 0);
    const prospectiveTotal = totalManMonth - confirmedTotal;

    const rate = totalManMonth / m.workCapacity;
    const isOver = rate > 1.0;

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`group hover:bg-indigo-50/30 transition-colors ${isDragging ? "bg-white shadow-2xl relative z-50 ring-2 ring-indigo-500/50" : ""}`}
        >
            <td className="px-6 py-4">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab text-gray-300 hover:text-gray-600 transition-colors p-1"
                >
                    <GripVertical size={18} />
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col">
                    <Link href={`/members/${m.id}`} className="text-sm font-black text-gray-900 hover:text-indigo-600 transition-colors">
                        {m.name}
                    </Link>
                    <span className="text-[10px] font-bold text-gray-400 leading-none mt-1 uppercase tracking-wider">{m.role}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1.5 max-w-md">
                    {m.assignments.length === 0 ? (
                        <span className="text-xs text-gray-300 font-medium">アサインなし</span>
                    ) : (
                        m.assignments.map((a) => (
                            <div
                                key={a.id}
                                className={`inline-flex items-center rounded-lg border px-2 py-1 shadow-sm group/item transition-all
                                    ${a.project.status === 'PROSPECTIVE'
                                        ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                                        : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}
                            >
                                <span className={`text-[10px] font-bold truncate max-w-[120px] 
                                    ${a.project.status === 'PROSPECTIVE' ? 'text-amber-700' : 'text-gray-600'}`}>
                                    {a.project.name}
                                </span>
                                <span className={`ml-1.5 text-[10px] font-black rounded px-1 min-w-[24px] text-center
                                    ${a.project.status === 'PROSPECTIVE' ? 'text-amber-600 bg-white/50' : 'text-indigo-600 bg-white'}`}>
                                    {a.manMonth.toFixed(1)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <p className="text-sm font-black text-gray-900">
                    {totalManMonth.toFixed(1)} <span className="text-[10px] font-normal text-gray-400">/ {m.workCapacity.toFixed(1)}</span>
                </p>
                {prospectiveTotal > 0 && (
                    <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                        (実: {confirmedTotal.toFixed(1)} + 予: {prospectiveTotal.toFixed(1)})
                    </p>
                )}
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                        {isOver && <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-500" />}
                        <span className={`text-base font-black ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
                            {(rate * 100).toFixed(0)}%
                        </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(rate * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </td>
        </tr>
    );
}

export default function MemberSummaryPage() {
    const [summaries, setSummaries] = useState<MemberSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/summary/members?year=${year}&month=${month}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setSummaries(data);
            }
        } catch (error) {
            console.error("Failed to fetch member summary", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [year, month]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSummaries((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Persist global order
                const memberIds = newItems.map(m => m.id);
                fetch("/api/members", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ memberIds }),
                }).catch(err => console.error("Failed to persist order", err));

                return newItems;
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">表示年月</Label>
                    <div className="flex items-center gap-2 h-10 bg-gray-50 rounded-xl px-2 border border-gray-100">
                        <Input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="w-20 h-7 border-none bg-transparent text-sm font-black focus:ring-0"
                        />
                        <span className="text-gray-300">/</span>
                        <select
                            className="w-16 h-7 border-none bg-transparent text-sm font-black focus:ring-0 cursor-pointer"
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}月</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden ring-1 ring-black/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="w-10 px-6 py-4"></th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">メンバー</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">アサイン状況</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">合計工数 (人月)</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">稼働率</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em]" />
                                            <p className="mt-4 text-sm font-bold text-gray-500">読み込み中...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <SortableContext
                                        items={summaries.map(s => s.id)}
                                        strategy={rectSortingStrategy}
                                    >
                                        {summaries.map((m) => (
                                            <SortableMemberRow key={m.id} m={m} />
                                        ))}
                                    </SortableContext>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DndContext>
        </div>
    );
}
