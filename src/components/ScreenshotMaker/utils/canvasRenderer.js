/**
 * Canvas rendering engine - pure functions migrated from vanilla JS app.js.
 * These functions draw to a canvas context and take everything as parameters.
 * They do not depend on DOM or React state directly.
 */

import { drawDuoMockup, getDuoPanelForDims } from './duoDevice';

// ─── Utility helpers ───────────────────────────────────────────────

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function roundRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ─── Text helpers ──────────────────────────────────────────────────

export function stripBoldMarkers(text) {
  return text.replace(/\*/g, '');
}

export function parseBoldSegments(text) {
  const segments = [];
  let lastIndex = 0;
  const regex = /\*([^*]+)\*/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }
  return segments.length ? segments : [{ text, bold: false }];
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildHighlightRegex(textSettings) {
  if (!textSettings?.highlightEnabled) return null;
  const raw = textSettings.highlightWords || '';
  const words = raw.split(',').map(w => w.trim()).filter(Boolean);
  if (words.length === 0) return null;
  const pattern = words.map(escapeRegex).join('|');
  return new RegExp(`\\b(${pattern})\\b`, 'gi');
}

export function getHighlightSegments(line, regex) {
  if (!regex) return [{ text: line, highlight: false }];
  const segments = [];
  let lastIndex = 0;
  for (const match of line.matchAll(regex)) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), highlight: false });
    }
    segments.push({ text: match[0], highlight: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), highlight: false });
  }
  return segments.length ? segments : [{ text: line, highlight: false }];
}

export function buildStyledHighlightSegments(text, regex) {
  const boldSegments = parseBoldSegments(text);
  if (!regex) return boldSegments.map(segment => ({ ...segment, highlight: false }));

  const segments = [];
  boldSegments.forEach(segment => {
    const parts = getHighlightSegments(segment.text, regex);
    parts.forEach(part => {
      segments.push({
        text: part.text,
        bold: segment.bold,
        highlight: part.highlight
      });
    });
  });

  return segments;
}

export function getBoldWeight(weight) {
  const numeric = parseInt(weight, 10);
  if (!Number.isNaN(numeric)) {
    return String(Math.min(900, numeric + 200));
  }
  if (weight === 'bold') return '800';
  return '700';
}

export function getAlignedX(align, textWidth, dims, padding, offsetX) {
  const shift = (dims.width * (offsetX || 0)) / 100;
  if (align === 'left') return padding + shift;
  if (align === 'right') return dims.width - padding - textWidth + shift;
  return dims.width / 2 - textWidth / 2 + shift;
}

export function measureStyledLineWidth(context, line, baseFont, boldFont) {
  const segments = parseBoldSegments(line);
  return segments.reduce((sum, segment) => {
    context.font = segment.bold ? boldFont : baseFont;
    return sum + context.measureText(segment.text).width;
  }, 0);
}

export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(stripBoldMarkers(testLine));

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function wrapTextWithBreaks(ctx, text, maxWidth) {
  const parts = text.split(/<br\s*\/?>|\n/i);
  const lines = [];

  parts.forEach(part => {
    if (part === '') {
      lines.push('');
      return;
    }
    const wrapped = wrapText(ctx, part, maxWidth);
    if (wrapped.length) {
      lines.push(...wrapped);
    } else {
      lines.push('');
    }
  });

  return lines;
}

// ─── Line-level drawing helpers ────────────────────────────────────

export function drawLineWithHighlights(context, line, xCenter, y, baseColor, highlightColor, regex) {
  if (!regex) {
    context.fillStyle = baseColor;
    context.fillText(line, xCenter, y);
    return;
  }

  const segments = getHighlightSegments(line, regex);
  const totalWidth = segments.reduce((sum, segment) => sum + context.measureText(segment.text).width, 0);
  let currentX = xCenter - totalWidth / 2;
  const originalAlign = context.textAlign;
  context.textAlign = 'left';

  segments.forEach(segment => {
    const segmentWidth = context.measureText(segment.text).width;
    context.fillStyle = segment.highlight ? highlightColor : baseColor;
    context.fillText(segment.text, currentX, y);
    currentX += segmentWidth;
  });

  context.textAlign = originalAlign;
}

