import { prefersCalm } from '../utils/decode';

/** A convex capsule displacement map for the button's backdrop, not its label. */
export function mountLiquidGlass(button: HTMLElement, image: SVGImageElement) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const map = () => {
    const { width, height } = button.getBoundingClientRect();
    canvas.width = Math.max(2, Math.round(width * 2));
    canvas.height = Math.max(2, Math.round(height * 2));
    const pixels = context.createImageData(canvas.width, canvas.height);
    const radius = canvas.height / 2;
    const straight = Math.max(0, canvas.width / 2 - radius);
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const px = x - canvas.width / 2;
      const nx = px - Math.max(-straight, Math.min(straight, px));
      const ny = y - radius;
      const distance = Math.hypot(nx, ny);
      const edge = Math.max(0, Math.min(1, (distance - radius + 25) / 25));
      const bend = Math.sin(edge * Math.PI / 2) * 110;
      const at = (y * canvas.width + x) * 4;
      pixels.data[at] = 128 + nx / Math.max(distance, 1) * bend;
      pixels.data[at + 1] = 128 + ny / Math.max(distance, 1) * bend;
      pixels.data[at + 2] = 128;
      pixels.data[at + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    image.setAttribute('href', canvas.toDataURL());
    button.classList.add('has-lens');
  };
  const resize = new ResizeObserver(map);
  resize.observe(button);
  button.addEventListener('pointermove', event => {
    if (prefersCalm() || event.pointerType === 'touch') return;
    const rect = button.getBoundingClientRect();
    button.style.setProperty('--glass-x', `${(event.clientX - rect.left) / rect.width * 100}%`);
    button.style.setProperty('--glass-y', `${(event.clientY - rect.top) / rect.height * 100}%`);
  });
  button.addEventListener('pointerleave', () => {
    button.style.removeProperty('--glass-x'); button.style.removeProperty('--glass-y');
  });
  return () => resize.disconnect();
}
