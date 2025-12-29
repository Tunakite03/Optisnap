import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Languages, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
   { code: 'en', name: 'English', flag: '🇬🇧' },
   { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
   { code: 'zh', name: '中文', flag: '🇨🇳' },
   { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export function TitleBar() {
   const { i18n } = useTranslation();
   const [showLanguageMenu, setShowLanguageMenu] = useState(false);
   const menuRef = useRef<HTMLDivElement>(null);

   const handleMinimize = async () => {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
   };

   const handleMaximize = async () => {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
   };

   const handleClose = async () => {
      try {
         const appWindow = getCurrentWindow();
         await appWindow.close();
      } catch (error) {
         console.error('Failed to close window:', error);
      }
   };

   const changeLanguage = (langCode: string) => {
      i18n.changeLanguage(langCode);
      setShowLanguageMenu(false);
   };

   // Close menu when clicking outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setShowLanguageMenu(false);
         }
      };

      if (showLanguageMenu) {
         document.addEventListener('mousedown', handleClickOutside);
         return () => document.removeEventListener('mousedown', handleClickOutside);
      }
   }, [showLanguageMenu]);

   const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

   return (
      <div
         data-tauri-drag-region
         className='h-8 bg-background border-b border-border flex items-center justify-between select-none shrink-0'
      >
         {/* App Icon & Title */}
         <div
            data-tauri-drag-region
            className='flex items-center gap-2 px-3 h-full'
         >
            <div className='w-4 h-4 flex items-center justify-center'>
               <img
                  src='/logo.png'
                  alt='App Logo'
                  className='w-4 h-4 object-cover'
               />
            </div>
            <span
               data-tauri-drag-region
               className='text-xs font-medium text-foreground/80'
            >
               OptiSnap
            </span>
         </div>

         {/* Language Switcher & Window Controls */}
         <div className='flex h-full'>
            <div
               className='relative'
               ref={menuRef}
            >
               <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  type='button'
                  style={{ WebkitAppRegion: 'no-drag' } as any}
                  className={cn(
                     'px-3 h-8 flex items-center gap-1.5 transition-colors cursor-pointer',
                     'text-foreground/60 hover:text-foreground hover:bg-accent'
                  )}
                  title='Switch Language'
               >
                  <Languages className='w-3.5 h-3.5' />
                  <span className='text-xs font-medium'>{currentLanguage.flag}</span>
               </button>

               {/* Language Dropdown Menu */}
               {showLanguageMenu && (
                  <div
                     className='absolute top-full right-0 mt-1 w-44 bg-background border border-border rounded-md shadow-lg z-50'
                     style={{ WebkitAppRegion: 'no-drag' } as any}
                  >
                     {LANGUAGES.map((lang) => (
                        <button
                           key={lang.code}
                           onClick={() => changeLanguage(lang.code)}
                           className={cn(
                              'w-full px-3 py-2 text-left text-xs flex items-center justify-between',
                              'hover:bg-accent transition-colors cursor-pointer',
                              i18n.language === lang.code && 'bg-accent/50'
                           )}
                        >
                           <span className='flex items-center gap-2'>
                              <span className='text-base'>{lang.flag}</span>
                              <span className='font-medium'>{lang.name}</span>
                           </span>
                           {i18n.language === lang.code && <Check className='w-3.5 h-3.5 text-primary' />}
                        </button>
                     ))}
                  </div>
               )}
            </div>
            <WindowButton
               onClick={handleMinimize}
               aria-label='Minimize'
            >
               <Minus className='w-3.5 h-3.5' />
            </WindowButton>
            <WindowButton
               onClick={handleMaximize}
               aria-label='Maximize'
            >
               <Square className='w-3 h-3' />
            </WindowButton>
            <WindowButton
               onClick={handleClose}
               variant='close'
               aria-label='Close'
            >
               <X className='w-4 h-4' />
            </WindowButton>
         </div>
      </div>
   );
}

function WindowButton({
   children,
   onClick,
   variant = 'default',
   ...props
}: {
   children: React.ReactNode;
   onClick: () => void;
   variant?: 'default' | 'close';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
   return (
      <button
         onClick={onClick}
         type='button'
         style={{ WebkitAppRegion: 'no-drag' } as any}
         className={cn(
            'w-11 h-full flex items-center justify-center transition-colors cursor-pointer',
            'text-foreground/60 hover:text-foreground',
            variant === 'default' && 'hover:bg-accent',
            variant === 'close' && 'hover:bg-red-500 hover:text-white'
         )}
         {...props}
      >
         {children}
      </button>
   );
}
