#!/usr/bin/env node
import sharp from 'sharp';
import { promises as fs } from 'fs';

async function createTestImage() {
  await fs.mkdir('test-images', { recursive: true });
  
  // Create a simple test image with sharp
  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 3,
      background: { r: 255, g: 100, b: 0 }
    }
  })
  .jpeg()
  .toFile('test-images/sample.jpg');
  
  console.log('Created test image: test-images/sample.jpg');
  
  // Verify the image
  const metadata = await sharp('test-images/sample.jpg').metadata();
  console.log('Image metadata:', metadata);
}

createTestImage().catch(console.error);