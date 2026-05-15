export const DEFAULT_SHAPES = [
  "M50,10 L90,90 L10,90 Z", // Triangle
  "M10,10 L90,10 L90,90 L10,90 Z", // Square
  "M50,10 A40,40 0 1,1 49.9,10 Z", // Circle
  "M50,10 L60,40 L90,40 L65,60 L75,90 L50,70 L25,90 L35,60 L10,40 L40,40 Z", // Star
  "M10,50 L50,10 L90,50 L50,90 Z", // Diamond
  "M20,20 L80,80 M80,20 L20,80", // X
  "M10,10 L90,90" // Slash
];

export interface ASCIIOptions {
  width: number;
  bg: string;
  fg: string;
  invert: boolean;
  rotation: number;
  scaleMode: 'fixed' | 'dynamic';
  shapes: string[];
  shapeColors: string[];
}

export const getY2KFilter = (intensity: number) => {
  return `
    contrast(${100 + intensity * 50}%)
    saturate(${150 + intensity * 100}%)
    brightness(${100 + intensity * 20}%)
    hue-rotate(${intensity * 10}deg)
  `;
};
