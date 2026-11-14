import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { FileCategory, FileSortOption, FileSortField } from '@/features/files/types';

export interface FileFiltersProps {
  selectedCategory: FileCategory;
  onSelectCategory: (category: FileCategory) => void;
  categoryCounts: Record<FileCategory, number>;
  sort: FileSortOption;
  onSortChange: (sort: FileSortOption) => void;
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                  isSelected ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sorting Control */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <span className="text-xs text-slate-500 hidden md:inline">Sort by:</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm text-xs">
          <button
            type="button"
            onClick={() => handleFieldChange('date')}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              sort.field === 'date'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Date
          </button>
          <button
            type="button"
            onClick={() => handleFieldChange('name')}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              sort.field === 'name'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Name
          </button>
          <button
            type="button"
            onClick={() => handleFieldChange('size')}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              sort.field === 'size'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Size
          </button>
        </div>

        <button
          type="button"
          onClick={toggleOrder}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
          title={`Order: ${sort.order === 'asc' ? 'Ascending' : 'Descending'}`}
          aria-label="Toggle sort order"
        >
          {sort.order === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};
