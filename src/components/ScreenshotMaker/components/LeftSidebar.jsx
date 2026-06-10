import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { deviceDimensions, languageFlags, languageNames, llmProviders } from '../constants';
import TemplatesPanel from './TemplatesPanel';
import {
  SELECT_SCREENSHOT,
  ADD_SCREENSHOT,
  REMOVE_SCREENSHOT,
  REORDER_SCREENSHOTS,
  SET_OUTPUT_DEVICE,
  SET_CUSTOM_DIMENSIONS,
  SET_CURRENT_LANGUAGE,
  ADD_PROJECT_LANGUAGE,
  REMOVE_PROJECT_LANGUAGE,
  APPLY_STYLE_TO_ALL,
  TRANSFER_STYLE,
  SET_PROJECTS,
  SET_CURRENT_PROJECT_ID,
  BATCH_UPDATE,
} from '../hooks/useAppState';
import {
  detectLanguageFromFilename,
  getBaseFilename,
  getAvailableLanguagesForScreenshot,
  isScreenshotComplete,
} from '../utils/languageUtils';

// =============================================================================
// Device options for the output size dropdown
// =============================================================================
const deviceOptions = [
  { group: 'iPhone', items: [
    { id: 'iphone-6.9', name: 'iPhone 6.9"' },
    { id: 'iphone-6.7', name: 'iPhone 6.7"' },
    { id: 'iphone-6.5', name: 'iPhone 6.5"' },
    { id: 'iphone-5.5', name: 'iPhone 5.5"' },
  ]},
  { group: 'iPad', items: [
    { id: 'ipad-12.9', name: 'iPad 12.9"' },
    { id: 'ipad-11', name: 'iPad 11"' },
  ]},
  { group: 'Android', items: [
    { id: 'android-phone', name: 'Android Phone' },
    { id: 'android-phone-hd', name: 'Android Phone HD' },
    { id: 'android-tablet-7', name: 'Android Tablet 7"' },
    { id: 'android-tablet-10', name: 'Android Tablet 10"' },
  ]},
  { group: 'Web', items: [
    { id: 'web-og', name: 'Open Graph' },
    { id: 'web-twitter', name: 'Twitter/X Card' },
    { id: 'web-hero', name: 'Website Hero' },
    { id: 'web-feature', name: 'Feature Graphic' },
  ]},
  { group: 'Custom', items: [
    { id: 'custom', name: 'Custom Size' },
  ]},
];

// =============================================================================
// SVG Icon Helpers
// =============================================================================
const GripIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
    <circle cx="8" cy="4" r="2" /><circle cx="16" cy="4" r="2" />
    <circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" />
    <circle cx="8" cy="20" r="2" /><circle cx="16" cy="20" r="2" />
  </svg>
);

const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const DropdownArrow = () => (
  <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

const AIIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const EditLangIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TranslateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2v3M22 22l-5-10-5 10M14 18h6" />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6" /><path d="M3 13a9 9 0 0 1 3-7.7A9 9 0 0 1 21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3" />
  </svg>
);

const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6" /><path d="M21 13a9 9 0 0 0-3-7.7A9 9 0 0 0 3 12a9 9 0 0 0 9 9 9 9 0 0 0 6.7-3" />
  </svg>
);

