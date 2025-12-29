import { useCallback, useState, useEffect } from 'react';
import { Upload, X, FileImage, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { stat } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { TrackedFile, SUPPORTED_EXTENSIONS, FileStatus, OperationMode } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DropZoneProps {
   files: TrackedFile[];
   onFilesAdded: (files: TrackedFile[]) => void;
   onFileRemove: (id: string) => void;
   onClearAll: () => void;
   operationMode: OperationMode;
   disabled?: boolean;
}

function formatFileSize(bytes: number): string {
   if (bytes === 0) return '0 B';
   const k = 1024;
   const sizes = ['B', 'KB', 'MB', 'GB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isValidImageFile(filename: string): boolean {
   const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
   return SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number]);
}

function generateId(): string {
   return Math.random().toString(36).substring(2, 11);
}

function getStatusIcon(status: FileStatus) {
   switch (status) {
      case 'pending':
         return <FileImage className='w-4 h-4 text-muted-foreground' />;
      case 'processing':
         return <Loader2 className='w-4 h-4 text-primary animate-spin' />;
      case 'success':
         return <CheckCircle2 className='w-4 h-4 text-emerald-600' />;
      case 'failed':
         return <AlertCircle className='w-4 h-4 text-red-600' />;
   }
}

function getStatusText(status: FileStatus, originalSize?: number, outputSize?: number) {
   switch (status) {
      case 'pending':
         return null;
      case 'processing':
         return <span className='text-[10px] text-primary font-medium'>Converting...</span>;
      case 'success':
         if (originalSize && outputSize) {
            const reduction = (((originalSize - outputSize) / originalSize) * 100).toFixed(1);
            const isReduced = originalSize > outputSize;
            return (
               <span className='text-[10px] text-emerald-600 font-medium'>{isReduced ? `-${reduction}%` : 'Done'}</span>
            );
         }
         return <span className='text-[10px] text-emerald-600 font-medium'>Done</span>;
      case 'failed':
         return <span className='text-[10px] text-red-600 font-medium'>Failed</span>;
   }
}

