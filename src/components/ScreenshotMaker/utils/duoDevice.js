// iPhone Duo mockup, drawn as vectors on the 2D canvas.
//
// Geometry follows the Duo simulator panels:
//  - inner: 7.6" open display, corners ~9.6 % of the short side, a fold crease
//    across the middle of the long edge (vertical when held landscape,
//    horizontal in tabletop portrait).
//  - outer: 5.4" cover display, square corners on the hinge side, a camera hole
//    in the top trailing corner when portrait. Landscape is the same panel
//    turned clockwise (hinge on top, hole bottom-right).

import { duoPanels, deviceDimensions } from '../constants';

const BODY_COLOR = '#2C2C2C';
const RIM_COLOR = '#7E7E7E';

/**
 * Returns the Duo panel description for an output device id, or null.
 * @param {string} outputDevice
 */
export function getDuoPanel(outputDevice) {
  return duoPanels[outputDevice] || null;
}

/**
 * The canvas passed to the renderers is identified by its size only, so a Duo
 * output size (preset or custom) always gets the matching mockup.
 * @param {{width:number,height:number}} dims
 */
export function getDuoPanelForDims(dims) {
  if (!dims) return null;
  for (const id of Object.keys(duoPanels)) {
    const d = deviceDimensions[id];
    if (d && d.width === dims.width && d.height === dims.height) return duoPanels[id];
  }
  return null;
}

function panelMetrics(panel, w, h) {
  const short = Math.min(w, h);
  const landscape = w > h;

  if (panel.kind === 'inner') {
    const r = 0.096 * short;
    const bezel = 0.017 * short;
    return {
      bezel,
      pad: { top: bezel, right: bezel, bottom: bezel, left: bezel },
      radii: [r, r, r, r], // tl, tr, br, bl
      hole: null,
      hingeSide: null,
    };
  }

  // Outer panel, portrait reference: hinge left, camera hole top-right.
  const r = 0.115 * short;
  const sq = 0.012 * short;
  const bezel = 0.022 * short;
  const spine = bezel * 2.4;
  const holeR = 0.0397 * short; // 111 px disc on a 1398 px wide capture
  const holeInset = 0.075 * short;

  if (!landscape) {
    return {
      bezel,
      pad: { top: bezel, right: bezel, bottom: bezel, left: spine },
      radii: [sq, r, r, sq],
      hole: { x: w - holeInset, y: holeInset, r: holeR },
      hingeSide: 'left',
    };
  }
  // Turned clockwise: hinge on top, hole bottom-right.
  return {
    bezel,
    pad: { top: spine, right: bezel, bottom: bezel, left: bezel },
    radii: [sq, sq, r, r],
    hole: { x: w - holeInset, y: h - holeInset, r: holeR },
    hingeSide: 'top',
  };
}

function screenPath(context, x, y, w, h, m) {
  context.beginPath();
  context.roundRect(x, y, w, h, m.radii);
  if (m.hole) {
    context.moveTo(x + m.hole.x + m.hole.r, y + m.hole.y);
    context.arc(x + m.hole.x, y + m.hole.y, m.hole.r, 0, Math.PI * 2);
  }
}

function bodyPath(context, x, y, w, h, m) {
  const { pad } = m;
  const radii = m.radii.map((r, i) => {
    // Body corner = screen corner + the padding of the two adjacent sides.
    const [a, b] = [
      [pad.top, pad.left],
      [pad.top, pad.right],
      [pad.bottom, pad.right],
      [pad.bottom, pad.left],
    ][i];
    return r + Math.max(a, b);
  });
  context.beginPath();
  context.roundRect(
    x - pad.left,
    y - pad.top,
    w + pad.left + pad.right,
    h + pad.top + pad.bottom,
    radii
  );
}

function drawSpine(context, x, y, w, h, m) {
  const { pad } = m;
  const horizontal = m.hingeSide === 'top';
  const bx = x - pad.left;
  const by = y - pad.top;
  const bw = w + pad.left + pad.right;
  const bh = h + pad.top + pad.bottom;
  const thickness = horizontal ? pad.top : pad.left;

  const grad = horizontal
    ? context.createLinearGradient(0, by, 0, by + thickness)
    : context.createLinearGradient(bx, 0, bx + thickness, 0);
  grad.addColorStop(0, '#1a1a1a');
  grad.addColorStop(0.35, '#4a4a4a');
  grad.addColorStop(0.7, '#2a2a2a');
  grad.addColorStop(1, '#202020');

  context.save();
  bodyPath(context, x, y, w, h, m);
  context.clip();
  context.fillStyle = grad;
  if (horizontal) {
    context.fillRect(bx, by, bw, thickness);
  } else {
    context.fillRect(bx, by, thickness, bh);
  }
  context.restore();
}

