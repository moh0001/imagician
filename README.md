# Imagician - MCP Image Editor

A Model Context Protocol (MCP) server for comprehensive image editing operations including resizing, format conversion, cropping, compression, and more.

## Features

- **Resize**: Change image dimensions with various fit options
- **Format Conversion**: Convert between JPEG, PNG, WebP, and AVIF
- **Crop**: Extract specific regions from images
- **Compress**: Reduce file size with quality control
- **Rotate**: Rotate images by any angle
- **Flip**: Mirror images horizontally or vertically
- **Batch Processing**: Generate multiple sizes from a single image
- **Metadata**: Extract image information and properties

## Installation

### From npm

```bash
npm install -g @flowy11/imagician
```

### From source

```bash
git clone https://github.com/flowy11/imagician.git
cd imagician
npm install
npm run build
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

### If installed globally via npm:
```json
{
  "mcpServers": {
    "imagician": {
      "command": "imagician"
    }
  }
}
```

### If installed from source:
```json
{
  "mcpServers": {
    "imagician": {
      "command": "node",
      "args": ["/path/to/imagician/dist/index.js"]
    }
  }
}
```

## Available Tools

### resize_image
Resize an image to specified dimensions with various fit options.

```
Parameters:
- inputPath: Path to input image
- outputPath: Path to save resized image
- width: Target width in pixels (optional)
- height: Target height in pixels (optional)
- fit: How to resize (cover, contain, fill, inside, outside)
- preserveAspectRatio: Maintain aspect ratio (default: true)
```

### convert_format
Convert between image formats with quality control.

```
Parameters:
- inputPath: Path to input image
- outputPath: Path to save converted image
- format: Target format (jpeg, png, webp, avif)
- quality: Quality for lossy formats (1-100, default: 80)
```

### crop_image
Extract a specific region from an image.

```
Parameters:
- inputPath: Path to input image
- outputPath: Path to save cropped image
- left: Left offset in pixels
- top: Top offset in pixels
- width: Width of crop area
- height: Height of crop area
```

### compress_image
Reduce image file size with quality settings.

```
Parameters:
- inputPath: Path to input image
- outputPath: Path to save compressed image
- quality: Compression quality (1-100, default: 80)
- progressive: Use progressive encoding for JPEG (default: true)
```

### rotate_image
Rotate an image by any angle.

```
Parameters:
- inputPath: Path to input image
- outputPath: Path to save rotated image
- angle: Rotation angle in degrees (positive = clockwise)
- background: Background color for exposed areas (default: #000000)
```

### flip_image
Mirror an image horizontally or vertically.

```
Parameters:
- inputPath: Path to input image
- outputPath: Path to save flipped image
- direction: Flip direction (horizontal, vertical, both)
```

### get_image_info
Extract metadata and information about an image.

```
Parameters:
- inputPath: Path to image file

Returns: format, dimensions, color space, file size, etc.
```

### batch_resize
Generate multiple sizes from one image (perfect for responsive images).

```
Parameters:
- inputPath: Path to input image
- outputDir: Directory to save resized images
- sizes: Array of {width, height?, suffix}
- format: Output format for all sizes (optional)
```

## Example Usage in Claude

```
"Please resize image.jpg to 800x600 pixels"
"Convert photo.png to WebP format with 90% quality"
"Crop avatar.jpg starting at (100, 100) with 200x200 size"
"Generate thumbnail sizes: 150px, 300px, and 600px wide"
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

## License

MIT