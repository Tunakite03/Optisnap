import { useState, useRef, useEffect, useCallback } from 'react';

interface ResizablePanelProps {
   children: [React.ReactNode, React.ReactNode];
   minLeftWidth?: number;
   minRightWidth?: number;
   defaultRightWidth?: number;
   storageKey?: string;
}

export function ResizablePanel({
   children,
   minLeftWidth = 300,
   minRightWidth = 250,
   defaultRightWidth = 288,
   storageKey = 'resizable-panel-width',
}: ResizablePanelProps) {
   const containerRef = useRef<HTMLDivElement>(null);
   const [rightWidth, setRightWidth] = useState<number>(() => {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : defaultRightWidth;
   });
   const [isDragging, setIsDragging] = useState(false);

   // Save width to localStorage
   useEffect(() => {
      localStorage.setItem(storageKey, rightWidth.toString());
   }, [rightWidth, storageKey]);

   const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
   }, []);

   useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
         if (!containerRef.current) return;

         const containerRect = containerRef.current.getBoundingClientRect();
         const newRightWidth = containerRect.right - e.clientX;

         // Apply constraints
         const leftWidth = containerRect.width - newRightWidth;
         if (leftWidth >= minLeftWidth && newRightWidth >= minRightWidth) {
            setRightWidth(newRightWidth);
         }
      };

      const handleMouseUp = () => {
         setIsDragging(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
         document.removeEventListener('mousemove', handleMouseMove);
         document.removeEventListener('mouseup', handleMouseUp);
      };
   }, [isDragging, minLeftWidth, minRightWidth]);

   return (
      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
         {/* Left Panel */}
         <div
            className="flex-1 flex flex-col min-w-0"
            style={{ marginRight: rightWidth }}
         >
            {children[0]}
         </div>

         {/* Resize Handle */}
         <div
            className={`absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors ${
               isDragging ? 'bg-primary' : 'bg-transparent'
            }`}
            style={{ right: rightWidth }}
            onMouseDown={handleMouseDown}
         >
            {/* Visible handle indicator */}
            <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center group">
               <div className="w-0.5 h-8 bg-border group-hover:bg-primary/70 rounded-full transition-colors" />
            </div>
         </div>

         {/* Right Panel */}
         <div
            className="absolute top-0 right-0 bottom-0 flex flex-col bg-muted/20"
            style={{ width: rightWidth }}
         >
            {children[1]}
         </div>

         {/* Dragging overlay */}
         {isDragging && (
            <div className="absolute inset-0 cursor-col-resize z-50" />
         )}
      </div>
   );
}
