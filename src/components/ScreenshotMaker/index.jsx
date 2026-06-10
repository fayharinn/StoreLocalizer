import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import appscreenCss from '@/appscreen/appscreen.css?raw';

import useAppState, {
  SET_TEXT_SETTING,
  SET_PROJECT_LANGUAGES,
  SET_CURRENT_LANGUAGE,
  LOAD_STATE,
  BATCH_UPDATE,
  UNDO,
  REDO,
} from './hooks/useAppState';
import useThreeRenderer from './hooks/useThreeRenderer';

import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import CanvasArea from './components/CanvasArea';
import {
  TranslateModal,
  LanguagesModal,
  ExportLanguageModal,
  ScreenshotTranslationsModal,
  MagicalTitlesModal,
  ExportProgressModal,
  DuplicateScreenshotModal,
} from './components/Modals';

import { getScreenshotImage as getScreenshotImageFn } from './utils/languageUtils';
import { exportScreenshot, exportAllForLanguage, exportAllLanguages } from './utils/exportUtils';
import { renderScreenshotToCanvas } from './utils/canvasRenderer';
import { generateTitles, parseDataUrl } from './utils/llmService';
import { languageNames, deviceDimensions } from './constants';
import { loadProjectsMeta } from './utils/persistence';

// =============================================================================
// CSS scoping utilities (copied from original ScreenshotMaker.jsx)
// =============================================================================

const scopeSelectors = (selectors, scope) => {
  return selectors.split(',').map((selector) => {
    const trimmed = selector.trim();
    if (!trimmed) return '';
    if (trimmed === ':root' || trimmed === 'html' || trimmed === 'body') return scope;
    if (trimmed.startsWith('html')) return trimmed.replace(/^html/, scope);
    if (trimmed.startsWith('body')) return trimmed.replace(/^body/, scope);
    return `${scope} ${trimmed}`;
  }).join(', ');
};

const extractBlock = (css, startIndex) => {
  const openIndex = css.indexOf('{', startIndex);
  if (openIndex === -1) return null;
  let depth = 0;
  for (let i = openIndex; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') depth -= 1;
    if (depth === 0) {
      return {
        header: css.slice(startIndex, openIndex).trim(),
        body: css.slice(openIndex + 1, i),
        endIndex: i + 1,
      };
    }
  }
  return null;
};

const scopeCss = (css, scope) => {
  let i = 0;
  let output = '';

  while (i < css.length) {
    const nextBrace = css.indexOf('{', i);
    const nextAt = css.indexOf('@', i);

    if (nextAt !== -1 && (nextBrace === -1 || nextAt < nextBrace)) {
      const block = extractBlock(css, nextAt);
      if (!block) {
        output += css.slice(i);
        break;
      }

      const header = block.header;
      if (header.startsWith('@keyframes') || header.startsWith('@-webkit-keyframes') || header.startsWith('@-moz-keyframes') || header.startsWith('@-o-keyframes')) {
        output += css.slice(nextAt, block.endIndex);
        i = block.endIndex;
        continue;
      }

      if (header.startsWith('@media') || header.startsWith('@supports') || header.startsWith('@container') || header.startsWith('@layer')) {
        output += `${header}{${scopeCss(block.body, scope)}}`;
        i = block.endIndex;
        continue;
      }

      output += css.slice(nextAt, block.endIndex);
      i = block.endIndex;
      continue;
    }

    if (nextBrace === -1) {
      output += css.slice(i);
      break;
    }

    const selectorText = css.slice(i, nextBrace).trim();
    const block = extractBlock(css, i);
    if (!block) break;
    if (selectorText) {
      output += `${scopeSelectors(selectorText, scope)}{${block.body}}`;
    }
    i = block.endIndex;
  }

  return output;
};

// =============================================================================
// Theme variable mappings
// =============================================================================