function drawFold(context, x, y, w, h, m) {
  const landscape = w > h;
  const thickness = (landscape ? w : h) * 0.016;
  const seam = Math.max(2, Math.min(w, h) * 0.002);

  // Crease, drawn over the screen (the caller has the panel clip active).
  const grad = landscape
    ? context.createLinearGradient(x + w / 2 - thickness / 2, 0, x + w / 2 + thickness / 2, 0)
    : context.createLinearGradient(0, y + h / 2 - thickness / 2, 0, y + h / 2 + thickness / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.38, 'rgba(0,0,0,0.07)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.14)');
  grad.addColorStop(0.62, 'rgba(0,0,0,0.07)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = grad;
  if (landscape) {
    context.fillRect(x + w / 2 - thickness / 2, y, thickness, h);
  } else {
    context.fillRect(x, y + h / 2 - thickness / 2, w, thickness);
  }

  return { seam, bezel: m.bezel };
}

function drawSeams(context, x, y, w, h, m, seam) {
  const landscape = w > h;
  context.fillStyle = 'rgba(0,0,0,0.55)';
  if (landscape) {
    const cx = x + w / 2 - seam;
    context.fillRect(cx, y - m.pad.top, seam * 2, m.pad.top);
    context.fillRect(cx, y + h, seam * 2, m.pad.bottom);
  } else {
    const cy = y + h / 2 - seam;
    context.fillRect(x - m.pad.left, cy, m.pad.left, seam * 2);
    context.fillRect(x + w, cy, m.pad.right, seam * 2);
  }
}

function drawCamera(context, x, y, m) {
  const { hole } = m;
  if (!hole) return;
  const cx = x + hole.x;
  const cy = y + hole.y;
  context.fillStyle = '#0b0b0d';
  context.beginPath();
  context.arc(cx, cy, hole.r, 0, Math.PI * 2);
  context.fill();
  const lens = context.createRadialGradient(cx - hole.r * 0.2, cy - hole.r * 0.2, 0, cx, cy, hole.r * 0.6);
  lens.addColorStop(0, '#2b3350');
  lens.addColorStop(1, '#0b0b0d');
  context.fillStyle = lens;
  context.beginPath();
  context.arc(cx, cy, hole.r * 0.55, 0, Math.PI * 2);
  context.fill();
}

/**
 * Draws the screenshot inside the Duo mockup. The (x, y, w, h) rectangle is the
 * display itself; the body extends around it. The caller owns rotation and
 * perspective transforms.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {HTMLImageElement|HTMLCanvasElement} img
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{kind:'inner'|'outer'}} panel
 * @param {object} settings - screenshot settings (shadow)
 */
export function drawDuoMockup(context, img, x, y, w, h, panel, settings) {
  const m = panelMetrics(panel, w, h);

  // Body, with the drop shadow when enabled.
  context.save();
  if (settings.shadow && settings.shadow.enabled) {
    const shadowOpacity = settings.shadow.opacity / 100;
    context.shadowColor = settings.shadow.color + Math.round(shadowOpacity * 255).toString(16).padStart(2, '0');
    context.shadowBlur = settings.shadow.blur;
    context.shadowOffsetX = settings.shadow.x;
    context.shadowOffsetY = settings.shadow.y;
  }
  bodyPath(context, x, y, w, h, m);
  context.fillStyle = BODY_COLOR;
  context.fill();
  context.restore();

  if (m.hingeSide) drawSpine(context, x, y, w, h, m);

  // Rim.
  const rim = Math.max(2, m.bezel * 0.12);
  context.save();
  bodyPath(context, x, y, w, h, m);
  context.clip();
  bodyPath(context, x, y, w, h, m);
  context.strokeStyle = RIM_COLOR;
  context.lineWidth = rim * 2;
  context.stroke();
  context.restore();

  // Display: panel shape with the camera hole cut out.
  context.save();
  screenPath(context, x, y, w, h, m);
  context.clip('evenodd');
  context.fillStyle = '#000';
  context.fillRect(x, y, w, h);
  context.drawImage(img, x, y, w, h);
  let seam = 0;
  if (panel.kind === 'inner') {
    seam = drawFold(context, x, y, w, h, m).seam;
  }
  context.restore();

  if (panel.kind === 'inner') drawSeams(context, x, y, w, h, m, seam);
  drawCamera(context, x, y, m);
}
