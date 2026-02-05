import MemberForm from "@/components/members/MemberForm";

export default function NewMemberPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">メンバー新規登録</h2>
            <MemberForm />
        </div>
    );
}
