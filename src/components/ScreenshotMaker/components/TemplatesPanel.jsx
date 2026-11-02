import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { APPLY_TEMPLATE } from '../hooks/useAppState';
import {
  BUILT_IN_TEMPLATES,
  saveCustomTemplate,
  loadCustomTemplates,
  deleteCustomTemplate,
} from '../utils/templates';

function TemplateSwatch({ template, onClick, onDelete }) {
  const { gradient } = template.preview;

  return (
    <button
      className="group relative flex flex-col items-center gap-1.5 rounded-lg border border-transparent p-1.5 transition-colors hover:border-border hover:bg-accent/50 cursor-pointer"
      onClick={() => onClick(template)}
      title={`Apply "${template.name}"`}
    >
      <div
        className="w-full aspect-square rounded-md border border-border"
        style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
      />
      <span className="text-xs leading-4 text-muted-foreground group-hover:text-foreground truncate w-full text-center">
        {template.name}
      </span>
      {onDelete && (
        <span
          className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs leading-none"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(template.id);
          }}
          title="Delete template"
        >
          &times;
        </span>
      )}
    </button>
  );
}

export default function TemplatesPanel({ state, dispatch }) {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  const handleApplyTemplate = useCallback(
    (template) => {
      dispatch({ type: APPLY_TEMPLATE, payload: { template } });
    },
    [dispatch],
  );

  const handleSave = useCallback(() => {
    const name = saveName.trim();
    if (!name) return;

    const current = state.screenshots[state.selectedIndex];
    if (!current) return;

    saveCustomTemplate(name, current);
    setCustomTemplates(loadCustomTemplates());
    setSaveName('');
    setShowSaveDialog(false);
  }, [saveName, state.screenshots, state.selectedIndex]);

  const handleDelete = useCallback((id) => {
    deleteCustomTemplate(id);
    setCustomTemplates(loadCustomTemplates());
  }, []);

  const hasScreenshot = state.screenshots.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Built-in Templates */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Built-in templates
        </h4>
        <div className="grid grid-cols-4 gap-1.5">
          {BUILT_IN_TEMPLATES.map((template) => (
            <TemplateSwatch
              key={template.id}
              template={template}
              onClick={handleApplyTemplate}
            />
          ))}
        </div>
      </div>

      {/* Custom Templates */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Custom templates
        </h4>
        {customTemplates.length > 0 ? (
          <div className="grid grid-cols-4 gap-1.5">
            {customTemplates.map((template) => (
              <TemplateSwatch
                key={template.id}
                template={template}
                onClick={handleApplyTemplate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            No custom templates yet
          </p>
        )}
      </div>

      {/* Save Current as Template */}
      <div className="border-t pt-4">
        {!showSaveDialog ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!hasScreenshot}
            onClick={() => setShowSaveDialog(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Save current as template
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Template name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') { setShowSaveDialog(false); setSaveName(''); }
              }}
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="sm" className="h-8 shrink-0" onClick={handleSave}>
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => { setShowSaveDialog(false); setSaveName(''); }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
