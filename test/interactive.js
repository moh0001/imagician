#!/usr/bin/env node
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import readline from 'readline';

async function downloadSampleImage() {
  const testDir = 'test-images';
  const samplePath = path.join(testDir, 'sample.jpg');
  
  await fs.mkdir(testDir, { recursive: true });
  
  if (!(await fs.access(samplePath).then(() => true).catch(() => false))) {
    console.log('Downloading sample image...');
    const response = await fetch('https://picsum.photos/1920/1080');
    const buffer = await response.arrayBuffer();
    await fs.writeFile(samplePath, Buffer.from(buffer));
    console.log('Sample image downloaded to:', samplePath);
  }
  
  return samplePath;
}

async function testMCPServer() {
  // Ensure we have a sample image
  const samplePath = await downloadSampleImage();
  await fs.mkdir('test-output', { recursive: true });
  
  console.log('\n=== Starting Imagician MCP Server Test ===\n');
  
  // Start the MCP server
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let responseBuffer = '';
  
  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line && line.startsWith('{')) {
        try {
          const response = JSON.parse(line);
          console.log('Response:', JSON.stringify(response, null, 2));
        } catch (e) {
          // Not JSON, ignore
        }
      }
    }
    
    responseBuffer = lines[lines.length - 1];
  });
  
  server.stderr.on('data', (data) => {
    const msg = data.toString();
    if (!msg.includes('Imagician MCP server running')) {
      console.error('Server error:', msg);
    }
  });
  
  // Helper to send request
  const sendRequest = (method, params, id = 1) => {
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };
    console.log('\nSending:', method);
    server.stdin.write(JSON.stringify(request) + '\n');
  };
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test sequence
  console.log('1. Testing resize_image...');
  sendRequest('tools/call', {
    name: 'resize_image',
    arguments: {
      inputPath: samplePath,
      outputPath: 'test-output/resized-800x600.jpg',
      width: 800,
      height: 600,
      fit: 'cover'
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('\n2. Testing convert_format...');
  sendRequest('tools/call', {
    name: 'convert_format',
    arguments: {
      inputPath: samplePath,
      outputPath: 'test-output/converted.webp',
      format: 'webp',
      quality: 85
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('\n3. Testing get_image_info...');
  sendRequest('tools/call', {
    name: 'get_image_info',
    arguments: {
      inputPath: samplePath
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('\n4. Testing batch_resize...');
  sendRequest('tools/call', {
    name: 'batch_resize',
    arguments: {
      inputPath: samplePath,
      outputDir: 'test-output',
      sizes: [
        { width: 150, suffix: '-thumb' },
        { width: 300, suffix: '-small' },
        { width: 600, suffix: '-medium' }
      ]
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // List output files
  console.log('\n=== Generated Files ===');
  const files = await fs.readdir('test-output');
  for (const file of files) {
    const stats = await fs.stat(path.join('test-output', file));
    console.log(`- ${file} (${stats.size} bytes)`);
  }
  
  server.kill();
  console.log('\n=== Test Complete ===');
}

testMCPServer().catch(console.error);