export function drawStyledLine(context, line, xStart, y, baseFont, boldFont, baseColor, highlightColor, regex) {
  if (!regex && !line.includes('*')) {
    context.font = baseFont;
    context.fillStyle = baseColor;
    const originalAlign = context.textAlign;
    context.textAlign = 'left';
    context.fillText(line, xStart, y);
    context.textAlign = originalAlign;
    return;
  }

  const segments = buildStyledHighlightSegments(line, regex);
  const originalAlign = context.textAlign;
  const originalBaseline = context.textBaseline;

  let currentX = xStart;

  context.textAlign = 'left';

  segments.forEach(segment => {
    context.font = segment.bold ? boldFont : baseFont;
    context.fillStyle = segment.highlight ? highlightColor : baseColor;
    context.fillText(segment.text, currentX, y);
    currentX += context.measureText(segment.text).width;
  });

  context.textAlign = originalAlign;
  context.textBaseline = originalBaseline;
}

// ─── Core rendering functions (parameterised) ──────────────────────

export function drawBackgroundToContext(context, dims, bg) {
  if (bg.type === 'gradient') {
    const angle = bg.gradient.angle * Math.PI / 180;
    const x1 = dims.width / 2 - Math.cos(angle) * dims.width;
    const y1 = dims.height / 2 - Math.sin(angle) * dims.height;
    const x2 = dims.width / 2 + Math.cos(angle) * dims.width;
    const y2 = dims.height / 2 + Math.sin(angle) * dims.height;

    const gradient = context.createLinearGradient(x1, y1, x2, y2);
    bg.gradient.stops.forEach(stop => {
      gradient.addColorStop(stop.position / 100, stop.color);
    });

    context.fillStyle = gradient;
    context.fillRect(0, 0, dims.width, dims.height);
  } else if (bg.type === 'solid') {
    context.fillStyle = bg.solid;
    context.fillRect(0, 0, dims.width, dims.height);
  } else if (bg.type === 'image' && bg.image) {
    const img = bg.image;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    let dx = 0, dy = 0, dw = dims.width, dh = dims.height;

    if (bg.imageFit === 'cover') {
      const imgRatio = img.width / img.height;
      const canvasRatio = dims.width / dims.height;

      if (imgRatio > canvasRatio) {
        sw = img.height * canvasRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / canvasRatio;
        sy = (img.height - sh) / 2;
      }
    } else if (bg.imageFit === 'contain') {
      const imgRatio = img.width / img.height;
      const canvasRatio = dims.width / dims.height;

      if (imgRatio > canvasRatio) {
        dh = dims.width / imgRatio;
        dy = (dims.height - dh) / 2;
      } else {
        dw = dims.height * imgRatio;
        dx = (dims.width - dw) / 2;
      }

      context.fillStyle = '#000';
      context.fillRect(0, 0, dims.width, dims.height);
    }

    if (bg.imageBlur > 0) {
      context.filter = `blur(${bg.imageBlur}px)`;
    }

    context.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    context.filter = 'none';

    if (bg.overlayOpacity > 0) {
      context.fillStyle = bg.overlayColor;
      context.globalAlpha = bg.overlayOpacity / 100;
      context.fillRect(0, 0, dims.width, dims.height);
      context.globalAlpha = 1;
    }
  }
}

export function drawNoiseToContext(context, dims, intensity) {
  const imageData = context.getImageData(0, 0, dims.width, dims.height);
  const data = imageData.data;
  const noiseAmount = intensity / 100;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * noiseAmount;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  context.putImageData(imageData, 0, 0);
}

function drawDeviceFrameToContext(context, x, y, width, height, settings) {
  const frameColor = settings.frame.color;
  const frameWidth = settings.frame.width * (width / 400);
  const frameOpacity = settings.frame.opacity / 100;
  const radius = (settings.cornerRadius || 0) * (width / 400) + frameWidth;

  context.globalAlpha = frameOpacity;
  context.strokeStyle = frameColor;
  context.lineWidth = frameWidth;
  context.beginPath();
  context.roundRect(x - frameWidth / 2, y - frameWidth / 2, width + frameWidth, height + frameWidth, radius);
  context.stroke();
  context.globalAlpha = 1;
}

