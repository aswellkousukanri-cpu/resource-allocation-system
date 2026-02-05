"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Member } from "@/types";

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMembers = async () => {
        try {
            const res = await fetch("/api/members");
            const data = await res.json();
            // Ensure data is an array
            if (Array.isArray(data)) {
                setMembers(data);
            }
        } catch (error) {
            console.error("Failed to fetch members", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？")) return;

        try {
            const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
            if (res.ok) {
                setMembers(members.filter((m) => m.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete member", error);
        }
    };

    const handleOnDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(members);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setMembers(items);

        // Persist to backend
        try {
            const memberIds = items.map(m => m.id);
            await fetch("/api/members", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberIds }),
            });
        } catch (error) {
            console.error("Failed to persist new order", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">メンバー管理</h2>
                <Link href="/members/new">
                    <Button className="flex items-center gap-2">
                        <Plus size={18} />
                        新規登録
                    </Button>
                </Link>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <DragDropContext onDragEnd={handleOnDragEnd}>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="w-10 px-6 py-3"></th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">氏名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">職種</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">工賃</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">稼働可能人月</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">メモ</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                                </tr>
                            </thead>
                            <Droppable droppableId="members">
                                {(provided) => (
                                    <tbody
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="divide-y divide-gray-200 bg-white"
                                    >
                                        {loading ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">読み込み中...</td>
                                            </tr>
                                        ) : members.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">メンバーが登録されていません</td>
                                            </tr>
                                        ) : (
                                            members.map((member, index) => (
                                                <Draggable key={member.id} draggableId={member.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <tr
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`${snapshot.isDragging ? "bg-indigo-50 shadow-lg" : "hover:bg-gray-50"} transition-colors`}
                                                        >
                                                            <td className="px-6 py-4">
                                                                <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-600">
                                                                    <GripVertical size={20} />
                                                                </div>
                                                            </td>
                                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{member.name}</td>
                                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{member.role}</td>
                                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">¥{member.hourlyRate.toLocaleString()}</td>
                                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{member.workCapacity.toFixed(1)}</td>
                                                            <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500">{member.memo || "-"}</td>
                                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                                <div className="flex justify-end gap-2">
                                                                    <Link href={`/members/${member.id}/edit`}>
                                                                        <Button variant="outline" size="sm">
                                                                            <Edit size={16} />
                                                                        </Button>
                                                                    </Link>
                                                                    <Button variant="danger" size="sm" onClick={() => handleDelete(member.id)}>
                                                                        <Trash2 size={16} />
                                                                    </Button>
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
