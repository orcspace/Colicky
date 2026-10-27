// The chat's bubbles with their curled tail (the app's MascotSpeechBubbleShape and HomeSpaceMessageBubble): HeyClicky's
// grey on the left, yours in the blue gel on the right. The SVG is redrawn whenever the bubble changes size.

const SVG = 'http://www.w3.org/2000/svg';

/// The outline for a `width` × `height` box whose bottom `tailDrop` belongs to the tail, curling bottom-left.
export function bubblePath(width, height, {radius = 17, tailDrop = 7} = {}) {
  const bodyHeight = height - tailDrop;
  const r = Math.min(radius, bodyHeight / 2);
  const s = tailDrop / 9;
  const c = (dx, dy) => `${(dx * s).toFixed(2)} ${(bodyHeight + dy * s).toFixed(2)}`;
  return [
    `M${r} 0`, `L${width - r} 0`, `A${r} ${r} 0 0 1 ${width} ${r}`,
    `L${width} ${bodyHeight - r}`, `A${r} ${r} 0 0 1 ${width - r} ${bodyHeight}`,
    `L${c(32.13, 0)}`,
    `C${c(26.48, 0)} ${c(21.08, 1.97)} ${c(16.12, 4.69)}`,
    `C${c(12.04, 6.95)} ${c(8.53, 8.49)} ${c(7.66, 8.55)}`,
    `C${c(5.03, 8.76)} ${c(4.69, 6.28)} ${c(5.72, 4.94)}`,
    `C${c(6.74, 3.61)} ${c(7.91, 1.88)} ${c(8.36, 0.94)}`,
    `C${c(9.38, -1.19)} ${c(8.18, -3.45)} ${c(6.43, -5.03)}`,
    `C${c(2.48, -8.6)} 0 ${(bodyHeight - r * 0.86).toFixed(2)} 0 ${(bodyHeight - r).toFixed(2)}`,
    `L0 ${r}`, `A${r} ${r} 0 0 1 ${r} 0`, 'Z',
  ].join(' ');
}

let gradientCount = 0;

/// Turns `element` (its text already inside) into a chat bubble: `outgoing` is yours (blue gel, tail on the right).
export function makeBubble(element, {outgoing = false} = {}) {
  element.classList.add('bubble', outgoing ? 'out' : 'in');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const id = `bubble-gel-${++gradientCount}`;
  svg.innerHTML = outgoing
    ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDF4FF"/><stop offset=".18" stop-color="#D6E7FF"/><stop offset=".5" stop-color="#A2C7FF"/><stop offset=".8" stop-color="#99CBF8"/><stop offset="1" stop-color="#A2D2F7"/></linearGradient>
       <linearGradient id="${id}-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#221898"/><stop offset="1" stop-color="#626262"/></linearGradient></defs>
       <path fill="url(#${id})" stroke="url(#${id}-rim)" stroke-width="1.3"/>`
    : '<path fill="#3B3B3D"/>';
  element.prepend(svg);
  const path = svg.querySelector('path');
  const redraw = () => {
    const {width, height} = element.getBoundingClientRect();
    if (!width || !height) return;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    path.setAttribute('d', bubblePath(width, height));
    // Yours curls off the bottom-right: the same outline, mirrored.
    path.setAttribute('transform', outgoing ? `translate(${width} 0) scale(-1 1)` : '');
  };
  redraw();
  new ResizeObserver(redraw).observe(element);
}
