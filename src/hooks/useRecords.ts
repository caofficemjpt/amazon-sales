import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ConsolidatedRecord } from '../types';

/** Supabase default page size */
const PAGE_SIZE = 1000;

interface UseRecordsResult {
  records: ConsolidatedRecord[];
  loading: boolean;
  error: string | null;
}

/** Cache keyed by periodId */
const recordCache = new Map<string, ConsolidatedRecord[]>();

/**
 * Fetches all consolidated records for the given period.
 * Uses range-based pagination (1000 rows per page) to handle large datasets.
 * Results are cached in memory — if the same periodId is requested again, serves from cache.
 */
export function useRecords(periodId: string | null): UseRecordsResult {
  const [records, setRecords] = useState<ConsolidatedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const fetchAll = useCallback(async (id: string) => {
    // Serve from cache if available
    if (recordCache.has(id)) {
      setRecords(recordCache.get(id)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current = false;

    const allRows: ConsolidatedRecord[] = [];

    try {
      let periodIds: string[] = [id];

      // Handle YTD virtual period
      if (id.startsWith('YTD_')) {
        const year = parseInt(id.split('_')[1], 10);
        const { data: matchingPeriods, error: periodsError } = await supabase
          .from('periods')
          .select('id')
          .eq('year', year);

        if (periodsError) throw new Error(periodsError.message);
        periodIds = (matchingPeriods ?? []).map((p) => p.id);
        
        if (periodIds.length === 0) {
          if (!abortRef.current) {
            setRecords([]);
            setLoading(false);
          }
          return;
        }
      }

      // Get count first
      const { count, error: countError } = await supabase
        .from('consolidated_records')
        .select('*', { count: 'exact', head: true })
        .in('period_id', periodIds);

      if (countError) throw new Error(countError.message);

      const totalCount = count ?? 0;
      if (totalCount > 0) {
        const pages = Math.ceil(totalCount / PAGE_SIZE);
        const promises = Array.from({ length: pages }, (_, i) => {
          const fromOffset = i * PAGE_SIZE;
          return supabase
            .from('consolidated_records')
            .select('*')
            .in('period_id', periodIds)
            .range(fromOffset, fromOffset + PAGE_SIZE - 1);
        });

        const responses = await Promise.all(promises);
        for (const res of responses) {
          if (res.error) throw new Error(res.error.message);
          allRows.push(...((res.data ?? []) as ConsolidatedRecord[]));
        }
      }

      if (!abortRef.current) {
        recordCache.set(id, allRows);
        setRecords(allRows);
      }
    } catch (err) {
      if (!abortRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch records';
        setError(msg);
      }
    } finally {
      if (!abortRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!periodId) {
      setRecords([]);
      setLoading(false);
      setError(null);
      return;
    }

    void fetchAll(periodId);

    return () => {
      abortRef.current = true;
    };
  }, [periodId, fetchAll]);

  return { records, loading, error };
}

/** Clears cache for a specific period (call after re-upload) */
export function invalidateRecordsCache(periodId: string): void {
  recordCache.delete(periodId);
}

/** Clears entire cache */
export function clearRecordsCache(): void {
  recordCache.clear();
}
