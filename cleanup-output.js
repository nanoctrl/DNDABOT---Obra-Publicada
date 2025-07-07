#!/usr/bin/env node

/**
 * Output Cleanup Script for registro-obras-bot
 * 
 * This script cleans old analysis files, logs, screenshots, and run artifacts
 * to prepare the project for fresh logging and debugging sessions.
 * 
 * Features:
 * - Selective cleanup with different levels (basic, full, all)
 * - Age-based filtering (keep recent files)
 * - Size reporting before/after cleanup
 * - Safe mode with confirmation prompts
 * - Detailed logging of cleanup actions
 * 
 * Usage:
 *   node cleanup-output.js [options]
 *   npm run clean:output [-- options]
 * 
 * Options:
 *   --level=basic|full|all    Cleanup level (default: basic)
 *   --keep-days=N            Keep files newer than N days (default: 3)
 *   --dry-run               Show what would be deleted without deleting
 *   --force                 Skip confirmation prompts
 *   --quiet                 Minimal output
 *   --help                  Show this help
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, 'output'),
  defaultKeepDays: 3,
  defaultLevel: 'basic',
  
  // Cleanup levels define what gets cleaned
  levels: {
    basic: {
      description: 'Clean old screenshots and basic logs',
      targets: [
        'screenshots/debug',
        'screenshots/error', 
        'screenshots/milestone',
        'logs'
      ],
      keepDays: 3,
      excludePatterns: []
    },
    full: {
      description: 'Clean all run artifacts and analysis files',
      targets: [
        'screenshots',
        'logs',
        'runs',
        'state',
        'analysis',
        'debug_runs'
      ],
      keepDays: 1,
      excludePatterns: []
    },
    all: {
      description: 'Clean everything except directory structure',
      targets: ['*'],
      keepDays: 0,
      excludePatterns: ['.gitkeep', 'README.md']
    }
  }
};

class OutputCleaner {
  constructor() {
    this.stats = {
      filesScanned: 0,
      filesDeleted: 0,
      directoriesDeleted: 0,
      bytesFreed: 0,
      errors: []
    };
    this.options = this.parseArguments();
  }

  parseArguments() {
    const args = process.argv.slice(2);
    const options = {
      level: CONFIG.defaultLevel,
      keepDays: CONFIG.defaultKeepDays,
      dryRun: false,
      force: false,
      quiet: false,
      help: false
    };

    for (const arg of args) {
      if (arg.startsWith('--level=')) {
        options.level = arg.split('=')[1];
      } else if (arg.startsWith('--keep-days=')) {
        options.keepDays = parseInt(arg.split('=')[1], 10);
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--force') {
        options.force = true;
      } else if (arg === '--quiet') {
        options.quiet = true;
      } else if (arg === '--help') {
        options.help = true;
      }
    }

    return options;
  }

  log(message, force = false) {
    if (!this.options.quiet || force) {
      console.log(message);
    }
  }

  logError(message) {
    console.error(`❌ ${message}`);
    this.stats.errors.push(message);
  }

  showHelp() {
    console.log(`
🧹 Output Cleanup Script for registro-obras-bot

USAGE:
  node cleanup-output.js [options]
  npm run clean:output [-- options]

OPTIONS:
  --level=LEVEL        Cleanup level: basic, full, or all (default: ${CONFIG.defaultLevel})
  --keep-days=N        Keep files newer than N days (default: ${CONFIG.defaultKeepDays})
  --dry-run           Show what would be deleted without deleting
  --force             Skip confirmation prompts  
  --quiet             Minimal output
  --help              Show this help

CLEANUP LEVELS:
${Object.entries(CONFIG.levels).map(([level, config]) => 
  `  ${level.padEnd(8)} ${config.description}`
).join('\n')}

EXAMPLES:
  node cleanup-output.js                    # Basic cleanup, keep 3 days
  node cleanup-output.js --level=full       # Full cleanup, keep 1 day
  node cleanup-output.js --dry-run          # See what would be deleted
  node cleanup-output.js --force --level=all # Delete everything without prompts
`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileAge(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const now = new Date();
      const ageMs = now.getTime() - stats.mtime.getTime();
      return Math.floor(ageMs / (1000 * 60 * 60 * 24)); // days
    } catch (error) {
      return 0;
    }
  }

  getFileSize(filePath) {
    try {
      return fs.statSync(filePath).size;
    } catch (error) {
      return 0;
    }
  }

  shouldKeepFile(filePath, config) {
    const fileName = path.basename(filePath);
    
    // Check exclude patterns
    for (const pattern of config.excludePatterns) {
      if (fileName.includes(pattern)) {
        return true;
      }
    }

    // Check age
    const age = this.getFileAge(filePath);
    return age <= this.options.keepDays;
  }

  async scanDirectory(dirPath, relativePath = '') {
    const items = [];
    
    try {
      if (!fs.existsSync(dirPath)) {
        return items;
      }

      const entries = fs.readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const itemRelativePath = path.join(relativePath, entry);
        const stats = fs.statSync(fullPath);
        
        this.stats.filesScanned++;
        
        if (stats.isDirectory()) {
          items.push({
            type: 'directory',
            path: fullPath,
            relativePath: itemRelativePath,
            size: 0,
            age: this.getFileAge(fullPath)
          });
          
          // Recursively scan subdirectory
          const subItems = await this.scanDirectory(fullPath, itemRelativePath);
          items.push(...subItems);
        } else {
          items.push({
            type: 'file',
            path: fullPath,
            relativePath: itemRelativePath,
            size: stats.size,
            age: this.getFileAge(fullPath)
          });
        }
      }
    } catch (error) {
      this.logError(`Error scanning directory ${dirPath}: ${error.message}`);
    }
    
    return items;
  }

  async getTargetItems(config) {
    const allItems = [];
    
    if (config.targets.includes('*')) {
      // Scan entire output directory
      const items = await this.scanDirectory(CONFIG.outputDir);
      allItems.push(...items);
    } else {
      // Scan specific target directories
      for (const target of config.targets) {
        const targetPath = path.join(CONFIG.outputDir, target);
        const items = await this.scanDirectory(targetPath, target);
        allItems.push(...items);
      }
    }
    
    return allItems;
  }

  async deleteItem(item) {
    try {
      if (item.type === 'file') {
        fs.unlinkSync(item.path);
        this.stats.filesDeleted++;
        this.stats.bytesFreed += item.size;
        this.log(`  🗑️  ${item.relativePath} (${this.formatBytes(item.size)})`);
      } else if (item.type === 'directory') {
        // Only delete if directory is empty
        try {
          fs.rmdirSync(item.path);
          this.stats.directoriesDeleted++;
          this.log(`  📁 ${item.relativePath}/`);
        } catch (error) {
          // Directory not empty, that's ok
        }
      }
    } catch (error) {
      this.logError(`Failed to delete ${item.relativePath}: ${error.message}`);
    }
  }

  async getDirectorySize(dirPath) {
    try {
      const result = execSync(`du -sb "${dirPath}" 2>/dev/null || echo "0"`, {
        encoding: 'utf8'
      });
      return parseInt(result.split('\t')[0], 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  async confirmCleanup(itemsToDelete, config) {
    if (this.options.force) {
      return true;
    }

    const totalSize = itemsToDelete.reduce((sum, item) => sum + item.size, 0);
    const fileCount = itemsToDelete.filter(item => item.type === 'file').length;
    const dirCount = itemsToDelete.filter(item => item.type === 'directory').length;

    console.log(`\n🧹 CLEANUP PREVIEW:`);
    console.log(`   Level: ${this.options.level} (${config.description})`);
    console.log(`   Files to delete: ${fileCount}`);
    console.log(`   Directories to clean: ${dirCount}`);
    console.log(`   Space to free: ${this.formatBytes(totalSize)}`);
    console.log(`   Keep files newer than: ${this.options.keepDays} days`);
    
    if (this.options.dryRun) {
      console.log(`\n🔍 DRY RUN - No files will actually be deleted\n`);
      return true;
    }

    console.log(`\n⚠️  This will permanently delete ${fileCount} files!`);
    console.log(`Are you sure you want to continue? (y/N): `);

    return new Promise((resolve) => {
      const stdin = process.stdin;
      stdin.setEncoding('utf8');
      stdin.resume();
      
      stdin.once('data', (data) => {
        const input = data.toString().trim().toLowerCase();
        stdin.pause();
        resolve(input === 'y' || input === 'yes');
      });
    });
  }

  async run() {
    if (this.options.help) {
      this.showHelp();
      return;
    }

    const config = CONFIG.levels[this.options.level];
    if (!config) {
      this.logError(`Invalid cleanup level: ${this.options.level}`);
      this.logError(`Valid levels: ${Object.keys(CONFIG.levels).join(', ')}`);
      process.exit(1);
    }

    this.log(`\n🧹 Starting Output Cleanup`);
    this.log(`📁 Output directory: ${CONFIG.outputDir}`);
    
    if (!fs.existsSync(CONFIG.outputDir)) {
      this.log(`✅ Output directory doesn't exist - nothing to clean`);
      return;
    }

    // Get initial directory size
    const initialSize = await this.getDirectorySize(CONFIG.outputDir);
    this.log(`📊 Current size: ${this.formatBytes(initialSize)}`);

    // Override keepDays from config if not specified in options
    if (process.argv.every(arg => !arg.startsWith('--keep-days='))) {
      this.options.keepDays = config.keepDays;
    }

    this.log(`🔍 Scanning for cleanup targets...`);
    
    // Get all items in target directories
    const allItems = await this.getTargetItems(config);
    
    // Filter items to delete (respecting age and exclude patterns)
    const itemsToDelete = allItems.filter(item => !this.shouldKeepFile(item.path, config));
    
    this.log(`📊 Scan complete:`);
    this.log(`   Total items scanned: ${this.stats.filesScanned}`);
    this.log(`   Items marked for deletion: ${itemsToDelete.length}`);

    if (itemsToDelete.length === 0) {
      this.log(`✅ Nothing to clean - all files are within retention period`);
      return;
    }

    // Show confirmation
    const confirmed = await this.confirmCleanup(itemsToDelete, config);
    if (!confirmed) {
      this.log(`❌ Cleanup cancelled by user`);
      return;
    }

    // Perform cleanup
    this.log(`\n🗑️  Starting cleanup...`);
    
    // Sort by path depth (deepest first) to handle nested directories properly
    itemsToDelete.sort((a, b) => {
      const depthA = a.relativePath.split('/').length;
      const depthB = b.relativePath.split('/').length;
      return depthB - depthA;
    });

    for (const item of itemsToDelete) {
      if (!this.options.dryRun) {
        await this.deleteItem(item);
      } else {
        this.log(`  🔍 Would delete: ${item.relativePath} (${this.formatBytes(item.size)})`);
        this.stats.filesDeleted++;
        this.stats.bytesFreed += item.size;
      }
    }

    // Final report
    const finalSize = await this.getDirectorySize(CONFIG.outputDir);
    const actualFreed = initialSize - finalSize;

    this.log(`\n✅ Cleanup completed!`, true);
    this.log(`📊 Summary:`, true);
    this.log(`   Files deleted: ${this.stats.filesDeleted}`, true);
    this.log(`   Directories cleaned: ${this.stats.directoriesDeleted}`, true);
    this.log(`   Space freed: ${this.formatBytes(actualFreed)}`, true);
    this.log(`   Final size: ${this.formatBytes(finalSize)}`, true);
    
    if (this.stats.errors.length > 0) {
      this.log(`⚠️  Errors encountered: ${this.stats.errors.length}`, true);
      for (const error of this.stats.errors) {
        this.log(`   ${error}`, true);
      }
    }

    if (this.options.dryRun) {
      this.log(`\n🔍 This was a dry run - no files were actually deleted`, true);
    }
  }
}

// Run the cleanup
if (require.main === module) {
  const cleaner = new OutputCleaner();
  cleaner.run().catch(error => {
    console.error(`❌ Cleanup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = OutputCleaner;