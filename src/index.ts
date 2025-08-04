#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const server = new Server(
  {
    name: 'imagician',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'resize_image',
      description: 'Resize an image to specified dimensions',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: { type: 'string', description: 'Path to input image' },
          outputPath: { type: 'string', description: 'Path to save resized image' },
          width: { type: 'number', description: 'Target width in pixels' },
          height: { type: 'number', description: 'Target height in pixels' },
          fit: {
            type: 'string',
            enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
            description: 'How the image should be resized to fit',
            default: 'cover'
          },
          preserveAspectRatio: {
            type: 'boolean',
            description: 'Maintain original aspect ratio',
            default: true
          }
        },
        required: ['inputPath', 'outputPath']
      }
    },
    {
      name: 'convert_format',
      description: 'Convert image between formats (jpeg, png, webp, avif)',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: { type: 'string', description: 'Path to input image' },
          outputPath: { type: 'string', description: 'Path to save converted image' },
          format: {
            type: 'string',
            enum: ['jpeg', 'jpg', 'png', 'webp', 'avif'],
            description: 'Target format'
          },
          quality: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            description: 'Quality for lossy formats (1-100)',
            default: 80
          }
        },
        required: ['inputPath', 'outputPath', 'format']
      }
    },
    {
      name: 'crop_image',
      description: 'Crop an image to specified region',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: { type: 'string', description: 'Path to input image' },
          outputPath: { type: 'string', description: 'Path to save cropped image' },
          left: { type: 'number', description: 'Left offset in pixels' },
          top: { type: 'number', description: 'Top offset in pixels' },
          width: { type: 'number', description: 'Width of crop area' },
          height: { type: 'number', description: 'Height of crop area' }
        },
        required: ['inputPath', 'outputPath', 'left', 'top', 'width', 'height']
      }
    },
    {
      name: 'compress_image',
      description: 'Compress an image with quality settings',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: { type: 'string', description: 'Path to input image' },
          outputPath: { type: 'string', description: 'Path to save compressed image' },
          quality: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            description: 'Compression quality (1-100)',
            default: 80
          },
          progressive: {
            type: 'boolean',
            description: 'Use progressive encoding (for JPEG)',
            default: true
          }
        },
        required: ['inputPath', 'outputPath']
      }
    },
    {
      name: 'rotate_image',
      description: 'Rotate an image by specified degrees',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: { type: 'string', description: 'Path to input image' },
          outputPath: { type: 'string', description: 'Path to save rotated image' },
          angle: {
            type: 'number',
            description: 'Rotation angle in degrees (positive = clockwise)'
          },
          background: {
            type: 'string',
            description: 'Background color for exposed areas (hex or named color)',
            default: '#000000'
          }
        },
        required: ['inputPath', 'outputPath', 'angle']
      }
    },
    {
      name: 'flip_image',
      description: 'Flip an image horizontally or vertically',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: { type: 'string', description: 'Path to input image' },
          outputPath: { type: 'string', description: 'Path to save flipped image' },
          direction: {
            type: 'string',
            enum: ['horizontal', 'vertical', 'both'],
            description: 'Flip direction'
          }
        },
        required: ['inputPath', 'outputPath', 'direction']
      }
    },
    {
      name: 'get_image_info',
      description: 'Get metadata and information about an image',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: { type: 'string', description: 'Path to image file' }
        },
        required: ['inputPath']
      }
    },
    {
      name: 'batch_resize',
      description: 'Generate multiple sizes from one image',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: { type: 'string', description: 'Path to input image' },
          outputDir: { type: 'string', description: 'Directory to save resized images' },
          sizes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                width: { type: 'number', description: 'Width in pixels' },
                height: { type: 'number', description: 'Height in pixels' },
                suffix: { type: 'string', description: 'Suffix to add to filename' }
              },
              required: ['width', 'suffix']
            },
            description: 'Array of sizes to generate'
          },
          format: {
            type: 'string',
            enum: ['jpeg', 'jpg', 'png', 'webp', 'avif'],
            description: 'Output format for all sizes'
          }
        },
        required: ['inputPath', 'outputDir', 'sizes']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as { name: string; arguments: any };

  try {
    switch (name) {
      case 'resize_image': {
        const { inputPath, outputPath, width, height, fit = 'cover', preserveAspectRatio = true } = args;
        
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        let pipeline = sharp(inputPath);
        
        if (width || height) {
          pipeline = pipeline.resize({
            width: width || undefined,
            height: height || undefined,
            fit: fit as any,
            withoutEnlargement: preserveAspectRatio
          });
        }
        
        await pipeline.toFile(outputPath);
        
        return {
          content: [
            {
              type: 'text',
              text: `Image resized successfully. Saved to: ${outputPath}`
            }
          ]
        };
      }

      case 'convert_format': {
        const { inputPath, outputPath, format, quality = 80 } = args;
        
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        let pipeline = sharp(inputPath);
        
        switch (format) {
          case 'jpeg':
          case 'jpg':
            pipeline = pipeline.jpeg({ quality, progressive: true });
            break;
          case 'png':
            pipeline = pipeline.png({ quality });
            break;
          case 'webp':
            pipeline = pipeline.webp({ quality });
            break;
          case 'avif':
            pipeline = pipeline.avif({ quality });
            break;
        }
        
        await pipeline.toFile(outputPath);
        
        return {
          content: [
            {
              type: 'text',
              text: `Image converted to ${format} format. Saved to: ${outputPath}`
            }
          ]
        };
      }

      case 'crop_image': {
        const { inputPath, outputPath, left, top, width, height } = args;
        
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        await sharp(inputPath)
          .extract({ left, top, width, height })
          .toFile(outputPath);
        
        return {
          content: [
            {
              type: 'text',
              text: `Image cropped successfully. Saved to: ${outputPath}`
            }
          ]
        };
      }

      case 'compress_image': {
        const { inputPath, outputPath, quality = 80, progressive = true } = args;
        
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        const metadata = await sharp(inputPath).metadata();
        let pipeline = sharp(inputPath);
        
        // Apply compression based on format
        if (metadata.format === 'jpeg') {
          pipeline = pipeline.jpeg({ quality, progressive });
        } else if (metadata.format === 'png') {
          pipeline = pipeline.png({ quality });
        } else if (metadata.format === 'webp') {
          pipeline = pipeline.webp({ quality });
        } else if (metadata.format === 'avif') {
          pipeline = pipeline.avif({ quality });
        }
        
        await pipeline.toFile(outputPath);
        
        const originalSize = (await fs.stat(inputPath)).size;
        const compressedSize = (await fs.stat(outputPath)).size;
        const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        return {
          content: [
            {
              type: 'text',
              text: `Image compressed successfully. Saved to: ${outputPath}\nSize reduction: ${savings}% (${originalSize} → ${compressedSize} bytes)`
            }
          ]
        };
      }

      case 'rotate_image': {
        const { inputPath, outputPath, angle, background = '#000000' } = args;
        
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        await sharp(inputPath)
          .rotate(angle, { background })
          .toFile(outputPath);
        
        return {
          content: [
            {
              type: 'text',
              text: `Image rotated ${angle}° successfully. Saved to: ${outputPath}`
            }
          ]
        };
      }

      case 'flip_image': {
        const { inputPath, outputPath, direction } = args;
        
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        let pipeline = sharp(inputPath);
        
        if (direction === 'horizontal' || direction === 'both') {
          pipeline = pipeline.flop();
        }
        if (direction === 'vertical' || direction === 'both') {
          pipeline = pipeline.flip();
        }
        
        await pipeline.toFile(outputPath);
        
        return {
          content: [
            {
              type: 'text',
              text: `Image flipped ${direction} successfully. Saved to: ${outputPath}`
            }
          ]
        };
      }

      case 'get_image_info': {
        const { inputPath } = args;
        
        const metadata = await sharp(inputPath).metadata();
        const stats = await fs.stat(inputPath);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                channels: metadata.channels,
                bitDepth: metadata.depth,
                colorSpace: metadata.space,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                fileSize: stats.size,
                lastModified: stats.mtime
              }, null, 2)
            }
          ]
        };
      }

      case 'batch_resize': {
        const { inputPath, outputDir, sizes, format } = args;
        
        await fs.mkdir(outputDir, { recursive: true });
        
        const basename = path.basename(inputPath, path.extname(inputPath));
        const results = [];
        
        for (const size of sizes) {
          const outputName = `${basename}${size.suffix}${format ? `.${format}` : path.extname(inputPath)}`;
          const outputPath = path.join(outputDir, outputName);
          
          let pipeline = sharp(inputPath)
            .resize({
              width: size.width,
              height: size.height || undefined,
              fit: 'cover',
              withoutEnlargement: true
            });
          
          if (format) {
            switch (format) {
              case 'jpeg':
              case 'jpg':
                pipeline = pipeline.jpeg({ quality: 80, progressive: true });
                break;
              case 'png':
                pipeline = pipeline.png();
                break;
              case 'webp':
                pipeline = pipeline.webp({ quality: 80 });
                break;
              case 'avif':
                pipeline = pipeline.avif({ quality: 80 });
                break;
            }
          }
          
          await pipeline.toFile(outputPath);
          results.push(outputPath);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Batch resize complete. Generated ${results.length} images:\n${results.join('\n')}`
            }
          ]
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Image processing error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Imagician MCP server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});