export function DropZone({
   files,
   onFilesAdded,
   onFileRemove,
   onClearAll,
   operationMode,
   disabled = false,
}: DropZoneProps) {
   const [isDragging, setIsDragging] = useState(false);
   const [isLoadingFiles, setIsLoadingFiles] = useState(false);
   const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

   // Process file paths and add to tracked files
   const processFilePaths = useCallback(
      async (paths: string[]) => {
         if (disabled) return;

         setIsLoadingFiles(true);
         setLoadingProgress({ current: 0, total: paths.length });

         const trackedFiles: TrackedFile[] = [];
         const BATCH_SIZE = 10; // Process files in batches for better performance

         try {
            for (let i = 0; i < paths.length; i += BATCH_SIZE) {
               const batch = paths.slice(i, i + BATCH_SIZE);

               // Process batch in parallel
               const batchResults = await Promise.all(
                  batch.map(async (path): Promise<TrackedFile | null> => {
                     const name = path.split(/[\\/]/).pop() || path;

                     if (isValidImageFile(name)) {
                        try {
                           const fileInfo = await stat(path);
                           let dimensions = undefined;
                           try {
                              dimensions = await invoke<{ width: number; height: number }>('get_image_dimensions', {
                                 path,
                              });
                           } catch (e) {
                              console.error('Failed to get dimensions:', e);
                           }

                           return {
                              id: generateId(),
                              name,
                              path,
                              size: fileInfo.size,
                              width: dimensions?.width,
                              height: dimensions?.height,
                              status: 'pending' as FileStatus,
                           };
                        } catch (e) {
                           console.error('Failed to stat file:', path, e);
                           return null;
                        }
                     }
                     return null;
                  })
               );

               // Add successful files to the tracked list
               const validFiles = batchResults.filter((f): f is TrackedFile => f !== null);
               trackedFiles.push(...validFiles);

               // Update progress
               setLoadingProgress({ current: Math.min(i + BATCH_SIZE, paths.length), total: paths.length });

               // Add files incrementally for better UX
               if (validFiles.length > 0) {
                  onFilesAdded(validFiles);
               }
            }
         } finally {
            setIsLoadingFiles(false);
            setLoadingProgress({ current: 0, total: 0 });
         }
      },
      [disabled, onFilesAdded]
   );

   // Use Tauri's drag-drop event listener
   useEffect(() => {
      const webview = getCurrentWebviewWindow();
      const unlisten = webview.onDragDropEvent((event) => {
         if (event.payload.type === 'over') {
            setIsDragging(true);
         } else if (event.payload.type === 'drop') {
            setIsDragging(false);
            if (event.payload.paths && event.payload.paths.length > 0) {
               processFilePaths(event.payload.paths);
            }
         } else if (event.payload.type === 'leave') {
            setIsDragging(false);
         }
      });

      return () => {
         unlisten.then((f) => f());
      };
   }, [processFilePaths]);

   const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Tauri handles this via onDragDropEvent
   }, []);

   const handleDragOver = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
         e.preventDefault();
         e.stopPropagation();
         if (!disabled && !isLoadingFiles) {
            setIsDragging(true);
         }
      },
      [disabled, isLoadingFiles]
   );

   const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
   }, []);

   const handleFileInput = useCallback(async () => {
      if (disabled || isLoadingFiles) return;

      const selected = await open({
         multiple: true,
         filters: [
            {
               name: 'Images',
               extensions: ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'bmp', 'qoi', 'gif'],
            },
         ],
      });

      if (!selected) return;

      const paths = Array.isArray(selected) ? selected : [selected];
      await processFilePaths(paths);
   }, [disabled, processFilePaths]);

   const totalSize = files.reduce((acc, f) => acc + f.size, 0);
   const showDimensions = operationMode === 'resize' || operationMode === 'optimize_resize' || operationMode === 'all';

   return (
      <div className='h-full flex flex-col relative'>
         {/* Loading Indicator Overlay */}
         {isLoadingFiles && (
            <div className='absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
               <div className='bg-card border border-border rounded-lg shadow-lg p-6 min-w-75'>
                  <div className='flex items-center gap-3 mb-4'>
                     <Loader2 className='w-5 h-5 text-primary animate-spin' />
                     <span className='text-sm font-medium'>Loading files...</span>
                  </div>
                  <div className='space-y-2'>
                     <div className='flex justify-between text-xs text-muted-foreground'>
                        <span>Processing</span>
                        <span>
                           {loadingProgress.current} / {loadingProgress.total}
                        </span>
                     </div>
                     <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
                        <div
                           className='h-full bg-primary transition-all duration-300 ease-out'
                           style={{
                              width: `${
                                 loadingProgress.total > 0 ? (loadingProgress.current / loadingProgress.total) * 100 : 0
                              }%`,
                           }}
                        />
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Drop Zone Area - Compact */}
         {files.length === 0 ? (
            <div
               onDrop={handleDrop}
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onClick={handleFileInput}
               className={cn(
                  'flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed m-3 rounded transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                  (disabled || isLoadingFiles) && 'opacity-50 cursor-not-allowed'
               )}
            >
               <Upload className={cn('w-10 h-10 mb-3', isDragging ? 'text-primary' : 'text-muted-foreground')} />
               <p className='text-sm font-medium text-foreground'>
                  {isDragging ? 'Drop files here' : 'Drop images or click to browse'}
               </p>
               <p className='text-xs text-muted-foreground mt-1'>PNG, JPG, WebP, TIFF, BMP, QOI, GIF</p>
            </div>
         ) : (
            <>
               {/* Small drop zone when files exist */}
               <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleFileInput}
                  className={cn(
                     'h-14 mx-3 mt-3 flex items-center justify-center cursor-pointer border border-dashed rounded transition-colors shrink-0',
                     isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                     (disabled || isLoadingFiles) && 'opacity-50 cursor-not-allowed'
                  )}
               >
                  <Upload className='w-4 h-4 mr-2 text-muted-foreground' />
                  <span className='text-xs text-muted-foreground'>Add more files</span>
               </div>

               {/* File List Header */}
               <div className='h-8 mx-3 mt-2 flex items-center px-2 bg-muted/50 rounded-t border border-b-0 border-border'>
                  <span className='w-6 shrink-0'></span>
                  <span className='flex-1 min-w-0 px-2 text-xs text-muted-foreground'>Name</span>
                  {showDimensions && (
                     <span className='w-24 text-xs text-muted-foreground shrink-0 text-center'>Dimensions</span>
                  )}
                  <span className='w-20  text-xs text-muted-foreground shrink-0 text-center'>Size</span>
                  <span className='w-20  text-xs text-muted-foreground shrink-0 text-center'>Status</span>
                  <div className='w-16 flex items-center justify-center shrink-0'>
                     <Button
                        variant='ghost'
                        size='sm'
                        onClick={onClearAll}
                        disabled={disabled || isLoadingFiles}
                        className='h-6 px-2 text-xs text-muted-foreground hover:text-destructive'
                     >
                        <Trash2 className='w-3 h-3' />
                        Clear
                     </Button>
                  </div>
               </div>

               {/* File List - Table Style */}
               <div className='flex-1 mx-3 mb-3 overflow-y-auto border border-border rounded-b bg-background'>
                  {files.map((file, index) => (
                     <div
                        key={file.id}
                        className={cn(
                           ' flex items-center px-2 text-xs group hover:bg-accent/50 transition-colors',
                           index !== files.length - 1 && 'border-b border-border',
                           file.status === 'failed' && 'bg-red-50 dark:bg-red-950/20',
                           file.status === 'success' && 'bg-emerald-50/50 dark:bg-emerald-950/10'
                        )}
                     >
                        <div className='w-6 flex items-center justify-center shrink-0'>
                           {getStatusIcon(file.status)}
                        </div>
                        <div className='flex-1 min-w-0 px-2 py-1'>
                           <div className='truncate block'>{file.name}</div>
                           {file.status === 'success' && file.outputSize && (
                              <div className='text-[10px] text-muted-foreground mt-0.5'>
                                 {formatFileSize(file.size)} → {formatFileSize(file.outputSize)}
                              </div>
                           )}
                        </div>
                        {showDimensions && (
                           <div className='w-24 text-muted-foreground shrink-0 text-center text-[11px]'>
                              {file.status === 'success' && file.outputWidth && file.outputHeight ? (
                                 <div className='flex flex-col'>
                                    <span className='text-muted-foreground/60 line-through text-[10px]'>
                                       {file.width} × {file.height}
                                    </span>
                                    <span className='text-emerald-600 font-medium'>
                                       {file.outputWidth} × {file.outputHeight}
                                    </span>
                                 </div>
                              ) : file.width && file.height ? (
                                 <span>
                                    {file.width} × {file.height}
                                 </span>
                              ) : (
                                 <span className='text-muted-foreground/50'>—</span>
                              )}
                           </div>
                        )}
                        <div className='w-20  text-muted-foreground shrink-0 text-center'>
                           {formatFileSize(file.size)}
                        </div>
                        <div className='w-20  shrink-0 text-center'>
                           {getStatusText(file.status, file.size, file.outputSize)}
                        </div>
                        <div className='w-16 flex items-center justify-center shrink-0'>
                           <button
                              onClick={() => onFileRemove(file.id)}
                              disabled={disabled || isLoadingFiles || file.status === 'processing'}
                              className='opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity disabled:opacity-0'
                           >
                              <X className='w-3.5 h-3.5' />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Footer Stats */}
               <div className='h-7 mx-3 mb-3 px-3 flex items-center justify-between bg-muted/30 rounded border border-border text-xs text-muted-foreground shrink-0'>
                  <span>{files.length} files selected</span>
                  <span>Total: {formatFileSize(totalSize)}</span>
               </div>
            </>
         )}
      </div>
   );
}
