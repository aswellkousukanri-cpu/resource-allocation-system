"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectForm from "@/components/projects/ProjectForm";

export default function EditProjectPage() {
    const params = useParams();
    const id = params.id as string;
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await fetch(`/api/projects/${id}`);
                const data = await res.json();
                setProject(data);
            } catch (error) {
                console.error("Failed to fetch project", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProject();
    }, [id]);

    if (loading) return <div>読み込み中...</div>;
    if (!project) return <div>案件が見つかりません</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">案件編集</h2>
            <ProjectForm initialData={project} />
        </div>
    );
}
