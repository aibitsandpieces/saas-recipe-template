# Dev Server Port Management

This directory contains utilities for smart development server port management, solving the common problem of port conflicts when running `npm run dev`.

## Files

### `dev-server.js` - Smart Dev Server Launcher
The main entry point that replaces the original `npm run dev` command. Features:
- **Port conflict detection** - Automatically checks if the target port is available
- **Process identification** - Identifies what process is using a conflicted port
- **Next.js process detection** - Recognizes existing Next.js dev servers
- **Interactive resolution** - Offers multiple options when conflicts arise:
  - Kill existing Next.js process and use target port
  - Find and use alternative port
  - Manual intervention
- **Force mode** - Automatic conflict resolution with `--force` flag
- **Cross-platform** - Works on Windows, macOS, and Linux

### `port-utils.js` - Port Management Utilities
Core utilities for cross-platform port and process management:
- **Port availability checking** - `isPortInUse(port)`
- **Process identification** - `findProcessUsingPort(port)`
- **Next.js detection** - `isNextJSProcess(processInfo)`
- **Process termination** - `killProcess(pid, force)`
- **Alternative port finding** - `findAvailablePort(startPort)`
- **Comprehensive status** - `getPortStatus(port)`

### `port-checker.js` - Standalone Port Checker
Simple utility for checking the status of development ports:
- Shows which ports are available/occupied
- Identifies process names and PIDs
- Detects Next.js vs other processes
- Provides helpful commands for cleanup

## Usage

### Standard Development
```bash
npm run dev          # Smart launcher with conflict resolution
```

### Port Management Commands
```bash
npm run dev:check    # Show what's using development ports
npm run dev:clean    # Clean up Next.js processes (interactive)
npm run dev:force    # Start with automatic cleanup
```

### Direct Script Usage
```bash
# Check specific port
node scripts/port-checker.js 3002

# Clean with force (no confirmation)
node scripts/port-utils.js clean --force

# Start dev server with force mode
node scripts/dev-server.js --force
```

## Configuration

### Environment Variables (`.env.local`)
```env
PORT=3002                           # Primary development port
DEV_PORT=3002                       # Fallback development port
NEXT_PUBLIC_SITE_URL=http://localhost:3002  # Consistent with dev port
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "node scripts/dev-server.js",
    "dev:check": "node scripts/port-utils.js check",
    "dev:clean": "node scripts/port-utils.js clean",
    "dev:force": "node scripts/dev-server.js --force"
  }
}
```

## Conflict Resolution Flow

1. **Check target port** (default: 3002)
2. **If available** → Start Next.js immediately
3. **If occupied** → Identify the process
4. **If Next.js process** → Offer cleanup options
5. **If other process** → Suggest alternative ports
6. **Start dev server** on resolved port

## Cross-Platform Support

### Windows
- Uses `netstat -ano` for port detection
- Uses `tasklist` for process identification
- Uses `taskkill` for process termination

### macOS/Linux
- Uses `lsof -i` for port detection
- Uses `ps` for process identification
- Uses `kill` for process termination

## Safety Features

- **Process verification** - Only kills confirmed Next.js processes
- **Interactive confirmation** - Asks before killing processes (unless `--force`)
- **Detailed logging** - Shows exactly what will be killed
- **Graceful fallback** - Suggests alternatives if cleanup fails
- **Non-destructive** - Won't kill non-Next.js processes

## Error Scenarios

### Port Conflict with Non-Next.js Process
- **Detection**: Process doesn't match Next.js patterns
- **Action**: Suggest alternative ports (3003, 3004, etc.)
- **Fallback**: Manual intervention instructions

### Failed Process Cleanup
- **Detection**: `taskkill`/`kill` command fails
- **Action**: Log error details
- **Fallback**: Suggest alternative ports

### No Available Ports
- **Detection**: All ports 3002-3012 are occupied
- **Action**: Error message with manual cleanup suggestions
- **Fallback**: Exit with helpful instructions

## Benefits

✅ **Consistent Port Usage** - Always uses 3002 when available
✅ **Zero Manual Intervention** - Handles common conflicts automatically
✅ **Safe Process Management** - Only touches Next.js processes
✅ **Clear User Feedback** - Explains what's happening and why
✅ **Fallback Options** - Multiple resolution strategies
✅ **Cross-Platform** - Works on Windows, macOS, Linux
✅ **Claude Code Friendly** - Predictable behavior for automation

## Development Notes

This implementation was created to solve the common development workflow issue where:
1. Previous Next.js dev server wasn't properly terminated
2. Port 3002 becomes occupied, causing `npm run dev` to fail
3. Developers waste time manually finding and killing processes
4. Inconsistent port usage breaks webhook URLs and redirects

The smart launcher detects these scenarios and provides appropriate resolution options while maintaining safety through process verification and user confirmation.