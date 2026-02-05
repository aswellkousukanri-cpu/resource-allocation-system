import ProjectForm from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">案件新規登録</h2>
            <ProjectForm />
        </div>
    );
}
