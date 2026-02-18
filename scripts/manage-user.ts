
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const password = process.argv[3];
    const role = (process.argv[4] || 'USER').toUpperCase();

    if (!email || !password) {
        console.log('Usage: npx tsx scripts/manage-user.ts <email> <password> [role(ADMIN/USER)]');
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Initial Admin',
            role
        }
    });

    console.log(`User ${email} has been ${user.createdAt === user.updatedAt ? 'created' : 'updated'} with the ${role} role.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
