import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Building client and server...');

// Build client
console.log('\nBuilding client...');
process.chdir(join(__dirname, 'client'));
execSync('npm run build', { stdio: 'inherit' });

// Build server
console.log('\nBuilding server...');
process.chdir(join(__dirname, 'server'));

if (!existsSync(join(__dirname, 'server', 'dist'))) {
    mkdirSync(join(__dirname, 'server', 'dist'));
}

console.log('\nBuild complete!');