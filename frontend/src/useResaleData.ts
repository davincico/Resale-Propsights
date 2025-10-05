import { useEffect, useState } from 'react';

export interface ResaleRecord {
  month: string;
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: string;
  resale_price: string;
}

export interface UseResaleDataResult {
  data: ResaleRecord[];
  loading: boolean;
  error: string | null;
}

const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
const API_BASE = 'https://data.gov.sg/api/action/datastore_search';

export function useResaleData(): UseResaleDataResult {
  const [data, setData] = useState<ResaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      let all: ResaleRecord[] = [];
      let offset = 0;
      let total = Infinity;
      const limit = 1000;
      try {
        while (offset < total) {
          const url = `${API_BASE}?resource_id=${RESOURCE_ID}&limit=${limit}&offset=${offset}`;
          const response = await fetch(url);
          const result = await response.json();
          if (!result.success) throw new Error('API query failed');
          all = all.concat(result.result.records);
          total = result.result.total;
          offset += limit;
          if (cancelled) return;
        }
        if (!cancelled) setData(all);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
