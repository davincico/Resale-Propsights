import React, { useMemo, useState } from 'react';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef } from '@mui/x-data-grid/models/colDef';
// import { Box, Typography } from '@mui/material';
// import { useResaleData } from './useResaleData';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {getResaleData} from './ResaleData';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

interface Filters {
  town: string;
  flatType: string;
  maxPrice: number;
}

const defaultFilters: Filters = {
  town: 'all',
  flatType: 'all',
  maxPrice: 2000000,
};

const Dashboard: React.FC = () => {
  // const { data, loading, error } = useResaleData();
  // console.log('Data loaded:', data.length, 'records');
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const { data, loading, error } = getResaleData(filters.town, filters.flatType);
  // Compute filter options
  const towns = ["ANG MO KIO","BEDOK","BISHAN","BUKIT BATOK","BUKIT MERAH","BUKIT PANJANG","BUKIT TIMAH","CENTRAL AREA","CHOA CHU KANG","CLEMENTI","GEYLANG","HOUGANG","JURONG EAST","JURONG WEST","KALLANG/WHAMPOA","MARINE PARADE","PASIR RIS","PUNGGOL","QUEENSTOWN","SEMBAWANG","SENGKANG","SERANGOON","TAMPINES","TOA PAYOH","WOODLANDS","YISHUN"];
  const flatTypes = ['1 ROOM', '2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE', 'MULTI-GENERATION'];
  // const maxSlider = useMemo(() => {
  //   if (data?.total_sales === 0) return 2000000;
  //   return Math.ceil(Math.max(...data.map(d => parseInt(d.resale_price))) / 50000) * 50000;
  // }, [data]);
  const maxSlider = 2000000;

  // Filtered data
  // const filteredData = useMemo(() =>
  //   data.filter(row =>
  //     (!filters.town || row.town === filters.town) &&
  //     (!filters.flatType || row.flat_type === filters.flatType) &&
  //     parseInt(row.resale_price) <= filters.maxPrice
  //   ),
  //   [data, filters]
  // );

  // Chart data: Flat Type Distribution (Pie)
  const flatTypePie = useMemo(() => {
  if (!data?.flat_type_distribution) return { labels: [], datasets: [] };

  const distribution = data.flat_type_distribution;
  // const total = Object.values(distribution).reduce((sum, v) => sum + v, 0);
  const labels = Object.keys(distribution).sort();
  const counts = labels.map(type => distribution[type]);
  const percentages = counts.map(c => ((c / data?.total_sales) * 100).toFixed(1));
  const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#17a2b8'];

  return {
    labels: labels.map((l, i) => `${l} (${percentages[i]}%)`),
    datasets: [
      {
        data: counts,
        backgroundColor: colors.slice(0, labels.length),
      },
    ],
  };
}, [data?.flat_type_distribution]);


  // Stats
  const totalSales = data?.total_sales || 0;
  const avgPrice = totalSales ? Math.round(data?.average_price ?? 0) : 0;
  const latestMonth = data?.latest_month || '-';
  const maxPrice = totalSales ? Math.round(data?.max_price ?? 0) : 0;

  // Chart data: Average resale price by town
  const priceByTown = useMemo(() => {
  if (!data?.avg_price_by_flat_type_by_town) return { labels: [], datasets: [] };

    const townData = data.avg_price_by_flat_type_by_town;

    const filtered_towns = Object.keys(townData).sort(); // X-axis labels
    const filtered_flatTypes = Array.from(
      new Set(filtered_towns.flatMap(t => Object.keys(townData[t])))
    ).sort();

    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#17a2b8'];

    const datasets = filtered_flatTypes.map((ft, i) => ({
      label: ft,
      data: filtered_towns.map(town => Math.round(townData[town][ft] ?? 0)), // 0 if missing
      backgroundColor: colors[i % colors.length],
    }));

    return {
      labels: filtered_towns,
      datasets,
    };
  }, [data?.avg_price_by_flat_type_by_town]);

  // Chart data: Average resale price over time
  const priceOverTime = useMemo(() => {
    if (!data?.avg_price_by_flat_type_by_month) return { labels: [], datasets: [] };

    const flatData = data.avg_price_by_flat_type_by_month;

    // Extract all months across all flat types and sort them
    const months = Array.from(
      new Set(Object.values(flatData).flatMap(d => Object.keys(d)))
    ).sort();

    const filtered_flatTypes = Object.keys(flatData);

    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#17a2b8'];

    const datasets = filtered_flatTypes.map((ft, i) => {
      // Build data with nulls for missing points
      const dataPoints = months.map(month => {
        const val = flatData[ft][month];
        return val !== undefined && val !== null && val !== -1 ? Math.round(val) : null;
      });

      return {
        label: ft,
        data: dataPoints,
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length] + '33',
        fill: true,
        tension: 0.1,
        spanGaps: false, // <-- ensures line breaks at null
        borderDash: dataPoints.includes(null) ? [5, 5] : [], // <-- dashed line if there are nulls
      };
    });

    return {
      labels: months,
      datasets,
    };
  }, [data?.avg_price_by_flat_type_by_month]);



  // Handlers
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: name === 'maxPrice' ? Number(value) : value }));
  };

  return (
    <div>
      <h1>HDB Resale Flat Prices Dashboard (2017 - Present)</h1>
      <p>Interactive insights into Singapore's HDB resale market (~216K rows). Data from <a href="https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc" target="_blank" rel="noopener noreferrer">data.gov.sg</a>.</p>
      {loading && <div>Loading data...</div>}
      {error && <div style={{color: 'red'}}>Error: {error}</div>}
      <div className="filters">
        <label htmlFor="townFilter">Town:</label>
        <select id="townFilter" name="town" value={filters.town} onChange={handleFilterChange}>
          <option value="all">All Towns</option>
          {towns.map(town => <option key={town} value={town}>{town}</option>)}
        </select>
        <label htmlFor="flatTypeFilter">Flat Type:</label>
        <select id="flatTypeFilter" name="flatType" value={filters.flatType} onChange={handleFilterChange}>
          <option value="all">All Types</option>
          {flatTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <label htmlFor="priceRange">Price Range (SGD):</label>
        <input
          type="range"
          id="priceRange"
          name="maxPrice"
          min={0}
          max={maxSlider}
          value={filters.maxPrice}
          step={50000}
        />
        <span id="priceValue">Up to ${filters.maxPrice.toLocaleString()}</span>
      </div>
          // ...existing code...
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Sales</h3>
          <p id="totalSales">{totalSales.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Avg Price</h3>
          <p id="avgPrice">${avgPrice.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Latest Month</h3>
          <p id="latestMonth">{latestMonth}</p>
        </div>
        <div className="stat-card">
          <h3>Highest Price</h3>
          <p id="maxPrice">${maxPrice.toLocaleString()}</p>
        </div>
      </div>
      {/* Chart: Average Resale Price Over Time */}
      <div className="chart-container" style={{ marginTop: 32 }}>
        <h2>Average Resale Price Over Time</h2>
        <Line data={priceOverTime} options={{
          responsive: true,
          plugins: {
            legend: { display: true },
            title: { display: false },
          },
          scales: {
            y: {
              ticks: {
                callback: (tickValue: string | number) => {
                  const n = typeof tickValue === 'number' ? tickValue : parseInt(tickValue);
                  return `$${n.toLocaleString()}`;
                },
              },
            },
          },
        }} />
      </div>

      {/* Chart: Average Resale Price by Town */}
      <div className="chart-container" style={{ marginTop: 32 }}>
        <h2>Avg Resale Price by Town</h2>
        <Bar data={priceByTown} options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: false },
          },
          scales: {
            y: {
              ticks: {
                callback: (tickValue: string | number) => {
                  const n = typeof tickValue === 'number' ? tickValue : parseInt(tickValue);
                  return `$${n.toLocaleString()}`;
                },
              },
            },
          },
        }} />
      </div>

      {/* Chart: Flat Type Distribution (Pie) */}
      <div className="chart-container" style={{ marginTop: 32 }}>
        <h2>Flat Type Distribution</h2>
        <Pie data={flatTypePie} options={{
          responsive: true,
          plugins: {
            legend: { position: 'right' },
            title: { display: false },
          },
        }} />
      </div>

      {/* Recent Transactions Table */}
      {/* <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Recent Transactions (Latest 1000)
        </Typography>
        <div style={{ height: 600, width: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
          <DataGrid
            rows={useMemo(() => {
              return filteredData
                .slice()
                .sort((a, b) => {
                  if (a.month !== b.month) return b.month.localeCompare(a.month);
                  // Ensure resale_price is a number for sorting
                  return parseInt(b.resale_price) - parseInt(a.resale_price);
                })
                .slice(0, 1000)
                .map((row, idx) => ({
                  ...row,
                  id: idx + 1,
                  resale_price: parseInt(row.resale_price),
                  floor_area_sqm: parseFloat(row.floor_area_sqm),
                }));
            }, [filteredData])}
            columns={[
              { field: 'id', headerName: 'ID', width: 70, hide: true },
              { field: 'month', headerName: 'Month', width: 110 },
              { field: 'town', headerName: 'Town', width: 130 },
              { field: 'flat_type', headerName: 'Flat Type', width: 120 },
              { field: 'block', headerName: 'Block', width: 90 },
              { field: 'street_name', headerName: 'Street', width: 160 },
              { field: 'storey_range', headerName: 'Storey Range', width: 120 },
              { field: 'floor_area_sqm', headerName: 'Floor Area (sqm)', width: 140, type: 'number' },
              { field: 'resale_price', headerName: 'Resale Price (SGD)', width: 160, type: 'number',
                valueFormatter: (params: any) => params.value?.toLocaleString('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 })
              },
            ] as GridColDef[]}
            paginationModel={{ pageSize: 20, page: 0 }}
            pageSizeOptions={[20, 50, 100]}
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
            sx={{ fontSize: 14 }}
          />
        </div>
      </Box> */}
    </div>
  );
};

export default Dashboard;