export function drawScreenshotToContext(context, dims, img, settings) {
  if (!img) return;

  const scale = settings.scale / 100;
  let imgWidth = dims.width * scale;
  let imgHeight = (img.height / img.width) * imgWidth;

  if (imgHeight > dims.height * scale) {
    imgHeight = dims.height * scale;
    imgWidth = (img.width / img.height) * imgHeight;
  }

  const x = (dims.width - imgWidth) * (settings.x / 100);
  const y = (dims.height - imgHeight) * (settings.y / 100);
  const centerX = x + imgWidth / 2;
  const centerY = y + imgHeight / 2;

  context.save();

  // Apply transformations
  context.translate(centerX, centerY);

  // Apply rotation
  if (settings.rotation !== 0) {
    context.rotate(settings.rotation * Math.PI / 180);
  }

  // Apply perspective (simulated with scale transform)
  if (settings.perspective !== 0) {
    context.transform(1, settings.perspective * 0.01, 0, 1, 0, 0);
  }

  context.translate(-centerX, -centerY);

  // iPhone Duo output sizes get the real panel shape and body instead of a rounded rect
  const duoPanel = getDuoPanelForDims(dims);
  if (duoPanel) {
    drawDuoMockup(context, img, x, y, imgWidth, imgHeight, duoPanel, settings);
    context.restore();
    return;
  }

  // Scale corner radius with image size
  const radius = (settings.cornerRadius || 0) * (imgWidth / 400);

  // Draw shadow first (needs a filled shape, not clipped)
  if (settings.shadow && settings.shadow.enabled) {
    const shadowOpacity = settings.shadow.opacity / 100;
    const shadowColor = settings.shadow.color + Math.round(shadowOpacity * 255).toString(16).padStart(2, '0');
    context.shadowColor = shadowColor;
    context.shadowBlur = settings.shadow.blur;
    context.shadowOffsetX = settings.shadow.x;
    context.shadowOffsetY = settings.shadow.y;

    // Draw filled rounded rect for shadow
    context.fillStyle = '#000';
    context.beginPath();
    context.roundRect(x, y, imgWidth, imgHeight, radius);
    context.fill();

    // Reset shadow before drawing image
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  }

  // Clip and draw image
  context.beginPath();
  context.roundRect(x, y, imgWidth, imgHeight, radius);
  context.clip();
  context.drawImage(img, x, y, imgWidth, imgHeight);

  context.restore();

  // Draw device frame if enabled
  if (settings.frame && settings.frame.enabled) {
    context.save();
    context.translate(centerX, centerY);
    if (settings.rotation !== 0) {
      context.rotate(settings.rotation * Math.PI / 180);
    }
    if (settings.perspective !== 0) {
      context.transform(1, settings.perspective * 0.01, 0, 1, 0, 0);
    }
    context.translate(-centerX, -centerY);
    drawDeviceFrameToContext(context, x, y, imgWidth, imgHeight, settings);
    context.restore();
  }
}

