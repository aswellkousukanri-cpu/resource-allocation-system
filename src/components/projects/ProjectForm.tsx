"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

interface ProjectFormProps {
    initialData?: {
        id: string;
        name: string;
        type: string;
        status: "CONFIRMED" | "PROSPECTIVE";
        description: string | null;
        budget: number | null;
        startDate: string | null;
        endDate: string | null;
        monthlyBudgets?: { year: number; month: number; amount: number }[];
    };
}

export default function ProjectForm({ initialData }: ProjectFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        type: initialData?.type || "開発",
        status: initialData?.status || "CONFIRMED",
        description: initialData?.description || "",
        budget: initialData?.budget !== null && initialData?.budget !== undefined ? String(initialData.budget) : "",
        startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : "",
        endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : "",
    });

    // Create a map for easy access: "YYYY-MM" -> amount
    const initialMonthlyBudgets = (initialData?.monthlyBudgets || []).reduce((acc, curr) => {
        acc[`${curr.year}-${curr.month}`] = String(curr.amount);
        return acc;
    }, {} as Record<string, string>);

    const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, string>>(initialMonthlyBudgets);
    const [bulkBudget, setBulkBudget] = useState("");

    const handleBulkBudgetChange = (val: string) => {
        setBulkBudget(val);
        if (!val) return;

        const newBudgets = { ...monthlyBudgets };
        const currentMonths = getMonthList();
        currentMonths.forEach(m => {
            newBudgets[m.key] = val;
        });
        setMonthlyBudgets(newBudgets);

        // Update Total Budget (only for months in current view)
        const total = currentMonths.reduce((sum, item) => sum + (Number(val) || 0), 0);
        setFormData(prev => ({ ...prev, budget: String(total) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const url = initialData
            ? `/api/projects/${initialData.id}`
            : "/api/projects";
        const method = initialData ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    monthlyBudgets: Object.entries(monthlyBudgets).map(([key, amount]) => {
                        const [year, month] = key.split("-").map(Number);
                        return { year, month, amount: Number(amount) || 0 };
                    }).filter(b => b.amount > 0), // Only send non-zero budgets
                }),
            });

            if (res.ok) {
                router.push("/projects");
                router.refresh();
            } else {
                alert("保存に失敗しました");
            }
        } catch (error) {
            console.error("Error saving project", error);
            alert("エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    // Generate list of months between start and end date
    const getMonthList = () => {
        if (!formData.startDate) return [];

        const start = new Date(formData.startDate);
        let end: Date;

        if (formData.endDate) {
            end = new Date(formData.endDate);
        } else if (formData.type === "保守") {
            // If indefinite maintenance, default to next September 30th (Fiscal Year End)
            // If start month is >= 10 (Oct), next Sep is next year.
            // If start month is < 10 (Jan-Sep), next Sep is this year? No, usually forward looking.
            // Let's assume standard fiscal year logic: 
            // Current is 2026-02. FY end is 2026-09-30.
            // Current is 2026-10. FY end is 2027-09-30.

            const currentYear = start.getFullYear();
            // If start date is before Oct 1, end is Sep 30 of same year.
            // If start date is on/after Oct 1, end is Sep 30 of next year.
            // Wait, usually it's "period allows input". 
            // If today is 2026-02, and we start 2026-02. We want up to 2026-09.

            const isBeforeOct = start.getMonth() < 9; // 0-8 is Jan-Sep
            const targetYear = isBeforeOct ? currentYear : currentYear + 1;
            end = new Date(targetYear, 8, 30); // Month 8 is September. Day 30.

            // If auto-calculated end is before start (edge case?), shift it +1 year?
            // e.g. Start 2026-09-29. End 2026-09-30. OK.
            // e.g. Start 2026-09-30. End 2026-09-30. OK. 
            // e.g. Start 2026-10-01. Target Year = 2027. End 2027-09-30. OK.
        } else {
            return [];
        }

        const months = [];
        let current = new Date(start);
        current.setDate(1); // Set to first day to avoid roll-over issues

        while (current <= end) {
            months.push({
                year: current.getFullYear(),
                month: current.getMonth() + 1,
                label: `${current.getFullYear()}年${current.getMonth() + 1}月`,
                key: `${current.getFullYear()}-${current.getMonth() + 1}`
            });
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    };

    const monthList = formData.type === "保守" ? getMonthList() : [];

    return (
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 rounded-xl border bg-white p-8 shadow-sm">
            <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <Label htmlFor="name" className="text-sm font-bold text-gray-700">案件名 *</Label>
                        <div className="flex gap-4 mt-1">
                            <Input
                                id="name"
                                required
                                className="flex-grow"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="〇〇システム開発"
                            />
                            <div className="w-48">
                                <select
                                    id="status"
                                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm h-10"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "CONFIRMED" | "PROSPECTIVE" })}
                                >
                                    <option value="CONFIRMED">実績（確定）</option>
                                    <option value="PROSPECTIVE">見込み（予定）</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="type" className="text-sm font-bold text-gray-700">タイプ *</Label>
                        <select
                            id="type"
                            required
                            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
                            value={formData.type}
                            onChange={(e) => {
                                const newType = e.target.value;
                                let newDates = {};

                                // 「管理」または「その他」の場合、工期を今季・来期（10/1〜翌々年9/30）に自動設定
                                if (newType === "管理" || newType === "その他") {
                                    const today = new Date();
                                    const month = today.getMonth();
                                    const year = today.getFullYear();
                                    let startYear, endYear;

                                    if (month >= 9) { // 10, 11, 12月
                                        startYear = year;
                                        endYear = year + 2;
                                    } else { // 1-9月
                                        startYear = year - 1;
                                        endYear = year + 1;
                                    }

                                    newDates = {
                                        startDate: `${startYear}-10-01`,
                                        endDate: `${endYear}-09-30`
                                    };
                                }

                                setFormData({ ...formData, type: newType, ...newDates });
                            }}
                        >
                            <option value="開発">開発</option>
                            <option value="保守">保守</option>
                            <option value="管理">管理</option>
                            <option value="その他">その他</option>
                        </select>
                        {formData.type === "保守" && (
                            <p className="mt-2 text-xs text-indigo-600 font-medium">※ 保守案件で終了日を空にした場合、無期限の案件として扱われます。</p>
                        )}
                    </div>
                    {/* Budget input: Hide if Management or Other */}
                    {formData.type !== "管理" && formData.type !== "その他" && (
                        <div>
                            <Label htmlFor="budget" className="text-sm font-bold text-gray-700">
                                {formData.type === "保守" ? "総予算 (自動計算)" : "予算 (¥)"}
                            </Label>
                            <Input
                                id="budget"
                                type="number"
                                min="0"
                                className="mt-1"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                placeholder={formData.type === "保守" ? "下部で月次予算を設定してください" : "総予算を入力"}
                                readOnly={formData.type === "保守"}
                                tabIndex={formData.type === "保守" ? -1 : 0}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <Label htmlFor="description" className="text-sm font-bold text-gray-700">説明（技術スタック等）</Label>
                    <textarea
                        id="description"
                        className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="使用技術、案件の概要など"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="startDate" className="text-sm font-bold text-gray-700">工期（開始）</Label>
                        <Input
                            id="startDate"
                            type="date"
                            className={`mt-1 ${(formData.type === "管理" || formData.type === "その他") ? "bg-gray-100 cursor-not-allowed" : ""}`}
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            readOnly={formData.type === "管理" || formData.type === "その他"}
                        />
                    </div>
                    <div>
                        <Label htmlFor="endDate" className="text-sm font-bold text-gray-700">工期（終了）</Label>
                        <Input
                            id="endDate"
                            type="date"
                            className={`mt-1 ${(formData.type === "管理" || formData.type === "その他") ? "bg-gray-100 cursor-not-allowed" : ""}`}
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            readOnly={formData.type === "管理" || formData.type === "その他"}
                        />
                    </div>
                    {(formData.type === "管理" || formData.type === "その他") && (
                        <p className="col-span-2 text-xs text-indigo-600 font-medium">
                            ※ {formData.type}案件は、自動的に今季と来期（10/1〜翌々年9/30）の期間に設定されます。
                        </p>
                    )}
                </div>

                {/* Monthly Budget Settings for Maintenance */}
                {formData.type === "保守" && monthList.length > 0 && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-6">
                        <div className="flex items-end justify-between mb-4 border-b border-indigo-200 pb-4">
                            <div>
                                <Label className="text-sm font-bold text-indigo-900 mb-1 block">月次予算設定</Label>
                                <p className="text-xs text-indigo-700">
                                    {formData.endDate ? "指定期間の予算を設定します。" : "終了日未指定のため、直近の年度末（9月末）までの枠を表示しています。"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-bold block mb-1">月額目安 (一括入力)</label>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        className="h-8 w-32 text-sm bg-white"
                                        placeholder="例: 500000"
                                        value={bulkBudget}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            handleBulkBudgetChange(val);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {monthList.map((m) => (
                                <div key={m.key}>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">{m.label}</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            className="pl-6 h-8 text-sm bg-white"
                                            placeholder="0"
                                            value={monthlyBudgets[m.key] || ""}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, "");
                                                const newBudgets = { ...monthlyBudgets, [m.key]: val };
                                                setMonthlyBudgets(newBudgets);

                                                const total = monthList.reduce((sum, item) => {
                                                    return sum + (Number(newBudgets[item.key]) || 0);
                                                }, 0);
                                                setFormData(prev => ({ ...prev, budget: String(total) }));
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-right">
                            <span className="text-xs font-bold text-gray-500 mr-2">合計予算:</span>
                            <span className="text-lg font-black text-indigo-700">
                                ¥{monthList.reduce((sum, item) => sum + (Number(monthlyBudgets[item.key]) || 0), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                    キャンセル
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "保存中..." : "保存する"}
                </Button>
            </div>
        </form>
    );
}
