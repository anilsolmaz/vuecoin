const { spawn } = require('child_process');
const path = require('path');

function runCommand(command, args, cwd, prefix, colorCode) {
    // shell: true is important for npm commands on some systems
    const process = spawn(command, args, { cwd, shell: true, stdio: 'pipe' });

    // Simple color codes: 36=Cyan, 32=Green, 31=Red, 0=Reset
    const color = colorCode || '0';

    process.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.log(`\x1b[${color}m[${prefix}]\x1b[0m ${line}`);
            }
        });
    });

    process.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            // Some tools use stderr for info/warnings (like webpack build progress)
            // So we just print it, maybe with red prefix if needed, but keeping simple for now
            if (line.trim()) {
                console.error(`\x1b[${color}m[${prefix}]\x1b[0m ${line}`);
            }
        });
    });

    process.on('close', (code) => {
        console.log(`[${prefix}] process exited with code ${code}`);
    });

    return process;
}

console.log('🚀 Starting VueCoin Development Environment...');
console.log('Press Ctrl+C to stop all processes.');

// Start Backend (Cyan)
runCommand('npm', ['run', 'dev'], __dirname, 'BACKEND', '36');

// Start Frontend (Green)
// Wait a bit to let backend start? Not strictly necessary but usually cleaner logs.
setTimeout(() => {
    runCommand('npm', ['run', 'serve'], path.join(__dirname, 'client'), 'FRONTEND', '32');
}, 2000);
