import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SettlementFee } from '../types';

/** Supabase default page size */
const PAGE_SIZE = 1000;

interface UseFeesResult {
  fees: SettlementFee[];
  loading: boolean;
  error: string | null;
}

/** Cache keyed by periodId */
const feeCache = new Map<string, SettlementFee[]>();

/**
 * Fetches all settlement fees for the given period.
 * Uses range-based pagination to handle large datasets (~94,000 rows).
 * Results are cached in memory.
 */
export function useFees(periodId: string | null): UseFeesResult {
  const [fees, setFees] = useState<SettlementFee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const fetchAll = useCallback(async (id: string) => {
    // Serve from cache if available
    if (feeCache.has(id)) {
      setFees(feeCache.get(id)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current = false;

    const allRows: SettlementFee[] = [];

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
            setFees([]);
            setLoading(false);
          }
          return;
        }
      }

      // Get count first
      const { count, error: countError } = await supabase
        .from('settlement_fees')
        .select('*', { count: 'exact', head: true })
        .in('period_id', periodIds);

      if (countError) throw new Error(countError.message);

      const totalCount = count ?? 0;
      if (totalCount > 0) {
        const pages = Math.ceil(totalCount / PAGE_SIZE);
        const promises = Array.from({ length: pages }, (_, i) => {
          const fromOffset = i * PAGE_SIZE;
          return supabase
            .from('settlement_fees')
            .select('order_id, sku, fee_type, fee_amount')
            .in('period_id', periodIds)
            .range(fromOffset, fromOffset + PAGE_SIZE - 1);
        });

        const responses = await Promise.all(promises);
        for (const res of responses) {
          if (res.error) throw new Error(res.error.message);
          allRows.push(...((res.data ?? []) as SettlementFee[]));
        }
      }

      if (!abortRef.current) {
        feeCache.set(id, allRows);
        setFees(allRows);
      }
    } catch (err) {
      if (!abortRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch fees';
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
      setFees([]);
      setLoading(false);
      setError(null);
      return;
    }

    void fetchAll(periodId);

    return () => {
      abortRef.current = true;
    };
  }, [periodId, fetchAll]);

  return { fees, loading, error };
}

/** Clears cache for a specific period */
export function invalidateFeesCache(periodId: string): void {
  feeCache.delete(periodId);
}

/** Clears entire cache */
export function clearFeesCache(): void {
  feeCache.clear();
}
