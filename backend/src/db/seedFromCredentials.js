import prisma from './prisma.js';
import { syncCredentialsToDatabase } from '../utils/credentialsSync.js';

async function run() {
  console.log('🌱 Seeding database from active credentials...');
  try {
    await syncCredentialsToDatabase(prisma);
    console.log('✅ Active credentials successfully synced to database!');
  } catch (err) {
    console.error('Error during credentials seed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
