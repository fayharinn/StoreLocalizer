import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppWindow, Plus, ChevronsUpDown, Check } from 'lucide-react'

export default function AppVersionSelector({
  apps,
  selectedApp,
  appPickerOpen,
  setAppPickerOpen,
  isLoadingApps,
  versions,
  selectedVersion,
  isLoadingVersions,
  handleAppSelect,
  handleVersionSelect,
  setCreateVersionDialog,
}) {
  return (
    <div id="asc-app-version" className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center">
      <Popover open={appPickerOpen} onOpenChange={setAppPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={appPickerOpen}
                  disabled={isLoadingApps}
                  className="h-9 w-full justify-between font-medium"
                >
                  <span className="flex items-center gap-2 truncate">
                    {selectedApp?.iconUrl ? (
                      <img src={selectedApp.iconUrl} alt="" className="h-5 w-5 rounded-md shrink-0" />
                    ) : selectedApp ? (
                      <AppWindow className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : null}
                    <span className="truncate">
                      {selectedApp ? selectedApp.name : 'Select an app...'}
                    </span>
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search apps..." />
                  <CommandList>
                    <CommandEmpty>No apps found.</CommandEmpty>
                    <CommandGroup>
                      {apps.map(app => (
                        <CommandItem
                          key={app.id}
                          value={`${app.name} ${app.bundleId}`}
                          onSelect={() => {
                            handleAppSelect(app.id)
                            setAppPickerOpen(false)
                          }}
                          className="flex items-center gap-2"
                        >
                          {app.iconUrl ? (
                            <img src={app.iconUrl} alt="" className="h-6 w-6 rounded-md shrink-0" />
                          ) : (
                            <AppWindow className="h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{app.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{app.bundleId}</span>
                          </div>
                          {selectedApp?.id === app.id && (
                            <Check className="h-4 w-4 ml-auto shrink-0 text-primary" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

      <Select
                value={selectedVersion?.id || ''}
                onValueChange={handleVersionSelect}
                disabled={isLoadingVersions || !selectedApp}
              >
                <SelectTrigger className="h-9 w-full min-w-0">
                  <SelectValue placeholder="Select a version..." />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(version => (
                    <SelectItem key={version.id} value={version.id}>
                      v{version.versionString} ({version.platform}) - {version.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateVersionDialog(prev => ({ ...prev, open: true }))}
        disabled={!selectedApp}
        className="h-9 gap-1.5"
        title="Create new version"
      >
        <Plus className="h-4 w-4" />
        <span className="sm:hidden lg:inline">New version</span>
      </Button>
    </div>
  )
}
