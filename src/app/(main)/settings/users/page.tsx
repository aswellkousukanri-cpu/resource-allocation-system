
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Shield, User as UserIcon, Loader2, Edit2, X } from "lucide-react";

interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("USER");
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                setError("ユーザー一覧の取得に失敗しました。管理権限が必要です。");
            }
        } catch (err) {
            setError("通信エラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
        setRole("USER");
        setShowAddForm(false);
        setEditingUser(null);
    };

    const startEdit = (user: User) => {
        setName(user.name || "");
        setEmail(user.email);
        setPassword(""); // パスワードは空のまま（変更する場合のみ入力）
        setRole(user.role);
        setEditingUser(user);
        setShowAddForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
            const method = editingUser ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    password: password || undefined,
                    role
                }),
            });

            if (res.ok) {
                resetForm();
                fetchUsers();
            } else {
                const data = await res.json();
                setError(data.message || "処理に失敗しました。");
            }
        } catch (err) {
            setError("エラーが発生しました。");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("本当にこのユーザーを削除しますか？")) return;

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.message || "削除に失敗しました。");
            }
        } catch (err) {
            alert("エラーが発生しました。");
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ユーザー管理</h1>
                    <p className="text-gray-500 text-sm">システムを利用できるユーザーと権限を管理します。</p>
                </div>
                {!showAddForm && !editingUser && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                        <UserPlus size={18} />
                        新規ユーザー追加
                    </button>
                )}
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">{error}</div>}

            {(showAddForm || editingUser) && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm ring-1 ring-indigo-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            {editingUser ? <Edit2 size={18} /> : <UserPlus size={18} />}
                            {editingUser ? "ユーザー情報の編集" : "新規ユーザー登録"}
                        </h2>
                        <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">名前</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="例：山田 太郎"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">メールアドレス</label>
                            <input
                                required
                                type="email"
                                disabled={!!editingUser}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${editingUser ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
                                placeholder="example@company.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-gray-500 uppercase">パスワード</label>
                                {editingUser && <span className="text-[10px] text-gray-400 italic">※変更する場合のみ入力</span>}
                            </div>
                            <input
                                required={!editingUser}
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder={editingUser ? "新しいパスワード（任意）" : "8文字以上"}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">役割（権限）</label>
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="USER">一般（ユーザー管理不可）</option>
                                <option value="ADMIN">管理者（ユーザー管理可）</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t mt-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-indigo-600 text-white px-8 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400 shadow-sm transition"
                            >
                                {submitting ? "保存中..." : editingUser ? "更新を保存" : "ユーザーを作成"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-bottom text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <th className="px-6 py-4">ユーザー</th>
                            <th className="px-6 py-4">権限</th>
                            <th className="px-6 py-4">登録日</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gray-100 p-2 rounded-full">
                                            <UserIcon size={20} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-800">{user.name || "名称未設定"}</div>
                                            <div className="text-gray-500 text-sm">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 uppercase">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${user.role === "ADMIN"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-blue-100 text-blue-700"
                                        }`}>
                                        {user.role === "ADMIN" && <Shield size={12} />}
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={() => startEdit(user)}
                                            className="text-gray-400 hover:text-indigo-600 p-2 transition"
                                            title="編集"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="text-gray-400 hover:text-red-600 p-2 transition"
                                            title="削除"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-400">
                        ユーザーが登録されていません。
                    </div>
                )}
            </div>
        </div>
    );
}
