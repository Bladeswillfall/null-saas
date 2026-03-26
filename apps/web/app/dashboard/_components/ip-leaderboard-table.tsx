'use client';

import { useState } from 'react';

/** Media type filter values matching AnalyticsMediaType */
const MEDIA_TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'book', label: 'Book' },
  { value: 'comic', label: 'Comic' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manhua', label: 'Manhua' },
  { value: 'webcomic', label: 'Web comic' },
  { value: 'indie_comic', label: 'Indie Comic' },
  { value: 'web_novel', label: 'Web Novel' },
] as const;

/** Matches IpLeaderboardRow from packages/domain/src/analytics.ts */
export interface IPLeaderboardEntry {
  ipId: string;
  name: string;
  slug: string;
  primaryCategory: string | null;
  compositeScore: number;
  momentumScore: number;
  confidenceScore: number;
  rankOverall: number | null;
  rankDelta: number | null;
  activeWorkCount: number;
  strongestCategory: string | null;
  latestScoreDate: string | null;
}

interface IPLeaderboardTableProps {
  data: IPLeaderboardEntry[];
  isLoading?: boolean;
  onFilterChange?: (category: string) => void;
  activeFilter?: string;
}

export function IPLeaderboardTable({
  data,
  isLoading = false,
  onFilterChange,
  activeFilter = 'all',
}: IPLeaderboardTableProps) {
  const [localFilter, setLocalFilter] = useState(activeFilter);

  const handleFilterClick = (value: string) => {
    setLocalFilter(value);
    onFilterChange?.(value);
  };

  const filteredData =
    localFilter === 'all'
      ? data
      : data.filter((row) => row.primaryCategory === localFilter);

  return (
    <div className="ip-leaderboard">
      <FilterBar activeFilter={localFilter} onFilterClick={handleFilterClick} />
      <TableContent data={filteredData} isLoading={isLoading} />
    </div>
  );
}

function FilterBar({
  activeFilter,
  onFilterClick,
}: {
  activeFilter: string;
  onFilterClick: (value: string) => void;
}) {
  return (
    <div className="ip-filter-bar">
      {MEDIA_TYPE_FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className={`ip-filter-btn ${activeFilter === filter.value ? 'ip-filter-btn--active' : ''}`}
          onClick={() => onFilterClick(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function TableContent({
  data,
  isLoading,
}: {
  data: IPLeaderboardEntry[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="ip-table-wrap">
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Loading IP leaderboard data...
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="ip-table-wrap">
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          No IP data available. Import data and run scoring to populate this leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="ip-table-wrap">
      <table className="ip-table">
        <thead>
          <tr>
            <th>Medium</th>
            <th>IP Title</th>
            <th>Rank</th>
            <th>Move</th>
            <th>Score</th>
            <th>Momentum</th>
            <th>Works</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <IPTableRow key={row.ipId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IPTableRow({ row }: { row: IPLeaderboardEntry }) {
  return (
    <tr>
      <td>
        <MediumBadge category={row.primaryCategory} />
      </td>
      <td className="ip-title-cell">{row.name}</td>
      <td className="ip-rank-cell">
        {row.rankOverall != null ? `#${row.rankOverall}` : '—'}
      </td>
      <td>
        <MovementIndicator delta={row.rankDelta} />
      </td>
      <td className="ip-rating-cell">{row.compositeScore.toFixed(1)}</td>
      <td className="ip-rating-cell">{row.momentumScore.toFixed(1)}</td>
      <td>{row.activeWorkCount}</td>
    </tr>
  );
}

function MediumBadge({ category }: { category: string | null }) {
  const label = category ? formatMediumLabel(category) : 'Unknown';
  return <span className="ip-medium-badge">{label}</span>;
}

function MovementIndicator({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) {
    return <span className="ip-movement ip-movement--neutral">—</span>;
  }
  if (delta > 0) {
    return <span className="ip-movement ip-movement--up">▲ {delta}</span>;
  }
  return <span className="ip-movement ip-movement--down">▼ {Math.abs(delta)}</span>;
}

function formatMediumLabel(category: string): string {
  const labels: Record<string, string> = {
    book: 'Book',
    comic: 'Comic',
    manga: 'Manga',
    manhwa: 'Manhwa',
    manhua: 'Manhua',
    webcomic: 'Web comic',
    indie_comic: 'Indie Co',
    web_novel: 'Web Nov',
  };
  return labels[category] ?? category;
}
