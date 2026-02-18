
import Link from "next/link";

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 text-center">
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                    新規アカウント作成について
                </h2>
                <div className="mt-4 text-gray-600">
                    <p>このシステムは社内専用です。</p>
                    <p className="mt-2">新しくアカウントを作成する必要がある場合は、システムの管理者にお問い合わせください。</p>
                </div>
                <div className="mt-6">
                    <Link
                        href="/login"
                        className="text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                        ログイン画面に戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
