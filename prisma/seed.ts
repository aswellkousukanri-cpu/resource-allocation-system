
import { PrismaClient, ProjectStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Members
    const member1 = await prisma.member.create({
        data: {
            name: '田中 太郎',
            role: 'PG',
            hourlyRate: 5000,
            workCapacity: 1.0,
            sortOrder: 1,
        }
    })

    const member2 = await prisma.member.create({
        data: {
            name: '鈴木 花子',
            role: 'SE',
            hourlyRate: 6000,
            workCapacity: 1.0,
            sortOrder: 2,
        }
    })

    const member3 = await prisma.member.create({
        data: {
            name: '佐藤 次郎',
            role: 'PM',
            hourlyRate: 8000,
            workCapacity: 1.0,
            sortOrder: 3,
        }
    })

    // Projects
    // 1. Confirmed Project (existing/ongoing)
    const projectA = await prisma.project.create({
        data: {
            name: '基幹システム刷新',
            type: '開発',
            status: ProjectStatus.CONFIRMED,
            budget: 10000000,
            startDate: new Date('2025-10-01'),
            endDate: new Date('2026-03-31'),
            sortOrder: 1,
        }
    })

    // 2. Prospective Project (future)
    const projectB = await prisma.project.create({
        data: {
            name: 'AIチャットボット導入',
            type: '開発',
            status: ProjectStatus.PROSPECTIVE,
            budget: 5000000,
            startDate: new Date('2026-04-01'),
            endDate: new Date('2026-06-30'),
            sortOrder: 2,
        }
    })

    // 3. Maintenance (Confirmed)
    const projectC = await prisma.project.create({
        data: {
            name: '既存アプリ保守',
            type: '保守',
            status: ProjectStatus.CONFIRMED,
            budget: 500000, // Monthly base
            sortOrder: 3,
        }
    })

    // Assignments
    // Member 1 on Project A (Confirmed)
    await prisma.assignment.create({
        data: {
            memberId: member1.id,
            projectId: projectA.id,
            year: 2026,
            month: 1,
            manMonth: 1.0,
        }
    })

    // Member 1 on Project B (Prospective) - Future
    await prisma.assignment.create({
        data: {
            memberId: member1.id,
            projectId: projectB.id,
            year: 2026,
            month: 4,
            manMonth: 0.5,
        }
    })

    // Member 2 on Project A (Confirmed)
    await prisma.assignment.create({
        data: {
            memberId: member2.id,
            projectId: projectA.id,
            year: 2026,
            month: 1,
            manMonth: 0.8,
        }
    })

    console.log('Seed data created.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
