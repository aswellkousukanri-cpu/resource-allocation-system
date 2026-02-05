"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Briefcase,
    CalendarClock,
    PieChart,
    ChevronLeft,
    ChevronRight,
    LucideIcon
} from "lucide-react";

interface NavItemProps {
    href: string;
    label: string;
    icon: LucideIcon;
    isActive: boolean;
    isCollapsed: boolean;
}

const NavItem = ({ href, label, icon: Icon, isActive, isCollapsed }: NavItemProps) => {
    return (
        <Link
            href={href}
            title={isCollapsed ? label : ""}
            className={`flex items-center rounded-lg py-3 transition-all duration-300 ${isCollapsed ? "justify-center px-0" : "px-4 space-x-3"} ${isActive
                ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200/50"
                : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                }`}
        >
            <div className={`flex items-center justify-center ${isCollapsed ? "w-12 h-10" : ""}`}>
                <Icon size={20} className="flex-shrink-0" />
            </div>
            <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                {label}
            </span>
        </Link>
    );
};

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();

    const navItems = [
        { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
        { href: "/summary", label: "サマリー", icon: PieChart },
        { href: "/assignments", label: "工数管理", icon: CalendarClock },
        { href: "/projects", label: "案件管理", icon: Briefcase },
        { href: "/members", label: "メンバー管理", icon: Users },
    ];

    return (
        <aside
            className={`fixed bottom-0 left-0 top-0 z-40 border-r bg-white transition-all duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"
                }`}
        >
            <div className={`flex h-16 items-center transition-all duration-300 relative ${isCollapsed ? "justify-center px-0" : "justify-between px-6"}`}>
                <div className={`flex items-center transition-all duration-300 ${isCollapsed ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}>
                    <span className="text-xl font-black tracking-tight text-indigo-600 truncate">
                        Team<span className="text-gray-900">Loader</span>
                    </span>
                </div>
                <div className={`absolute flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all duration-300 ${isCollapsed ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"}`}>
                    <span className="text-xl font-black">T</span>
                </div>
            </div>

            <nav className={`mt-6 space-y-2 transition-all duration-300 ${isCollapsed ? "px-2" : "px-4"}`}>
                {navItems.map((item) => (
                    <NavItem
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={pathname.startsWith(item.href) || (item.href === "/dashboard" && pathname === "/")}
                        isCollapsed={isCollapsed}
                    />
                ))}
            </nav>

            {/* Toggle Button at the bottom */}
            <div className="absolute bottom-6 left-0 right-0 px-4">
                <button
                    onClick={onToggle}
                    className="flex w-full items-center justify-center rounded-xl border border-gray-100 bg-gray-50/50 py-3 text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-md transition-all duration-300"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>
        </aside>
    );
}
