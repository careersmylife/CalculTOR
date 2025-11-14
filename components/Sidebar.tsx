import React from 'react';
// FIX: Import CalculatorModule type for the refactored ModuleItem component's props.
import type { CalculatorModule, CalculatorModuleKey } from '../types';
import { CALCULATOR_MODULES } from '../constants';
import ThemeToggleButton from './common/ThemeToggleButton';

interface SidebarProps {
  activeModule: CalculatorModuleKey;
  onModuleChange: (moduleKey: CalculatorModuleKey) => void;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  favorites: CalculatorModuleKey[];
  onToggleFavorite: (moduleKey: CalculatorModuleKey) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

// FIX: Moved ModuleItem outside of Sidebar component to avoid re-creation on every render and to fix TS error with `key` prop.
// This is a React best practice.
interface ModuleItemProps {
  module: CalculatorModule;
  showStar: boolean;
  isFavorited: boolean;
  isActive: boolean;
  onModuleChange: (moduleKey: CalculatorModuleKey) => void;
  onToggleFavorite: (moduleKey: CalculatorModuleKey) => void;
}

const ModuleItem: React.FC<ModuleItemProps> = ({ module, showStar, isFavorited, isActive, onModuleChange, onToggleFavorite }) => {
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onModuleChange(module.key)}
        className={`flex items-center flex-1 px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-accent text-white'
            : 'text-text-secondary hover:bg-highlight hover:text-text-primary dark:text-[#BDBDBD] dark:hover:bg-[#4F4F4F] dark:hover:text-[#F2F2F2]'
        }`}
      >
        <i className={`${module.icon} w-6 text-center text-lg`}></i>
        <span className="ml-4 text-sm font-medium">{module.name}</span>
      </button>
      {showStar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(module.key);
          }}
          className="p-2 ml-1 text-text-secondary hover:text-yellow-400 focus:outline-none dark:text-[#BDBDBD]"
          aria-label={isFavorited ? `Remove ${module.name} from favorites` : `Add ${module.name} to favorites`}
        >
          <i className={`${isFavorited ? 'fas' : 'far'} fa-star text-yellow-400 transition-transform duration-200 group-hover:scale-125`}></i>
        </button>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeModule, onModuleChange, isOpen, setIsOpen, favorites, onToggleFavorite, theme, onToggleTheme }) => {
  const allModules = Object.values(CALCULATOR_MODULES);
  const favoriteModules = favorites.map(key => CALCULATOR_MODULES[key]).filter(Boolean);

  return (
    <>
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsOpen(false)}></div>
      <aside className={`fixed md:relative flex flex-col w-64 bg-secondary h-full shadow-lg z-30 transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 dark:bg-[#1A1A1A]`}>
        <div className="flex items-center justify-center p-6 border-b border-highlight dark:border-[#4F4F4F]">
          <i className="fas fa-drafting-compass text-accent text-3xl mr-3"></i>
          <h1 className="text-xl font-bold text-text-primary dark:text-[#F2F2F2]">EngiCalc</h1>
        </div>
        <nav className="flex-1 px-2 py-6 space-y-4 overflow-y-auto">
          {favoriteModules.length > 0 && (
            <div>
              <h2 className="px-4 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider dark:text-[#BDBDBD]">Favorites</h2>
              <div className="space-y-1">
                {favoriteModules.map(module => (
                  <ModuleItem
                    key={`fav-${module.key}`}
                    module={module}
                    showStar={false}
                    isFavorited={true}
                    isActive={activeModule === module.key}
                    onModuleChange={onModuleChange}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h2 className="px-4 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider dark:text-[#BDBDBD]">All Calculators</h2>
            <div className="space-y-1">
                {allModules.map(module => (
                  <ModuleItem
                    key={module.key}
                    module={module}
                    showStar={true}
                    isFavorited={favorites.includes(module.key)}
                    isActive={activeModule === module.key}
                    onModuleChange={onModuleChange}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
            </div>
          </div>
        </nav>
        <div className="p-4 border-t border-highlight dark:border-[#4F4F4F] flex justify-between items-center text-xs text-text-secondary dark:text-[#BDBDBD]">
          <p>Designed by IRFAN HAJI FAQEER MUHAMMAD</p>
          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;