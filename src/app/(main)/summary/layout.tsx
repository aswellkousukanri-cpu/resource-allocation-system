"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function SummaryLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { href: "/summary/annual", label: "年間スケジュール" },
        { href: "/summary/members", label: "月別サマリー" },
        { href: "/summary/projects", label: "案件別サマリー" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">サマリー</h2>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${pathname === tab.href
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <div>{children}</div>
        </div>
    );
}
// This is actually a shared part. I'll make children mandatory but the top page will redirect.
