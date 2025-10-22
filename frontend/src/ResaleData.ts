import { useEffect, useState } from "react";

export interface ResaleData {
  total_sales: number;
  average_price: number;
  latest_month: string;
  max_price: number;
  avg_price_by_flat_type_by_month: Record<string, Record<string, number>>;
  avg_price_by_flat_type_by_town: Record<string, Record<string, number>>;
  flat_type_distribution: Record<string, number>;
}

export interface ApiResponse {
  "status code": number;
  data: ResaleData;
}

// --- plain fetch function ---
async function fetchResaleData(
  town: string,
  flat_type: string
): Promise<ResaleData> {

    console.log("Fetching resale data for", town, flat_type);
    const url = `https://pw5ywy2759.execute-api.ap-southeast-1.amazonaws.com/Stage/process?town=${encodeURIComponent(
    town
    )}&flat_type=${encodeURIComponent(flat_type)}`;

    const res = await fetch(url);
    if (!res.ok) {
    throw new Error(`Failed to fetch resale data: ${res.status}`);
    }
    console.log("Response received");
    const result= await res.json();
    // console.log("Data parsed", result);
    return result;
}

// --- React hook version (self-contained state + effect) ---
export function getResaleData(town: string, flat_type: string) {
  const [data, setData] = useState<ResaleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const resaleData = await fetchResaleData(town, flat_type);
        if (isMounted) {
          setData(resaleData);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [town, flat_type]);

  return { data, loading, error };
}
