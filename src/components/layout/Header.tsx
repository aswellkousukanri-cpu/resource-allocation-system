"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";

interface HeaderProps {
    isCollapsed: boolean;
}

export default function Header({ isCollapsed }: HeaderProps) {
    const { data: session } = useSession();

    return (
        <header className={`fixed right-0 top-0 z-30 h-16 border-b bg-white px-4 transition-all duration-300 ${isCollapsed ? "left-20" : "left-64"}`}>
            <div className="flex h-full items-center justify-between">
                <div className="hidden md:block">
                    <h1 className="text-lg font-semibold text-gray-800">
                        {/* Page title could be dynamic */}
                    </h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <UserIcon size={20} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                            {session?.user?.name || session?.user?.email}
                        </span>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">ログアウト</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
