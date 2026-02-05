"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MemberForm from "@/components/members/MemberForm";

export default function EditMemberPage() {
    const params = useParams();
    const id = params.id as string;
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMember = async () => {
            try {
                const res = await fetch(`/api/members/${id}`);
                if (!res.ok) {
                    setMember(null);
                    return;
                }
                const data = await res.json();
                setMember(data);
            } catch (error) {
                console.error("Failed to fetch member", error);
                setMember(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchMember();
    }, [id]);

    if (loading) return <div>読み込み中...</div>;
    if (!member) return <div>メンバーが見つかりません</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">メンバー編集</h2>
            <MemberForm initialData={member} />
        </div>
    );
}
