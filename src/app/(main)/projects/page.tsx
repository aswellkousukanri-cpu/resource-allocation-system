"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";
import { Plus, Edit, Trash2, ExternalLink, Search, Filter, Calendar, DollarSign, GripVertical, User } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Member {
    id: string;
    name: string;
}

interface Project {
    id: string;
    name: string;
    type: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    budget: number | null;
    assignments: {
        memberId: string;
        member: {
            name: string;
        };
    }[];
    _count: {
        assignments: number;
    };
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [filters, setFilters] = useState<{
        search: string;
        type: string;
        minBudget: string;
        maxBudget: string;
        startDate: string;
        endDate: string;
        includeEnded: boolean;
        memberIds: string[];
    }>({
        search: "",
        type: "",
        minBudget: "",
        maxBudget: "",
        startDate: "",
        endDate: "",
        includeEnded: false,
        memberIds: [],
    });

    const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append("search", filters.search);
            if (filters.type) params.append("type", filters.type);
            if (filters.minBudget) params.append("minBudget", filters.minBudget);
            if (filters.maxBudget) params.append("maxBudget", filters.maxBudget);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);
            if (filters.includeEnded) params.append("includeEnded", "true");
            if (filters.memberIds.length > 0) params.append("memberId", filters.memberIds.join(","));

            const res = await fetch(`/api/projects?${params.toString()}`);
            const data = await res.json();
            setProjects(data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await fetch("/api/members");
            const data = await res.json();
            setMembers(data);
        } catch (error) {
            console.error("Failed to fetch members", error);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const toggleMember = (id: string) => {
        setFilters(prev => ({
            ...prev,
            memberIds: prev.memberIds.includes(id)
                ? prev.memberIds.filter(mid => mid !== id)
                : [...prev.memberIds, id]
        }));
    };

    const handleOnDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const reorderedProjects = Array.from(projects);
        const [removed] = reorderedProjects.splice(result.source.index, 1);
        reorderedProjects.splice(result.destination.index, 0, removed);

        setProjects(reorderedProjects);

        try {
            await fetch("/api/projects", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectIds: reorderedProjects.map(p => p.id) }),
            });
        } catch (error) {
            console.error("Failed to save project order", error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProjects();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [filters]);

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？")) return;

        try {
            const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
            if (res.ok) {
                setProjects(projects.filter((p) => p.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete project", error);
        }
    };

    const formatDate = (dateStr: string | null, type: string) => {
        if (!dateStr) {
            return type === "保守" ? "無期限" : "-";
        }
        return new Date(dateStr).toLocaleDateString("ja-JP");
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "開発": return "bg-blue-50 text-blue-700 ring-blue-600/20";
            case "保守": return "bg-green-50 text-green-700 ring-green-600/20";
            case "管理": return "bg-purple-50 text-purple-700 ring-purple-600/20";
            default: return "bg-gray-50 text-gray-700 ring-gray-600/20";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">案件管理</h2>
                    <p className="text-sm text-gray-500">プロジェクトの進捗と予算を管理します</p>
                </div>
                <Link href="/projects/new">
                    <Button className="flex items-center gap-2 shadow-lg shadow-indigo-100">
                        <Plus size={18} />
                        新規登録
                    </Button>
                </Link>
            </div>

            {/* Filters Section */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Filter size={18} className="text-indigo-600" />
                        <span>絞り込み条件</span>
                    </div>
                    <button
                        onClick={() => setFilters({ search: "", type: "", minBudget: "", maxBudget: "", startDate: "", endDate: "", includeEnded: false, memberIds: [] })}
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

                    {/* Member Multi-Filter */}
                    <div className="space-y-1.5 relative">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">アサインメンバー (複数選択可)</Label>
                        <div className="relative">
                            <button
                                onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                                className="flex items-center gap-2 w-full h-11 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all text-left overflow-hidden h-11"
                            >
                                <User className="text-gray-400 flex-shrink-0" size={16} />
                                <span className="truncate">
                                    {filters.memberIds.length === 0
                                        ? "すべてのアサイン"
                                        : `${filters.memberIds.length}名選択中: ${filters.memberIds.map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(", ")}`}
                                </span>
                            </button>

                            {memberDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMemberDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto p-2 space-y-1">
                                        {members.map(m => (
                                            <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors group">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 pointer-events-none"
                                                    checked={filters.memberIds.includes(m.id)}
                                                    onChange={() => toggleMember(m.id)}
                                                />
                                                <span className={`text-sm ${filters.memberIds.includes(m.id) ? 'font-bold text-indigo-700' : 'text-gray-600 group-hover:text-indigo-600'}`}>
                                                    {m.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
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
                    <div className="flex items-center gap-3 bg-indigo-50/50 rounded-xl px-4 py-2 border border-indigo-100/50 col-span-1">
                        <input
                            id="includeEnded"
                            type="checkbox"
                            className="h-5 w-5 rounded-md border-indigo-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={filters.includeEnded}
                            onChange={(e) => setFilters({ ...filters, includeEnded: e.target.checked })}
                        />
                        <Label htmlFor="includeEnded" className="text-sm font-bold text-indigo-700 cursor-pointer mb-0">
                            終了案件込
                        </Label>
                    </div>
                </div>
            </div>

            {/* Projects Table */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden ring-1 ring-black/5">
                <div className="overflow-x-auto">
                    <DragDropContext onDragEnd={handleOnDragEnd}>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 w-10"></th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">案件名 / タイプ</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">工期</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">予算</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">アサイン</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">操作</th>
                                </tr>
                            </thead>
                            <Droppable droppableId="projects-list">
                                {(provided) => (
                                    <tbody
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="divide-y divide-gray-200"
                                    >
                                        {loading && projects.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center">
                                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em]" />
                                                    <p className="mt-4 text-sm font-bold text-gray-500">読み込み中...</p>
                                                </td>
                                            </tr>
                                        ) : projects.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <Search className="text-gray-200 mb-2" size={48} />
                                                        <p className="text-gray-500 font-medium">条件に一致する案件が見つかりませんでした</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            projects.map((project, index) => (
                                                <Draggable key={project.id} draggableId={project.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <tr
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`group transition-colors ${snapshot.isDragging ? "bg-indigo-50 shadow-lg" : "hover:bg-indigo-50/30"}`}
                                                        >
                                                            <td className="px-6 py-5">
                                                                <div {...provided.dragHandleProps} className="text-gray-300 hover:text-indigo-600 cursor-grab active:cursor-grabbing transition-colors">
                                                                    <GripVertical size={18} />
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black ring-1 ring-inset ${getTypeColor(project.type)} shadow-sm`}>
                                                                            {project.type}
                                                                        </span>
                                                                        <Link href={`/projects/${project.id}`} className="text-sm font-black text-gray-900 hover:text-indigo-600 transition-colors">
                                                                            {project.name}
                                                                        </Link>
                                                                        {project.status === "PROSPECTIVE" && (
                                                                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-600/20 shadow-sm">
                                                                                見込み
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                                                    <Calendar size={14} className="text-gray-400" />
                                                                    <span>{formatDate(project.startDate, project.type)} 〜 {formatDate(project.endDate, project.type)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right font-black text-sm text-gray-900">
                                                                {project.budget ? `¥${project.budget.toLocaleString()}` : <span className="text-gray-300 font-normal">未設定</span>}
                                                            </td>
                                                            <td className="px-6 py-5 text-center">
                                                                <div className="flex flex-wrap justify-center gap-1.5 max-w-[240px] mx-auto">
                                                                    {project.assignments.length > 0 ? (
                                                                        Array.from(new Set(project.assignments.map(a => a.member.name))).map((name, i) => (
                                                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-600 border border-gray-200">
                                                                                {name}
                                                                            </span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-gray-300 text-xs">-</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Link href={`/projects/${project.id}/edit`}>
                                                                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-white hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all">
                                                                            <Edit size={16} />
                                                                        </Button>
                                                                    </Link>
                                                                    <Button
                                                                        variant="danger"
                                                                        size="sm"
                                                                        className="h-9 w-9 p-0 rounded-xl bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white shadow-sm transition-all"
                                                                        onClick={() => handleDelete(project.id)}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </Button>
                                                                    <Link href={`/projects/${project.id}`}>
                                                                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-white hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all">
                                                                            <ExternalLink size={16} />
                                                                        </Button>
                                                                    </Link>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Draggable>
                                            ))
                                        )}
                                        {provided.placeholder}
                                    </tbody>
                                )}
                            </Droppable>
                        </table>
                    </DragDropContext>
                </div>
            </div>
        </div>
    );
}
