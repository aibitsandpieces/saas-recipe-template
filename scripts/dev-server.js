const { PortUtils } = require('./port-utils');
const { spawn } = require('child_process');
const readline = require('readline');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function startDevServer() {
  const targetPort = process.env.PORT || process.env.DEV_PORT || 3002;
  const forceMode = process.argv.includes('--force');

  log(`🚀 Starting Next.js dev server on port ${targetPort}...`, 'blue');

  try {
    // 1. Check if port is available
    const portStatus = await PortUtils.getPortStatus(targetPort);

    if (portStatus.status === 'available') {
      log(`✅ Port ${targetPort} is available`, 'green');
      return launchNextJS(targetPort);
    }

    // 2. Port is occupied - analyze the situation
    log(`⚠️  Port ${targetPort} is occupied`, 'yellow');
    const { process, isNextJS } = portStatus;

    log(`   Process: ${process.name} (PID: ${process.pid})`, 'reset');
    if (process.command) {
      log(`   Command: ${process.command}`, 'reset');
    }

    // 3. Handle Next.js process conflict
    if (isNextJS) {
      log(`🟡 Found existing Next.js process`, 'yellow');

      if (forceMode) {
        log(`🔧 Force mode: Automatically killing existing process...`, 'blue');
        const killed = await PortUtils.killProcess(process.pid);

        if (killed) {
          log(`✅ Killed existing Next.js process (PID: ${process.pid})`, 'green');
          // Wait a moment for port to be freed
          await new Promise(resolve => setTimeout(resolve, 1000));
          return launchNextJS(targetPort);
        } else {
          log(`❌ Failed to kill existing process`, 'red');
          return suggestAlternatives(targetPort);
        }
      } else {
        // Interactive mode - ask user what to do
        log(`\nOptions:`, 'bold');
        log(`  1) Kill existing process and use port ${targetPort}`, 'reset');
        log(`  2) Find alternative port`, 'reset');
        log(`  3) Cancel`, 'reset');

        const choice = await askQuestion('\nChoose an option (1/2/3): ');

        switch (choice) {
          case '1':
            log(`🔧 Killing existing process...`, 'blue');
            const killed = await PortUtils.killProcess(process.pid);

            if (killed) {
              log(`✅ Killed existing Next.js process`, 'green');
              await new Promise(resolve => setTimeout(resolve, 1000));
              return launchNextJS(targetPort);
            } else {
              log(`❌ Failed to kill process`, 'red');
              return suggestAlternatives(targetPort);
            }

          case '2':
            return suggestAlternatives(targetPort);

          case '3':
            log(`⏹️  Cancelled`, 'yellow');
            process.exit(0);

          default:
            log(`❌ Invalid choice. Exiting.`, 'red');
            process.exit(1);
        }
      }
    } else {
      // 4. Non-Next.js process - suggest alternatives
      log(`🔴 Port occupied by non-Next.js process`, 'red');
      return suggestAlternatives(targetPort);
    }

  } catch (error) {
    log(`❌ Error during startup: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function suggestAlternatives(originalPort) {
  log(`\n🔍 Looking for alternative ports...`, 'blue');

  const alternativePort = await PortUtils.findAvailablePort(originalPort + 1);

  if (alternativePort) {
    log(`✅ Found available port: ${alternativePort}`, 'green');

    if (process.argv.includes('--force')) {
      log(`🚀 Auto-starting on port ${alternativePort}`, 'blue');
      return launchNextJS(alternativePort);
    } else {
      const proceed = await askQuestion(`Use port ${alternativePort}? (y/n): `);

      if (proceed === 'y' || proceed === 'yes') {
        return launchNextJS(alternativePort);
      } else {
        log(`⏹️  Cancelled`, 'yellow');
        process.exit(0);
      }
    }
  } else {
    log(`❌ No available ports found in range ${originalPort + 1}-${originalPort + 10}`, 'red');
    log(`💡 Try manually stopping other processes or use different ports`, 'yellow');
    process.exit(1);
  }
}

function launchNextJS(port) {
  log(`\n🚀 Launching Next.js dev server on port ${port}...`, 'green');

  const devServer = spawn('npx', ['next', 'dev', '--turbopack', '--port', port.toString()], {
    stdio: 'inherit',
    env: { ...process.env, PORT: port.toString() },
    shell: process.platform === 'win32' // Use shell on Windows
  });

  // Handle process events
  devServer.on('error', (error) => {
    log(`❌ Failed to start dev server: ${error.message}`, 'red');
    process.exit(1);
  });

  devServer.on('close', (code) => {
    if (code !== 0) {
      log(`❌ Dev server exited with code ${code}`, 'red');
    }
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log(`\n🛑 Shutting down dev server...`, 'yellow');
    devServer.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    log(`\n🛑 Terminating dev server...`, 'yellow');
    devServer.kill('SIGTERM');
  });
}

// Entry point
if (require.main === module) {
  startDevServer().catch(error => {
    log(`💥 Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { startDevServer };