export default function LeftSidebar({
  state,
  dispatch,
  onExportCurrent,
  onExportAll,
  onGenerateTitles,
  onOpenLanguages,
  onOpenTranslateAll,
  aiConfig,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  mobile,
}) {
  // ---------------------------------------------------------------------------
  // Local UI state
  // ---------------------------------------------------------------------------
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [outputSizeMenuOpen, setOutputSizeMenuOpen] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState('new'); // 'new' | 'rename'
  const [projectNameInput, setProjectNameInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [uploadDragOver, setUploadDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const replaceTargetIndex = useRef(null);

  const {
    screenshots,
    selectedIndex,
    outputDevice,
    currentLanguage,
    projectLanguages,
    customWidth,
    customHeight,
    projects,
    currentProjectId,
    transferTarget,
  } = state;

  const currentProject = projects?.find((p) => p.id === currentProjectId) || null;

  // ---------------------------------------------------------------------------
  // Close menus on outside click
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.project-dropdown')) setProjectMenuOpen(false);
      if (!e.target.closest('.language-picker')) setLanguageMenuOpen(false);
      if (!e.target.closest('.output-size-dropdown')) setOutputSizeMenuOpen(false);
      // (DropdownMenu from shadcn handles its own open/close)
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // ---------------------------------------------------------------------------
  // File upload
  // ---------------------------------------------------------------------------
  const handleFileUpload = useCallback((files) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const detectedLang = detectLanguageFromFilename(file.name);
          const baseName = getBaseFilename(file.name);

          dispatch({
            type: ADD_SCREENSHOT,
            payload: {
              screenshot: {
                image: img,
                name: baseName,
                deviceType: img.width < img.height ? 'phone' : 'tablet',
                localizedImages: {
                  [detectedLang]: {
                    image: img,
                    src: e.target.result,
                    name: file.name,
                  },
                },
              },
            },
          });

          // Add language to project if not already present
          if (!projectLanguages.includes(detectedLang)) {
            dispatch({ type: ADD_PROJECT_LANGUAGE, payload: { language: detectedLang } });
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }, [dispatch, projectLanguages]);

  const handleFileInputChange = useCallback((e) => {
    handleFileUpload(e.target.files);
    e.target.value = '';
  }, [handleFileUpload]);

  // ---------------------------------------------------------------------------
  // Replace screenshot
  // ---------------------------------------------------------------------------
  const handleReplaceScreenshot = useCallback((index) => {
    replaceTargetIndex.current = index;
    replaceFileInputRef.current?.click();

  }, []);

  const handleReplaceFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const targetIdx = replaceTargetIndex.current;
    if (targetIdx == null) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Dispatch a localized image set for the replacement under the current active language
        dispatch({
          type: 'SET_LOCALIZED_IMAGE',
          payload: {
            screenshotIndex: targetIdx,
            lang: currentLanguage,
            image: img,
            src: ev.target.result,
            name: file.name,
          },
        });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [dispatch, currentLanguage]);

  // ---------------------------------------------------------------------------
  // Drag and drop reordering
  // ---------------------------------------------------------------------------
  const handleDragStart = useCallback((e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault();
    const fromIndex = dragIndex;
    if (fromIndex != null && fromIndex !== toIndex) {
      // If we're in transfer mode, transfer style instead of reorder
      if (transferTarget != null) {
        dispatch({
          type: TRANSFER_STYLE,
          payload: { fromIndex: transferTarget, toIndex },
        });
      } else {
        dispatch({
          type: REORDER_SCREENSHOTS,
          payload: { fromIndex, toIndex },
        });
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, transferTarget, dispatch]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Project management
  // ---------------------------------------------------------------------------
  const handleNewProject = useCallback(() => {
    setProjectModalMode('new');
    setProjectNameInput('');
    setShowProjectModal(true);
  }, []);

  const handleRenameProject = useCallback(() => {
    if (!currentProject) return;
    setProjectModalMode('rename');
    setProjectNameInput(currentProject.name || '');
    setShowProjectModal(true);
  }, [currentProject]);

  const handleProjectModalSubmit = useCallback(() => {
    const name = projectNameInput.trim();
    if (!name) return;

    if (projectModalMode === 'new') {
      const id = `project_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newProject = { id, name, createdAt: Date.now() };
      const updatedProjects = [...(projects || []), newProject];
      dispatch({ type: SET_PROJECTS, payload: { projects: updatedProjects } });
      dispatch({ type: SET_CURRENT_PROJECT_ID, payload: { projectId: id } });
    } else if (projectModalMode === 'rename' && currentProject) {
      const updatedProjects = (projects || []).map((p) =>
        p.id === currentProject.id ? { ...p, name } : p
      );
      dispatch({ type: SET_PROJECTS, payload: { projects: updatedProjects } });
    }

    setShowProjectModal(false);
    setProjectNameInput('');
  }, [projectNameInput, projectModalMode, projects, currentProject, dispatch]);

  const handleDeleteProject = useCallback(async () => {
    if (!currentProject || !projects) return;

    const remaining = projects.filter((p) => p.id !== currentProject.id);
    dispatch({ type: SET_PROJECTS, payload: { projects: remaining } });

    if (remaining.length > 0) {
      dispatch({ type: SET_CURRENT_PROJECT_ID, payload: { projectId: remaining[0].id } });
    } else {
      dispatch({ type: SET_CURRENT_PROJECT_ID, payload: { projectId: null } });
    }

    setShowDeleteConfirm(false);
  }, [currentProject, projects, dispatch]);

  const handleSwitchProject = useCallback((projectId) => {
    dispatch({ type: SET_CURRENT_PROJECT_ID, payload: { projectId } });
    setProjectMenuOpen(false);
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Language
  // ---------------------------------------------------------------------------
  const handleLanguageSelect = useCallback((lang) => {
    dispatch({ type: SET_CURRENT_LANGUAGE, payload: { language: lang } });
    setLanguageMenuOpen(false);
  }, [dispatch]);

  const handleSetDefaultLanguage = useCallback(() => {
    // Move current language to first position in projectLanguages
    const reordered = [
      currentLanguage,
      ...projectLanguages.filter((l) => l !== currentLanguage),
    ];
    dispatch({ type: 'SET_PROJECT_LANGUAGES', payload: { languages: reordered } });
    setLanguageMenuOpen(false);
  }, [currentLanguage, projectLanguages, dispatch]);

  // ---------------------------------------------------------------------------
  // Output device
  // ---------------------------------------------------------------------------
  const handleDeviceSelect = useCallback((deviceId) => {
    dispatch({ type: SET_OUTPUT_DEVICE, payload: { device: deviceId } });
    setOutputSizeMenuOpen(false);
  }, [dispatch]);

  const handleCustomWidth = useCallback((e) => {
    const w = parseInt(e.target.value, 10);
    if (!isNaN(w) && w >= 100 && w <= 4000) {
      dispatch({ type: SET_CUSTOM_DIMENSIONS, payload: { width: w } });
    }
  }, [dispatch]);

  const handleCustomHeight = useCallback((e) => {
    const h = parseInt(e.target.value, 10);
    if (!isNaN(h) && h >= 100 && h <= 4000) {
      dispatch({ type: SET_CUSTOM_DIMENSIONS, payload: { height: h } });
    }
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Context menu actions
  // ---------------------------------------------------------------------------
  const handleDeleteScreenshot = useCallback((index) => {
    dispatch({ type: REMOVE_SCREENSHOT, payload: { index } });

  }, [dispatch]);

  const handleDuplicateScreenshot = useCallback((index) => {
    const src = screenshots[index];
    if (!src) return;
    const clone = {
      ...src, // keeps image / localizedImages references (HTMLImageElements are immutable here)
      name: `${src.name || 'Screenshot'} copy`,
      background: JSON.parse(JSON.stringify(src.background)),
      screenshot: JSON.parse(JSON.stringify(src.screenshot)),
      text: JSON.parse(JSON.stringify(src.text)),
      overlay: { ...src.overlay },
      overrides: JSON.parse(JSON.stringify(src.overrides || {})),
    };
    const next = [...screenshots];
    next.splice(index + 1, 0, clone);
    dispatch({ type: BATCH_UPDATE, payload: { screenshots: next, selectedIndex: index + 1 } });
  }, [screenshots, dispatch]);

  const handleApplyStyleToAll = useCallback((index) => {
    dispatch({ type: SELECT_SCREENSHOT, payload: { index } });
    dispatch({ type: APPLY_STYLE_TO_ALL });

  }, [dispatch]);

  const handleTransferStyle = useCallback((index) => {
    // Enter transfer mode: next click on a screenshot will transfer style
    dispatch({ type: 'BATCH_UPDATE', payload: { transferTarget: index } });

  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const currentDeviceDims = deviceDimensions[outputDevice];
  const outputDeviceName = (() => {
    for (const group of deviceOptions) {
      const found = group.items.find((i) => i.id === outputDevice);
      if (found) return found.name;
    }
    return outputDevice;
  })();

  const dimsLabel = outputDevice === 'custom'
    ? `${customWidth} x ${customHeight}`
    : currentDeviceDims
      ? `${currentDeviceDims.width} x ${currentDeviceDims.height}`
      : '';

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderScreenshotThumbnail = (screenshot, index) => {
    const langs = getAvailableLanguagesForScreenshot(screenshot);
    const complete = isScreenshotComplete(screenshot, projectLanguages);
    const isSelected = index === selectedIndex;
    const isDragOver = index === dragOverIndex && dragIndex !== index;
    const isTransferTarget = transferTarget === index;

    // Get image for thumbnail: prefer current language, fall back to first available
    const thumbSrc = (screenshot.localizedImages?.[currentLanguage]?.image?.src)
      || screenshot.image?.src
      || (screenshot.localizedImages && Object.values(screenshot.localizedImages).find(l => l?.image)?.image?.src)
      || null;

    return (
      <div
        key={index}
        className={[
          'screenshot-item',
          isSelected ? 'selected' : '',
          isDragOver ? 'drag-insert-after' : '',
          isTransferTarget ? 'transfer-target' : '',
        ].filter(Boolean).join(' ')}
        draggable
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (transferTarget != null && transferTarget !== index) {
            dispatch({
              type: TRANSFER_STYLE,
              payload: { fromIndex: transferTarget, toIndex: index },
            });
          } else {
            dispatch({ type: SELECT_SCREENSHOT, payload: { index } });
          }
        }}
      >
        <div className="drag-handle" title="Drag to reorder">
          <span className="order-num">{index + 1}</span>
          <GripIcon />
        </div>

        {thumbSrc ? (
          <img src={thumbSrc} alt={screenshot.name} className="screenshot-thumb" />
        ) : (
          <div className="screenshot-thumb" />
        )}

        <div className="screenshot-info">
          <span className="screenshot-name">
            {screenshot.name || `Screenshot ${index + 1}`}
          </span>
          <span className="screenshot-device">
            {screenshot.deviceType === 'phone' ? 'Phone' : 'Tablet'}
            {langs.length > 0 && (
              <span className="screenshot-lang-flags">
                {' '}
                {langs.map((lang) => (
                  <span key={lang} title={languageNames[lang] || lang}>
                    {languageFlags[lang] || lang}
                  </span>
                ))}
                {projectLanguages.length > 1 && (
                  complete ? (
                    <span className="screenshot-complete" title="All languages covered">✓</span>
                  ) : (
                    <span
                      className="screenshot-incomplete"
                      title={`Missing: ${projectLanguages.filter((l) => !langs.includes(l)).map((l) => languageNames[l] || l).join(', ')}`}
                    >
                      ●
                    </span>
                  )
                )}
              </span>
            )}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="screenshot-menu-btn"
              onClick={(e) => e.stopPropagation()}
              title="Options"
            >
              <DotsIcon />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onOpenLanguages?.()}>
              <TranslateIcon />
              Manage Translations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReplaceScreenshot(index)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16"/></svg>
              Replace Screenshot
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicateScreenshot(index)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Duplicate Screenshot
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTransferStyle(index)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Transfer Style
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleApplyStyleToAll(index)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Apply Style to All
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => handleDeleteScreenshot(index)}
            >
              <TrashIcon />
              Delete Screenshot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={mobile ? '' : 'sidebar'}>
      <div className={mobile ? '' : 'sidebar-content'}>
        {/* ---- Header with undo/redo, language picker and AI indicator ---- */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <h2 style={{ marginBottom: 0 }}>Project</h2>
            <button
              className="project-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{ opacity: canUndo ? 1 : 0.3, padding: '4px', width: '28px', height: '28px' }}
            >
              <UndoIcon />
            </button>
            <button
              className="project-btn"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              style={{ opacity: canRedo ? 1 : 0.3, padding: '4px', width: '28px', height: '28px' }}
            >
              <RedoIcon />
            </button>
          </div>
          <div className="sidebar-header-buttons">
            {/* Language Picker */}
            <div className="language-picker">
              <button
                className="language-btn"
                title="Language"
                onClick={(e) => {
                  e.stopPropagation();
                  setLanguageMenuOpen(!languageMenuOpen);
                }}
              >
                <span className="language-btn-flag">
                  {languageFlags[currentLanguage] || currentLanguage}
                </span>
              </button>

              {languageMenuOpen && (
                <div className="language-menu visible">
                  <div className="language-menu-items">
                    {projectLanguages.map((lang) => (
                      <button
                        key={lang}
                        className={`language-menu-item ${lang === currentLanguage ? 'selected' : ''}`}
                        onClick={() => handleLanguageSelect(lang)}
                      >
                        <span className="language-menu-flag">{languageFlags[lang] || ''}</span>
                        <span className="language-menu-name">{languageNames[lang] || lang}</span>
                      </button>
                    ))}
                  </div>
                  <div className="language-menu-divider" />
                  <button
                    className="language-menu-edit"
                    onClick={() => { setLanguageMenuOpen(false); onOpenLanguages?.(); }}
                  >
                    <EditLangIcon />
                    Edit Languages...
                  </button>
                  <button
                    className="language-menu-edit"
                    onClick={handleSetDefaultLanguage}
                  >
                    <StarIcon />
                    <span>Set as Default Language</span>
                  </button>
                  <div className="language-menu-divider" />
                  <button
                    className="language-menu-edit"
                    onClick={() => { setLanguageMenuOpen(false); onOpenTranslateAll?.(); }}
                  >
                    <TranslateIcon />
                    Translate All...
                  </button>
                </div>
              )}
            </div>

            {/* AI Status Indicator */}
            <span
              className="ai-status-indicator"
              title="AI provider"
            >
              <AIIcon />
              <span>{aiConfig?.provider ? llmProviders[aiConfig.provider]?.name || aiConfig.provider : 'No AI'}</span>
            </span>
          </div>
        </div>

        {/* ---- Project controls ---- */}
        <div className="project-controls">
          <div className={`project-dropdown${projectMenuOpen ? ' open' : ''}`}>
            <button
              className="project-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setProjectMenuOpen(!projectMenuOpen);
              }}
            >
              <div className="project-trigger-info">
                <span className="project-trigger-name">
                  {currentProject?.name || 'Default Project'}
                </span>
                <span className="project-trigger-meta">
                  {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
                </span>
              </div>
              <DropdownArrow />
            </button>

            <div className="project-menu">
              {(projects || []).map((project) => (
                <div
                  key={project.id}
                  className={`project-option${project.id === currentProjectId ? ' selected' : ''}`}
                  onClick={() => handleSwitchProject(project.id)}
                >
                  <span className="project-option-name">{project.name}</span>
                  <span className="project-option-meta">
                    {project.screenshotCount || 0} screenshots
                  </span>
                </div>
              ))}
              {(!projects || projects.length === 0) && (
                <div style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>No projects</div>
              )}
            </div>
          </div>

          <div className="project-buttons">
            <button className="project-btn" onClick={handleNewProject} title="New Project">
              <PlusIcon />
            </button>
            <button className="project-btn" onClick={handleRenameProject} title="Rename Project">
              <PencilIcon />
            </button>
            <button
              className="project-btn danger"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Project"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        <div className="divider" />

        {/* ---- Screenshots heading ---- */}
        <h2>Screenshots</h2>

        {/* ---- Hidden file inputs ---- */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*"
          hidden
          onChange={handleFileInputChange}
        />
        <input
          type="file"
          ref={replaceFileInputRef}
          accept="image/*"
          hidden
          onChange={handleReplaceFileChange}
        />

        {/* ---- Screenshot list (arrow keys move the selection) ---- */}
        <div
          className="screenshot-list"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            if (screenshots.length === 0) return;
            e.preventDefault();
            const delta = e.key === 'ArrowDown' ? 1 : -1;
            const next = Math.min(screenshots.length - 1, Math.max(0, selectedIndex + delta));
            if (next !== selectedIndex) {
              dispatch({ type: SELECT_SCREENSHOT, payload: { index: next } });
            }
          }}
        >
          {screenshots.map((screenshot, index) =>
            renderScreenshotThumbnail(screenshot, index)
          )}

          {/* Upload drop zone — grows into a full empty state when the list is empty */}
          <div
            className={[
              'screenshot-item upload-item',
              screenshots.length === 0 ? 'empty' : '',
              uploadDragOver ? 'dragover' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setUploadDragOver(true);
            }}
            onDragLeave={() => setUploadDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setUploadDragOver(false);
              handleFileUpload(e.dataTransfer.files);
            }}
          >
            <div className="upload-item-icon">
              <PlusIcon />
            </div>
            <div className="screenshot-info">
              <span className="screenshot-name">
                {screenshots.length === 0 ? 'Add your first screenshot' : 'Add Screenshots'}
              </span>
              <span className="screenshot-device upload-hint">or drag &amp; drop images</span>
            </div>
          </div>
        </div>

        {/* ---- Transfer mode indicator ---- */}
        {transferTarget != null && (
          <div className="transfer-mode-banner">
            <span>Click a screenshot to transfer style from #{transferTarget + 1}</span>
            <button onClick={() => dispatch({ type: 'BATCH_UPDATE', payload: { transferTarget: null } })}>
              Cancel
            </button>
          </div>
        )}

        {/* ---- Sidebar actions ---- */}
        <div className="sidebar-actions">
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="action-btn"
                title="Apply a style template to the current screenshot"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Style Templates
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Style Templates</DialogTitle>
              </DialogHeader>
              <TemplatesPanel state={state} dispatch={dispatch} />
            </DialogContent>
          </Dialog>
          <button
            className="action-btn action-btn-magic"
            onClick={onGenerateTitles}
            title="Use AI to generate marketing headlines from your screenshots"
          >
            <StarIcon />
            Generate Magical Titles
          </button>
          <button
            className="action-btn"
            onClick={onOpenTranslateAll}
            title="Translate all text to selected languages"
          >
            <TranslateIcon />
            Translate All Languages
          </button>
        </div>
      </div>

      {/* ---- Sidebar footer with export controls ---- */}
      <div className={mobile ? '' : 'sidebar-footer'}>
        <div className="export-output-section">
          <div className="export-row">
            <div className={`output-size-dropdown${outputSizeMenuOpen ? ' open' : ''}`}>
              <button
                className="output-size-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setOutputSizeMenuOpen(!outputSizeMenuOpen);
                }}
              >
                <div className="output-size-info">
                  <span className="output-size-name">{outputDeviceName}</span>
                  <span className="output-size-dims">{dimsLabel}</span>
                </div>
                <DropdownArrow />
              </button>

              <div className="output-size-menu">
                  {deviceOptions.map((group, gi) => (
                    <React.Fragment key={group.group}>
                      {gi > 0 && <div className="output-size-divider" />}
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className={`device-option ${item.id === outputDevice ? 'selected' : ''}`}
                          onClick={() => handleDeviceSelect(item.id)}
                        >
                          <span className="device-option-name">{item.name}</span>
                          <span className="device-option-size">
                            {item.id === 'custom'
                              ? 'Set dimensions'
                              : deviceDimensions[item.id]
                                ? `${deviceDimensions[item.id].width} x ${deviceDimensions[item.id].height}`
                                : ''}
                          </span>
                        </div>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Custom size inputs */}
                  {outputDevice === 'custom' && (
                    <div className="custom-size-inputs visible">
                      <input
                        type="number"
                        value={customWidth}
                        min="100"
                        max="4000"
                        placeholder="Width"
                        onChange={handleCustomWidth}
                      />
                      <span className="custom-size-x">&times;</span>
                      <input
                        type="number"
                        value={customHeight}
                        min="100"
                        max="4000"
                        placeholder="Height"
                        onChange={handleCustomHeight}
                      />
                    </div>
                  )}
                </div>
            </div>

            <button
              className="export-btn secondary"
              onClick={onExportCurrent}
              title="Export current screenshot"
            >
              <DownloadIcon />
              Export
            </button>
          </div>

          <button
            className="export-btn export-all-btn"
            onClick={onExportAll}
            title={projectLanguages.length > 1
              ? `Export ${screenshots.length} screenshot${screenshots.length !== 1 ? 's' : ''} × ${projectLanguages.length} languages as ZIP`
              : 'Export all screenshots as ZIP'}
          >
            <DownloadIcon />
            Export All{screenshots.length > 0 ? ` (${screenshots.length}${projectLanguages.length > 1 ? ` × ${projectLanguages.length}` : ''})` : ''}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Modals                                                             */}
      {/* ================================================================== */}

      {/* Project name modal (new / rename) */}
      {showProjectModal && (
        <div className="modal-overlay visible" onClick={() => setShowProjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{projectModalMode === 'new' ? 'New Project' : 'Rename Project'}</h3>
            <input
              type="text"
              className="modal-input"
              placeholder="Project name"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProjectModalSubmit();
                if (e.key === 'Escape') setShowProjectModal(false);
              }}
              autoFocus
            />
            <div className="modal-buttons">
              <button className="modal-btn secondary" onClick={() => setShowProjectModal(false)}>
                Cancel
              </button>
              <button className="modal-btn primary" onClick={handleProjectModalSubmit}>
                {projectModalMode === 'new' ? 'Create' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay visible" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Project</h3>
            <p>
              Are you sure you want to delete &ldquo;{currentProject?.name || 'this project'}&rdquo;?
              This action cannot be undone.
            </p>
            <div className="modal-buttons">
              <button className="modal-btn secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="modal-btn danger" onClick={handleDeleteProject}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
