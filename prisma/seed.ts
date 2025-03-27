import { PrismaClient, UserRole } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');
  
  // Senha '123456' para ambos os usuários
  const hashedPassword = await bcryptjs.hash('123456', 10);
  const dataAtual = new Date();
  
  console.log('Cadastrando usuário Amanda...');
  await prisma.user.upsert({
    where: { email: 'amandasousa22.adv@gmail.com' },
    update: {
      name: 'Amanda',
      emailVerified: dataAtual,
      role: UserRole.ADMIN,
      password: hashedPassword,
    },
    create: {
      email: 'amandasousa22.adv@gmail.com',
      name: 'Amanda',
      emailVerified: dataAtual,
      role: UserRole.ADMIN,
      password: hashedPassword,
      createdAt: dataAtual,
    },
  });

  console.log('Cadastrando usuário Witalo...');
  await prisma.user.upsert({
    where: { email: 'witalo_rocha@hotmail.com' },
    update: {
      name: 'Witalo',
      emailVerified: dataAtual,
      role: UserRole.ADMIN,
      password: hashedPassword,
    },
    create: {
      email: 'witalo_rocha@hotmail.com',
      name: 'Witalo',
      emailVerified: dataAtual,
      role: UserRole.ADMIN,
      password: hashedPassword,
      createdAt: dataAtual,
    },
  });

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 