const themeVars = `.appscreen-root{
  --bg-primary: var(--background);
  --bg-secondary: var(--card);
  --bg-tertiary: var(--muted);
  --border-color: var(--border);
  --text-primary: var(--foreground);
  --text-secondary: var(--muted-foreground);
  --accent: var(--primary);
  --accent-hover: var(--primary);
  --appscreen-height: calc(100svh - 3.5rem - 1px);
  width: 100%;
}
.appscreen-root .app-container{
  width: 100%;
  max-width: none;
  height: var(--appscreen-height);
  min-height: var(--appscreen-height);
  max-height: var(--appscreen-height);
}
.appscreen-root .sidebar{
  height: var(--appscreen-height);
  max-height: var(--appscreen-height);
}
.appscreen-root .sidebar-content{
  overflow-y: auto;
}
.appscreen-root .sidebar-right .sidebar-content{
  overflow-y: auto;
}
.appscreen-root .canvas-area{
  height: var(--appscreen-height);
  max-height: var(--appscreen-height);
  overflow: hidden;
}
`;

// =============================================================================
// Main Component
// =============================================================================

export default function ScreenshotMaker({ localizationPayload, aiConfig, active }) {
  // ---------------------------------------------------------------------------
  // State management
  // ---------------------------------------------------------------------------
  const isMobile = useIsMobile();

  const {
    state,
    dispatch,
    saveState,
    loadState,
    db,
    getCurrentScreenshot,
    getBackground,
    getScreenshotSettings,
    getText,
    canUndo,
    canRedo,
  } = useAppState();

  // ---------------------------------------------------------------------------
  // 3D renderer
  // ---------------------------------------------------------------------------
  const threeContainerRef = useRef(null);
  const threeRenderer = useThreeRenderer(threeContainerRef);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts (Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z = redo)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) dispatch({ type: UNDO });
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        if (canRedo) dispatch({ type: REDO });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, dispatch]);

  // ---------------------------------------------------------------------------
  // Scoped CSS (memoised once)
  // ---------------------------------------------------------------------------
  const scopedCss = useMemo(() => scopeCss(appscreenCss, '.appscreen-root'), []);

  // ---------------------------------------------------------------------------
  // AI payload derived from aiConfig
  // ---------------------------------------------------------------------------
  const aiPayload = useMemo(() => {
    if (!aiConfig) return null;
    const provider = aiConfig.provider || 'openai';
    const apiKey = aiConfig.apiKeys?.[provider] || '';
    const model = aiConfig.models?.[provider] || '';
    if (!apiKey && !model) return null;
    // Azure uses endpoint as the resource URL; Cloudflare uses it as the Account ID
    const endpoint = (provider === 'azure' || provider === 'cloudflare') ? aiConfig.endpoint : undefined;
    const region = provider === 'bedrock' ? (aiConfig.region || 'us-east-1') : undefined;
    return { apiKey, model, provider, endpoint, region };
  }, [aiConfig]);

  // ---------------------------------------------------------------------------
  // Modal visibility state
  // ---------------------------------------------------------------------------
  const [translateModalVisible, setTranslateModalVisible] = useState(false);
  const [translateTarget, setTranslateTarget] = useState('headline');

  const [languagesModalVisible, setLanguagesModalVisible] = useState(false);

  const [exportLanguageModalVisible, setExportLanguageModalVisible] = useState(false);

  const [screenshotTranslationsModalVisible, setScreenshotTranslationsModalVisible] = useState(false);
  const [translationsScreenshotIndex, setTranslationsScreenshotIndex] = useState(0);

  const [magicalTitlesModalVisible, setMagicalTitlesModalVisible] = useState(false);

  const [exportProgressVisible, setExportProgressVisible] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportDetail, setExportDetail] = useState('');

  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const saveTimerRef = useRef(null);
  const prevLocalizationRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Initialisation: load projects meta & state from IndexedDB
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!db.current) {
        // Wait briefly for the database to open
        await new Promise((r) => setTimeout(r, 200));
      }
      if (cancelled || !db.current) return;

      try {
        const meta = await loadProjectsMeta(db.current);
        if (cancelled) return;

        if (meta && meta.projects && meta.projects.length > 0) {
          dispatch({ type: BATCH_UPDATE, payload: { projects: meta.projects, currentProjectId: meta.currentProjectId || meta.projects[0].id } });
          await loadState(meta.currentProjectId || meta.projects[0].id);
        } else {
          // Create a default project on first run
          const id = `project_${Date.now()}`;
          const defaultProject = { id, name: 'Default Project', createdAt: Date.now() };
          dispatch({ type: BATCH_UPDATE, payload: { projects: [defaultProject], currentProjectId: id } });
        }
      } catch (err) {
        console.error('Failed to load initial state:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Apply localization data when localizationPayload changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!localizationPayload) return;
    if (localizationPayload === prevLocalizationRef.current) return;
    prevLocalizationRef.current = localizationPayload;

    const { languages, headlines, subheadlines, options } = localizationPayload;

    // Sync project languages if provided
    if (languages && languages.length > 0) {
      const merged = [...new Set([...state.projectLanguages, ...languages])];
      dispatch({ type: SET_PROJECT_LANGUAGES, payload: { languages: merged } });
    }

    // Apply headline translations to each screenshot
    if (headlines && state.screenshots.length > 0) {
      state.screenshots.forEach((screenshot, idx) => {
        if (headlines[idx]) {
          const mergedHeadlines = { ...(screenshot.text?.headlines || {}), ...headlines[idx] };
          // We need to dispatch per-screenshot; use BATCH_UPDATE with patched screenshots
          const updatedScreenshots = [...state.screenshots];
          updatedScreenshots[idx] = {
            ...updatedScreenshots[idx],
            text: {
              ...updatedScreenshots[idx].text,
              headlines: mergedHeadlines,
              headlineLanguages: [...new Set([...(updatedScreenshots[idx].text?.headlineLanguages || ['en']), ...Object.keys(mergedHeadlines)])],
            },
          };
          dispatch({ type: BATCH_UPDATE, payload: { screenshots: updatedScreenshots } });
        }
      });
    }

    // Apply subheadline translations to each screenshot
    if (subheadlines && state.screenshots.length > 0) {
      state.screenshots.forEach((screenshot, idx) => {
        if (subheadlines[idx]) {
          const mergedSubheadlines = { ...(screenshot.text?.subheadlines || {}), ...subheadlines[idx] };
          const updatedScreenshots = [...state.screenshots];
          updatedScreenshots[idx] = {
            ...updatedScreenshots[idx],
            text: {
              ...updatedScreenshots[idx].text,
              subheadlines: mergedSubheadlines,
              subheadlineLanguages: [...new Set([...(updatedScreenshots[idx].text?.subheadlineLanguages || ['en']), ...Object.keys(mergedSubheadlines)])],
              subheadlineEnabled: true,
            },
          };
          dispatch({ type: BATCH_UPDATE, payload: { screenshots: updatedScreenshots } });
        }
      });
    }
  }, [localizationPayload]);

  // ---------------------------------------------------------------------------
  // Auto-save on state change (debounced)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!state.currentProjectId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveState();
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, saveState]);

  // ---------------------------------------------------------------------------
  // Helper: get localized image for current settings
  // ---------------------------------------------------------------------------
  const getScreenshotImageForCurrent = useCallback((screenshot) => {
    return getScreenshotImageFn(screenshot, state.currentLanguage, state.projectLanguages);
  }, [state.currentLanguage, state.projectLanguages]);

  // ---------------------------------------------------------------------------
  // Output dimensions helper
  // ---------------------------------------------------------------------------
  const getOutputDimensions = useCallback(() => {
    if (state.outputDevice === 'custom') {
      return { width: state.customWidth, height: state.customHeight };
    }
    return deviceDimensions[state.outputDevice] || { width: 1290, height: 2796 };
  }, [state.outputDevice, state.customWidth, state.customHeight]);

  // ---------------------------------------------------------------------------
  // Render function for exports (renders a screenshot to an offscreen canvas)
  // ---------------------------------------------------------------------------
  const renderFn = useCallback(async (canvas, screenshot, width, height, language) => {
    // Build text settings with the appropriate language set
    const textWithLang = {
      ...screenshot.text,
      currentHeadlineLang: language,
      currentSubheadlineLang: language,
    };
    const screenshotWithLang = { ...screenshot, text: textWithLang };

    renderScreenshotToCanvas(
      canvas,
      screenshotWithLang,
      width,
      height,
      language,
      state.projectLanguages,
      threeRenderer,
    );
  }, [state.projectLanguages, threeRenderer]);

  // ---------------------------------------------------------------------------
  // Export: current screenshot
  // ---------------------------------------------------------------------------
  const exportCurrent = useCallback(async () => {
    const screenshot = getCurrentScreenshot();
    if (!screenshot) return;

    const dims = getOutputDimensions();
    const canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;

    await renderFn(canvas, screenshot, dims.width, dims.height, state.currentLanguage);
    await exportScreenshot(canvas, `screenshot-${state.currentLanguage}.png`);
  }, [getCurrentScreenshot, getOutputDimensions, renderFn, state.currentLanguage]);

  // ---------------------------------------------------------------------------
  // Export: all screenshots - shows language choice modal first
  // ---------------------------------------------------------------------------
  const exportAll = useCallback(() => {
    if (state.projectLanguages.length > 1) {
      setExportLanguageModalVisible(true);
    } else {
      handleExportCurrentLanguage();
    }
  }, [state.projectLanguages.length]);

  const handleExportCurrentLanguage = useCallback(async () => {
    setExportLanguageModalVisible(false);
    setExportProgressVisible(true);
    setExportProgress(0);
    setExportStatus('Exporting...');
    setExportDetail('');

    try {
      const dims = getOutputDimensions();
      await exportAllForLanguage(
        state.screenshots,
        state.currentLanguage,
        dims.width,
        dims.height,
        renderFn,
        (current, total) => {
          const pct = Math.round((current / total) * 100);
          setExportProgress(pct);
          setExportStatus(`Exporting screenshot ${current} of ${total}...`);
          setExportDetail(`${languageNames[state.currentLanguage] || state.currentLanguage}`);
        },
      );
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('Export failed: ' + err.message);
    } finally {
      setTimeout(() => setExportProgressVisible(false), 1500);
    }
  }, [getOutputDimensions, state.screenshots, state.currentLanguage, renderFn]);

  const handleExportAllLanguages = useCallback(async () => {
    setExportLanguageModalVisible(false);
    setExportProgressVisible(true);
    setExportProgress(0);
    setExportStatus('Exporting all languages...');
    setExportDetail('');

    try {
      const dims = getOutputDimensions();
      await exportAllLanguages(
        state.screenshots,
        state.projectLanguages,
        dims.width,
        dims.height,
        renderFn,
        (current, total) => {
          const pct = Math.round((current / total) * 100);
          setExportProgress(pct);
          const langIndex = Math.floor((current - 1) / state.screenshots.length);
          const lang = state.projectLanguages[langIndex] || '';
          setExportStatus(`Exporting ${current} of ${total}...`);
          setExportDetail(`${languageNames[lang] || lang}`);
        },
      );
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('Export failed: ' + err.message);
    } finally {
      setTimeout(() => setExportProgressVisible(false), 1500);
    }
  }, [getOutputDimensions, state.screenshots, state.projectLanguages, renderFn]);

  // ---------------------------------------------------------------------------
  // Translate all handler (headline + subheadline for all screenshots)
  // ---------------------------------------------------------------------------
  const handleTranslateAll = useCallback(() => {
    setTranslateTarget('headline');
    setTranslateModalVisible(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Magical titles generation
  // ---------------------------------------------------------------------------
  const handleGenerateTitles = useCallback(async (targetLang) => {
    setMagicalTitlesModalVisible(false);

    if (!aiPayload) {
      console.error('AI not configured');
      return;
    }

    if (state.screenshots.length === 0) {
      console.error('No screenshots to generate titles for');
      return;
    }

    setExportProgressVisible(true);
    setExportProgress(0);
    setExportStatus('Generating magical titles...');
    setExportDetail('Analysing your screenshots with AI');

    try {
      // Collect screenshot images as base64 data URLs
      const images = [];
      for (const screenshot of state.screenshots) {
        const img = getScreenshotImageForCurrent(screenshot);
        if (img && img.src) {
          const parsed = parseDataUrl(img.src);
          if (parsed) {
            images.push(parsed);
          }
        }
      }

      if (images.length === 0) {
        setExportStatus('No images found to analyse');
        setTimeout(() => setExportProgressVisible(false), 2000);
        return;
      }

      const langName = languageNames[targetLang] || targetLang;
      const prompt = `You are an expert App Store marketing copywriter. Analyse these ${images.length} app screenshots and generate compelling marketing headlines and subheadlines for each one.

Generate titles in ${langName} (${targetLang}).

For each screenshot, provide:
- A headline: short, punchy, marketing-focused (max ~6 words)
- A subheadline: slightly longer descriptive text (max ~12 words)

Respond ONLY with a valid JSON array where each element has "headline" and "subheadline" keys.
Example: [{"headline": "Track Your Progress", "subheadline": "Beautiful charts show your daily achievements"}]

Generate exactly ${images.length} items, one per screenshot.`;

      setExportProgress(30);

      const responseText = await generateTitles(
        aiPayload.provider,
        aiPayload.apiKey,
        images,
        prompt,
        aiPayload.model,
        { endpoint: aiPayload.endpoint, region: aiPayload.region },
      );

      setExportProgress(80);
      setExportStatus('Applying titles...');

      // Parse response
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const titles = JSON.parse(cleaned);

      // Apply titles to screenshots
      const updatedScreenshots = state.screenshots.map((screenshot, idx) => {
        const titleData = titles[idx];
        if (!titleData) return screenshot;

        const newHeadlines = { ...(screenshot.text?.headlines || {}), [targetLang]: titleData.headline || '' };
        const newSubheadlines = { ...(screenshot.text?.subheadlines || {}), [targetLang]: titleData.subheadline || '' };

        return {
          ...screenshot,
          text: {
            ...screenshot.text,
            headlines: newHeadlines,
            headlineLanguages: [...new Set([...(screenshot.text?.headlineLanguages || ['en']), targetLang])],
            currentHeadlineLang: targetLang,
            subheadlines: newSubheadlines,
            subheadlineLanguages: [...new Set([...(screenshot.text?.subheadlineLanguages || ['en']), targetLang])],
            currentSubheadlineLang: targetLang,
            subheadlineEnabled: true,
          },
        };
      });

      dispatch({ type: BATCH_UPDATE, payload: { screenshots: updatedScreenshots } });

      // Ensure the target language is in project languages
      if (!state.projectLanguages.includes(targetLang)) {
        dispatch({ type: SET_PROJECT_LANGUAGES, payload: { languages: [...state.projectLanguages, targetLang] } });
      }
      dispatch({ type: SET_CURRENT_LANGUAGE, payload: { language: targetLang } });

      setExportProgress(100);
      setExportStatus('Titles generated successfully!');
    } catch (err) {
      console.error('Title generation failed:', err);
      setExportStatus('Generation failed: ' + err.message);
    } finally {
      setTimeout(() => setExportProgressVisible(false), 2000);
    }
  }, [aiPayload, state.screenshots, state.projectLanguages, getScreenshotImageForCurrent, dispatch]);

  // ---------------------------------------------------------------------------
  // Shared props
  // ---------------------------------------------------------------------------
  const leftSidebarProps = {
    state, dispatch,
    onExportCurrent: exportCurrent,
    onExportAll: exportAll,
    onGenerateTitles: () => setMagicalTitlesModalVisible(true),
    onOpenLanguages: () => setLanguagesModalVisible(true),
    onOpenTranslateAll: handleTranslateAll,
    aiConfig: aiPayload,
    canUndo, canRedo,
    onUndo: () => dispatch({ type: UNDO }),
    onRedo: () => dispatch({ type: REDO }),
  };

  const canvasAreaProps = {
    state, dispatch,
    threeRenderer,
    getScreenshotImage: getScreenshotImageForCurrent,
  };

  const rightSidebarProps = {
    state, dispatch,
    onTranslateHeadline: () => { setTranslateTarget('headline'); setTranslateModalVisible(true); },
    onTranslateSubheadline: () => { setTranslateTarget('subheadline'); setTranslateModalVisible(true); },
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const sharedHead = (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${scopedCss}\n${themeVars}` }} />
      <div ref={threeContainerRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }} />
    </>
  );

  // ── Mobile layout ──
  if (isMobile) {
    return (
      <div className="appscreen-root">
        {sharedHead}
        <Tabs defaultValue="preview">
          {/* Content area — above the fixed bar, scrollable */}
          <div style={{ position: 'fixed', top: '3.5rem', left: 0, right: 0, bottom: '3.5rem', overflow: 'hidden' }}>
            <TabsContent value="list" className="m-0 h-full overflow-y-auto data-[state=inactive]:hidden">
              <div className="p-4">
                <LeftSidebar {...leftSidebarProps} mobile />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="m-0 h-full data-[state=inactive]:hidden">
              <CanvasArea {...canvasAreaProps} />
            </TabsContent>
            <TabsContent value="settings" className="m-0 h-full overflow-y-auto data-[state=inactive]:hidden">
              <div className="p-4">
                <RightSidebar {...rightSidebarProps} mobile />
              </div>
            </TabsContent>
          </div>

          {/* Fixed bottom tab bar */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '3.5rem', zIndex: 50, borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
            <TabsList style={{ display: 'flex', width: '100%', height: '100%', borderRadius: 0, padding: 0, background: 'transparent' }}>
              <TabsTrigger value="list" style={{ flex: 1, height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                Screenshots
              </TabsTrigger>
              <TabsTrigger value="preview" style={{ flex: 1, height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
                Preview
              </TabsTrigger>
              <TabsTrigger value="settings" style={{ flex: 1, height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                Settings
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
    );
  }

  // ── Desktop layout ──
  return (
    <div className="appscreen-root w-full">
      {sharedHead}

      <div
        className="app-container"
        style={{
          gridTemplateColumns: rightSidebarOpen ? '320px 1fr 340px' : '320px 1fr',
          transition: 'grid-template-columns 0.2s ease',
        }}
      >
        <LeftSidebar {...leftSidebarProps} />

        <div style={{ position: 'relative' }}>
          <CanvasArea {...canvasAreaProps} />
          <button
            onClick={() => setRightSidebarOpen((v) => !v)}
            title={rightSidebarOpen ? 'Hide settings panel' : 'Show settings panel'}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 10,
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {rightSidebarOpen ? (
                <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18" /><path d="M19 9l-2 3 2 3" /></>
              ) : (
                <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18" /><path d="M10 9l2 3-2 3" /></>
              )}
            </svg>
          </button>
        </div>

        {rightSidebarOpen && <RightSidebar {...rightSidebarProps} />}
      </div>

      {/* Modals */}
      <TranslateModal
        visible={translateModalVisible}
        onClose={() => setTranslateModalVisible(false)}
        target={translateTarget}
        state={state}
        dispatch={dispatch}
        aiConfig={aiPayload}
      />

      <LanguagesModal
        visible={languagesModalVisible}
        onClose={() => setLanguagesModalVisible(false)}
        state={state}
        dispatch={dispatch}
      />

      <ExportLanguageModal
        visible={exportLanguageModalVisible}
        onClose={() => setExportLanguageModalVisible(false)}
        onExportCurrent={handleExportCurrentLanguage}
        onExportAll={handleExportAllLanguages}
        currentLanguage={state.currentLanguage}
      />

      <ScreenshotTranslationsModal
        visible={screenshotTranslationsModalVisible}
        onClose={() => setScreenshotTranslationsModalVisible(false)}
        screenshotIndex={translationsScreenshotIndex}
        state={state}
        dispatch={dispatch}
      />

      <MagicalTitlesModal
        visible={magicalTitlesModalVisible}
        onClose={() => setMagicalTitlesModalVisible(false)}
        onConfirm={handleGenerateTitles}
        state={state}
        aiConfig={aiPayload}
      />

      <ExportProgressModal
        visible={exportProgressVisible}
        status={exportStatus}
        detail={exportDetail}
        progress={exportProgress}
      />

      <DuplicateScreenshotModal
        visible={duplicateModalVisible}
        onReplace={() => {
          if (duplicateData?.onReplace) duplicateData.onReplace();
          setDuplicateModalVisible(false);
          setDuplicateData(null);
        }}
        onCreateNew={() => {
          if (duplicateData?.onCreateNew) duplicateData.onCreateNew();
          setDuplicateModalVisible(false);
          setDuplicateData(null);
        }}
        onSkip={() => {
          setDuplicateModalVisible(false);
          setDuplicateData(null);
        }}
        existingScreenshot={duplicateData?.existingScreenshot || null}
        newImage={duplicateData?.newImage || null}
        detectedLang={duplicateData?.detectedLang || 'en'}
      />
    </div>
  );
}
