import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useArchiveSuggestions, useArchiveProject } from '@/hooks/useTasks';
import { Archive, X, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ArchiveSuggestionBanner() {
  const { data: suggestions, isLoading } = useArchiveSuggestions();
  const archiveProject = useArchiveProject();
  const [dismissedProjects, setDismissedProjects] = useState<Set<string>>(new Set());
  const [confirmProject, setConfirmProject] = useState<string | null>(null);

  if (isLoading || !suggestions?.length) {
    return null;
  }

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedProjects.has(s.project));

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const handleDismiss = (project: string) => {
    setDismissedProjects(prev => new Set(prev).add(project));
  };

  const handleArchive = async (project: string) => {
    try {
      await archiveProject.mutateAsync(project);
      setConfirmProject(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <>
      <div className="space-y-2 mb-4">
        {visibleSuggestions.map((suggestion) => (
          <div
            key={suggestion.project}
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3 rounded-lg",
              "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
            )}
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  Project "{suggestion.project}" is complete!
                </p>
                <p className="text-sm opacity-80">
                  All {suggestion.taskCount} task{suggestion.taskCount !== 1 ? 's' : ''} are done. 
                  Ready to archive?
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmProject(suggestion.project)}
                disabled={archiveProject.isPending}
                className="border-green-500/30 hover:bg-green-500/10"
              >
                {archiveProject.isPending && confirmProject === suggestion.project ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-1" />
                    Archive All
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(suggestion.project)}
                className="hover:bg-green-500/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmProject} onOpenChange={() => setConfirmProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive project "{confirmProject}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive all {
                suggestions.find(s => s.project === confirmProject)?.taskCount || 0
              } tasks in this project. You can restore them from the archive later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmProject && handleArchive(confirmProject)}
              disabled={archiveProject.isPending}
            >
              {archiveProject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Project
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
