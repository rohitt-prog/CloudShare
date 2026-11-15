import React from 'react';
import { Search, X } from 'lucide-react';

export interface FileSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const FileSearch: React.FC<FileSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search files by name...',
}) => {
  return (
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search files by name"
        className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg m-1"
          aria-label="Clear search query"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
