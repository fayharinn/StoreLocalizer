import React, { useState, useCallback, useRef, useEffect } from 'react';
import { gradientPresets, positionPresets, googleFontsConfig } from '../constants';
import {
  SET_BACKGROUND,
  SET_SCREENSHOT_SETTING,
  SET_TEXT_SETTING,
  SET_OVERLAY_SETTING,
} from '../hooks/useAppState';

// =============================================================================
// Helpers
// =============================================================================

function loadGoogleFont(fontName) {
  const id = `gfont-${fontName.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

function parseGradient(gradientStr) {
  const angleMatch = gradientStr.match(/(\d+)deg/);
  const angle = angleMatch ? parseInt(angleMatch[1], 10) : 135;
  const stopRegex = /(#[0-9a-fA-F]{6})\s+(\d+)%/g;
  const stops = [];
  let m;
  while ((m = stopRegex.exec(gradientStr)) !== null) {
    stops.push({ color: m[1], position: parseInt(m[2], 10) });
  }
  return { angle, stops };
}

// =============================================================================
// Sub-components — use appscreen.css classes for consistent look
// =============================================================================

function CollapsibleSection({ label, enabled, onToggle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="control-group">
        <div
          className={`toggle-row collapsible${open ? '' : ' collapsed'}`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="toggle-label">
            <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {label}
          </span>
          {onToggle !== undefined && (
            <div
              className={`toggle${enabled ? ' active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(!enabled);
              }}
            />
          )}
        </div>
      </div>
      {open && children}
    </>
  );
}

