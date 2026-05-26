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

  const oldQuarter = await prisma.place.upsert({
    where: {
      provider_providerPlaceId: {
        provider: 'MANUAL',
        providerPlaceId: 'seed:old-quarter'
      }
    },
    update: {},
    create: {
      provider: 'MANUAL',
      providerPlaceId: 'seed:old-quarter',
      name: 'Old Quarter',
      formattedAddress: 'Hoan Kiem, Hanoi, Vietnam',
      countryCode: 'VN',
      latitude: 21.034,
      longitude: 105.852,
      timezone: 'Asia/Bangkok',
      categories: ['neighborhood']
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
      itineraryItems: {
        create: [
          {
            placeId: oldQuarter.id,
            type: 'PLACE',
            title: 'Old Quarter walk',
            timezone: 'Asia/Bangkok',
            sortOrder: 1024
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
