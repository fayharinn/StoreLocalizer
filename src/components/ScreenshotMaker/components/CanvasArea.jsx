import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { deviceDimensions } from '../constants';
import { getDuoPanelForDims } from '../utils/duoDevice';
import { SELECT_SCREENSHOT, SET_SCREENSHOT_SETTING } from '../hooks/useAppState';
import {
  drawBackgroundToContext,
  drawNoiseToContext,
  drawScreenshotToContext,
  drawTextToContext,
  drawOverlayToContext,
  renderScreenshotToCanvas,
} from '../utils/canvasRenderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCanvasDimensions(state) {
  if (state.outputDevice === 'custom') {
    return { width: state.customWidth, height: state.customHeight };
  }
  return deviceDimensions[state.outputDevice] || { width: 1290, height: 2796 };
}

function getScreenshotSettings(state) {
  const ss = state.screenshots[state.selectedIndex];
  return ss ? ss.screenshot : state.defaults.screenshot;
}

function getBackground(state) {
  const ss = state.screenshots[state.selectedIndex];
  return ss ? ss.background : state.defaults.background;
}

function getTextSettings(state) {
  const ss = state.screenshots[state.selectedIndex];
  return ss ? ss.text : state.defaults.text;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PREVIEW_WIDTH = 400;
const MAX_PREVIEW_HEIGHT = 700;
const SWIPE_THRESHOLD = 50;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CanvasArea({ state, dispatch, threeRenderer, getScreenshotImage }) {
  // Canvas refs
  const canvasRef = useRef(null);
  const leftCanvasRef = useRef(null);
  const rightCanvasRef = useRef(null);
  const farLeftCanvasRef = useRef(null);
  const farRightCanvasRef = useRef(null);
  const previewStripRef = useRef(null);

  // Interaction state refs (not React state to avoid re-renders during drag)
  const isDragging3D = useRef(false);
  const isAltDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragUpdatePending = useRef(false);
  const swipeAccumulator = useRef(0);
  const isSliding = useRef(false);

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const dims = useMemo(() => getCanvasDimensions(state), [
    state.outputDevice,
    state.customWidth,
    state.customHeight,
  ]);

  const previewScale = useMemo(
    () => Math.min(MAX_PREVIEW_WIDTH / dims.width, MAX_PREVIEW_HEIGHT / dims.height),
    [dims]
  );

  const use3D = useMemo(() => {
    const ss = getScreenshotSettings(state);
    // No 3D model exists for the iPhone Duo: its sizes use the 2D vector mockup
    return (ss?.use3D || false) && !getDuoPanelForDims(dims);
  }, [state.screenshots, state.selectedIndex, state.defaults, dims]);

  // -----------------------------------------------------------------------
  // Initialize Three.js when 3D mode is activated
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (use3D && threeRenderer && typeof threeRenderer.initThreeJS === 'function') {
      threeRenderer.initThreeJS();
    }
  }, [use3D, threeRenderer]);

  // Update Three.js screen texture + background when screenshot or 3D state changes
  useEffect(() => {
    if (!use3D || !threeRenderer) return;
    if (!threeRenderer.isLoaded || !threeRenderer.isLoaded()) return;

    // Update background
    const bg = getBackground(state);
    if (typeof threeRenderer.updateBackground === 'function') {
      threeRenderer.updateBackground(bg);
    }

    // Update screen texture with current screenshot image
    if (state.screenshots.length > 0) {
      const screenshot = state.screenshots[state.selectedIndex];
      if (screenshot) {
        const img = getScreenshotImage(screenshot);
        if (img && typeof threeRenderer.updateScreenTexture === 'function') {
          threeRenderer.updateScreenTexture(img);
        }
      }
    }

    // Update rotation
    const ss = getScreenshotSettings(state);
    const rotation3D = ss?.rotation3D || { x: 0, y: 0, z: 0 };
    if (typeof threeRenderer.setRotation === 'function') {
      threeRenderer.setRotation(rotation3D.x, rotation3D.y, rotation3D.z);
    }

    // Switch device model if needed
    const device3D = ss?.device3D || 'iphone';
    if (typeof threeRenderer.getCurrentDevice === 'function' && threeRenderer.getCurrentDevice() !== device3D) {
      if (typeof threeRenderer.switchPhoneModel === 'function') {
        threeRenderer.switchPhoneModel(device3D);
      }
    }
  }, [use3D, threeRenderer, state.screenshots, state.selectedIndex, state.currentLanguage, state.defaults, getScreenshotImage]);

  // -----------------------------------------------------------------------
  // renderSideCanvas – render a single screenshot to a side preview canvas
  // -----------------------------------------------------------------------

  const renderSideCanvas = useCallback(
    (index, targetCanvas) => {
      if (!targetCanvas) return;
      const screenshot = state.screenshots[index];
      if (!screenshot) return;

      renderScreenshotToCanvas(
        targetCanvas,
        screenshot,
        dims.width,
        dims.height,
        state.currentLanguage,
        state.projectLanguages,
        threeRenderer
      );

      // Apply preview scale to display size
      targetCanvas.style.width = dims.width * previewScale + 'px';
      targetCanvas.style.height = dims.height * previewScale + 'px';
    },
    [state, dims, previewScale, threeRenderer]
  );

  // -----------------------------------------------------------------------
  // updateSidePreviews – renders adjacent screenshots to side canvases
  // -----------------------------------------------------------------------

  const updateSidePreviews = useCallback(
    (skipLeftRight = false) => {
      const mainCanvasWidth = dims.width * previewScale;
      const gap = 10;
      const sideOffset = mainCanvasWidth / 2 + gap;
      const farSideOffset = sideOffset + mainCanvasWidth + gap;

      // --- Left (index - 1) ---
      const prevIndex = state.selectedIndex - 1;
      const leftWrapper = leftCanvasRef.current?.parentElement;
      if (prevIndex >= 0 && state.screenshots.length > 1) {
        if (leftWrapper) {
          leftWrapper.classList.remove('hidden');
          leftWrapper.style.right = `calc(50% + ${sideOffset}px)`;
        }
        if (!skipLeftRight) {
          renderSideCanvas(prevIndex, leftCanvasRef.current);
        }
      } else if (leftWrapper) {
        leftWrapper.classList.add('hidden');
      }

      // --- Far Left (index - 2) ---
      const farPrevIndex = state.selectedIndex - 2;
      const farLeftWrapper = farLeftCanvasRef.current?.parentElement;
      if (farPrevIndex >= 0 && state.screenshots.length > 2) {
        if (farLeftWrapper) {
          farLeftWrapper.classList.remove('hidden');
          farLeftWrapper.style.right = `calc(50% + ${farSideOffset}px)`;
        }
        renderSideCanvas(farPrevIndex, farLeftCanvasRef.current);
      } else if (farLeftWrapper) {
        farLeftWrapper.classList.add('hidden');
      }

      // --- Right (index + 1) ---
      const nextIndex = state.selectedIndex + 1;
      const rightWrapper = rightCanvasRef.current?.parentElement;
      if (nextIndex < state.screenshots.length && state.screenshots.length > 1) {
        if (rightWrapper) {
          rightWrapper.classList.remove('hidden');
          rightWrapper.style.left = `calc(50% + ${sideOffset}px)`;
        }
        if (!skipLeftRight) {
          renderSideCanvas(nextIndex, rightCanvasRef.current);
        }
      } else if (rightWrapper) {
        rightWrapper.classList.add('hidden');
      }

      // --- Far Right (index + 2) ---
      const farNextIndex = state.selectedIndex + 2;
      const farRightWrapper = farRightCanvasRef.current?.parentElement;
      if (farNextIndex < state.screenshots.length && state.screenshots.length > 2) {
        if (farRightWrapper) {
          farRightWrapper.classList.remove('hidden');
          farRightWrapper.style.left = `calc(50% + ${farSideOffset}px)`;
        }
        renderSideCanvas(farNextIndex, farRightCanvasRef.current);
      } else if (farRightWrapper) {
        farRightWrapper.classList.add('hidden');
      }
    },
    [state, dims, previewScale, renderSideCanvas]
  );

  // -----------------------------------------------------------------------
  // updateCanvas – draws the main preview canvas
  // -----------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set internal resolution
    canvas.width = dims.width;
    canvas.height = dims.height;

    // Scale for preview display
    canvas.style.width = dims.width * previewScale + 'px';
    canvas.style.height = dims.height * previewScale + 'px';

    // If no screenshots, clear canvas and let the "no-screenshot" overlay show
    if (state.screenshots.length === 0) {
      ctx.clearRect(0, 0, dims.width, dims.height);
      return;
    }

    // Draw background
    const bg = getBackground(state);
    drawBackgroundToContext(ctx, dims, bg);

    // Draw noise overlay if enabled
    if (bg.noise) {
      drawNoiseToContext(ctx, dims, bg.noiseIntensity);
    }

    // Draw screenshot (2D) or 3D phone model
    if (state.screenshots.length > 0) {
      const ss = getScreenshotSettings(state);
      const is3D = (ss.use3D || false) && !getDuoPanelForDims(dims);

      if (is3D && threeRenderer && typeof threeRenderer.renderToCanvas === 'function' && threeRenderer.isLoaded && threeRenderer.isLoaded()) {
        // 3D mode – render to canvas with current screenshot settings
        threeRenderer.renderToCanvas(canvas, dims.width, dims.height, ss);
      } else if (!is3D) {
        // 2D mode
        const screenshot = state.screenshots[state.selectedIndex];
        if (screenshot) {
          const img = getScreenshotImage(screenshot);
          if (img) {
            drawScreenshotToContext(ctx, dims, img, ss);
          }
        }
      }
    }

    // Draw text
    const txt = getTextSettings(state);
    const txtWithLang = {
      ...txt,
      currentHeadlineLang: state.currentLanguage,
      currentSubheadlineLang: state.currentLanguage,
    };
    drawTextToContext(ctx, dims, txtWithLang);

    // Draw overlay/logo
    const screenshot = state.screenshots[state.selectedIndex];
    const overlay = screenshot?.overlay;
    if (overlay) {
      drawOverlayToContext(ctx, dims, overlay);
    }

    // Update side previews after main canvas is drawn
    updateSidePreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.screenshots,
    state.selectedIndex,
    state.outputDevice,
    state.customWidth,
    state.customHeight,
    state.currentLanguage,
    state.defaults,
    dims,
    previewScale,
    updateSidePreviews,
    getScreenshotImage,
  ]);

  // -----------------------------------------------------------------------
  // slideToScreenshot – animated transition when clicking side previews
  // -----------------------------------------------------------------------

  const slideToScreenshot = useCallback(
    (newIndex, direction) => {
      if (isSliding.current) return;
      isSliding.current = true;

      const strip = previewStripRef.current;
      if (!strip) return;

      strip.classList.add('sliding');

      const slideDistance = dims.width * previewScale + 10;

      // Slide the strip in the opposite direction of the click
      if (direction === 'right') {
        strip.style.transform = `translateX(-${slideDistance}px)`;
      } else {
        strip.style.transform = `translateX(${slideDistance}px)`;
      }

      // Wait for animation to complete
      const animationDone = new Promise((resolve) => setTimeout(resolve, 300));

      animationDone.then(() => {
        // Pre-render new side previews to temporary canvases
        const newPrevIndex = newIndex - 1;
        const newNextIndex = newIndex + 1;
        const tempCanvases = [];

        const prerenderToTemp = (idx, targetCanvas) => {
          if (idx < 0 || idx >= state.screenshots.length || !targetCanvas) return null;
          const tempCanvas = document.createElement('canvas');
          const screenshot = state.screenshots[idx];
          if (!screenshot) return null;

          renderScreenshotToCanvas(
            tempCanvas,
            screenshot,
            dims.width,
            dims.height,
            state.currentLanguage,
            state.projectLanguages,
            threeRenderer
          );
          tempCanvas.style.width = dims.width * previewScale + 'px';
          tempCanvas.style.height = dims.height * previewScale + 'px';

          return { tempCanvas, targetCanvas };
        };

        const leftPrerender = prerenderToTemp(newPrevIndex, leftCanvasRef.current);
        const rightPrerender = prerenderToTemp(newNextIndex, rightCanvasRef.current);
        if (leftPrerender) tempCanvases.push(leftPrerender);
        if (rightPrerender) tempCanvases.push(rightPrerender);

        // Disable transition temporarily for instant reset
        strip.style.transition = 'none';
        strip.style.transform = 'translateX(0)';

        // Copy pre-rendered canvases to actual canvases before state update
        tempCanvases.forEach(({ tempCanvas, targetCanvas }) => {
          targetCanvas.width = tempCanvas.width;
          targetCanvas.height = tempCanvas.height;
          targetCanvas.style.width = tempCanvas.style.width;
          targetCanvas.style.height = tempCanvas.style.height;
          const targetCtx = targetCanvas.getContext('2d');
          targetCtx.drawImage(tempCanvas, 0, 0);
        });

        // Update state – this will trigger re-render and updateCanvas
        dispatch({ type: SELECT_SCREENSHOT, payload: { index: newIndex } });

        // Re-enable transition after a frame
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            strip.style.transition = '';
            strip.classList.remove('sliding');
            isSliding.current = false;
          });
        });
      });
    },
    [state, dims, previewScale, dispatch, threeRenderer]
  );

  // -----------------------------------------------------------------------
  // Side preview click handlers
  // -----------------------------------------------------------------------

  const handleLeftClick = useCallback(() => {
    const prevIndex = state.selectedIndex - 1;
    if (prevIndex >= 0 && !isSliding.current) {
      slideToScreenshot(prevIndex, 'left');
    }
  }, [state.selectedIndex, slideToScreenshot]);

  const handleRightClick = useCallback(() => {
    const nextIndex = state.selectedIndex + 1;
    if (nextIndex < state.screenshots.length && !isSliding.current) {
      slideToScreenshot(nextIndex, 'right');
    }
  }, [state.selectedIndex, state.screenshots.length, slideToScreenshot]);

  const handleFarLeftClick = useCallback(() => {
    const farPrevIndex = state.selectedIndex - 2;
    if (farPrevIndex >= 0 && !isSliding.current) {
      slideToScreenshot(farPrevIndex, 'left');
    }
  }, [state.selectedIndex, slideToScreenshot]);

  const handleFarRightClick = useCallback(() => {
    const farNextIndex = state.selectedIndex + 2;
    if (farNextIndex < state.screenshots.length && !isSliding.current) {
      slideToScreenshot(farNextIndex, 'right');
    }
  }, [state.selectedIndex, state.screenshots.length, slideToScreenshot]);

  // -----------------------------------------------------------------------
  // 3D interactive rotation – mouse/touch events on the main canvas
  // -----------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (e) => {
      if (!use3D) return;
      isDragging3D.current = true;
      isAltDragging.current = e.altKey;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      if (canvasRef.current) {
        canvasRef.current.style.cursor = e.altKey ? 'move' : 'grabbing';
      }
    },
    [use3D]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging3D.current || !use3D) return;

      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      const ss = getScreenshotSettings(state);
      if (!ss) return;

      if (isAltDragging.current) {
        // Alt+drag: move position (x, y)
        const newX = Math.max(-30, Math.min(130, ss.x + deltaX * 0.2));
        const newY = Math.max(-30, Math.min(130, ss.y + deltaY * 0.2));
        dispatch({ type: SET_SCREENSHOT_SETTING, payload: { key: 'x', value: newX } });
        dispatch({ type: SET_SCREENSHOT_SETTING, payload: { key: 'y', value: newY } });
      } else {
        // Regular drag: rotate
        const rotation3D = ss.rotation3D || { x: 0, y: 0, z: 0 };
        const newRotY = Math.max(-45, Math.min(45, rotation3D.y + deltaX * 0.5));
        const newRotX = Math.max(-45, Math.min(45, rotation3D.x + deltaY * 0.5));

        dispatch({ type: SET_SCREENSHOT_SETTING, payload: { key: 'rotation3D', value: { x: newRotX, y: newRotY, z: rotation3D.z } } });

        // Apply rotation directly to model for fast feedback
        if (threeRenderer && typeof threeRenderer.setRotation === 'function') {
          threeRenderer.setRotation(newRotX, newRotY, rotation3D.z);
        }
      }

      // Throttle canvas updates via requestAnimationFrame
      if (!dragUpdatePending.current) {
        dragUpdatePending.current = true;
        requestAnimationFrame(() => {
          dragUpdatePending.current = false;
        });
      }
    },
    [use3D, state, dispatch, threeRenderer]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging3D.current) {
      isDragging3D.current = false;
      isAltDragging.current = false;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = use3D ? 'grab' : '';
      }
    }
  }, [use3D]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging3D.current) {
      isDragging3D.current = false;
      isAltDragging.current = false;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = '';
      }
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (use3D && canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  }, [use3D]);

  // -----------------------------------------------------------------------
  // Wheel event – horizontal scroll navigation between screenshots
  // -----------------------------------------------------------------------

  useEffect(() => {
    const canvasWrapper = canvasRef.current?.parentElement;
    const strip = previewStripRef.current;

    // Prevent horizontal scroll from triggering browser back/forward on wrapper
    const handleWrapperWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    };

    // Handle horizontal swipe navigation on the strip
    const handleStripWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

      e.preventDefault();
      e.stopPropagation();

      if (isSliding.current) return;
      if (state.screenshots.length <= 1) return;

      swipeAccumulator.current += e.deltaX;

      if (swipeAccumulator.current > SWIPE_THRESHOLD) {
        // Swipe left = go to next screenshot
        const nextIndex = state.selectedIndex + 1;
        if (nextIndex < state.screenshots.length) {
          slideToScreenshot(nextIndex, 'right');
        }
        swipeAccumulator.current = 0;
      } else if (swipeAccumulator.current < -SWIPE_THRESHOLD) {
        // Swipe right = go to previous screenshot
        const prevIndex = state.selectedIndex - 1;
        if (prevIndex >= 0) {
          slideToScreenshot(prevIndex, 'left');
        }
        swipeAccumulator.current = 0;
      }
    };

    if (canvasWrapper) {
      canvasWrapper.addEventListener('wheel', handleWrapperWheel, { passive: false });
    }
    if (strip) {
      strip.addEventListener('wheel', handleStripWheel, { passive: false });
    }

    return () => {
      if (canvasWrapper) {
        canvasWrapper.removeEventListener('wheel', handleWrapperWheel);
      }
      if (strip) {
        strip.removeEventListener('wheel', handleStripWheel);
      }
    };
  }, [state.screenshots, state.selectedIndex, slideToScreenshot]);

  // (Three.js container is in the parent index.jsx, connected via useThreeRenderer hook)

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const hasScreenshots = state.screenshots.length > 0;

  return (
    <div className="canvas-area">
      <div className="preview-strip" ref={previewStripRef}>
        {/* Far-left side preview */}
        <div
          className="side-preview side-preview-far-left hidden"
          onClick={handleFarLeftClick}
        >
          <canvas ref={farLeftCanvasRef} />
        </div>

        {/* Left side preview */}
        <div
          className="side-preview side-preview-left hidden"
          onClick={handleLeftClick}
        >
          <canvas ref={leftCanvasRef} />
        </div>

        {/* Main canvas wrapper */}
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
          />

          {/* No-screenshot overlay */}
          {!hasScreenshots && (
            <div className="no-screenshot">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p>Upload screenshots to get started</p>
            </div>
          )}
        </div>

        {/* Right side preview */}
        <div
          className="side-preview side-preview-right hidden"
          onClick={handleRightClick}
        >
          <canvas ref={rightCanvasRef} />
        </div>

        {/* Far-right side preview */}
        <div
          className="side-preview side-preview-far-right hidden"
          onClick={handleFarRightClick}
        >
          <canvas ref={farRightCanvasRef} />
        </div>
      </div>
    </div>
  );
}
