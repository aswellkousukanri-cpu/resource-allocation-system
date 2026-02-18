import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // 1. High-Level Summary Cards
        const activeProjectsCount = await prisma.project.count({
            where: {
                status: "CONFIRMED",
                OR: [
                    { endDate: { gte: now } },
                    { endDate: null }
                ]
            }
        });

        const prospectiveProjects = await prisma.project.findMany({
            where: { status: "PROSPECTIVE" },
            orderBy: { createdAt: "desc" }
        });

        // 2. Financial Summary (Overall Project Lifetime)
        const HOURS_PER_MONTH = 160;
        const DEFAULT_RATE = 5000; // Falling back to 5000 JPY/h

        const confirmedProjectsForFinance = await prisma.project.findMany({
            include: {
                assignments: {
                    include: { member: { select: { hourlyRate: true } } }
                },
                monthlyBudgets: true
            }
        });

        let totalBudget = 0;
        let totalCost = 0;

        confirmedProjectsForFinance.forEach(p => {
            // "その他" logic: Budget = 0, Cost = 0
            if (p.type === "その他") return;

            const projectCost = p.assignments.reduce((sum, a) => {
                const hourlyRate = a.member?.hourlyRate ?? DEFAULT_RATE;
                return sum + (a.manMonth * hourlyRate * HOURS_PER_MONTH);
            }, 0);

            totalCost += projectCost;

            // "管理" logic: Budget = 0
            if (p.type === "管理") return;

            // "保守" logic: Budget = Monthly Budgets overrides or Base Budget
            if (p.type === "保守") {
                const relevantMonths = new Set<string>();
                if (p.startDate && p.endDate) {
                    let cur = new Date(Date.UTC(p.startDate.getUTCFullYear(), p.startDate.getUTCMonth(), 1));
                    const stop = new Date(Date.UTC(p.endDate.getUTCFullYear(), p.endDate.getUTCMonth(), 1));
                    let safety = 0;
                    while (cur <= stop && safety < 120) {
                        relevantMonths.add(`${cur.getUTCFullYear()}-${cur.getUTCMonth() + 1}`);
                        cur.setUTCMonth(cur.getUTCMonth() + 1);
                        safety++;
                    }
                }
                p.assignments.forEach(a => relevantMonths.add(`${a.year}-${a.month}`));
                p.monthlyBudgets.forEach(mb => relevantMonths.add(`${mb.year}-${mb.month}`));

                let projectBudget = 0;
                Array.from(relevantMonths).forEach(key => {
                    const [y, m] = key.split("-").map(Number);
                    const mb = p.monthlyBudgets.find(b => b.year === y && b.month === m);
                    if (mb) {
                        projectBudget += mb.amount;
                    } else if (p.budget) {
                        projectBudget += p.budget;
                    }
                });
                totalBudget += projectBudget;
            } else {
                // Default "開発" (Standard project budget)
                totalBudget += (p.budget || 0);
            }
        });

        // --- Utilization & Over-allocation Calculation (Across all months) ---
        // To find over-allocation in ANY month, we need to group by (memberId, year, month)
        const allAssignmentsWithMembers = await prisma.assignment.findMany({
            include: { member: true }
        });

        const grouping: { [key: string]: { memberId: string, name: string, year: number, month: number, total: number, capacity: number } } = {};

        allAssignmentsWithMembers.forEach(a => {
            if (!a.member) return; // Skip if member data is missing
            const key = `${a.memberId}-${a.year}-${a.month}`;
            if (!grouping[key]) {
                grouping[key] = {
                    memberId: a.memberId,
                    name: a.member.name,
                    year: a.year,
                    month: a.month,
                    total: 0,
                    capacity: a.member.workCapacity || 1.0
                };
            }
            grouping[key].total += a.manMonth;
        });

        const overAllocatedHistory = Object.values(grouping)
            .filter(g => {
                const util = (g.total / g.capacity) * 100;
                return isFinite(util) && util > 100;
            })
            .map(g => ({
                id: `${g.memberId}-${g.year}-${g.month}`,
                name: `${g.name} (${g.year}/${g.month})`,
                utilization: Math.min(999, (g.total / g.capacity) * 100), // Cap at 999 for display
                totalManMonth: g.total,
                workCapacity: g.capacity
            }));

        // For Overall Utilization, we stick to current month for a snapshot
        const currentMonthAssts = allAssignmentsWithMembers.filter(a => a.year === year && a.month === month);
        const membersList = await prisma.member.findMany();
        const currentMonthUtilization = membersList.map(member => {
            const total = currentMonthAssts.filter(a => a.memberId === member.id).reduce((s, a) => s + a.manMonth, 0);
            return (total / (member.workCapacity || 1)) * 100;
        });
        const currentMonthAvgUtilization = currentMonthUtilization.length > 0
            ? currentMonthUtilization.reduce((s, u) => s + (isFinite(u) ? u : 0), 0) / currentMonthUtilization.length
            : 0;

        const safeAvgUtilization = isFinite(currentMonthAvgUtilization) ? currentMonthAvgUtilization : 0;

        // 3. Project Risks
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const upcomingEndProjects = await prisma.project.findMany({
            where: {
                status: "CONFIRMED",
                endDate: {
                    gte: now,
                    lte: thirtyDaysFromNow
                }
            },
            include: {
                _count: {
                    select: { assignments: true }
                }
            }
        });

        return NextResponse.json({
            summary: {
                activeProjects: activeProjectsCount,
                prospectiveProjects: prospectiveProjects.length,
                overallUtilization: Math.round(safeAvgUtilization),
                overAllocatedCount: overAllocatedHistory.length,
                totalBudget,
                totalCost
            },
            alerts: {
                overAllocated: overAllocatedHistory,
                lowUtilization: [] // Temporarily empty or per-month logic
            },
            projects: {
                prospective: prospectiveProjects,
                upcomingEnd: upcomingEndProjects
            }
        });

    } catch (error) {
        const errorDetail = {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            time: new Date().toISOString()
        };
        console.error("Dashboard API Error:", errorDetail);

        // Try to write to a log file if possible (optional, might fail in some envs)
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), 'api_error.log');
            fs.appendFileSync(logPath, JSON.stringify(errorDetail, null, 2) + '\n');
        } catch (e) { }

        return NextResponse.json({
            error: "Internal Server Error",
            message: errorDetail.message
        }, { status: 500 });
    }
}
