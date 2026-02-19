/**
 * Master Test Runner
 * Runs all test suites sequentially and reports results.
 * 
 * Usage: NODE_ENV=test node tests/run-all-tests.js
 */
const { execSync } = require('child_process');
const path = require('path');

const testFiles = [
    'test-redis-mock.js',
    'test-functions.js',
    'test-telegram-service.js',
    'test-exchange-monitor.js',
    'test-listing-monitor.js',
    'test-coindata-service.js'
];

let totalPassed = 0;
let totalFailed = 0;
let failedSuites = [];

console.log('╔══════════════════════════════════════════════╗');
console.log('║        VueCoin Test Suite Runner             ║');
console.log('╚══════════════════════════════════════════════╝\n');

for (const file of testFiles) {
    const filePath = path.join(__dirname, file);
    console.log(`\n▶ Running: ${file}`);
    console.log('─'.repeat(50));

    try {
        const output = execSync(`NODE_ENV=test node "${filePath}"`, {
            encoding: 'utf8',
            timeout: 30000,
            env: { ...process.env, NODE_ENV: 'test' }
        });
        console.log(output);

        // Parse results from output
        const match = output.match(/(\d+) passed, (\d+) failed/);
        if (match) {
            totalPassed += parseInt(match[1]);
            totalFailed += parseInt(match[2]);
            if (parseInt(match[2]) > 0) failedSuites.push(file);
        }
    } catch (e) {
        console.error(e.stdout || e.message);
        if (e.stderr) console.error(e.stderr);
        failedSuites.push(file);

        // Try to parse even from failed output
        const match = (e.stdout || '').match(/(\d+) passed, (\d+) failed/);
        if (match) {
            totalPassed += parseInt(match[1]);
            totalFailed += parseInt(match[2]);
        } else {
            totalFailed++;
        }
    }
}

console.log('\n' + '═'.repeat(50));
console.log(`\n📊 FINAL RESULTS: ${totalPassed} passed, ${totalFailed} failed`);

if (failedSuites.length > 0) {
    console.log(`\n❌ Failed suites:`);
    failedSuites.forEach(f => console.log(`   - ${f}`));
    process.exitCode = 1;
} else {
    console.log('\n✅ All test suites passed!');
}