export function drawTextToContext(context, dims, txt) {
  // Check enabled states (default headline to true for backwards compatibility)
  const headlineEnabled = txt.headlineEnabled !== false;
  const subheadlineEnabled = txt.subheadlineEnabled || false;

  const headline = headlineEnabled && txt.headlines ? (txt.headlines[txt.currentHeadlineLang || 'en'] || '') : '';
  const subheadline = subheadlineEnabled && txt.subheadlines ? (txt.subheadlines[txt.currentSubheadlineLang || 'en'] || '') : '';

  if (!headline && !subheadline) return;

  const padding = dims.width * 0.08;
  const textY = txt.position === 'top'
    ? dims.height * (txt.offsetY / 100)
    : dims.height * (1 - txt.offsetY / 100);
  const align = txt.textAlign || 'center';
  const offsetX = txt.offsetX || 0;

  context.textAlign = align;
  context.textBaseline = txt.position === 'top' ? 'top' : 'bottom';

  let currentY = textY;
  const highlightRegex = buildHighlightRegex(txt);

  // Draw headline
  if (headline) {
    const fontStyle = txt.headlineItalic ? 'italic' : 'normal';
    const baseFont = `${fontStyle} ${txt.headlineWeight} ${txt.headlineSize}px ${txt.headlineFont}`;
    const boldFont = `${fontStyle} ${getBoldWeight(txt.headlineWeight)} ${txt.headlineSize}px ${txt.headlineFont}`;
    context.font = baseFont;
    context.fillStyle = txt.headlineColor;
    const highlightColor = txt.highlightColor || '#ffd166';

    const lines = wrapTextWithBreaks(context, headline, dims.width - padding * 2);
    const lineHeight = txt.headlineSize * (txt.lineHeight / 100);

    // For bottom positioning, offset currentY so lines draw correctly
    if (txt.position === 'bottom') {
      currentY -= (lines.length - 1) * lineHeight;
    }

    let lastLineY;
    lines.forEach((line, i) => {
      const y = currentY + i * lineHeight;
      lastLineY = y;
      const textWidth = measureStyledLineWidth(context, line, baseFont, boldFont);
      const lineX = getAlignedX(align, textWidth, dims, padding, offsetX);
      drawStyledLine(context, line, lineX, y, baseFont, boldFont, txt.headlineColor, highlightColor, highlightRegex);

      // Calculate text metrics for decorations
      const fontSize = txt.headlineSize;
      const lineThickness = Math.max(2, fontSize * 0.05);
      const xPos = lineX;

      // Draw underline
      if (txt.headlineUnderline) {
        const underlineY = txt.position === 'top'
          ? y + fontSize * 0.9
          : y + fontSize * 0.1;
        context.fillRect(xPos, underlineY, textWidth, lineThickness);
      }

      // Draw strikethrough
      if (txt.headlineStrikethrough) {
        const strikeY = txt.position === 'top'
          ? y + fontSize * 0.4
          : y - fontSize * 0.4;
        context.fillRect(xPos, strikeY, textWidth, lineThickness);
      }
    });

    // Track where subheadline should start (below the bottom edge of headline)
    const gap = lineHeight - txt.headlineSize;
    if (txt.position === 'top') {
      currentY = lastLineY + txt.headlineSize + gap;
    } else {
      currentY = lastLineY + gap;
    }
  }

  // Draw subheadline (always below headline visually)
  if (subheadline) {
    const subFontStyle = txt.subheadlineItalic ? 'italic' : 'normal';
    const subWeight = txt.subheadlineWeight || '400';
    const subBaseFont = `${subFontStyle} ${subWeight} ${txt.subheadlineSize}px ${txt.subheadlineFont || txt.headlineFont}`;
    const subBoldFont = `${subFontStyle} ${getBoldWeight(subWeight)} ${txt.subheadlineSize}px ${txt.subheadlineFont || txt.headlineFont}`;
    context.font = subBaseFont;
    const baseColor = hexToRgba(txt.subheadlineColor, txt.subheadlineOpacity / 100);
    const highlightColor = hexToRgba(txt.highlightColor || '#ffd166', txt.subheadlineOpacity / 100);
    context.fillStyle = baseColor;

    const lines = wrapTextWithBreaks(context, subheadline, dims.width - padding * 2);
    const subLineHeight = txt.subheadlineSize * 1.4;

    // Subheadline starts after headline with gap determined by headline lineHeight
    // For bottom position, switch to 'top' baseline so subheadline draws downward
    const subY = currentY;
    if (txt.position === 'bottom') {
      context.textBaseline = 'top';
    }

    lines.forEach((line, i) => {
      const y = subY + i * subLineHeight;
      const textWidth = measureStyledLineWidth(context, line, subBaseFont, subBoldFont);
      const lineX = getAlignedX(align, textWidth, dims, padding, offsetX);
      drawStyledLine(context, line, lineX, y, subBaseFont, subBoldFont, baseColor, highlightColor, highlightRegex);

      // Calculate text metrics for decorations
      const fontSize = txt.subheadlineSize;
      const lineThickness = Math.max(2, fontSize * 0.05);
      const xPos = lineX;

      // Draw underline (using 'top' baseline for subheadline)
      if (txt.subheadlineUnderline) {
        const underlineY = y + fontSize * 0.9;
        context.fillRect(xPos, underlineY, textWidth, lineThickness);
      }

      // Draw strikethrough
      if (txt.subheadlineStrikethrough) {
        const strikeY = y + fontSize * 0.4;
        context.fillRect(xPos, strikeY, textWidth, lineThickness);
      }
    });

    // Restore baseline if we changed it
    if (txt.position === 'bottom') {
      context.textBaseline = 'bottom';
    }
  }
}

