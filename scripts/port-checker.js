const { PortUtils } = require('./port-utils');

/**
 * Standalone port checker utility
 * Usage: node scripts/port-checker.js [port]
 */

async function checkPortStatus() {
  const targetPort = parseInt(process.argv[2]) || 3002;
  const portsToCheck = process.argv[2] ? [targetPort] : [3002, 3003, 3004, 3005];

  console.log('🔍 Development Port Status Check');
  console.log('='.repeat(40));
  console.log('');

  for (const port of portsToCheck) {
    try {
      const status = await PortUtils.getPortStatus(port);

      if (status.status === 'available') {
        console.log(`✅ Port ${port}: Available`);
      } else {
        const typeIndicator = status.isNextJS ? '🟡 Next.js' : '🔴 Other';
        console.log(`❌ Port ${port}: Occupied ${typeIndicator}`);
        console.log(`   Process: ${status.process?.name || 'unknown'} (PID: ${status.process?.pid})`);

        if (status.process?.command) {
          const command = status.process.command.length > 80
            ? status.process.command.substring(0, 77) + '...'
            : status.process.command;
          console.log(`   Command: ${command}`);
        }

        if (status.isNextJS) {
          console.log(`   💡 This appears to be a Next.js dev server`);
          console.log(`   💡 You can clean it with: npm run dev:clean`);
        }
        console.log('');
      }
    } catch (error) {
      console.log(`❌ Port ${port}: Error checking status - ${error.message}`);
    }
  }

  console.log('');
  console.log('💡 Available commands:');
  console.log('   npm run dev        # Smart dev server launcher');
  console.log('   npm run dev:check  # Check port status');
  console.log('   npm run dev:clean  # Clean Next.js processes');
  console.log('   npm run dev:force  # Auto-start with cleanup');
}

// Run if called directly
if (require.main === module) {
  checkPortStatus().catch(error => {
    console.error('Error checking ports:', error.message);
    process.exit(1);
  });
}

module.exports = { checkPortStatus };