import { exec } from 'child_process';
import fs from 'fs';

console.log('🔄 Git Auto-Saver started. Watching for changes...');

let timeout;

// Watch the entire directory for changes
try {
  fs.watch('.', { recursive: true }, (eventType, filename) => {
      // Ignore node_modules, .git, and dist directories
      if (filename && (filename.startsWith('node_modules') || filename.startsWith('.git') || filename.startsWith('dist'))) {
          return;
      }

      // Clear the timeout to debounce frequent saves
      if (timeout) clearTimeout(timeout);
      
      // Wait 10 seconds before committing to prevent Vercel build-spamming/cancellation
      timeout = setTimeout(() => {
          // Check if there are changes to commit
          const commitMsg = filename ? `Auto save: Updated ${filename}` : 'Auto save: File update';
          console.log(`📦 Changes detected in ${filename || 'files'}. Preparing push...`);
          
          exec(`git add . && git diff --cached --quiet || git commit -m "${commitMsg}" && git push`, (error, stdout, stderr) => {
              if (error) {
                  // If push fails (e.g. network), we'll try again on next change
                  return;
              }
              
              const output = stdout.trim();
              if (output && !output.includes('nothing to commit')) {
                  console.log(`🚀 [Vercel Sync] Snapshot successfully pushed to Github for: ${filename || 'changes'}`);
              }
          });
      }, 10000); // 10 seconds debounce
  });
} catch (e) {
  console.log('⚠️ Could not start auto_git watcher:', e.message);
}
