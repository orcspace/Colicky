// The HeyClicky ⌃⌥ mark, drawn and moved exactly like the Mac app's ClickyBrandMarkLayerView (48 × 31 view box,
// round strokes 3 units wide, heavier at small sizes). At rest it is still and can blink; while Clickys work it
// shape-shifts like the notch's: three dots bouncing in turn, a heartbeat line, Clicky's cursor flipping over and
// back, then (with a count) shrinking to a point while the number pops up. Every pose keeps each stroke's point
// count, so the poses morph point by point. Reduce Motion keeps it still (the number stands in while working).

const SVG = 'http://www.w3.org/2000/svg';
const VIEW = {width: 48, height: 31};

const MARK = {zig: [[9.5, 12.4], [14.5, 6.5], [24.3, 23.3]], eye: [[27.1, 12.4], [32.86, 6.5], [38.4, 12.4]],
  mouth: [[24.3, 23.3], [33.4, 23.3]], width: 1};
const SHUT = {zig: [[9.5, 9.5], [14.5, 9.5], [24.3, 23.3]], eye: [[27.1, 9.5], [32.75, 9.5], [38.4, 9.5]]};
const dots = (left = 16, middle = 16, right = 16) => ({zig: [[8, left], [8, left], [8, left]],
  eye: [[40, right], [40, right], [40, right]], mouth: [[24, middle], [24, middle]], width: 2.3});
const heartbeat = (peak, dip) => ({zig: [[14, 16], [19, peak], [24.5, dip]], eye: [[24.5, dip], [29.5, 16], [45, 16]],
  mouth: [[3, 16], [14, 16]], width: 1.15});
// Clicky's cursor pointing right, then mirrored; the heavy round-joined stroke rounds its corners.
const triangle = right => {
  const base = right ? 16.5 : 31.5, tip = right ? 32 : 16;
  return {zig: [[base, 7], [tip, 16], [base, 25]], eye: [[base, 25], [base, 16], [base, 7]], mouth: [[tip, 16], [tip, 16]], width: 2.2};
};
const VANISHED = {zig: [[24, 16], [24, 16], [24, 16]], eye: [[24, 16], [24, 16], [24, 16]], mouth: [[24, 16], [24, 16]], width: 0.01};
const RISE = 9.5;

function workingTimeline(showsCount) {
  const ending = showsCount
    ? [[6.1, VANISHED], [7.55, VANISHED], [8.05, MARK], [8.9, MARK]]
    : [[6.3, MARK], [7.2, MARK]];
  return [
    [0, MARK], [0.5, MARK],
    [0.85, dots()],
    [1.1, dots(16 - RISE)], [1.35, dots(16, 16 - RISE)], [1.6, dots(16, 16, 16 - RISE)],
    [1.85, dots()],
    [2.1, dots(16 - RISE)], [2.35, dots(16, 16 - RISE)], [2.6, dots(16, 16, 16 - RISE)],
    [2.85, dots()],
    [3.2, heartbeat(5, 27)], [3.45, heartbeat(11, 21)], [3.7, heartbeat(5, 27)], [3.95, heartbeat(11, 21)], [4.2, heartbeat(5, 27)],
    [4.6, triangle(true)], [5.0, triangle(true)], [5.4, triangle(false)], [5.8, triangle(true)],
    ...ending,
  ];
}

// Core Animation's ease-in-ease-out, cubic-bezier(0.42, 0, 0.58, 1).
function easeInOut(t) {
  let lo = 0, hi = 1, u = t;
  for (let i = 0; i < 18; i++) {
    const x = 3 * (1 - u) * (1 - u) * u * 0.42 + 3 * (1 - u) * u * u * 0.58 + u * u * u;
    if (x < t) lo = u; else hi = u;
    u = (lo + hi) / 2;
  }
  return 3 * (1 - u) * u * u + u * u * u;
}

const lerp = (a, b, t) => a + (b - a) * t;
const points = (from, to, t) => from.map((point, i) => [lerp(point[0], to[i][0], t), lerp(point[1], to[i][1], t)]);
const pathData = list => 'M' + list.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L');

