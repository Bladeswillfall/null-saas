'use client';

import { useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
 * Types for the IP leaderboard table
 * ─────────────────────────────────────────────────────────────────────────────*/
export type MediaFilter =
  | 'all'
  | 'book'
  | 'comic'
  | 'manga'
  | 'manhwa'
  | 'manhua'
  | 'web_comic'
  | 'indie_comic'
  | 'web_novel';

export type MovementDirection = 'up' | 'down' | 'neutral';

export interface IPLeaderboardRow {
  id: string;
  platformCode: string;
  medium: MediaFilter;
  title: string;
  creators: string[];
  publisher: string;
  rank: number;
  movement: MovementDirection;
  rating: number;
  genres: string[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Placeholder data generator (to be replaced with real Supabase queries)
 * ─────────────────────────────────────────────────────────────────────────────*/
const PLACEHOLDER_CREATORS = [
  'Robert Jordan',
  'Martha Wells',
  'Neil Gaiman',
  'Robin Hobb',
  'N. K. Jemisin',
  'Ken Liu',
  'V. E. Schwab',
  'R. F. Kuang',
  'Terry Pratchett',
  'Brandon Sanderson',
  'Leigh Bardugo',
  'Pat Rothfuss',
];

const PLACEHOLDER_PUBLISHERS = [
  'Publisher 1',
  'Publisher 2',
  'Publisher 3',
  'Publisher 4',
  'Publisher 5',
];

const PLACEHOLDER_GENRES = [
  'Adventure',
  'Thriller',
  'Romance',
  'Mystery',
  'Historical',
  'Horror',
  'Young Adult',
  'Science Fiction',
  'Fantasy',
  'Non-Fiction',
];

const MEDIUM_LABELS: Record<MediaFilter, string> = {
  all: 'All',
  book: 'Book',
  comic: 'Comic',
  manga: 'Manga',
  manhwa: 'Manhwa',
  manhua: 'Manhua',
  web_comic: 'Web com',
  indie_comic: 'Indie Co',
  web_novel: 'Web Nov',
};

function generatePlaceholderData(): IPLeaderboardRow[] {
  const mediums: MediaFilter[] = [
    'manhua',
    'indie_comic',
    'manhwa',
    'web_comic',
    'comic',
    'manga',
    'web_novel',
  ];
  const movements: MovementDirection[] = ['up', 'down', 'neutral'];

  return Array.from({ length: 20 }, (_, i) => {
    const creatorCount = Math.floor(Math.random() * 3) + 1;
    const creatorIndices = Array.from(
      { length: creatorCount },
      () => Math.floor(Math.random() * PLACEHOLDER_CREATORS.length)
    );
    const genreCount = Math.floor(Math.random() * 3) + 1;
    const genreIndices = Array.from(
      { length: genreCount },
      () => Math.floor(Math.random() * PLACEHOLDER_GENRES.length)
    );

    return {
      id: `ip-${i + 1}`,
      platformCode: i < 5 ? ['-', 'A', 'G', 'N', 'B'][i] : '+',
      medium: mediums[Math.floor(Math.random() * mediums.length)],
      title: `Book Title ${i + 1}`,
      creators: [...new Set(creatorIndices.map((idx) => PLACEHOLDER_CREATORS[idx]))],
      publisher: PLACEHOLDER_PUBLISHERS[Math.floor(Math.random() * PLACEHOLDER_PUBLISHERS.length)],
      rank: i + 1,
      movement: movements[Math.floor(Math.random() * movements.length)],
      rating: Number((3 + Math.random() * 2).toFixed(1)),
      genres: [...new Set(genreIndices.map((idx) => PLACEHOLDER_GENRES[idx]))],
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Subcomponents (kept under 150 lines each)
 * ─────────────────────────────────────────────────────────────────────────────*/
function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ip-filter-btn${active ? ' ip-filter-btn--active' : ''}`}
    >
      {label}
    </button>
  );
}

function MediumBadge({ medium }: { medium: MediaFilter }) {
  const label = MEDIUM_LABELS[medium] || medium;
  return <span className="ip-medium-badge">{label}</span>;
}

function CreatorTags({ creators }: { creators: string[] }) {
  const visibleCreators = creators.slice(0, 2);
  const overflow = creators.length - 2;

  return (
    <div className="ip-creator-tags">
      {visibleCreators.map((creator) => (
        <span key={creator} className="ip-creator-tag">
          {creator}
        </span>
      ))}
      {overflow > 0 && <span className="ip-creator-overflow">+{overflow}</span>}
    </div>
  );
}

function MovementIndicator({ direction }: { direction: MovementDirection }) {
  const className = `ip-movement ip-movement--${direction}`;
  const symbol = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■';
  return <span className={className}>{symbol}</span>;
}

function GenreTags({ genres }: { genres: string[] }) {
  const visibleGenres = genres.slice(0, 2);
  const overflow = genres.length - 2;

  return (
    <div className="ip-genre-tags">
      {visibleGenres.map((genre) => (
        <span key={genre} className="ip-genre-tag">
          {genre}
        </span>
      ))}
      {overflow > 0 && <span className="ip-genre-overflow">...</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Main IP Leaderboard Table Component
 * ─────────────────────────────────────────────────────────────────────────────*/
interface IPLeaderboardTableProps {
  /** Optional real data from Supabase — falls back to placeholder if empty */
  data?: IPLeaderboardRow[];
  /** Called when filter changes, parent can use this to refetch from Supabase */
  onFilterChange?: (filter: MediaFilter) => void;
}

export function IPLeaderboardTable({ data, onFilterChange }: IPLeaderboardTableProps) {
  const [activeFilter, setActiveFilter] = useState<MediaFilter>('all');

  // Use provided data or generate placeholder
  const rows = data && data.length > 0 ? data : generatePlaceholderData();

  // Filter rows client-side (in production, this would be server-side)
  const filteredRows =
    activeFilter === 'all' ? rows : rows.filter((row) => row.medium === activeFilter);

  const handleFilterChange = (filter: MediaFilter) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  };

  const filters: { key: MediaFilter; label: string }[] = [
    { key: 'book', label: 'Book' },
    { key: 'comic', label: 'Comic' },
    { key: 'manga', label: 'Manga' },
    { key: 'manhwa', label: 'Manhwa' },
    { key: 'manhua', label: 'Manhua' },
    { key: 'web_comic', label: 'Web comic' },
    { key: 'indie_comic', label: 'Indie Comic' },
    { key: 'web_novel', label: 'Web Novel' },
  ];

  return (
    <div className="ip-leaderboard">
      {/* Filter bar */}
      <div className="ip-filter-bar">
        {filters.map((f) => (
          <FilterButton
            key={f.key}
            label={f.label}
            active={activeFilter === f.key}
            onClick={() => handleFilterChange(f.key)}
          />
        ))}
      </div>

      {/* Table */}
      <div className="ip-table-wrap">
        <table className="ip-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Medium</th>
              <th>IP Title</th>
              <th>Creator</th>
              <th>Publisher</th>
              <th>Rank</th>
              <th>Move</th>
              <th>Rating</th>
              <th>Genre tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="ip-platform-code">{row.platformCode}</span>
                </td>
                <td>
                  <MediumBadge medium={row.medium} />
                </td>
                <td className="ip-title-cell">{row.title}</td>
                <td>
                  <CreatorTags creators={row.creators} />
                </td>
                <td>{row.publisher}</td>
                <td className="ip-rank-cell">#{row.rank}</td>
                <td>
                  <MovementIndicator direction={row.movement} />
                </td>
                <td className="ip-rating-cell">{row.rating.toFixed(1)}</td>
                <td>
                  <GenreTags genres={row.genres} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
