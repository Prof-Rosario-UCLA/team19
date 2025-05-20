import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, cpSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;

console.log('Building client and server...');

// Build client
console.log('\nBuilding client...');
process.chdir(join(rootDir, 'client'));
execSync('npm run build', { stdio: 'inherit' });

// Ensure server dist directory exists
const serverDistDir = join(rootDir, 'server', 'dist');
if (!existsSync(serverDistDir)) {
    mkdirSync(serverDistDir, { recursive: true });
}

// Ensure server public directory exists
const serverPublicDir = join(rootDir, 'server', 'public');
if (!existsSync(serverPublicDir)) {
    mkdirSync(serverPublicDir, { recursive: true });
}

// Copy client build to server public directory
console.log('\nCopying client build to server.');
const clientBuildDir = join(rootDir, 'client', 'dist');
cpSync(clientBuildDir, serverPublicDir, { recursive: true });

// Build server
console.log('\nBuilding server...');
process.chdir(join(rootDir, 'server'));
execSync('npm run build', { stdio: 'inherit' })

console.log('\nBuild complete');