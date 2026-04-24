const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('Source directory does not exist:', src);
    return;
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else if (entry.isFile()) {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (e) {
        console.warn('Failed to copy', srcPath, e);
      }
    }
  }
}

const workspaceRoot = process.cwd();
// Adjust these paths if your output location differs
const outputRoot = path.join(workspaceRoot, 'dist', 'esdop_front');
const from = path.join(outputRoot, 'browser', 'media');
const to = path.join(outputRoot, 'assets', 'media');

console.log('Copying media from', from, 'to', to);
copyDirSync(from, to);
console.log('Media copy finished.');