// Single-stroke digits and "+", y-down, each in a 10 × 18 box (the app's strokedCountPath).
const DIGITS = {
  0: ['M5 0A5 5 0 0 1 10 5V13A5 5 0 0 1 0 13V5A5 5 0 0 1 5 0Z', 10],
  1: ['M2.5 3.5L6.5 0L6.5 18', 4],
  2: ['M0.2 5C0.2 2.2 2.3 0 5 0C7.7 0 9.8 2.2 9.8 5C9.8 9 4 12.5 0 18L10 18', 10],
  3: ['M0.3 2.6C1.4 0.9 3 0 5 0C7.6 0 9.5 1.8 9.5 4.4C9.5 7 7 8.6 4 8.6C8 8.6 10 10.5 10 13.2C10 16 7.8 18 5 18C2.8 18 0.9 17 0 15.4', 10],
  4: ['M7.5 18L7.5 0L0 12.5L10 12.5', 10],
  5: ['M9.5 0L1.2 0L0.6 8C2 7.1 3.5 6.8 5 6.8C8 6.8 10 9.3 10 12.4C10 15.6 7.8 18 5 18C2.8 18 0.9 17 0 15.4', 10],
  6: ['M10 12.75A5 5.25 0 1 1 0 12.75A5 5.25 0 1 1 10 12.75M8.6 1.3C7.6 0.4 6.3 0 5 0C1.5 0 0 4 0 9.5L0 12.75', 10],
  7: ['M0 0L10 0L3.5 18', 10],
  8: ['M9.2 4.2A4.2 4.2 0 1 1 0.8 4.2A4.2 4.2 0 1 1 9.2 4.2M10 13.2A5 4.8 0 1 1 0 13.2A5 4.8 0 1 1 10 13.2', 10],
  9: ['M10 5.25A5 5.25 0 1 1 0 5.25A5 5.25 0 1 1 10 5.25M10 5.25L10 8.5C10 14 8.5 18 5 18C3.7 18 2.4 17.6 1.4 16.7', 10],
  '+': ['M0 9L8 9M4 5L4 13', 8],
};

