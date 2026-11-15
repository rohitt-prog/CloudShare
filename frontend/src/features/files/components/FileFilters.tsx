import React from 'react';
import { ArrowUp, ArrowDown, List, LayoutGrid } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { FileCategory, FileSortOption, FileSortField } from '@/features/files/types';

export interface FileFiltersProps {
  selectedCategory: FileCategory;
  onSelectCategory: (category: FileCategory) => void;
  categoryCounts: Record<FileCategory, number>;
  sort: FileSortOption;
  onSortChange: (sort: FileSortOption) => void;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
}

const CATEGORIES: { id: FileCategory; label: string }[] = [
  { id: 'all', label: 'All Files' },
  { id: 'documents', label: 'Documents' },
  { id: 'images', label: 'Images' },
  { id: 'media', label: 'Media' },
  { id: 'archives', label: 'Archives' },
  { id: 'other', label: 'Other' },
];

export const FileFilters: React.FC<FileFiltersProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  sort,
  onSortChange,
  viewMode = 'list',
  onViewModeChange,
}) => {
  const handleFieldChange = (field: FileSortField) => {
    onSortChange({
      field,
      order: sort.field === field && sort.order === 'asc' ? 'desc' : 'asc',
    });
  };

  const toggleOrder = () => {
    onSortChange({
      ...sort,
      order: sort.order === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-1">
      {/* Category Filter Toggle Group */}
      <div
        role="group"
        aria-label="Filter files by category"
        className="flex flex-wrap items-center gap-1.5"
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-[1.015] hover:-translate-y-px motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 border border-border'
              )}
            >
              <span>{cat.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                  isSelected
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls Group: Sorting & View Mode Switcher */}
      <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
        {/* Sort Field Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
          <div className="inline-flex rounded-xl border border-border bg-card p-0.5 shadow-sm text-xs">
            <button
              type="button"
              onClick={() => handleFieldChange('date')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-medium transition-all duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sort.field === 'date'
                  ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Date
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('name')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-medium transition-all duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sort.field === 'name'
                  ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Name
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('size')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-medium transition-all duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sort.field === 'size'
                  ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Size
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={toggleOrder}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={`Sort order: ${sort.order === 'asc' ? 'Ascending' : 'Descending'}`}
            aria-label={`Toggle sort order, currently ${sort.order === 'asc' ? 'ascending' : 'descending'}`}
          >
            {sort.order === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* View Mode Switcher (List vs Grid) */}
        {onViewModeChange && (
          <div
            role="group"
            aria-label="View layout switcher"
            className="inline-flex items-center rounded-xl border border-border bg-card p-0.5 shadow-sm text-xs ml-1"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              title="List view"
              aria-label="Switch to list view"
              aria-pressed={viewMode === 'list'}
              className={cn(
                'rounded-lg p-1.5 transition-all duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                viewMode === 'list'
                  ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              title="Grid view"
              aria-label="Switch to grid view"
              aria-pressed={viewMode === 'grid'}
              className={cn(
                'rounded-lg p-1.5 transition-all duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                viewMode === 'grid'
                  ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
