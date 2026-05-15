import { ASCIIOptions } from "./constants";

export function getPixelBrightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function renderShapesToCanvas(
  sourceCtx: CanvasRenderingContext2D,
  displayCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ASCIIOptions,
  time: number = 0
) {
  const imageData = sourceCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const cellW = displayCtx.canvas.width / width;
  const cellH = displayCtx.canvas.height / height;

  displayCtx.fillStyle = options.bg;
  displayCtx.fillRect(0, 0, displayCtx.canvas.width, displayCtx.canvas.height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      
      let brightness = getPixelBrightness(r, g, b);
      if (options.invert) brightness = 255 - brightness;

      // Map brightness to one of 7 shapes
      const shapeIdx = Math.floor((brightness / 256) * Math.min(options.shapes.length, 7));
      const shapePath = options.shapes[shapeIdx] || options.shapes[0];
      const color = options.shapeColors[shapeIdx] || options.fg;

      displayCtx.save();
      displayCtx.translate(x * cellW + cellW / 2, y * cellH + cellH / 2);
      
      // Auto-animate rotation if requested (base + time-based)
      const rotation = options.rotation + (time * 0.05);
      displayCtx.rotate((rotation * Math.PI) / 180);

      // Scale based on brightness (midtowns max)
      let scale = 0.8;
      if (options.scaleMode === 'dynamic') {
        scale = 0.2 + (brightness / 255) * 1.2;
      }

      displayCtx.scale(scale * (cellW / 100), scale * (cellH / 100));
      
      const p = new Path2D(shapePath);
      displayCtx.strokeStyle = color;
      displayCtx.lineWidth = 4;
      displayCtx.stroke(p);
      
      displayCtx.restore();
    }
  }
}
