import { exec } from 'child_process';
import fs from 'fs';

console.log('🔄 Git Auto-Saver started. Watching for changes in src/ directory...');

let timeout;

// Watch the src directory for any file changes
try {
  fs.watch('./src', { recursive: true }, (eventType, filename) => {
      // Clear the timeout to debounce frequent saves
      if (timeout) clearTimeout(timeout);
      
      // Wait 2 seconds before committing to group rapid changes
      timeout = setTimeout(() => {
          // Check if there are changes to commit. If there are, commit them.
          const commitMsg = filename ? `Auto save: Updated ${filename}` : 'Auto save: File update';
          exec(`git add . && git diff --cached --quiet || git commit -m "${commitMsg}"`, (error, stdout, stderr) => {
              if (error) return; // If there's an error (e.g., nothing to commit), ignore
              
              const output = stdout.trim();
              if (output && !output.includes('nothing to commit')) {
                  console.log(`✅ [Git Auto-Save] Snapshot created for: ${filename || 'file changes'}`);
              }
          });
      }, 2000); 
  });
} catch (e) {
  console.log('⚠️ Could not start auto_git watcher:', e.message);
}
