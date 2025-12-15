const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'backend', 'server.js');

console.log("Starting backend server to check for AVRE signature...");

const server = spawn('node', [serverPath], {
    env: { ...process.env, NODE_ENV: 'test', PORT: '3001' } // Use test env to avoid some checks, but keep logging
});

let output = '';

server.stdout.on('data', (data) => {
    output += data.toString();
    // Check for signature immediately
    if (output.includes('LEGACY EDITION') && output.includes('AVRE')) {
        console.log("✅ AVRE Signature found in logs!");
        console.log(output);
        server.kill();
        process.exit(0);
    }
});

server.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log("Timeout waiting for signature.");
    console.log("Output so far:\n" + output);
    server.kill();
    process.exit(1);
}, 10000);
