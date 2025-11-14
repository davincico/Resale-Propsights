import { useEffect, useState } from "react";

interface PredictionParams {
  flat_type: string;
  storey_range: string;
  remaining_lease_numeric: number;
  floor_area_sqm: number;
  flat_model: string;
  town: string;
}

interface PredictionResponse {
  data: number[]; // preds.tolist() returns an array of numbers
}

export interface ResaleData {
  total_sales: number;
  average_price: number;
  latest_month: string;
  max_price: number;
  avg_price_by_flat_type_by_month: Record<string, Record<string, number>>;
  avg_price_by_flat_type_by_town: Record<string, Record<string, number>>;
  flat_type_distribution: Record<string, number>;
}

export interface TownStat {
  town: string;
  percent: number;
}

export interface EDASummary {
  updated_at: string;
  source_key: string;
  n_rows: number;
  n_cols: number;
  preview_cols: string[];
  town_stats: TownStat[];
}


// export interface ApiResponse {
//   "status code": number;
//   data: ResaleData;
// }

// --- plain fetch function ---
async function fetchResaleData(
  town: string,
  flat_type: string
): Promise<ResaleData> {

  console.log("Fetching resale data for", town, flat_type);
  const url = `https://${import.meta.env.VITE_API_ID}.execute-api.ap-southeast-1.amazonaws.com/Stage/process?town=${encodeURIComponent(
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
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        // setLoading(true);
        const resaleData = await fetchResaleData(town, flat_type);
        if (isMounted) {
          setData(resaleData);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to fetch resale data:", err);
        }
      } 
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [town, flat_type]);

  return { data};
}

export function getStats(){
  const [stats, setStats] = useState<EDASummary | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        // setLoading(true);
        const res = await fetch(import.meta.env.VITE_EDA);
        if (isMounted) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to fetch EDA summary:", err);
        }
      }
    };
    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);
  return { stats};
}

export async function fetchPrediction(
  params: PredictionParams
): Promise<PredictionResponse> {
  console.log("Fetching prediction for", params);
  
  const url = `https://${import.meta.env.VITE_PREDICT_API_ID}.execute-api.ap-southeast-1.amazonaws.com/Prod/predict`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch prediction: ${res.status}`);
  }
  
  console.log("Prediction response received");
  const result = await res.json();
  
  // The response has a `data` field containing the predictions array
  return result;
}

export function getPrediction(
  params: PredictionParams,
  trigger: number
) {
  const [predictionData, setData] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  console.log("getPrediction called with params:", params, "trigger:", trigger);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const predictionData = await fetchPrediction(params);
        if (isMounted) {
          setData(predictionData);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to fetch prediction:", err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Only fetch if all required parameters are provided
    if (params.town && params.flat_type && params.flat_model) {
      load();
    }

    return () => {
      isMounted = false;
    };
  }, [params, trigger]);

  return { predictionData, loading, error };
}