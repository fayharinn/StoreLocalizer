import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
    <Card id="asc-app-version" className="border-border/50 shadow-sm card-hover scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          {selectedApp?.iconUrl ? (
            <img
              src={selectedApp.iconUrl}
              alt={selectedApp.name}
              className="h-10 w-10 rounded-xl shadow-sm"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <AppWindow className="h-5 w-5 text-violet-500" />
            </div>
          )}
          <div>
            <CardTitle className="text-lg">Select App & Version</CardTitle>
            <CardDescription>Choose which app version to translate</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">App</Label>
            <Popover open={appPickerOpen} onOpenChange={setAppPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={appPickerOpen}
                  disabled={isLoadingApps}
                  className="w-full h-10 justify-between font-medium"
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
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Version</Label>
            <div className="flex gap-2">
              <Select
                value={selectedVersion?.id || ''}
                onValueChange={handleVersionSelect}
                disabled={isLoadingVersions || !selectedApp}
              >
                <SelectTrigger className="flex-1 h-10">
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
                className="h-10 w-10 p-0"
                title="Create new version"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