function RangeControl({ label, value, min, max, unit, onChange, resetValue }) {
  const unitSymbol = unit === 'deg' ? '\u00B0' : unit === '%' ? '%' : unit === 'px' ? 'px' : '';
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const canReset = resetValue !== undefined && value !== resetValue;

  return (
    <div className="control-group">
      <div className="range-head">
        <label className="control-label">{label}</label>
        <div className="range-value-edit">
          {canReset && (
            <button
              className="range-reset-btn"
              title={`Reset to ${resetValue}${unitSymbol}`}
              onClick={() => onChange(resetValue)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
          <input
            className="range-value-input"
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) onChange(clamp(v));
            }}
          />
          <span className="range-unit">{unitSymbol}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, var(--bg-tertiary) ${pct}%)` }}
        title={resetValue !== undefined ? `Double-click to reset to ${resetValue}${unitSymbol}` : undefined}
        onDoubleClick={resetValue !== undefined ? () => onChange(resetValue) : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ColorHexInput({ label, value, onChange }) {
  return (
    <div className="control-group">
      <label className="control-label">{label}</label>
      <div className="color-input-wrapper">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
          }}
          onBlur={(e) => {
            let v = e.target.value;
            if (!v.startsWith('#')) v = '#' + v;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
          }}
        />
      </div>
    </div>
  );
}

function BtnGroup({ options, value, onChange }) {
  return (
    <div className="btn-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FontPicker({ currentFont, onSelect, idPrefix = 'font' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('popular');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const getFontList = () => {
    if (category === 'system') {
      return googleFontsConfig.system.map((f) => ({ name: f.name, value: f.value, isSystem: true }));
    }
    if (category === 'popular') {
      return googleFontsConfig.popular.map((name) => ({ name, value: `'${name}'`, isSystem: false }));
    }
    // all
    const systemFonts = googleFontsConfig.system.map((f) => ({ name: f.name, value: f.value, isSystem: true }));
    const googleFonts = googleFontsConfig.popular.map((name) => ({ name, value: `'${name}'`, isSystem: false }));
    return [...systemFonts, ...googleFonts];
  };

  const fonts = getFontList().filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const displayName =
    googleFontsConfig.system.find((sf) => sf.value === currentFont)?.name ||
    currentFont.replace(/'/g, '');

  return (
    <div className="font-picker" ref={dropdownRef}>
      <button className="font-picker-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="font-picker-preview">{displayName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="font-picker-dropdown">
          <div className="font-picker-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search fonts..."
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="font-picker-categories">
            {['popular', 'system', 'all'].map((cat) => (
              <button
                key={cat}
                className={`font-category${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div className="font-picker-list">
            {fonts.map((font) => (
              <div
                key={font.name}
                className={`font-option${currentFont === font.value ? ' selected' : ''}`}
                style={{ fontFamily: font.value }}
                onClick={() => {
                  if (!font.isSystem) loadGoogleFont(font.name);
                  onSelect(font.value);
                  setOpen(false);
                }}
              >
                {font.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Text Section (shared between headline & subheadline)
// =============================================================================

function TextSection({
  type, // 'headline' | 'subheadline'
  text,
  dispatch,
  currentLanguage,
  onTranslate,
}) {
  const isHeadline = type === 'headline';
  const prefix = isHeadline ? 'headline' : 'subheadline';
  const enabledKey = `${prefix}Enabled`;
  const textsKey = `${prefix}s`; // headlines or subheadlines
  const fontKey = `${prefix}Font`;
  const sizeKey = `${prefix}Size`;
  const weightKey = `${prefix}Weight`;
  const colorKey = `${prefix}Color`;
  const italicKey = `${prefix}Italic`;
  const underlineKey = `${prefix}Underline`;
  const strikethroughKey = `${prefix}Strikethrough`;

  const enabled = text[enabledKey];
  const texts = text[textsKey] || {};
  const currentText = texts[currentLanguage] || '';
  const font = text[fontKey];
  const size = text[sizeKey];
  const weight = text[weightKey];
  const color = text[colorKey];
  const italic = text[italicKey];
  const underline = text[underlineKey];
  const strikethrough = text[strikethroughKey];

  const set = (key, value) => dispatch({ type: SET_TEXT_SETTING, payload: { key, value } });

  const setTextField = (val) => {
    set(textsKey, { ...texts, [currentLanguage]: val });
  };

  const toggleStyle = (style) => {
    const keyMap = { italic: italicKey, underline: underlineKey, strikethrough: strikethroughKey };
    const valMap = { italic, underline, strikethrough };
    set(keyMap[style], !valMap[style]);
  };

  return (
    <CollapsibleSection
      label={isHeadline ? 'Headline' : 'Subheadline'}
      enabled={enabled}
      onToggle={(v) => set(enabledKey, v)}
      defaultOpen={isHeadline}
    >
      {/* Text area + translate */}
      <div className="control-group">
        <div className="textarea-with-button">
          <textarea
            rows="2"
            placeholder={isHeadline ? 'Your feature headline' : 'Optional subheadline'}
            value={currentText}
            onChange={(e) => setTextField(e.target.value)}
          />
          <button
            className="magic-translate-btn"
            title="Translate to all languages"
            onClick={onTranslate}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2v3M22 22l-5-10-5 10M14 18h6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Font picker */}
      <div className="control-group">
        <label className="control-label">{isHeadline ? 'Headline' : 'Subheadline'} Font</label>
        <FontPicker
          currentFont={font}
          onSelect={(v) => set(fontKey, v)}
          idPrefix={prefix}
        />

        {/* Text style bar */}
        <div className="text-style-bar">
          <input
            type="number"
            min="12"
            max={isHeadline ? 300 : 200}
            value={size}
            title="Font Size"
            onChange={(e) => set(sizeKey, Number(e.target.value))}
          />
          <input
            type="color"
            value={color}
            title="Text Color"
            onChange={(e) => set(colorKey, e.target.value)}
          />
          <select
            value={weight}
            title="Font Weight"
            onChange={(e) => set(weightKey, e.target.value)}
          >
            <option value="300">Light</option>
            <option value="400">Regular</option>
            <option value="500">Medium</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
            <option value="800">Heavy</option>
            <option value="900">Black</option>
          </select>
          <button
            className={italic ? 'active' : ''}
            onClick={() => toggleStyle('italic')}
            title="Italic"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </button>
          <button
            className={underline ? 'active' : ''}
            onClick={() => toggleStyle('underline')}
            title="Underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
              <line x1="4" y1="21" x2="20" y2="21" />
            </svg>
          </button>
          <button
            className={strikethrough ? 'active' : ''}
            onClick={() => toggleStyle('strikethrough')}
            title="Strikethrough"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="12" x2="20" y2="12" />
              <path d="M17.5 7.5c-1-1.5-2.5-2.5-5.5-2.5-4 0-6 2-6 4.5 0 1.5.5 2.5 2 3.5" />
              <path d="M10 16.5c.5.5 1.5 1 3 1 4 0 5.5-2 5.5-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Position & alignment (headline only) */}
      {isHeadline && (
        <>
          <div className="control-group">
            <label className="control-label">Text Position</label>
            <BtnGroup
              options={[
                { value: 'top', label: 'Top' },
                { value: 'bottom', label: 'Bottom' },
              ]}
              value={text.position}
              onChange={(v) => set('position', v)}
            />
          </div>

          <div className="control-group">
            <label className="control-label">Text Align</label>
            <BtnGroup
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
              value={text.textAlign}
              onChange={(v) => set('textAlign', v)}
            />
          </div>

          <RangeControl
            label="Text Vertical Offset"
            value={text.offsetY}
            min={0}
            max={100}
            unit="%"
            resetValue={12}
            onChange={(v) => set('offsetY', v)}
          />
          <RangeControl
            label="Text Horizontal Offset"
            value={text.offsetX}
            min={-50}
            max={50}
            unit="%"
            resetValue={0}
            onChange={(v) => set('offsetX', v)}
          />
          <RangeControl
            label="Line Height"
            value={text.lineHeight}
            min={80}
            max={250}
            unit="%"
            resetValue={110}
            onChange={(v) => set('lineHeight', v)}
          />

          {/* Highlight */}
          <div className="control-group">
            <div className="toggle-row">
              <span className="toggle-label">Highlight Words</span>
              <div
                className={`toggle${text.highlightEnabled ? ' active' : ''}`}
                onClick={() => set('highlightEnabled', !text.highlightEnabled)}
              />
            </div>
          </div>
          {text.highlightEnabled && (
            <div className="control-group">
              <label className="control-label">Words to highlight (comma-separated)</label>
              <div className="control-row">
                <input
                  type="text"
                  placeholder="pro, fast, secure"
                  value={text.highlightWords}
                  onChange={(e) => set('highlightWords', e.target.value)}
                />
                <input
                  type="color"
                  value={text.highlightColor}
                  title="Highlight Color"
                  onChange={(e) => set('highlightColor', e.target.value)}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Subheadline opacity */}
      {!isHeadline && (
        <RangeControl
          label="Subheadline Opacity"
          value={text.subheadlineOpacity}
          min={0}
          max={100}
          unit="%"
          resetValue={70}
          onChange={(v) => set('subheadlineOpacity', v)}
        />
      )}
    </CollapsibleSection>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function RightSidebar({ state, dispatch, onTranslateHeadline, onTranslateSubheadline, mobile }) {
  const [activeTab, setActiveTab] = useState('background');
  const bgImageInputRef = useRef(null);
  const overlayImageInputRef = useRef(null);

  // Current screenshot data
  const current = state.screenshots[state.selectedIndex];
  const bg = current?.background || state.defaults.background;
  const ss = current?.screenshot || state.defaults.screenshot;
  const text = current?.text || state.defaults.text;
  const overlay = current?.overlay || state.defaults.overlay;

  // Dispatch helpers
  const setBg = useCallback(
    (key, value) => dispatch({ type: SET_BACKGROUND, payload: { key, value } }),
    [dispatch],
  );
  const setSS = useCallback(
    (key, value) => dispatch({ type: SET_SCREENSHOT_SETTING, payload: { key, value } }),
    [dispatch],
  );
  const setOverlay = useCallback(
    (key, value) => dispatch({ type: SET_OVERLAY_SETTING, payload: { key, value } }),
    [dispatch],
  );

  // =========================================================================
  // Background image upload
  // =========================================================================
  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBg('image', ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // =========================================================================
  // Overlay / logo image upload
  // =========================================================================
  const handleOverlayImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        setOverlay('image', img);
        setOverlay('imageSrc', dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveOverlayImage = () => {
    setOverlay('image', null);
    setOverlay('imageSrc', null);
    setOverlay('enabled', false);
    if (overlayImageInputRef.current) {
      overlayImageInputRef.current.value = '';
    }
  };

  // =========================================================================
  // Gradient preset selection
  // =========================================================================
  const applyGradientPreset = (gradientStr) => {
    const { angle, stops } = parseGradient(gradientStr);
    setBg('gradient.angle', angle);
    setBg('gradient.stops', stops);
  };

  // Is this preset the one currently applied? (drives the selected ring in the gallery)
  const isGradientPresetActive = (gradientStr) => {
    const p = parseGradient(gradientStr);
    if (p.angle !== bg.gradient.angle) return false;
    if (p.stops.length !== bg.gradient.stops.length) return false;
    return p.stops.every(
      (s, i) =>
        s.color.toLowerCase() === bg.gradient.stops[i].color.toLowerCase() &&
        s.position === bg.gradient.stops[i].position,
    );
  };

  // =========================================================================
  // Position preset selection
  // =========================================================================
  const applyPositionPreset = (presetName) => {
    const preset = positionPresets[presetName];
    if (!preset) return;
    setSS('scale', preset.scale);
    setSS('x', preset.x);
    setSS('y', preset.y);
    setSS('rotation', preset.rotation);
    setSS('perspective', preset.perspective);
  };

  const isPositionPresetActive = (preset) =>
    ss.scale === preset.scale &&
    ss.x === preset.x &&
    ss.y === preset.y &&
    ss.rotation === preset.rotation &&
    (ss.perspective || 0) === preset.perspective;

  // =========================================================================
  // Render
  // =========================================================================

  const positionPresetSVGs = {
    centered: <rect x="8" y="12" width="24" height="36" rx="2" />,
    'bleed-bottom': <rect x="8" y="20" width="24" height="45" rx="2" />,
    'bleed-top': <rect x="8" y="-5" width="24" height="45" rx="2" />,
    'float-center': <rect x="10" y="15" width="20" height="30" rx="2" />,
    'tilt-left': <rect x="8" y="12" width="24" height="36" rx="2" transform="rotate(-8 20 30)" />,
    'tilt-right': <rect x="8" y="12" width="24" height="36" rx="2" transform="rotate(8 20 30)" />,
    perspective: <path d="M12 15 L28 12 L30 48 L10 45 Z" />,
    'float-bottom': <rect x="10" y="25" width="20" height="30" rx="2" />,
  };

  const positionPresetLabels = {
    centered: 'Centered',
    'bleed-bottom': 'Bleed Bottom',
    'bleed-top': 'Bleed Top',
    'float-center': 'Float Center',
    'tilt-left': 'Tilt Left',
    'tilt-right': 'Tilt Right',
    perspective: 'Perspective',
    'float-bottom': 'Float Bottom',
  };

  return (
    <div className={mobile ? '' : 'sidebar sidebar-right'}>
      {/* Tab header */}
      <div className={mobile ? '' : 'sidebar-header'}>
        <div className="tabs">
          <button
            className={`tab${activeTab === 'background' ? ' active' : ''}`}
            onClick={() => setActiveTab('background')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Background</span>
          </button>
          <button
            className={`tab${activeTab === 'screenshot' ? ' active' : ''}`}
            onClick={() => setActiveTab('screenshot')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12" y2="18" />
            </svg>
            <span>Device</span>
          </button>
          <button
            className={`tab${activeTab === 'text' ? ' active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7V4h16v3" />
              <path d="M9 20h6" />
              <path d="M12 4v16" />
            </svg>
            <span>Text</span>
          </button>
        </div>
      </div>

      <div className="sidebar-content">
        {/* ================================================================= */}
        {/* Background Tab                                                    */}
        {/* ================================================================= */}
        {activeTab === 'background' && (
          <div className="tab-content active" id="tab-background">
            {/* Background type selector */}
            <div className="control-group">
              <label className="control-label">Background Type</label>
              <BtnGroup
                options={[
                  { value: 'gradient', label: 'Gradient' },
                  { value: 'solid', label: 'Solid' },
                  { value: 'image', label: 'Image' },
                ]}
                value={bg.type}
                onChange={(v) => setBg('type', v)}
              />
            </div>

            {/* --- Gradient options --- */}
            {bg.type === 'gradient' && (
              <>
                {/* Gradient presets — always-visible gallery, one click to apply */}
                <div className="control-group">
                  <label className="control-label">Presets</label>
                  <div className="preset-grid inline">
                    {gradientPresets.map((g, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`preset-swatch${isGradientPresetActive(g) ? ' selected' : ''}`}
                        style={{ background: g }}
                        onClick={() => applyGradientPreset(g)}
                      />
                    ))}
                  </div>
                </div>

                {/* Gradient direction */}
                <RangeControl
                  label="Gradient Direction"
                  value={bg.gradient.angle}
                  min={0}
                  max={360}
                  unit="deg"
                  resetValue={135}
                  onChange={(v) => setBg('gradient.angle', v)}
                />

                {/* Gradient color stops */}
                <div className="control-group">
                  <label className="control-label">Colors</label>
                  <div className="gradient-stops">
                    {bg.gradient.stops.map((stop, idx) => (
                      <div className="gradient-stop" key={idx}>
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(e) => {
                            const newStops = bg.gradient.stops.map((s, i) =>
                              i === idx ? { ...s, color: e.target.value } : s,
                            );
                            setBg('gradient.stops', newStops);
                          }}
                        />
                        <input
                          type="number"
                          value={stop.position}
                          min={0}
                          max={100}
                          onChange={(e) => {
                            const newStops = bg.gradient.stops.map((s, i) =>
                              i === idx ? { ...s, position: Number(e.target.value) } : s,
                            );
                            setBg('gradient.stops', newStops);
                          }}
                        />
                        <span>%</span>
                        {bg.gradient.stops.length > 2 && (
                          <button
                            className="remove-stop-btn"
                            title="Remove stop"
                            onClick={() => {
                              const newStops = bg.gradient.stops.filter((_, i) => i !== idx);
                              setBg('gradient.stops', newStops);
                            }}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    className="add-stop-btn"
                    onClick={() => {
                      const newStops = [
                        ...bg.gradient.stops,
                        { color: '#ffffff', position: 50 },
                      ];
                      setBg('gradient.stops', newStops);
                    }}
                  >
                    + Add Color Stop
                  </button>
                </div>
              </>
            )}

            {/* --- Solid options --- */}
            {bg.type === 'solid' && (
              <ColorHexInput
                label="Background Color"
                value={bg.solid}
                onChange={(v) => setBg('solid', v)}
              />
            )}

            {/* --- Image options --- */}
            {bg.type === 'image' && (
              <>
                <div className="control-group">
                  <label className="control-label">Background Image</label>
                  <div
                    className="bg-image-upload"
                    onClick={() => bgImageInputRef.current?.click()}
                  >
                    <p>Click to upload image</p>
                  </div>
                  <input
                    ref={bgImageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleBgImageUpload}
                  />
                  {bg.image && (
                    <img className="bg-image-preview" src={bg.image} alt="Background preview" />
                  )}
                </div>
                <div className="control-group">
                  <label className="control-label">Image Fit</label>
                  <select value={bg.imageFit} onChange={(e) => setBg('imageFit', e.target.value)}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </div>
                <RangeControl
                  label="Blur"
                  value={bg.imageBlur}
                  min={0}
                  max={50}
                  unit="px"
                  onChange={(v) => setBg('imageBlur', v)}
                />
                <ColorHexInput
                  label="Overlay Color"
                  value={bg.overlayColor}
                  onChange={(v) => setBg('overlayColor', v)}
                />
                <RangeControl
                  label="Overlay Opacity"
                  value={bg.overlayOpacity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => setBg('overlayOpacity', v)}
                />
              </>
            )}

            <div className="divider" />

            {/* Noise section */}
            <CollapsibleSection
              label="Noise"
              enabled={bg.noise}
              onToggle={(v) => setBg('noise', v)}
              defaultOpen={false}
            >
              <RangeControl
                label="Noise Intensity"
                value={bg.noiseIntensity}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => setBg('noiseIntensity', v)}
              />
            </CollapsibleSection>
          </div>
        )}

        {/* ================================================================= */}
        {/* Screenshot / Device Tab                                           */}
        {/* ================================================================= */}
        {activeTab === 'screenshot' && (
          <div className="tab-content active" id="tab-screenshot">
            {/* Device type selector */}
            <div className="control-group">
              <label className="control-label">Device Type</label>
              <BtnGroup
                options={[
                  { value: false, label: '2D' },
                  { value: true, label: '3D' },
                ]}
                value={ss.use3D}
                onChange={(v) => setSS('use3D', v)}
              />
            </div>

            {/* 3D options */}
            {ss.use3D && (
              <>
                <div className="control-group">
                  <label className="control-label">Device Model</label>
                  <BtnGroup
                    options={[
                      { value: 'iphone', label: 'iPhone' },
                      { value: 'samsung', label: 'Samsung' },
                    ]}
                    value={ss.device3D}
                    onChange={(v) => setSS('device3D', v)}
                  />
                </div>
                <RangeControl
                  label="Rotation X (Tilt)"
                  value={ss.rotation3D.x}
                  min={-45}
                  max={45}
                  unit="deg"
                  resetValue={0}
                  onChange={(v) => setSS('rotation3D.x', v)}
                />
                <RangeControl
                  label="Rotation Y (Turn)"
                  value={ss.rotation3D.y}
                  min={-45}
                  max={45}
                  unit="deg"
                  resetValue={0}
                  onChange={(v) => setSS('rotation3D.y', v)}
                />
                <RangeControl
                  label="Rotation Z (Roll)"
                  value={ss.rotation3D.z}
                  min={-45}
                  max={45}
                  unit="deg"
                  resetValue={0}
                  onChange={(v) => setSS('rotation3D.z', v)}
                />
              </>
            )}

            {/* Position presets — always-visible gallery with active state */}
            <div className="control-group">
              <label className="control-label">Layout Presets</label>
              <div className="preset-positions">
                {Object.keys(positionPresets).map((presetName) => (
                  <button
                    key={presetName}
                    className={`position-preset${isPositionPresetActive(positionPresets[presetName]) ? ' selected' : ''}`}
                    title={positionPresetLabels[presetName]}
                    onClick={() => applyPositionPreset(presetName)}
                  >
                    <svg viewBox="0 0 40 60" fill="none" stroke="currentColor" strokeWidth="2">
                      {positionPresetSVGs[presetName]}
                    </svg>
                    <span>{positionPresetLabels[presetName]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="divider" />

            <RangeControl
              label="Screenshot Scale"
              value={ss.scale}
              min={30}
              max={100}
              unit="%"
              resetValue={70}
              onChange={(v) => setSS('scale', v)}
            />
            <RangeControl
              label="Vertical Position"
              value={ss.y}
              min={-30}
              max={130}
              unit="%"
              resetValue={50}
              onChange={(v) => setSS('y', v)}
            />
            <RangeControl
              label="Horizontal Position"
              value={ss.x}
              min={-30}
              max={130}
              unit="%"
              resetValue={50}
              onChange={(v) => setSS('x', v)}
            />

            {/* 2D-only settings */}
            {!ss.use3D && (
              <>
                <div className="divider" />

                <RangeControl
                  label="Corner Radius"
                  value={ss.cornerRadius}
                  min={0}
                  max={100}
                  unit="px"
                  resetValue={24}
                  onChange={(v) => setSS('cornerRadius', v)}
                />
                <RangeControl
                  label="Tilt / Rotation"
                  value={ss.rotation}
                  min={-45}
                  max={45}
                  unit="deg"
                  resetValue={0}
                  onChange={(v) => setSS('rotation', v)}
                />

                <div className="divider" />

                {/* Shadow section */}
                <CollapsibleSection
                  label="Shadow"
                  enabled={ss.shadow.enabled}
                  onToggle={(v) => setSS('shadow.enabled', v)}
                  defaultOpen={true}
                >
                  <ColorHexInput
                    label="Shadow Color"
                    value={ss.shadow.color}
                    onChange={(v) => setSS('shadow.color', v)}
                  />
                  <RangeControl
                    label="Blur"
                    value={ss.shadow.blur}
                    min={0}
                    max={100}
                    unit="px"
                    onChange={(v) => setSS('shadow.blur', v)}
                  />
                  <RangeControl
                    label="Opacity"
                    value={ss.shadow.opacity}
                    min={0}
                    max={100}
                    unit="%"
                    resetValue={30}
                    onChange={(v) => setSS('shadow.opacity', v)}
                  />
                  <RangeControl
                    label="Offset Y"
                    value={ss.shadow.y}
                    min={-50}
                    max={100}
                    unit="px"
                    resetValue={20}
                    onChange={(v) => setSS('shadow.y', v)}
                  />
                  <RangeControl
                    label="Offset X"
                    value={ss.shadow.x}
                    min={-50}
                    max={50}
                    unit="px"
                    resetValue={0}
                    onChange={(v) => setSS('shadow.x', v)}
                  />
                </CollapsibleSection>

                <div className="divider" />

                {/* Border section */}
                <CollapsibleSection
                  label="Border"
                  enabled={ss.frame.enabled}
                  onToggle={(v) => setSS('frame.enabled', v)}
                  defaultOpen={false}
                >
                  <ColorHexInput
                    label="Border Color"
                    value={ss.frame.color}
                    onChange={(v) => setSS('frame.color', v)}
                  />
                  <RangeControl
                    label="Border Width"
                    value={ss.frame.width}
                    min={1}
                    max={50}
                    unit="px"
                    onChange={(v) => setSS('frame.width', v)}
                  />
                  <RangeControl
                    label="Border Opacity"
                    value={ss.frame.opacity}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => setSS('frame.opacity', v)}
                  />
                </CollapsibleSection>
              </>
            )}

            {/* 3D tip */}
            {ss.use3D && (
              <div className="tip-box">
                <img src="/appscreen/img/info.svg" width="16" height="16" alt="Info" />
                <div className="tip-content">
                  <strong>Interactive Controls</strong>
                  <span>Drag on preview to rotate - Alt+drag to move</span>
                </div>
              </div>
            )}

            <div className="divider" />

            {/* Logo Overlay section */}
            <CollapsibleSection
              label="Logo Overlay"
              enabled={overlay.enabled}
              onToggle={(v) => setOverlay('enabled', v)}
              defaultOpen={false}
            >
              {/* Upload zone */}
              <div className="control-group">
                <label className="control-label">Logo Image</label>
                <div
                  className="bg-image-upload"
                  onClick={() => overlayImageInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  {overlay.imageSrc ? (
                    <img
                      src={overlay.imageSrc}
                      alt="Logo preview"
                      style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }}
                    />
                  ) : (
                    <p>Click to upload logo</p>
                  )}
                </div>
                <input
                  ref={overlayImageInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleOverlayImageUpload}
                />
              </div>

              <RangeControl
                label="Scale"
                value={overlay.scale}
                min={5}
                max={80}
                unit="%"
                onChange={(v) => setOverlay('scale', v)}
              />
              <RangeControl
                label="Horizontal Position"
                value={overlay.x}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => setOverlay('x', v)}
              />
              <RangeControl
                label="Vertical Position"
                value={overlay.y}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => setOverlay('y', v)}
              />
              <RangeControl
                label="Opacity"
                value={overlay.opacity}
                min={0}
                max={100}
                unit="%"
                resetValue={100}
                onChange={(v) => setOverlay('opacity', v)}
              />
              <RangeControl
                label="Rotation"
                value={overlay.rotation}
                min={-180}
                max={180}
                unit="deg"
                resetValue={0}
                onChange={(v) => setOverlay('rotation', v)}
              />

              {overlay.imageSrc && (
                <div className="control-group">
                  <button
                    className="add-stop-btn"
                    style={{ background: '#e74c3c', color: '#fff', border: 'none' }}
                    onClick={handleRemoveOverlayImage}
                  >
                    Remove Logo
                  </button>
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}

        {/* ================================================================= */}
        {/* Text Tab                                                          */}
        {/* ================================================================= */}
        {activeTab === 'text' && (
          <div className="tab-content active" id="tab-text">
            <TextSection
              type="headline"
              text={text}
              dispatch={dispatch}
              currentLanguage={state.currentLanguage}
              onTranslate={onTranslateHeadline}
            />

            <div className="divider" />

            <TextSection
              type="subheadline"
              text={text}
              dispatch={dispatch}
              currentLanguage={state.currentLanguage}
              onTranslate={onTranslateSubheadline}
            />
          </div>
        )}

        {/* Templates removed from tabs — now in left sidebar as a dialog */}
      </div>
    </div>
  );
}
