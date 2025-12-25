const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Prisma Client'ın generate edilip edilmediğini kontrol et
const prismaClientPath = path.join(__dirname, '../../node_modules/.prisma/client');
if (!fs.existsSync(prismaClientPath)) {
  console.log('[Prisma] Client not found, generating...');
  try {
    execSync('npx prisma generate', { 
      cwd: path.join(__dirname, '../..'),
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('[Prisma] Failed to generate client:', error.message);
    // Devam et, belki build sırasında generate edilmiştir
  }
}

const prisma = new PrismaClient();

module.exports = prisma;

