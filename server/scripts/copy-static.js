const fs = require('fs');
const path = require('path');

function copyDir(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

const repoRoot = path.resolve(__dirname, '..', '..');
const serverRoot = path.join(repoRoot, 'server');
const distServerRoot = path.join(repoRoot, 'dist', 'server');
fs.mkdirSync(distServerRoot, { recursive: true });

copyDir(path.join(serverRoot, 'public'), path.join(distServerRoot, 'public'));
copyDir(path.join(serverRoot, 'views'), path.join(distServerRoot, 'views'));
copyDir(path.join(repoRoot, 'assets'), path.join(distServerRoot, 'assets'));
