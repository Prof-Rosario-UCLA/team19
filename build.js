import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;

console.log('=== SIMPLIFIED BUILD PROCESS ===');

// Clean any existing builds
console.log('\n1. Cleaning previous builds...');
const serverDistDir = join(rootDir, 'server', 'dist');
const serverPublicDir = join(rootDir, 'server', 'public');

if (existsSync(serverDistDir)) {
    rmSync(serverDistDir, { recursive: true });
}
if (existsSync(serverPublicDir)) {
    rmSync(serverPublicDir, { recursive: true });
}

// Build client first
console.log('\n2. Building client...');
process.chdir(join(rootDir, 'client'));
execSync('npm run build', { stdio: 'inherit' });

// Copy client build DIRECTLY to server/public (final location)
console.log('\n3. Copying client build to server/public...');
const clientBuildDir = join(rootDir, 'client', 'dist');
cpSync(clientBuildDir, serverPublicDir, { recursive: true });

// Build server
console.log('\n4. Building server...');
process.chdir(join(rootDir, 'server'));
execSync('npm run build', { stdio: 'inherit' });

// Verify final structure
console.log('\n5. FINAL VERIFICATION:');
console.log('server/dist/ contents:');
execSync('ls -la server/dist/', { stdio: 'inherit', cwd: rootDir });
console.log('\nserver/public/ contents:');
execSync('ls -la server/public/', { stdio: 'inherit', cwd: rootDir });

console.log('\nBUILD COMPLETE - Files are in their final locations!');