/// Puts a mark into `host` and returns its controls: `setWorking(isWorking, count)` and `blink()`.
/// `width` is in CSS pixels; `weight` multiplies the stroke (the notch draws a 24-wide mark at 1.25).
export function createMark(host, {width = 24, weight = 1} = {}) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'mark');
  svg.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(Math.round(width * VIEW.height / VIEW.width * 100) / 100));
  svg.setAttribute('aria-hidden', 'true');
  const make = () => svg.appendChild(document.createElementNS(SVG, 'path'));
  const mouth = make(), zig = make(), eye = make();
  const count = document.createElementNS(SVG, 'g');
  const countPath = document.createElementNS(SVG, 'path');
  count.appendChild(countPath);
  svg.appendChild(count);
  host.replaceChildren(svg);

  const baseWidth = 3 * weight;
  const COUNT_SCALE = 1.45;
  let working = false, workingCount = 0, frame = 0, startedAt = 0, blinkTimer = 0, countWidth = 10;

  function draw(pose, {eyesShut = false} = {}) {
    const shape = eyesShut ? {...pose, zig: SHUT.zig, eye: SHUT.eye} : pose;
    zig.setAttribute('d', pathData(shape.zig));
    eye.setAttribute('d', pathData(shape.eye));
    mouth.setAttribute('d', pathData(shape.mouth));
    for (const path of [zig, eye, mouth]) path.style.strokeWidth = String(baseWidth * pose.width);
  }

  function placeCount(number) {
    const characters = number > 9 ? ['9', '+'] : String(number).split('');
    let x = 0;
    const parts = [];
    for (const character of characters) {
      const [data, glyphWidth] = DIGITS[character];
      parts.push(`<path d="${data}" transform="translate(${x} 0)"/>`);
      x += glyphWidth + 6;
    }
    countWidth = x - 6;
    count.innerHTML = parts.join('');
    for (const path of count.querySelectorAll('path')) path.style.strokeWidth = String(baseWidth / COUNT_SCALE);
  }

  /// The count sits on the mark's centre, about as tall as the face; `pop` scales it as it appears and leaves.
  function setCountLook(pop, opacity) {
    count.style.opacity = String(opacity);
    count.setAttribute('transform', `translate(${VIEW.width / 2} ${VIEW.height / 2}) scale(${COUNT_SCALE * pop}) translate(${-countWidth / 2} -9)`);
  }

  function still() {
    cancelAnimationFrame(frame);
    frame = 0;
    const showsStillCount = working && workingCount > 0 && reduceMotion.matches;
    zig.style.fill = 'none';
    for (const path of [zig, eye, mouth]) path.style.opacity = showsStillCount ? '0' : '1';
    if (showsStillCount) { placeCount(workingCount); setCountLook(1, 1); } else setCountLook(1, 0);
    draw(MARK);
  }

  function tick(now) {
    const timeline = workingTimeline(workingCount > 0);
    const cycle = timeline[timeline.length - 1][0];
    const t = ((now - startedAt) / 1000) % cycle;
    let index = 0;
    while (index < timeline.length - 2 && timeline[index + 1][0] <= t) index++;
    const [fromTime, fromPose] = timeline[index], [toTime, toPose] = timeline[index + 1];
    const progress = easeInOut(Math.min(1, Math.max(0, (t - fromTime) / Math.max(0.0001, toTime - fromTime))));
    const pose = {zig: points(fromPose.zig, toPose.zig, progress), eye: points(fromPose.eye, toPose.eye, progress),
      mouth: points(fromPose.mouth, toPose.mouth, progress), width: lerp(fromPose.width, toPose.width, progress)};
    draw(pose);
    // The triangle is solid only while it is up.
    const [fillOn, fillOff] = workingCount > 0 ? [[4.5, 4.6], [6.05, 6.1]] : [[4.5, 4.6], [5.85, 5.95]];
    const fill = t < fillOn[0] ? 0 : t < fillOn[1] ? (t - fillOn[0]) / (fillOn[1] - fillOn[0])
      : t < fillOff[0] ? 1 : t < fillOff[1] ? 1 - (t - fillOff[0]) / (fillOff[1] - fillOff[0]) : 0;
    zig.style.fill = fill > 0 ? `rgba(255, 255, 255, ${fill})` : 'none';
    if (workingCount > 0) {
      const keys = [0, 6.05, 6.3, 6.45, 7.35, 7.55, cycle];
      const scales = [0.2, 0.2, 1.18, 1, 1, 0.2, 0.2], opacities = [0, 0, 1, 1, 1, 0, 0];
      let k = 0;
      while (k < keys.length - 2 && keys[k + 1] <= t) k++;
      const local = easeInOut(Math.min(1, Math.max(0, (t - keys[k]) / Math.max(0.0001, keys[k + 1] - keys[k]))));
      setCountLook(lerp(scales[k], scales[k + 1], local), lerp(opacities[k], opacities[k + 1], (t - keys[k]) / Math.max(0.0001, keys[k + 1] - keys[k])));
    }
    frame = requestAnimationFrame(tick);
  }

  function setWorking(isWorking, number = 0) {
    const changed = isWorking !== working || number !== workingCount;
    working = isWorking;
    workingCount = number;
    if (!changed && (frame || !working)) return;
    if (working && workingCount > 0) placeCount(workingCount);
    if (!working || reduceMotion.matches || document.hidden) { still(); return; }
    for (const path of [zig, eye, mouth]) path.style.opacity = '1';
    if (!frame) { startedAt = performance.now(); frame = requestAnimationFrame(tick); }
  }

  /// One quick double blink, like the notch's Home tab on a click. Not while it shape-shifts, nor under Reduce Motion.
  function blink() {
    if (working || reduceMotion.matches) return;
    clearTimeout(blinkTimer);
    const shut = 90, gap = 180;
    const show = eyesShut => draw(MARK, {eyesShut});
    show(true);
    blinkTimer = setTimeout(() => { show(false); blinkTimer = setTimeout(() => { show(true); blinkTimer = setTimeout(() => show(false), shut); }, gap); }, shut);
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) still(); else setWorking(working, workingCount); });
  reduceMotion.addEventListener?.('change', () => { cancelAnimationFrame(frame); frame = 0; setWorking(working, workingCount); });
  still();
  return {setWorking, blink, element: svg};
}
