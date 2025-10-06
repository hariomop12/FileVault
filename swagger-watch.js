#!/usr/bin/env node

const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

console.log('🔄 Starting Swagger auto-generation watcher...\n');

// Watch for changes in routes and controllers
const watcher = chokidar.watch([
  'routes/**/*.js',
  'controllers/**/*.js',
  'app.js'
], {
  ignored: [
    /node_modules/,
    /\.git/,
    /docs\/swagger-output\.json/
  ],
  persistent: true,
  ignoreInitial: false
});

let isGenerating = false;
let pendingGeneration = false;

const generateSwagger = () => {
  if (isGenerating) {
    pendingGeneration = true;
    return;
  }

  isGenerating = true;
  console.log('📝 Regenerating Swagger documentation...');
  
  exec('node swagger-autogen.js', (error, stdout, stderr) => {
    isGenerating = false;
    
    if (error) {
      console.error('❌ Error generating swagger docs:', error);
      return;
    }
    
    if (stderr) {
      console.error('⚠️  Swagger generation warning:', stderr);
    }
    
    console.log('✅ Swagger docs updated!');
    console.log(`📄 ${new Date().toLocaleTimeString()}: Documentation refreshed\n`);
    
    // Handle pending generation
    if (pendingGeneration) {
      pendingGeneration = false;
      setTimeout(generateSwagger, 1000); // Debounce
    }
  });
};

// Debounce function to avoid excessive regeneration
let timeout;
const debouncedGenerate = () => {
  clearTimeout(timeout);
  timeout = setTimeout(generateSwagger, 500);
};

watcher
  .on('ready', () => {
    console.log('👀 Watching for changes in:');
    console.log('   - routes/**/*.js');
    console.log('   - controllers/**/*.js');
    console.log('   - app.js\n');
    generateSwagger(); // Initial generation
  })
  .on('change', (filePath) => {
    console.log(`🔄 File changed: ${path.relative(process.cwd(), filePath)}`);
    debouncedGenerate();
  })
  .on('add', (filePath) => {
    console.log(`➕ File added: ${path.relative(process.cwd(), filePath)}`);
    debouncedGenerate();
  })
  .on('unlink', (filePath) => {
    console.log(`➖ File removed: ${path.relative(process.cwd(), filePath)}`);
    debouncedGenerate();
  })
  .on('error', (error) => {
    console.error('❌ Watcher error:', error);
  });

process.on('SIGINT', () => {
  console.log('\n👋 Stopping Swagger watcher...');
  watcher.close();
  process.exit(0);
});