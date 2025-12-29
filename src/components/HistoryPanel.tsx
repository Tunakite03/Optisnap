import { HistoryEntry } from '@/types';
import { Clock, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface HistoryPanelProps {
   history: HistoryEntry[];
   onUndo: (entryId: string) => void;
   onClearHistory: () => void;
   disabled?: boolean;
}

function formatFileSize(bytes: number): string {
   if (bytes === 0) return '0 B';
   const k = 1024;
   const sizes = ['B', 'KB', 'MB', 'GB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTimeAgo(timestamp: number): string {
   const now = Date.now();
   const diff = now - timestamp;
   const seconds = Math.floor(diff / 1000);
   const minutes = Math.floor(seconds / 60);
   const hours = Math.floor(minutes / 60);
   const days = Math.floor(hours / 24);

   if (days > 0) return `${days}d ago`;
   if (hours > 0) return `${hours}h ago`;
   if (minutes > 0) return `${minutes}m ago`;
   return `${seconds}s ago`;
}

export function HistoryPanel({
   history,
   onUndo,
   onClearHistory,
   disabled = false,
}: HistoryPanelProps) {
   const { t } = useTranslation();
   const [expandedId, setExpandedId] = useState<string | null>(null);

   if (history.length === 0) {
      return (
         <div className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
               {t('history.empty')}
            </p>
         </div>
      );
   }

   return (
      <div className="p-3 space-y-2">
         <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">
               {t('history.title')}
            </h3>
            <Button
               variant="ghost"
               size="sm"
               onClick={onClearHistory}
               disabled={disabled}
               className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
               <Trash2 className="w-3 h-3 mr-1" />
               {t('history.clear')}
            </Button>
         </div>

         <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((entry) => {
               const sizeSaved = entry.totalSizeBefore - entry.totalSizeAfter;
               const percentSaved =
                  entry.totalSizeBefore > 0
                     ? ((sizeSaved / entry.totalSizeBefore) * 100).toFixed(1)
                     : '0';
               const isExpanded = expandedId === entry.id;

               return (
                  <div
                     key={entry.id}
                     className="border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                     <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs font-semibold text-foreground capitalize">
                                    {entry.operationMode.replace('_', ' + ')}
                                 </span>
                                 {entry.outputFormat && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase">
                                       {entry.outputFormat}
                                    </span>
                                 )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                 <span>
                                    {entry.filesProcessed} {t('history.files')}
                                 </span>
                                 <span className="text-emerald-600 font-medium">
                                    {entry.successCount}{' '}
                                    {t('progress.success').toLowerCase()}
                                 </span>
                                 {entry.failedCount > 0 && (
                                    <span className="text-red-600 font-medium">
                                       {entry.failedCount}{' '}
                                       {t('progress.failed').toLowerCase()}
                                    </span>
                                 )}
                              </div>
                              {sizeSaved > 0 && (
                                 <div className="text-xs text-primary font-medium mt-1">
                                    {formatFileSize(sizeSaved)}{' '}
                                    {t('history.saved')} ({percentSaved}%)
                                 </div>
                              )}
                              <div className="text-[10px] text-muted-foreground mt-1">
                                 {formatTimeAgo(entry.timestamp)}
                              </div>
                           </div>

                           <div className="flex items-center gap-1 shrink-0">
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() =>
                                    setExpandedId(isExpanded ? null : entry.id)
                                 }
                                 disabled={disabled}
                                 className="h-7 w-7 p-0"
                                 title={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                 {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                 ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                 )}
                              </Button>
                              {entry.backups.length > 0 && (
                                 <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUndo(entry.id)}
                                    disabled={disabled}
                                    className="h-7 px-2 text-xs hover:text-primary"
                                    title={t('history.undo')}
                                 >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                    {t('history.undo')}
                                 </Button>
                              )}
                           </div>
                        </div>

                        {isExpanded && entry.backups.length > 0 && (
                           <div className="mt-3 pt-3 border-t border-border">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                 Backup Files:
                              </div>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                 {entry.backups.map((backup, idx) => (
                                    <div
                                       key={idx}
                                       className="text-[10px] text-muted-foreground font-mono bg-muted/50 p-1.5 rounded"
                                    >
                                       <div className="truncate">
                                          {backup.originalPath}
                                       </div>
                                       <div className="text-[9px] text-primary truncate">
                                          → {backup.backupPath}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               );
            })}
         </div>
      </div>
   );
}