// ─── Overlay / logo drawing ─────────────────────────────────────────

export function drawOverlayToContext(context, dims, overlay) {
  if (!overlay || !overlay.enabled || !overlay.image) return;

  const img = overlay.image;
  const scale = (overlay.scale || 20) / 100;
  const opacity = (overlay.opacity ?? 100) / 100;
  const rotation = (overlay.rotation || 0) * Math.PI / 180;

  // Calculate size based on canvas width percentage
  const targetWidth = dims.width * scale;
  const aspectRatio = img.width / img.height;
  const targetHeight = targetWidth / aspectRatio;

  // Calculate position
  const cx = dims.width * (overlay.x || 50) / 100;
  const cy = dims.height * (overlay.y || 85) / 100;

  context.save();
  context.globalAlpha = opacity;
  context.translate(cx, cy);
  if (rotation) context.rotate(rotation);
  context.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  context.restore();
}

// ─── Full render pipeline ──────────────────────────────────────────

/**
 * Renders a complete screenshot to a canvas, including background, noise,
 * screenshot image (2D or 3D), and text overlays.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {object} screenshot - Screenshot data object with background, screenshot, text, localizedImages
 * @param {number} outputWidth - Output width in pixels
 * @param {number} outputHeight - Output height in pixels
 * @param {string} currentLanguage - Current language code for localized images
 * @param {string[]} projectLanguages - Array of project language codes
 * @param {object|null} threeRenderer - Optional Three.js renderer context for 3D mode
 */
export function renderScreenshotToCanvas(canvas, screenshot, outputWidth, outputHeight, currentLanguage, projectLanguages, threeRenderer) {
  if (!screenshot) return;

  const ctx = canvas.getContext('2d');
  const dims = { width: outputWidth, height: outputHeight };

  // Set canvas size (this also clears the canvas)
  canvas.width = dims.width;
  canvas.height = dims.height;

  // Clear canvas explicitly
  ctx.clearRect(0, 0, dims.width, dims.height);

  // Get localized image for current language
  const img = getLocalizedImage(screenshot, currentLanguage);

  // Draw background for this screenshot
  const bg = screenshot.background;
  drawBackgroundToContext(ctx, dims, bg);

  // Draw noise if enabled
  if (bg.noise) {
    drawNoiseToContext(ctx, dims, bg.noiseIntensity);
  }

  // Draw screenshot - 3D if active for this screenshot, otherwise 2D
  const settings = screenshot.screenshot;
  // No 3D model exists for the iPhone Duo: its sizes always use the 2D vector mockup
  const use3D = (settings.use3D || false) && !getDuoPanelForDims(dims);

  if (use3D && threeRenderer && typeof threeRenderer.renderToCanvas === 'function' && threeRenderer.isLoaded && threeRenderer.isLoaded()) {
    // Update screen texture with the localized image for this screenshot
    if (img && typeof threeRenderer.updateScreenTexture === 'function') {
      threeRenderer.updateScreenTexture(img);
    }
    // Render 3D phone model with this screenshot's settings
    threeRenderer.renderToCanvas(canvas, dims.width, dims.height, settings);
  } else if (img) {
    // Draw 2D screenshot using localized image
    drawScreenshotToContext(ctx, dims, img, settings);
  }

  // Draw text
  const txt = {
    ...screenshot.text,
    currentHeadlineLang: currentLanguage,
    currentSubheadlineLang: currentLanguage,
  };
  drawTextToContext(ctx, dims, txt);

  // Draw overlay/logo
  if (screenshot.overlay) {
    drawOverlayToContext(ctx, dims, screenshot.overlay);
  }
}

// ─── Image localisation helper ─────────────────────────────────────

/**
 * Gets the correct localised image from a screenshot object.
 * Falls back to the base image if no localised version exists.
 *
 * @param {object} screenshot - Screenshot data object
 * @param {string} lang - Language code
 * @returns {HTMLImageElement|null}
 */
export function getLocalizedImage(screenshot, lang) {
  if (!screenshot) return null;

  // Check for localized image first
  if (screenshot.localizedImages && screenshot.localizedImages[lang]) {
    return screenshot.localizedImages[lang].image;
  }

  // Fall back to base image
  return screenshot.image || null;
}
