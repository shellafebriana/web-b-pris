import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedUsers() {
  // Demo admin user
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: Buffer.from('admin1').toString('base64'), 
      email: 'admin@polresta.go.id',
      role: 'admin',
      isActive: true
    }
  });

  // Demo operator user
  await prisma.user.upsert({
    where: { username: 'operator1' },
    update: {},
    create: {
      username: 'operator1',
      password: Buffer.from('operator1').toString('base64'),
      email: 'operator@polresta.go.id',
      role: 'operator',
      isActive: true
    }
  });
}

// Call seedUsers() in main()
await seedUsers();