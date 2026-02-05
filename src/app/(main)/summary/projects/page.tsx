"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ChevronRight,
    AlertCircle,
    Search,
    Filter,
    GripVertical
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
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
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ProjectSummary {
    id: string;
    name: string;
    type: string;
    status: "CONFIRMED" | "PROSPECTIVE";
    budget: number | null;
    startDate: string | null;
    endDate: string | null;
    monthlyBudgets?: {
        year: number;
        month: number;
        amount: number;
    }[];
    assignments: {
        id: string;
        member: { name: string; hourlyRate: number };
        year: number;
        month: number;
        manMonth: number;
    }[];
}

interface SortableProjectCardProps {
    p: ProjectSummary;
    formatDate: (dateStr: string | null) => string;
}

const HOURS_PER_MONTH = 160;

function SortableProjectCard({ p, formatDate }: SortableProjectCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: p.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    const getCostAndBudget = () => {
        // "その他" logic: Budget = 0, Cost = 0
        if (p.type === "その他") {
            return { budget: 0, cost: 0 };
        }

        // Standard cost calculation
        let cost = p.assignments.reduce((sum, a) => sum + (a.member.hourlyRate * HOURS_PER_MONTH * a.manMonth), 0);

        // "管理" logic: Value Budget as 0 (not relevant), but track cost? Or just show Cost?
        // Requirement: "Management: Budget setting not needed, calculate only used man-hours (cost)"
        if (p.type === "管理") {
            return { budget: 0, cost };
        }

        // "保守" logic: Budget = Monthly Budgets sum
        if (p.type === "保守") {
            // Requirement: "Budget calculation: Difference between actual assigned person's unit price and budget"
            // We need to calculate Budget specifically for the assigned months if we want apple-to-apple comparison?
            // OR: Sum up all MonthlyBudgets for keys that exist.

            // Collect all relevant months
            const relevantMonths = new Set<string>();

            // 1. Add months from duration range
            if (p.startDate && p.endDate) {
                const s = new Date(p.startDate);
                const e = new Date(p.endDate);
                let cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
                const stop = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1));
                let safety = 0;
                while (cur <= stop && safety < 120) {
                    relevantMonths.add(`${cur.getUTCFullYear()}-${cur.getUTCMonth() + 1}`);
                    cur.setUTCMonth(cur.getUTCMonth() + 1);
                    safety++;
                }
            }

            // 2. Add months with assignments (flexible)
            p.assignments.forEach(a => relevantMonths.add(`${a.year}-${a.month}`));

            // 3. Add months with explicit budgets
            p.monthlyBudgets?.forEach(mb => relevantMonths.add(`${mb.year}-${mb.month}`));

            let totalBudget = 0;

            Array.from(relevantMonths).forEach(key => {
                const [y, m] = key.split("-").map(Number);
                const mb = p.monthlyBudgets?.find(b => b.year === y && b.month === m);

                if (mb) {
                    totalBudget += mb.amount;
                } else if (p.budget) {
                    // Since relevantMonths already includes the duration range and 
                    // months with assignments, we can simply apply the base budget 
                    // to any month in the set that doesn't have an override.
                    totalBudget += p.budget;
                }
            });

            return { budget: totalBudget, cost };
        }

        // Default "開発" logic
        return { budget: p.budget || 0, cost };
    };

    const { budget, cost: totalCost } = getCostAndBudget();

    // Profit Logic
    // Management: Profit doesn't make sense? treated as Cost center.
    // Other: 0/0.
    // Maintenance/Development: Budget - Cost.

    const profit = (p.type === "その他" || p.type === "管理") ? 0 : (budget - totalCost);
    // Is Deficit? Only for Dev/Maint
    const isDeficit = (p.type !== "その他" && p.type !== "管理") && profit < 0;

    const progress = (budget > 0) ? Math.min((totalCost / budget) * 100, 100) : 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-all 
                ${p.status === 'PROSPECTIVE' ? 'border-amber-200 hover:border-amber-400 bg-amber-50/10' : 'border-gray-200 hover:border-indigo-300'} 
                ${isDragging ? "shadow-2xl ring-2 ring-indigo-500/50 z-50" : ""}`}
        >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-grow">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab text-gray-300 hover:text-gray-600 transition-colors p-1"
                    >
                        <GripVertical size={20} />
                    </div>
                    <div className="flex-grow">
                        <Link href={`/summary/projects/${p.id}`} className="block">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 group-hover:underline decoration-indigo-300 underline-offset-4 transition-all">
                                    {p.name}
                                </h3>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${p.type === "開発" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                    p.type === "保守" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                        p.type === "管理" ? "bg-purple-50 text-purple-600 border-purple-100" :
                                            "bg-gray-50 text-gray-600 border-gray-100"
                                    }`}>
                                    {p.type}
                                </span>
                                {p.status === "PROSPECTIVE" && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100 uppercase">
                                        見込み
                                    </span>
                                )}
                                {isDeficit && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100 uppercase animate-pulse">
                                        <AlertCircle size={10} /> 予算超過
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                {formatDate(p.startDate)} 〜 {formatDate(p.endDate)}
                            </p>
                            {/* 簡易プログレスバー */}
                            <div className="w-full max-w-md bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-700 ${isDeficit ? 'bg-red-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-right min-w-[300px]">
                    <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">総予算</p>
                        <p className="text-sm font-black text-gray-900">
                            {(p.type === "管理" || p.type === "その他")
                                ? <span className="text-gray-300 font-normal italic">-</span>
                                : (budget !== null ? `¥${budget.toLocaleString()}` : <span className="text-gray-300 font-normal italic">未設定</span>)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">予測原価</p>
                        <p className="text-sm font-black text-gray-900">
                            {p.type === "その他" ? "-" : `¥${totalCost.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="md:col-span-1">
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${profit < 0 ? 'text-red-400' : profit > 0 ? 'text-green-400' : 'text-gray-400'}`}>予測粗利</p>
                        <p className={`text-sm font-black ${profit < 0 ? 'text-red-600' : profit > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            {(p.type === "その他" || p.type === "管理")
                                ? "-"
                                : `${profit > 0 ? '+' : profit < 0 ? '-' : ''}¥${Math.abs(profit).toLocaleString()}`}
                        </p>
                    </div>
                </div>

                <Link href={`/summary/projects/${p.id}`} className="flex items-center justify-center bg-gray-50 group-hover:bg-indigo-50 rounded-lg p-2 transition-colors">
                    <ChevronRight className="text-gray-400 group-hover:text-indigo-600" size={20} />
                </Link>
            </div>
        </div>
    );
}

export default function ProjectSummaryListPage() {
    const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [filters, setFilters] = useState({
        search: "",
        type: "",
        status: "",
        minBudget: "",
        maxBudget: "",
        startDate: "",
        endDate: "",
        includeEnded: false,
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append("search", filters.search);
            if (filters.type) params.append("type", filters.type);
            if (filters.status) params.append("status", filters.status);
            if (filters.minBudget) params.append("minBudget", filters.minBudget);
            if (filters.maxBudget) params.append("maxBudget", filters.maxBudget);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);
            if (filters.includeEnded) params.append("includeEnded", "true");

            const res = await fetch(`/api/summary/projects?${params.toString()}`);
            const data = await res.json();
            setSummaries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch project summary", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSummary();
        }, 300);
        return () => clearTimeout(timer);
    }, [filters]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSummaries((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Persist order
                const projectIds = newItems.map(p => p.id);
                fetch("/api/projects", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectIds }),
                }).catch(err => console.error("Failed to persist order", err));

                return newItems;
            });
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("ja-JP");
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">案件別サマリー</h2>
                <p className="text-sm text-gray-500">各案件の予算と原価の状況を一覧で確認できます。</p>
            </div>

            {/* Filters Section */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Filter size={18} className="text-indigo-600" />
                        <span>絞り込み条件</span>
                    </div>
                    <button
                        onClick={() => setFilters({ search: "", type: "", status: "", minBudget: "", maxBudget: "", startDate: "", endDate: "", includeEnded: false })}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        フィルターをクリア
                    </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Keywords */}
                    <div className="md:col-span-2 space-y-1.5">
                        <Label htmlFor="search" className="text-[10px] font-black uppercase tracking-widest text-gray-400">キーワード検索</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <Input
                                id="search"
                                placeholder="案件名、技術スタック、説明など..."
                                className="pl-10 h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Type Selector */}
                    <div className="space-y-1.5">
                        <Label htmlFor="typeFilter" className="text-[10px] font-black uppercase tracking-widest text-gray-400">タイプ</Label>
                        <select
                            id="typeFilter"
                            className="block w-full h-11 rounded-xl border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all cursor-pointer"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="">すべてのタイプ</option>
                            <option value="開発">開発</option>
                            <option value="保守">保守</option>
                            <option value="管理">管理</option>
                            <option value="その他">その他</option>
                        </select>
                    </div>

                    {/* Budget Range */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">予算範囲 (円)</Label>
                        <div className="flex h-11 items-center gap-2 bg-gray-50 rounded-xl px-2 border border-gray-100 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                            <Input
                                type="number"
                                placeholder="下限"
                                className="h-8 border-none bg-transparent text-xs focus:ring-0"
                                value={filters.minBudget}
                                onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
                            />
                            <span className="text-gray-300">~</span>
                            <Input
                                type="number"
                                placeholder="上限"
                                className="h-8 border-none bg-transparent text-xs focus:ring-0"
                                value={filters.maxBudget}
                                onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">工期（開始・終了日）</Label>
                        <div className="flex h-11 items-center gap-2 bg-gray-50 rounded-xl px-2 border border-gray-100 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                            <Input
                                type="date"
                                className="h-8 border-none bg-transparent text-xs focus:ring-0"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                            <span className="text-gray-300">~</span>
                            <Input
                                type="date"
                                className="h-8 border-none bg-transparent text-xs focus:ring-0"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Ended Checkbox */}
                    <div className="md:col-span-2 flex items-center gap-3 bg-indigo-50/50 rounded-xl px-4 py-2 border border-indigo-100/50">
                        <input
                            id="includeEnded"
                            type="checkbox"
                            className="h-5 w-5 rounded-md border-indigo-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={filters.includeEnded}
                            onChange={(e) => setFilters({ ...filters, includeEnded: e.target.checked })}
                        />
                        <Label htmlFor="includeEnded" className="text-sm font-bold text-indigo-700 cursor-pointer mb-0">
                            工期が終了した案件も含めて表示する
                        </Label>
                    </div>
                </div>
            </div>

            <div className="relative">
                {loading ? (
                    <div className="py-20 text-center text-gray-500">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em]" />
                        <p className="mt-4 font-bold">読み込み中...</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="grid gap-4">
                            {summaries.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-xl border border-dashed text-gray-500">
                                    案件が見つかりません
                                </div>
                            ) : (
                                <SortableContext
                                    items={summaries.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {summaries.map((p) => (
                                        <SortableProjectCard
                                            key={p.id}
                                            p={p}
                                            formatDate={formatDate}
                                        />
                                    ))}
                                </SortableContext>
                            )}
                        </div>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
