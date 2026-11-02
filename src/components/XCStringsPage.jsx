import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_LANGUAGES, PROVIDERS } from '../services/translationService'
import { Languages, Upload, FileText, Download, Search, Edit3, Terminal, CheckCircle2, AlertCircle, Clock, X, Plus, ChevronLeft, ChevronRight, Loader2, ChevronDown } from 'lucide-react'

export function XCStringsPage({
  providerConfig,
  currentApiKey,
  currentModel,
  isTesting,
  testResult,
  handleTestConnection,
  concurrency,
  setConcurrency,
  batchSize,
  setBatchSize,
  protectedWords,
  newProtectedWord,
  setNewProtectedWord,
  addProtectedWord,
  removeProtectedWord,
  xcstringsData,
  fileName,
  stats,
  selectedLanguages,
  isTranslating,
  progress,
  progressPercent,
  logs,
  isDragging,
  languageSearch,
  setLanguageSearch,
  handleFileUpload,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleLanguageToggle,
  handleSelectAll,
  handleTranslate,
  handleSave,
  editDialog,
  setEditDialog,
  filterLang,
  setFilterLang,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  availableLanguages,
  filteredTranslations,
  paginatedTranslations,
  totalPages,
  truncateText,
  handleEditTranslation,
  handleSaveEdit,
  ITEMS_PER_PAGE,
}) {
  const sourceLanguage = xcstringsData?.sourceLanguage || 'en'
  const neededCount = stats
    ? selectedLanguages.reduce((acc, lang) => acc + (stats.totalStrings - (stats.translationCounts[lang] || 0)), 0)
    : 0

  return (
    <>
      <div className="space-y-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-[28px] leading-9 font-medium tracking-[-0.01em]">
              {fileName || 'String catalog'}
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Translate an Xcode <code className="text-[13px] text-foreground">.xcstrings</code> catalog into {SUPPORTED_LANGUAGES.length} languages,
              keep format specifiers and brand words intact, then export it back to your project.
            </p>
          </div>
          {stats && (
            <dl className="flex gap-8">
              <div>
                <dt className="text-xs text-faint">Strings</dt>
                <dd className="mt-1 text-2xl font-medium tabular-nums">{stats.totalStrings}</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Languages</dt>
                <dd className="mt-1 text-2xl font-medium tabular-nums">{stats.languages.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Missing</dt>
                <dd className="mt-1 text-2xl font-medium tabular-nums text-highlight-ink">
                  {stats.languages.reduce((acc, lang) => acc + (stats.totalStrings - (stats.translationCounts[lang] || 0)), 0)}
                </dd>
              </div>
            </dl>
          )}
        </header>

        <Tabs defaultValue="translate" className="gap-6">
          <TabsList className="h-9">
            <TabsTrigger value="translate" className="px-3">
              <Languages className="h-4 w-4" />
              Translate
            </TabsTrigger>
            <TabsTrigger value="editor" disabled={!xcstringsData} className="px-3">
              <Edit3 className="h-4 w-4" />
              Editor
              {stats && <span className="font-mono text-xs text-faint tabular-nums">{stats.totalStrings}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="translate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI provider</CardTitle>
                <CardDescription>Set the provider, key and model in the sidebar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                    <span className="font-medium">{PROVIDERS[providerConfig.provider]?.name}</span>
                    <span className="text-faint">/</span>
                    <span className="font-mono text-[13px] text-muted-foreground">
                      {currentModel?.includes('inference-profile/')
                        ? currentModel.split('/').pop().replace('global.anthropic.', '').replace(/-v\d+:\d+$/, '')
                        : currentModel || 'No model'}
                    </span>
                  </div>
                  {currentApiKey ? (
                    <span className="flex items-center gap-2 text-sm text-positive">
                      <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                      Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-highlight-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-highlight" />
                      No API key
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTesting || !currentApiKey}
                    className="ml-auto"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Testing
                      </>
                    ) : 'Test connection'}
                  </Button>
                </div>
                {testResult && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${testResult.success ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}>
                    {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-6 border-t border-border pt-5">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-normal text-muted-foreground whitespace-nowrap">Texts per batch</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={batchSize}
                      onChange={(e) => setBatchSize(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                      className="h-9 w-20 text-center font-mono tabular-nums"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-normal text-muted-foreground whitespace-nowrap">Parallel requests</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={concurrency}
                      onChange={(e) => setConcurrency(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      className="h-9 w-20 text-center font-mono tabular-nums"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Protected words</CardTitle>
                <CardDescription>Brand names and terms that stay as they are in every language</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a word"
                    value={newProtectedWord}
                    onChange={(e) => setNewProtectedWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addProtectedWord()}
                    className="h-9 flex-1"
                  />
                  <Button onClick={addProtectedWord} variant="outline">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-2">
                  {protectedWords.map(word => (
                    <button
                      key={word}
                      onClick={() => removeProtectedWord(word)}
                      title={`Remove ${word}`}
                      className="group flex h-7 items-center gap-1.5 rounded-md border border-border bg-secondary px-2 font-mono text-[13px] hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    >
                      {word}
                      <X className="h-3 w-3 text-faint group-hover:text-destructive" />
                    </button>
                  ))}
                  {protectedWords.length === 0 && (
                    <span className="px-1 text-sm text-faint">No protected words yet</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Catalog file</CardTitle>
                <CardDescription>The Localizable.xcstrings file from your Xcode project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="file"
                  accept=".xcstrings"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-input"
                />
                <Label
                  htmlFor="file-input"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    relative flex flex-col items-center justify-center gap-2 ${fileName ? 'h-28' : 'h-40'} rounded-lg border border-dashed cursor-pointer transition-colors duration-150
                    ${isDragging
                      ? 'border-foreground/40 bg-accent'
                      : fileName
                        ? 'border-border bg-secondary/40 hover:bg-secondary/70'
                        : 'border-border hover:border-foreground/25 hover:bg-secondary/40'
                    }
                  `}
                >
                  {fileName ? (
                    <>
                      <span className="flex items-center gap-2 font-mono text-sm">
                        <FileText className="h-4 w-4 text-faint" />
                        {fileName}
                      </span>
                      <span className="text-xs font-normal text-faint">Click or drop to replace</span>
                    </>
                  ) : isDragging ? (
                    <>
                      <Upload className="h-5 w-5 text-foreground" />
                      <span className="text-sm">Drop your file here</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-faint" />
                      <span className="text-sm">Drop a <span className="font-mono">.xcstrings</span> file or click to choose</span>
                    </>
                  )}
                </Label>
                {stats && (
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span><span className="tabular-nums text-foreground">{stats.totalStrings}</span> strings</span>
                    <span><span className="tabular-nums text-foreground">{stats.languages.length}</span> languages</span>
                    {selectedLanguages.length > 0 && (
                      <span className="ml-auto flex items-center gap-1.5 text-highlight-ink">
                        <Clock className="h-4 w-4" />
                        <span className="tabular-nums">{neededCount}</span> translations to write
                      </span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Target languages</CardTitle>
                <CardDescription>
                  {selectedLanguages.length > 0
                    ? `${selectedLanguages.length} selected`
                    : 'Pick the languages to translate into'}
                </CardDescription>
                <CardAction>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedLanguages.length === SUPPORTED_LANGUAGES.length ? 'Deselect all' : 'Select all'}
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <Input
                    placeholder="Search languages"
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {SUPPORTED_LANGUAGES
                    .filter(lang => {
                      if (!languageSearch) return true
                      const q = languageSearch.toLowerCase()
                      return lang.name.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q)
                    })
                    .map(lang => {
                    const translated = stats?.translationCounts?.[lang.code] || 0
                    const missing = stats ? stats.totalStrings - translated : 0
                    const isComplete = stats && missing === 0
                    const isSelected = selectedLanguages.includes(lang.code)
                    const coverage = stats?.totalStrings ? translated / stats.totalStrings : 0

                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageToggle(lang.code)}
                        className={`
                          relative flex h-11 items-center gap-3 overflow-hidden rounded-lg border px-3 text-left transition-colors duration-150
                          ${isSelected
                            ? 'border-foreground/20 bg-accent'
                            : 'border-border hover:bg-secondary/50'
                          }
                        `}
                      >
                        <span className={`
                          flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors
                          ${isSelected
                            ? 'border-highlight bg-highlight text-highlight-foreground'
                            : 'border-foreground/25'
                          }
                        `}>
                          {isSelected && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="text-base leading-none">{lang.flag}</span>
                        <span className="flex-1 truncate text-sm">{lang.name}</span>
                        {stats ? (
                          isComplete
                            ? <CheckCircle2 className="h-4 w-4 text-positive" />
                            : <span className="font-mono text-xs tabular-nums text-faint">{missing}</span>
                        ) : (
                          <span className="keycap">{lang.code}</span>
                        )}
                        {stats && (
                          <span
                            className={`absolute bottom-0 left-0 h-0.5 ${isComplete ? 'bg-positive/70' : 'bg-foreground/30'}`}
                            style={{ width: `${coverage * 100}%` }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Translate and export</CardTitle>
                <CardDescription>Fill the missing strings, then download the updated catalog</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex gap-3">
                  <Button
                    onClick={handleTranslate}
                    disabled={isTranslating || !xcstringsData || !currentApiKey || selectedLanguages.length === 0}
                    variant="highlight"
                    size="lg"
                    className="flex-1"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Translating
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4" />
                        {selectedLanguages.length > 0
                          ? `Translate into ${selectedLanguages.length} ${selectedLanguages.length === 1 ? 'language' : 'languages'}`
                          : 'Translate'}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!xcstringsData}
                    variant="outline"
                    size="lg"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
                {isTranslating && (
                  <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Translating</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{progress.current} / {progress.total}</span>
                    </div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
                      {progress.total === 0 ? (
                        <div className="absolute inset-0 rounded-full bg-highlight/50 animate-pulse" />
                      ) : (
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-highlight transition-[width] duration-300 ease-out"
                          style={{ width: `${progressPercent}%` }}
                        />
                      )}
                    </div>
                    <p className="truncate text-sm text-faint">{progress.currentText}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Collapsible open={logs.length > 0} className="overflow-hidden rounded-xl border border-border bg-card">
              <CollapsibleTrigger className="flex w-full items-center gap-3 px-6 py-4 hover:bg-secondary/30">
                <Terminal className="h-4 w-4 text-faint" />
                <span className="flex-1 text-left text-base font-medium">Activity log</span>
                {logs.length > 0 && (
                  <span className="font-mono text-xs tabular-nums text-faint">{logs.length}</span>
                )}
                <ChevronDown className="h-4 w-4 text-faint transition-transform duration-200 ease-out [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6">
                  <ScrollArea className="h-64 rounded-lg border border-border bg-background">
                    <div className="space-y-0.5 p-2">
                      {logs.map((log, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/50"
                        >
                          <span className={`mt-0.5 ${
                            log.type === 'error' ? 'text-destructive' :
                            log.type === 'success' ? 'text-positive' :
                            'text-faint'
                          }`}>
                            {log.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
                             log.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                             <Clock className="h-4 w-4" />}
                          </span>
                          <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-faint">
                            {log.timestamp}
                          </span>
                          <span className={`break-all ${log.type === 'error' ? 'text-destructive' : 'text-foreground'}`}>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="editor" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input
                  placeholder="Search keys and text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
              <Select value={filterLang} onValueChange={setFilterLang}>
                <SelectTrigger className="h-9 min-w-[160px]">
                  <SelectValue placeholder="All languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  {availableLanguages.map(lang => {
                    const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang)
                    return (
                      <SelectItem key={lang} value={lang}>
                        {langInfo ? `${langInfo.flag} ${langInfo.name}` : lang}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Button onClick={handleSave} variant="outline">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10 w-[200px] text-xs font-normal text-faint">Key</TableHead>
                    <TableHead className="h-10 w-[260px] text-xs font-normal text-faint">
                      Source <span className="keycap ml-1">{sourceLanguage}</span>
                    </TableHead>
                    <TableHead className="h-10 text-xs font-normal text-faint">Translations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTranslations.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Search className="mb-2 h-5 w-5 text-faint" />
                          <p className="text-sm">
                            {xcstringsData ? 'No strings match this search' : 'Load a catalog to see its strings'}
                          </p>
                          <p className="text-xs text-faint">
                            {xcstringsData ? 'Try another word or language' : 'Drop a .xcstrings file in the Translate tab'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTranslations.map(item => (
                      <TableRow key={item.key} className="group hover:bg-secondary/20">
                        <TableCell className="py-3 align-top">
                          <div className="max-w-[180px] truncate font-mono text-xs leading-6 text-faint group-hover:text-muted-foreground" title={item.key}>
                            {item.key}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[200px] max-w-[300px] py-3 align-top">
                          <div className="whitespace-pre-wrap break-words text-sm leading-6">
                            {item.english}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(filterLang === 'all' ? availableLanguages : [filterLang]).map(lang => {
                              const translation = item.translations[lang]?.stringUnit?.value

                              return (
                                <button
                                  key={lang}
                                  onClick={() => handleEditTranslation(item.key, lang, translation)}
                                  title={translation || 'Add a translation'}
                                  className={`
                                    group/btn flex h-8 items-center gap-2 rounded-md border pl-1 pr-2.5 text-[13px] transition-colors duration-150
                                    ${translation
                                      ? 'border-border bg-secondary/50 hover:bg-secondary'
                                      : 'border-dashed border-foreground/15 text-faint hover:border-highlight/60 hover:text-highlight-ink'
                                    }
                                  `}
                                >
                                  <span className="keycap h-6">{lang}</span>
                                  <span className="max-w-[180px] truncate">
                                    {translation ? truncateText(translation, 32) : 'Add'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground tabular-nums">
                <span className="text-foreground">{filteredTranslations.length > 0 ? currentPage * ITEMS_PER_PAGE + 1 : 0}–{Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredTranslations.length)}</span> of <span className="text-foreground">{filteredTranslations.length}</span> strings
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i
                    } else if (currentPage < 3) {
                      pageNum = i
                    } else if (currentPage > totalPages - 4) {
                      pageNum = totalPages - 5 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-md font-mono text-xs tabular-nums transition-colors ${
                          currentPage === pageNum
                            ? 'bg-secondary text-foreground'
                            : 'text-faint hover:bg-secondary/50 hover:text-foreground'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ ...editDialog, open: false })}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px]">
          <DialogHeader className="border-b border-border p-6 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{SUPPORTED_LANGUAGES.find(l => l.code === editDialog.lang)?.flag}</span>
              <div className="space-y-1">
                <DialogTitle>Edit translation</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  {SUPPORTED_LANGUAGES.find(l => l.code === editDialog.lang)?.name || editDialog.lang}
                  <span className="keycap">{editDialog.lang}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 p-6">
            <dl className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
              <div>
                <dt className="text-xs text-faint">Key</dt>
                <dd className="mt-1 break-all font-mono text-[13px] text-muted-foreground">{editDialog.key}</dd>
              </div>
              <div className="border-t border-border pt-3">
                <dt className="text-xs text-faint">Source</dt>
                <dd className="mt-1 text-sm">
                  {xcstringsData?.strings?.[editDialog.key]?.localizations?.[sourceLanguage]?.stringUnit?.value || editDialog.key}
                </dd>
              </div>
            </dl>
            <div className="space-y-2">
              <Label htmlFor="translation" className="text-sm font-medium">Translation</Label>
              <Textarea
                id="translation"
                value={editDialog.value}
                onChange={(e) => setEditDialog({ ...editDialog, value: e.target.value })}
                rows={5}
                placeholder="Write the translation"
                className="resize-none text-[15px]"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border p-6 pt-4">
            <Button variant="ghost" onClick={() => setEditDialog({ ...editDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save translation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
