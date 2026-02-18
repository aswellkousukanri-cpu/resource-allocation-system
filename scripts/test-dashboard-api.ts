
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        console.log("Checking active projects...");
        const activeProjectsCount = await prisma.project.count({
            where: {
                status: "CONFIRMED",
                OR: [
                    { endDate: { gte: now } },
                    { endDate: null }
                ]
            }
        });
        console.log("Active projects:", activeProjectsCount);

        console.log("Checking prospective projects...");
        const prospectiveProjects = await prisma.project.findMany({
            where: { status: "PROSPECTIVE" },
            orderBy: { createdAt: "desc" }
        });
        console.log("Prospective projects:", prospectiveProjects.length);

        console.log("Checking finance...");
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
        const HOURS_PER_MONTH = 160;
        const DEFAULT_RATE = 5000;

        confirmedProjectsForFinance.forEach(p => {
            if (p.type === "その他") return;

            const projectCost = p.assignments.reduce((sum, a) => {
                if (!a.member) {
                    console.error(`Assignment ${a.id} has no member! Project: ${p.id}`);
                    return sum;
                }
                return sum + (a.manMonth * (a.member.hourlyRate || DEFAULT_RATE) * HOURS_PER_MONTH);
            }, 0);

            totalCost += projectCost;

            if (p.type === "管理") return;

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
                totalBudget += (p.budget || 0);
            }
        });
        console.log("Finance calculated. Budget:", totalBudget, "Cost:", totalCost);

        console.log("Checking utilization...");
        const allAssignmentsWithMembers = await prisma.assignment.findMany({
            include: { member: true }
        });

        const grouping: Record<string, any> = {};

        allAssignmentsWithMembers.forEach(a => {
            if (!a.member) {
                console.error(`Assignment ${a.id} has no member in utilization loop!`);
                return;
            }
            const key = `${a.memberId}-${a.year}-${a.month}`;
            if (!grouping[key]) {
                grouping[key] = {
                    memberId: a.memberId,
                    name: a.member.name,
                    year: a.year,
                    month: a.month,
                    total: 0,
                    capacity: a.member.workCapacity
                };
            }
            grouping[key].total += a.manMonth;
        });

        const overAllocatedHistory = Object.values(grouping)
            .filter(g => (g.total / g.capacity) * 100 > 100)
            .map(g => ({
                id: `${g.memberId}-${g.year}-${g.month}`,
                name: `${g.name} (${g.year}/${g.month})`,
                utilization: (g.total / g.capacity) * 100,
                totalManMonth: g.total,
                workCapacity: g.capacity
            }));
        console.log("Over-allocated history count:", overAllocatedHistory.length);

        const currentMonthAssts = allAssignmentsWithMembers.filter(a => a.year === year && a.month === month);
        const membersList = await prisma.member.findMany();
        const currentMonthUtilization = membersList.map(member => {
            const total = currentMonthAssts.filter(a => a.memberId === member.id).reduce((s, a) => s + a.manMonth, 0);
            return (total / (member.workCapacity || 1)) * 100;
        });
        const currentMonthAvgUtilization = currentMonthUtilization.length > 0
            ? currentMonthUtilization.reduce((s, u) => s + u, 0) / currentMonthUtilization.length
            : 0;
        console.log("Current month avg utilization:", currentMonthAvgUtilization);

        console.log("SUCCESS!");

    } catch (error) {
        console.error("Test failed with error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
