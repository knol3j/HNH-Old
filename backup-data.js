const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupData() {
  console.log('Starting data backup...');

  const backupDir = path.join(__dirname, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  try {
    // Query all existing tables using raw SQL
    const users = await prisma.$queryRaw`SELECT * FROM users`;
    const miners = await prisma.$queryRaw`SELECT * FROM miners`;
    const coins = await prisma.$queryRaw`SELECT * FROM coins`;
    const pools = await prisma.$queryRaw`SELECT * FROM pools`;
    const systemConfig = await prisma.$queryRaw`SELECT * FROM system_config`;
    const payments = await prisma.$queryRaw`SELECT * FROM payments`;
    const shares = await prisma.$queryRaw`SELECT * FROM shares`;
    const minerStats = await prisma.$queryRaw`SELECT * FROM miner_statistics`;
    const networkStats = await prisma.$queryRaw`SELECT * FROM network_statistics`;
    const vendorProfiles = await prisma.$queryRaw`SELECT * FROM vendor_profiles`;
    const computeOrders = await prisma.$queryRaw`SELECT * FROM compute_orders`;
    const computeAssignments = await prisma.$queryRaw`SELECT * FROM compute_assignments`;

    // Save all data to JSON files
    const backup = {
      timestamp: new Date().toISOString(),
      users,
      miners,
      coins,
      pools,
      systemConfig,
      payments,
      shares,
      minerStats,
      networkStats,
      vendorProfiles,
      computeOrders,
      computeAssignments
    };

    fs.writeFileSync(
      path.join(backupDir, 'database-backup.json'),
      JSON.stringify(backup, null, 2)
    );

    console.log('✅ Backup completed successfully!');
    console.log(`Backed up:`);
    console.log(`  - ${users.length} users`);
    console.log(`  - ${miners.length} miners`);
    console.log(`  - ${coins.length} coins`);
    console.log(`  - ${pools.length} pools`);
    console.log(`  - ${systemConfig.length} system configs`);
    console.log(`  - ${payments.length} payments`);
    console.log(`  - ${shares.length} shares`);
    console.log(`  - ${minerStats.length} miner statistics`);
    console.log(`  - ${networkStats.length} network statistics`);
    console.log(`  - ${vendorProfiles.length} vendor profiles`);
    console.log(`  - ${computeOrders.length} compute orders`);
    console.log(`  - ${computeAssignments.length} compute assignments`);
    console.log(`\nBackup saved to: ${path.join(backupDir, 'database-backup.json')}`);

  } catch (error) {
    console.error('❌ Error during backup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupData();
