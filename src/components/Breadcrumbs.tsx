import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="py-2 px-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs my-3 overflow-x-auto">
      <ol className="flex items-center space-x-1.5 text-xs text-slate-500 whitespace-nowrap min-w-max">
        <li>
          <button
            onClick={items[0]?.onClick}
            className="inline-flex items-center font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span>Home</span>
          </button>
        </li>
        {items.slice(1).map((item, index) => (
          <li key={index} className="flex items-center space-x-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            {item.onClick && !item.active ? (
              <button
                onClick={item.onClick}
                className="font-medium text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={`font-semibold ${item.active ? 'text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/60' : 'text-slate-800'}`}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
