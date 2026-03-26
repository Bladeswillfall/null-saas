'use client';

import { IPLeaderboardTable, type IPLeaderboardEntry } from './ip-leaderboard-table';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';

interface IPLeaderboardPreviewProps {
  organizationId: string | null;
}

export function IPLeaderboardPreview({ organizationId }: IPLeaderboardPreviewProps) {
  const [category, setCategory] = useState<string>('all');

  const { data: response, isLoading } = trpc.leaderboard.listIps.useQuery(
    {
      organizationId: organizationId ?? '',
      window: '1w',
      category: category as 'all' | 'book' | 'comic' | 'manga' | 'manhwa' | 'manhua' | 'webcomic' | 'indie_comic' | 'web_novel',
      limit: 20,
    },
    { enabled: Boolean(organizationId) }
  );

  const rows: IPLeaderboardEntry[] =
    response?.status === 'ready'
      ? response.data.map((row) => ({
          ipId: row.ipId,
          name: row.name,
          slug: row.slug,
          primaryCategory: row.primaryCategory,
          compositeScore: row.compositeScore,
          momentumScore: row.momentumScore,
          confidenceScore: row.confidenceScore,
          rankOverall: row.rankOverall,
          rankDelta: row.rankDelta,
          activeWorkCount: row.activeWorkCount,
          strongestCategory: row.strongestCategory,
          latestScoreDate: row.latestScoreDate,
        }))
      : [];

  const handleFilterChange = (filter: string) => {
    setCategory(filter);
  };

  return (
    <IPLeaderboardTable
      data={rows}
      isLoading={isLoading}
      onFilterChange={handleFilterChange}
      activeFilter={category}
    />
  );
}
