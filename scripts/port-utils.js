const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

/**
 * Cross-platform port detection and process management
 */
class PortUtils {
  static async isPortInUse(port) {
    try {
      const isWindows = os.platform() === 'win32';

      if (isWindows) {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        return stdout.trim().length > 0;
      } else {
        // macOS/Linux
        const { stdout } = await execAsync(`lsof -i :${port}`);
        return stdout.trim().length > 0;
      }
    } catch (error) {
      // Command failed means port is likely free
      return false;
    }
  }

  static async findProcessUsingPort(port) {
    try {
      const isWindows = os.platform() === 'win32';

      if (isWindows) {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        if (!stdout.trim()) return null;

        // Extract PID from netstat output
        const lines = stdout.trim().split('\n');
        const pidMatch = lines[0].match(/\s+(\d+)\s*$/);
        if (!pidMatch) return null;

        const pid = pidMatch[1];

        // Get process details
        const { stdout: taskOutput } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
        const csvLines = taskOutput.trim().split('\n');
        if (csvLines.length < 2) return null;

        const processInfo = csvLines[1].split(',').map(field => field.replace(/"/g, ''));
        return {
          pid: parseInt(pid),
          name: processInfo[0],
          command: processInfo[0]
        };
      } else {
        // macOS/Linux
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        if (!stdout.trim()) return null;

        const pid = parseInt(stdout.trim().split('\n')[0]);
        const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o pid,ppid,comm,args --no-headers`);

        const parts = psOutput.trim().split(/\s+/);
        return {
          pid,
          ppid: parseInt(parts[1]),
          name: parts[2],
          command: parts.slice(3).join(' ')
        };
      }
    } catch (error) {
      console.error('Error finding process:', error.message);
      return null;
    }
  }

  static async isNextJSProcess(processInfo) {
    if (!processInfo) return false;

    const { name, command } = processInfo;

    // Check for Next.js patterns
    const nextPatterns = [
      /next.*dev/i,
      /next-server/i,
      /node.*next/i,
      /turbopack/i,
      /.next/i
    ];

    const fullCommand = `${name} ${command || ''}`;
    return nextPatterns.some(pattern => pattern.test(fullCommand));
  }

  static async killProcess(pid, force = false) {
    try {
      const isWindows = os.platform() === 'win32';

      if (isWindows) {
        const command = force ? `taskkill /PID ${pid} /F` : `taskkill /PID ${pid}`;
        await execAsync(command);
      } else {
        const signal = force ? 'SIGKILL' : 'SIGTERM';
        await execAsync(`kill -${signal} ${pid}`);
      }

      return true;
    } catch (error) {
      console.error(`Error killing process ${pid}:`, error.message);
      return false;
    }
  }

  static async findAvailablePort(startPort = 3002, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      const inUse = await this.isPortInUse(port);
      if (!inUse) {
        return port;
      }
    }
    return null;
  }

  static async getPortStatus(port) {
    const inUse = await this.isPortInUse(port);
    if (!inUse) {
      return { port, status: 'available' };
    }

    const process = await this.findProcessUsingPort(port);
    const isNextJS = await this.isNextJSProcess(process);

    return {
      port,
      status: 'occupied',
      process,
      isNextJS
    };
  }
}

// CLI interface when run directly
async function main() {
  const command = process.argv[2];
  const targetPort = parseInt(process.argv[3]) || 3002;

  switch (command) {
    case 'check':
      console.log('🔍 Checking development ports...\n');

      for (let port = 3002; port <= 3005; port++) {
        const status = await PortUtils.getPortStatus(port);

        if (status.status === 'available') {
          console.log(`✅ Port ${port}: Available`);
        } else {
          const nextJSIndicator = status.isNextJS ? '🟡 Next.js' : '🔴 Other';
          console.log(`❌ Port ${port}: Occupied by ${status.process?.name || 'unknown'} (PID: ${status.process?.pid}) ${nextJSIndicator}`);
          if (status.process?.command) {
            console.log(`   Command: ${status.process.command}`);
          }
        }
      }
      break;

    case 'clean':
      console.log('🧹 Cleaning up Next.js processes...\n');

      const portsToCheck = [3002, 3003, 3004, 3005];
      let cleanedCount = 0;

      for (const port of portsToCheck) {
        const status = await PortUtils.getPortStatus(port);

        if (status.status === 'occupied' && status.isNextJS) {
          console.log(`🎯 Found Next.js process on port ${port} (PID: ${status.process.pid})`);
          console.log(`   Command: ${status.process.command}`);

          // Ask for confirmation
          console.log('❓ Kill this process? [y/N]');

          // For automated cleanup, default to yes if --force flag is present
          const force = process.argv.includes('--force');

          if (force) {
            console.log('🔧 Force mode: Killing process...');
            const success = await PortUtils.killProcess(status.process.pid);
            if (success) {
              console.log(`✅ Killed process ${status.process.pid} on port ${port}`);
              cleanedCount++;
            } else {
              console.log(`❌ Failed to kill process ${status.process.pid}`);
            }
          } else {
            console.log('⏭️  Skipping (use --force to auto-kill)');
          }
        }
      }

      if (cleanedCount === 0) {
        console.log('✨ No Next.js processes found to clean up');
      } else {
        console.log(`\n✅ Cleaned up ${cleanedCount} Next.js process(es)`);
      }
      break;

    default:
      console.log('Port Utils - Development Server Port Management');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/port-utils.js check        # Check port status');
      console.log('  node scripts/port-utils.js clean        # Clean Next.js processes');
      console.log('  node scripts/port-utils.js clean --force # Auto-kill without confirmation');
      console.log('');
      console.log('Examples:');
      console.log('  npm run dev:check   # Check what\'s using development ports');
      console.log('  npm run dev:clean   # Clean up Next.js processes');
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PortUtils };