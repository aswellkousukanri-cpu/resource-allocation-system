import prisma from './src/lib/prisma';

async function main() {
    const users = await prisma.user.findMany();
    console.log('Users:', JSON.stringify(users, null, 2));
    const projects = await prisma.project.findMany();
    console.log('Projects:', JSON.stringify(projects, null, 2));
}

main().catch(console.error);
