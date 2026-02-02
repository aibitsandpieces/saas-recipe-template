const { exec } = require('child_process');
const path = require('path');

// Simple script to run the department cleanup
async function runCleanup() {
  console.log('🔧 Starting department cleanup process...');

  // We'll execute the cleanup using the Next.js environment
  const command = 'npm run dev -- --turbo & sleep 5 && curl -X POST http://localhost:3000/api/admin/cleanup-departments && killall node';

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Execution error: ${error}`);
      return;
    }

    console.log(`📊 Output: ${stdout}`);
    if (stderr) {
      console.error(`⚠️ Warnings: ${stderr}`);
    }
  });
}

runCleanup();