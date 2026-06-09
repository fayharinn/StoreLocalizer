import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { languageFlags, languageNames, llmProviders } from '../constants';
import { translateText } from '../utils/llmService';
import {
  SET_TEXT_SETTING,
  ADD_PROJECT_LANGUAGE,
  REMOVE_PROJECT_LANGUAGE,
  SET_PROJECT_LANGUAGES,
  SET_CURRENT_LANGUAGE,
  SET_LOCALIZED_IMAGE,
  REMOVE_LOCALIZED_IMAGE,
} from '../hooks/useAppState';

// =============================================================================
// TranslateModal
// =============================================================================

export function TranslateModal({ visible, onClose, target, state, dispatch, aiConfig }) {
  const [sourceLang, setSourceLang] = useState(state.currentLanguage || 'en');
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');

  const isHeadline = target === 'headline';
  const currentScreenshot = state.screenshots[state.selectedIndex];
  const text = currentScreenshot?.text || state.defaults?.text || {};

  const languages = useMemo(() => state.projectLanguages || ['en'], [state.projectLanguages]);
  const texts = useMemo(() => {
    return isHeadline ? (text.headlines || {}) : (text.subheadlines || {});
  }, [isHeadline, text.headlines, text.subheadlines]);

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setSourceLang(state.currentLanguage || languages[0] || 'en');
      setTranslations({ ...texts });
      setStatusMessage('');
      setStatusType('');
      setTranslating(false);
    }
  }

  const sourceText = translations[sourceLang] || texts[sourceLang] || '';
  const targetLangs = languages.filter(lang => lang !== sourceLang);

  const handleTranslationChange = useCallback((lang, value) => {
    setTranslations(prev => ({ ...prev, [lang]: value }));
  }, []);

  const handleAiTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
      setStatusMessage('Please enter text in the source language first');
      setStatusType('error');
      return;
    }

    if (targetLangs.length === 0) {
      setStatusMessage('Add more languages to translate to');
      setStatusType('error');
      return;
    }

    const { provider, apiKey, model, endpoint, region } = aiConfig || {};
    const providerConfig = llmProviders[provider];

    if (!apiKey) {
      setStatusMessage('Configure your AI API key in the sidebar to use AI translation.');
      setStatusType('error');
      return;
    }

    setTranslating(true);
    const providerName = providerConfig?.name || provider;
    setStatusMessage(`Translating to ${targetLangs.length} language(s) with ${providerName}...`);
    setStatusType('');

    try {
      const targetLangNames = targetLangs.map(lang => `${languageNames[lang]} (${lang})`).join(', ');

      const prompt = `You are a professional translator for App Store screenshot marketing copy. Translate the following text from ${languageNames[sourceLang]} to these languages: ${targetLangNames}.

The text is a short marketing headline/tagline for an app that must fit on a screenshot, so keep translations:
- SIMILAR LENGTH to the original - do NOT make it longer, as it must fit on screen
- Concise and punchy
- Marketing-focused and compelling
- Culturally appropriate for each target market
- Natural-sounding in each language

IMPORTANT: The translated text will be displayed on app screenshots with limited space. If the source text is short, the translation MUST also be short. Prioritize brevity over literal accuracy.

Source text (${languageNames[sourceLang]}):
"${sourceText}"

Respond ONLY with a valid JSON object mapping language codes to translations. Do not include any other text.
Example format:
{"de": "German translation", "fr": "French translation"}

Translate to these language codes: ${targetLangs.join(', ')}`;

      let responseText = await translateText(provider, apiKey, prompt, model, { endpoint, region });

      // Clean up response - remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed = JSON.parse(responseText);

      let translatedCount = 0;
      const updated = { ...translations };
      targetLangs.forEach(lang => {
        if (parsed[lang]) {
          updated[lang] = parsed[lang];
          translatedCount++;
        }
      });
      setTranslations(updated);
      setStatusMessage(`Translated to ${translatedCount} language(s)`);
      setStatusType('success');
    } catch (error) {
      console.error('Translation error:', error);
      if (error.message === 'Failed to fetch') {
        setStatusMessage('Connection failed. Check your API key in the sidebar.');
      } else if (error.message === 'AI_UNAVAILABLE' || error.message.includes('401') || error.message.includes('403')) {
        setStatusMessage('Invalid API key. Update it in the sidebar AI settings.');
      } else {
        setStatusMessage('Translation failed: ' + error.message);
      }
      setStatusType('error');
    } finally {
      setTranslating(false);
    }
  }, [sourceText, targetLangs, sourceLang, aiConfig, translations]);

  const handleApply = useCallback(() => {
    // Dispatch translations for each language
    const key = isHeadline ? 'headlines' : 'subheadlines';
    const merged = { ...texts, ...translations };
    dispatch({ type: SET_TEXT_SETTING, payload: { key, value: merged } });

    // Also update the list of languages with actual translations
    const langKey = isHeadline ? 'headlineLanguages' : 'subheadlineLanguages';
    const activeLangs = Object.keys(merged).filter(lang => merged[lang]?.trim());
    dispatch({ type: SET_TEXT_SETTING, payload: { key: langKey, value: activeLangs } });

    onClose();
  }, [isHeadline, texts, translations, dispatch, onClose]);

  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`}>
      <div className="modal translate-modal">
        <div className="modal-icon" style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#764ba2' }}>
            <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2v3M22 22l-5-10-5 10M14 18h6" />
          </svg>
        </div>
        <h3 className="modal-title">Translate {isHeadline ? 'Headline' : 'Subheadline'}</h3>
        <p className="modal-message">Select a source language and enter translations for each active language.</p>

        <div className="translate-source">
          <label className="control-label">Source Language</label>
          <select
            value={sourceLang}
            onChange={e => setSourceLang(e.target.value)}
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>
                {languageFlags[lang]} {languageNames[lang] || lang}
              </option>
            ))}
          </select>
          <div className="source-text-preview">
            {sourceText || 'No text entered'}
          </div>
          <button
            className={`ai-translate-btn ${translating ? 'loading' : ''}`}
            disabled={translating}
            onClick={handleAiTranslate}
          >
            {translating ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4m0 12v4m-8-10h4m12 0h4m-5.66-5.66l-2.83 2.83m-5.66 5.66l-2.83 2.83m14.14 0l-2.83-2.83M6.34 6.34L3.51 3.51" />
                </svg>
                <span>Translating...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>Auto-translate with AI</span>
              </>
            )}
          </button>
          {statusMessage && (
            <div className={`ai-translate-status ${statusType}`}>{statusMessage}</div>
          )}
        </div>

        <div className="translate-targets">
          {languages.map(lang => (
            <div
              key={lang}
              className={`translate-target-item ${translating && lang !== sourceLang ? 'translating' : ''}`}
              data-lang={lang}
            >
              <div className="translate-target-header">
                <span className="flag">{languageFlags[lang]}</span>
                <span>{languageNames[lang] || lang}</span>
              </div>
              <textarea
                placeholder={`Enter ${languageNames[lang] || lang} translation...`}
                value={translations[lang] || ''}
                onChange={e => handleTranslationChange(lang, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="modal-buttons">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn modal-btn-confirm"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            onClick={handleApply}
          >
            Apply Translations
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LanguagesModal
// =============================================================================

export function LanguagesModal({ visible, onClose, state, dispatch }) {
  const [search, setSearch] = useState('');

  const allLanguageCodes = useMemo(() => Object.keys(languageNames), []);

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return allLanguageCodes;
    const q = search.toLowerCase();
    return allLanguageCodes.filter(code => {
      const name = (languageNames[code] || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [search, allLanguageCodes]);

  const toggleLanguage = useCallback((langCode) => {
    if (state.projectLanguages.includes(langCode)) {
      if (state.projectLanguages.length <= 1) return;
      dispatch({ type: REMOVE_PROJECT_LANGUAGE, payload: { language: langCode } });
    } else {
      dispatch({ type: ADD_PROJECT_LANGUAGE, payload: { language: langCode } });
    }
  }, [dispatch, state.projectLanguages]);

  const handleSetDefault = useCallback((langCode) => {
    const reordered = [langCode, ...state.projectLanguages.filter(l => l !== langCode)];
    dispatch({ type: SET_PROJECT_LANGUAGES, payload: { languages: reordered } });
    dispatch({ type: SET_CURRENT_LANGUAGE, payload: { language: langCode } });
  }, [dispatch, state.projectLanguages]);

  const isSelected = (code) => state.projectLanguages.includes(code);
  const isDefault = (code) => state.projectLanguages[0] === code;

  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Project Languages</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select the languages for your screenshots. Click to toggle.
          </p>
        </DialogHeader>

        {/* Selected languages summary */}
        {state.projectLanguages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pb-3 max-h-[72px] overflow-hidden">
            {state.projectLanguages.length <= 8 ? (
              state.projectLanguages.map((lang) => (
                <Badge
                  key={lang}
                  variant={isDefault(lang) ? 'default' : 'secondary'}
                  className="gap-1 cursor-pointer select-none text-xs"
                  onClick={() => {
                    if (!isDefault(lang) && state.projectLanguages.length > 1) {
                      toggleLanguage(lang);
                    }
                  }}
                >
                  {languageFlags[lang]} {languageNames[lang] || lang}
                  {isDefault(lang) && <span className="text-[10px] opacity-70">default</span>}
                  {!isDefault(lang) && <span className="opacity-50 hover:opacity-100">&times;</span>}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground py-1">
                {state.projectLanguages.map(l => languageFlags[l]).join(' ')}
              </span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="px-5 pb-2">
          <Input
            placeholder="Search languages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Language list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 max-h-[400px]">
          {filteredLanguages.map(code => {
            const selected = isSelected(code);
            const def = isDefault(code);
            return (
              <div
                key={code}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  selected ? 'bg-primary/10' : 'hover:bg-accent/50'
                }`}
                onClick={() => toggleLanguage(code)}
              >
                {/* Checkbox */}
                <div className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                  selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                }`}>
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                <span className="text-lg leading-none">{languageFlags[code]}</span>
                <span className="flex-1 text-sm">{languageNames[code] || code}</span>

                {def && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    DEFAULT
                  </span>
                )}

                {selected && !def && (
                  <button
                    className="text-[10px] font-medium text-muted-foreground hover:text-primary bg-muted hover:bg-primary/10 px-1.5 py-0.5 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefault(code);
                    }}
                  >
                    Set default
                  </button>
                )}
              </div>
            );
          })}
          {filteredLanguages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No languages match your search</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {state.projectLanguages.length} / {allLanguageCodes.length} languages
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (state.projectLanguages.length === allLanguageCodes.length) {
                  // Deselect all except default
                  const def = state.projectLanguages[0] || 'en';
                  dispatch({ type: SET_PROJECT_LANGUAGES, payload: { languages: [def] } });
                } else {
                  // Select all
                  const def = state.projectLanguages[0] || 'en';
                  const all = [def, ...allLanguageCodes.filter(c => c !== def)];
                  dispatch({ type: SET_PROJECT_LANGUAGES, payload: { languages: all } });
                }
              }}
            >
              {state.projectLanguages.length === allLanguageCodes.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// ExportLanguageModal
// =============================================================================

export function ExportLanguageModal({ visible, onClose, onExportCurrent, onExportAll, currentLanguage }) {
  const displayName = languageNames[currentLanguage] || currentLanguage;
  const flag = languageFlags[currentLanguage] || '';

  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`}>
      <div className="modal">
        <div className="modal-icon" style={{ background: 'rgba(10, 132, 255, 0.2)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <h3 className="modal-title">Export Screenshots</h3>
        <p className="modal-message">Choose which language versions to export.</p>

        <div className="export-options">
          <button className="export-option" onClick={onExportCurrent}>
            <span className="export-option-title">Current Language Only</span>
            <span className="export-option-desc">{flag} {displayName}</span>
          </button>
          <button className="export-option" onClick={onExportAll}>
            <span className="export-option-title">All Languages</span>
            <span className="export-option-desc">Separate folder per language</span>
          </button>
        </div>

        <div className="modal-buttons">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ScreenshotTranslationsModal
// =============================================================================

export function ScreenshotTranslationsModal({ visible, onClose, screenshotIndex, state, dispatch }) {
  const fileInputRef = useRef(null);
  const [uploadLang, setUploadLang] = useState(null);

  const screenshot = state.screenshots[screenshotIndex] || null;
  const localizedImages = screenshot?.localizedImages || {};

  const handleUploadClick = useCallback((lang) => {
    setUploadLang(lang);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadLang) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        dispatch({
          type: SET_LOCALIZED_IMAGE,
          payload: {
            screenshotIndex,
            lang: uploadLang,
            image: img,
            src: loadEvent.target.result,
            name: file.name,
          },
        });
      };
      img.src = loadEvent.target.result;
    };
    reader.readAsDataURL(file);
    setUploadLang(null);
  }, [uploadLang, screenshotIndex, dispatch]);

  const handleRemoveImage = useCallback((lang) => {
    dispatch({
      type: REMOVE_LOCALIZED_IMAGE,
      payload: { screenshotIndex, lang },
    });
  }, [screenshotIndex, dispatch]);

  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`}>
      <div className="modal translations-modal">
        <div className="modal-header">
          <h3 className="modal-title">Screenshot Translations</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="modal-message">Upload localized versions of this screenshot for each language.</p>

        <div className="translations-list">
          {state.projectLanguages.map(lang => {
            const localized = localizedImages[lang];
            return (
              <div key={lang} className="translation-item">
                <span className="translation-flag">{languageFlags[lang]}</span>
                <span className="translation-name">{languageNames[lang] || lang}</span>
                {localized?.src ? (
                  <div className="translation-thumb-wrapper">
                    <img className="translation-thumb" src={localized.src} alt={lang} />
                    <button
                      className="translation-remove-btn"
                      title="Remove image"
                      onClick={() => handleRemoveImage(lang)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    className="translation-upload-btn"
                    onClick={() => handleUploadClick(lang)}
                  >
                    Upload
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="modal-buttons">
          <button
            className="modal-btn modal-btn-confirm"
            style={{ background: 'var(--accent)' }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MagicalTitlesModal
// =============================================================================

export function MagicalTitlesModal({ visible, onClose, onConfirm, state, aiConfig }) {
  const [selectedLang, setSelectedLang] = useState(state.currentLanguage || 'en');

  const screenshotCount = state.screenshots.length;
  const provider = aiConfig?.provider;
  const providerConfig = llmProviders[provider];
  const providerName = providerConfig?.name || provider || '-';

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setSelectedLang(state.currentLanguage || 'en');
    }
  }

  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`}>
      <div className="modal">
        <div className="modal-icon" style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#ffa500' }}>
            <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
          </svg>
        </div>
        <h3 className="modal-title">Generate Magical Titles</h3>
        <p className="modal-message">This will use AI to analyze your screenshots and generate marketing headlines and subheadlines for each screen.</p>
        <p className="modal-message" style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
          Screenshots: {screenshotCount} &middot; Provider: {providerName}
        </p>

        <div className="translate-source" style={{ marginTop: 16 }}>
          <label className="control-label">Generate titles in</label>
          <select
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            {state.projectLanguages.map(lang => (
              <option key={lang} value={lang}>
                {languageFlags[lang]} {languageNames[lang] || lang}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-buttons">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn modal-btn-confirm"
            style={{ background: 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' }}
            onClick={() => onConfirm(selectedLang)}
          >
            Generate Titles
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ExportProgressModal
// =============================================================================

export function ExportProgressModal({ visible, status, detail, progress }) {
  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`}>
      <div className="modal export-progress-modal">
        <div className="modal-icon" style={{ background: 'rgba(10, 132, 255, 0.2)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <h2>Exporting Screenshots</h2>
        <p>{status || 'Preparing export...'}</p>
        <div className="export-progress-bar">
          <div
            className="export-progress-fill"
            style={{ width: `${progress || 0}%` }}
          />
        </div>
        {detail && <p className="export-progress-detail">{detail}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// DuplicateScreenshotModal
// =============================================================================

export function DuplicateScreenshotModal({
  visible,
  onReplace,
  onCreateNew,
  onSkip,
  existingScreenshot,
  newImage,
  detectedLang,
}) {
  const langName = languageNames[detectedLang] || detectedLang || 'language';

  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`}>
      <div className="modal duplicate-screenshot-modal">
        <div className="modal-icon" style={{ background: 'rgba(255, 159, 10, 0.2)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#ff9f0a' }}>
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="modal-title">Screenshot Already Exists</h3>
        <p className="modal-message">A screenshot with this filename already exists. What would you like to do?</p>

        <div className="duplicate-comparison">
          <div className="duplicate-item">
            <span className="duplicate-label">Existing</span>
            <div className="duplicate-thumb">
              {existingScreenshot?.src && (
                <img src={existingScreenshot.src} alt="Existing" />
              )}
            </div>
            <span className="duplicate-name">{existingScreenshot?.name || 'screenshot.png'}</span>
          </div>
          <div className="duplicate-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className="duplicate-item">
            <span className="duplicate-label">New</span>
            <div className="duplicate-thumb">
              {newImage?.src && (
                <img src={newImage.src} alt="New" />
              )}
            </div>
            <span className="duplicate-name">{newImage?.name || 'screenshot.png'}</span>
          </div>
        </div>

        <div className="duplicate-options">
          <button className="duplicate-option" onClick={onReplace}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
            </svg>
            <div className="duplicate-option-text">
              <span className="duplicate-option-title">Replace</span>
              <span className="duplicate-option-desc">Replace the {langName} version</span>
            </div>
          </button>
          <button className="duplicate-option" onClick={onCreateNew}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <div className="duplicate-option-text">
              <span className="duplicate-option-title">Create New</span>
              <span className="duplicate-option-desc">Add as a separate screenshot</span>
            </div>
          </button>
          <button className="duplicate-option" onClick={onSkip}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            <div className="duplicate-option-text">
              <span className="duplicate-option-title">Skip</span>
              <span className="duplicate-option-desc">Don't upload this file</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
