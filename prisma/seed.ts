import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@trip-planner.local' },
    update: {},
    create: {
      email: 'demo@trip-planner.local',
      name: 'Demo Traveler',
      passwordHash,
      emailVerifiedAt: new Date()
    }
  });

  await prisma.trip.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      ownerId: user.id,
      title: 'Northern Vietnam Discovery',
      description: 'A starter trip used for local development and onboarding.',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-07'),
      timezone: 'Asia/Bangkok',
      status: 'PLANNED',
      visibility: 'PRIVATE',
      destinations: {
        create: [
          {
            name: 'Hanoi',
            countryCode: 'VN',
            city: 'Hanoi',
            order: 1
          },
          {
            name: 'Ha Long Bay',
            countryCode: 'VN',
            city: 'Ha Long',
            order: 2
          }
        ]
      },
      days: {
        create: [
          {
            date: new Date('2026-06-01'),
            title: 'Arrival in Hanoi',
            order: 1,
            activities: {
              create: [
                {
                  title: 'Old Quarter walk',
                  timezone: 'Asia/Bangkok',
                  order: 1
                }
              ]
            }
          }
        ]
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
