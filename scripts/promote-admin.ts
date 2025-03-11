import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Por favor, forneça um email de usuário como argumento.');
    console.error('Uso: npx ts-node scripts/promote-admin.ts email@exemplo.com');
    process.exit(1);
  }

  try {
    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Usuário com email ${email} não encontrado.`);
      process.exit(1);
    }

    // Atualizar o papel do usuário para ADMIN
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });

    console.log(`Usuário ${updatedUser.email} foi promovido a administrador com sucesso!`);
  } catch (error) {
    console.error('Erro ao promover usuário:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();