"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

interface MemberFormProps {
    initialData?: {
        id: string;
        name: string;
        role: string;
        hourlyRate: number;
        workCapacity: number;
        memo: string | null;
    };
}

export default function MemberForm({ initialData }: MemberFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        role: initialData?.role || "PG",
        hourlyRate: initialData?.hourlyRate || 0,
        workCapacity: initialData?.workCapacity || 1.0,
        memo: initialData?.memo || "",
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name ?? "",
                role: initialData.role ?? "PG",
                hourlyRate: initialData.hourlyRate ?? 0,
                workCapacity: initialData.workCapacity ?? 1.0,
                memo: initialData.memo ?? "",
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const isEdit = !!initialData && 'id' in initialData && !!initialData.id;
        const url = isEdit
            ? `/api/members/${initialData?.id}`
            : "/api/members";
        const method = isEdit ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/members");
                router.refresh();
            } else {
                alert("保存に失敗しました");
            }
        } catch (error) {
            console.error("Error saving member", error);
            alert("エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name">氏名 *</Label>
                    <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="山田 太郎"
                    />
                </div>
                <div>
                    <Label htmlFor="role">職種 *</Label>
                    <select
                        id="role"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                        <option value="PG">PG</option>
                        <option value="SE">SE</option>
                        <option value="PM">PM</option>
                        <option value="その他">その他</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="hourlyRate">時給 (¥/時間) *</Label>
                    <Input
                        id="hourlyRate"
                        type="number"
                        required
                        min="0"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    />
                </div>
                <div>
                    <Label htmlFor="workCapacity">稼働可能人月</Label>
                    <Input
                        id="workCapacity"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1.0"
                        value={formData.workCapacity}
                        onChange={(e) => setFormData({ ...formData, workCapacity: Number(e.target.value) })}
                    />
                </div>
                <div>
                    <Label htmlFor="memo">メモ</Label>
                    <textarea
                        id="memo"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        rows={4}
                        value={formData.memo}
                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                        placeholder="技術スキル、経歴など"
                    />
                </div>
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
