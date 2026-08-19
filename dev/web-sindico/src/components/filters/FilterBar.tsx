import { Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface FilterBarProps {
  placeholder?: string;
  debounceMs?: number;
  onSearchChange?: (value: string) => void;
  children?: ReactNode;
}

export function FilterBar({
  placeholder = 'Buscar...',
  debounceMs = 300,
  onSearchChange,
  children,
}: FilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSearchParam = searchParams.get('search') || '';
  const [searchState, setSearchState] = useState(() => ({
    source: currentSearchParam,
    value: currentSearchParam,
  }));
  const searchValue =
    searchState.source === currentSearchParam
      ? searchState.value
      : currentSearchParam;
  const debouncedSearchValue = useDebouncedValue(searchValue, debounceMs);

  useEffect(() => {
    const trimmedSearch = debouncedSearchValue.trim();

    if (trimmedSearch === currentSearchParam) {
      return;
    }

    setSearchParams((currentParams) => {
      const newParams = new URLSearchParams(currentParams);
      if (trimmedSearch) {
        newParams.set('search', trimmedSearch);
      } else {
        newParams.delete('search');
      }
      newParams.delete('page');
      return newParams;
    }, { replace: true });
    onSearchChange?.(trimmedSearch);
  }, [
    currentSearchParam,
    debouncedSearchValue,
    onSearchChange,
    setSearchParams,
  ]);

  return (
    <div className="filter-bar">
      <div className="filter-bar__search">
        <div className="filter-bar__icon" aria-hidden="true">
          <Search size={18} />
        </div>
        <input
          type="text"
          className="field__input filter-bar__input"
          placeholder={placeholder}
          value={searchValue}
          onChange={(event) =>
            setSearchState({
              source: currentSearchParam,
              value: event.target.value,
            })
          }
        />
      </div>
      {children ? <div className="filter-bar__actions">{children}</div> : null}
    </div>
  );
}
