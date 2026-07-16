export function generateHairSwatch(colorValue: string): string {
  // Check if running in browser environment
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Determine Base Color
  // Handle Hex
  // Handle Gradient (parse first color)
  let baseColor = colorValue;
  
  if (colorValue.startsWith('linear-gradient')) {
    // Simple extraction of the first hex code found
    const match = colorValue.match(/#[a-fA-F0-9]{6}/);
    if (match) {
        baseColor = match[0];
    } else {
        baseColor = '#3B2F2F'; // Fallback
    }
  }

  // Fill Background
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 128);

  // 2. Add Noise / Texture
  // Draw vertical-ish strands
  const imageData = ctx.getImageData(0, 0, 128, 128);
  const data = imageData.data;

  // Simple noise
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 10;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
    data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  // Draw Strands (Curves)
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 150; i++) {
    ctx.beginPath();
    // Alternating light and dark strands for depth
    const isHighlight = Math.random() > 0.5;
    ctx.strokeStyle = isHighlight ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    
    const startX = Math.random() * 128;
    const endX = startX + (Math.random() * 20 - 10);
    
    ctx.moveTo(startX, 0);
    ctx.bezierCurveTo(
        startX + (Math.random() * 10 - 5), 40, 
        endX + (Math.random() * 10 - 5), 80, 
        endX, 128
    );
    ctx.stroke();
  }

  // 3. Add Shine (Specular Highlight) to simulate "shiny" hair
  ctx.globalCompositeOperation = 'source-over'; // Reset
  const gradient = ctx.createRadialGradient(64, 30, 0, 64, 40, 80);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)'); // Bright center
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  // Distort the gradient to be more horizontal (cylindrical shine)
  ctx.save();
  ctx.translate(0, 10);
  ctx.scale(1, 0.6);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 200);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.85);
}
