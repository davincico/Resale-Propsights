import React, { useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid/models/colDef';
import { Box, Typography } from '@mui/material';
import { useResaleData } from './useResaleData';
import { Line, Bar, Pie } from 'react-chartjs-2';
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
  town: '',
  flatType: '',
  maxPrice: 2000000,
};

const Dashboard: React.FC = () => {
  const { data, loading, error } = useResaleData();
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  // Compute filter options
  const towns = useMemo(() => Array.from(new Set(data.map(d => d.town))).sort(), [data]);
  const flatTypes = useMemo(() => Array.from(new Set(data.map(d => d.flat_type))).sort(), [data]);
  const maxSlider = useMemo(() => {
    if (data.length === 0) return 2000000;
    return Math.ceil(Math.max(...data.map(d => parseInt(d.resale_price))) / 50000) * 50000;
  }, [data]);

  // Filtered data
  const filteredData = useMemo(() =>
    data.filter(row =>
      (!filters.town || row.town === filters.town) &&
      (!filters.flatType || row.flat_type === filters.flatType) &&
      parseInt(row.resale_price) <= filters.maxPrice
    ),
    [data, filters]
  );

  // Chart data: Flat Type Distribution (Pie)
  const flatTypePie = useMemo(() => {
    const flatData: Record<string, number> = {};
    filteredData.forEach(row => {
      const type = row.flat_type;
      flatData[type] = (flatData[type] || 0) + 1;
    });
    const total = filteredData.length;
    const labels = Object.keys(flatData).sort();
    const counts = labels.map(type => flatData[type]);
    const percentages = counts.map(c => ((c / total) * 100).toFixed(1));
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
  }, [filteredData]);

  // Stats
  const totalSales = filteredData.length;
  const avgPrice = totalSales ? Math.round(filteredData.reduce((sum, d) => sum + parseInt(d.resale_price), 0) / totalSales) : 0;
  const latestMonth = filteredData.length ? filteredData.slice().sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())[0].month : '-';
  const maxPrice = filteredData.length ? Math.max(...filteredData.map(d => parseInt(d.resale_price))) : 0;

  // Chart data: Average resale price by town
  const priceByTown = useMemo(() => {
    const townData: Record<string, { total: number; count: number }> = {};
    filteredData.forEach(row => {
      const town = row.town;
      const price = parseInt(row.resale_price);
      if (!townData[town]) townData[town] = { total: 0, count: 0 };
      townData[town].total += price;
      townData[town].count += 1;
    });
    const labels = Object.keys(townData).sort((a, b) => {
      const avgA = townData[a].total / townData[a].count;
      const avgB = townData[b].total / townData[b].count;
      return avgB - avgA;
    });
    const prices = labels.map(town => Math.round(townData[town].total / townData[town].count));
    return {
      labels,
      datasets: [
        {
          label: 'Avg Price (SGD)',
          data: prices,
          backgroundColor: '#007bff',
        },
      ],
    };
  }, [filteredData]);

  // Chart data: Average resale price over time
  const priceOverTime = useMemo(() => {
    const monthly: Record<string, { total: number; count: number }> = {};
    filteredData.forEach(row => {
      const month = row.month;
      const price = parseInt(row.resale_price);
      if (!monthly[month]) monthly[month] = { total: 0, count: 0 };
      monthly[month].total += price;
      monthly[month].count += 1;
    });
    const labels = Object.keys(monthly).sort();
    const prices = labels.map(month => Math.round(monthly[month].total / monthly[month].count));
    return {
      labels,
      datasets: [
        {
          label: 'Avg Resale Price (SGD)',
          data: prices,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          fill: true,
          tension: 0.1,
        },
      ],
    };
  }, [filteredData]);

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
          <option value="">All Towns</option>
          {towns.map(town => <option key={town} value={town}>{town}</option>)}
        </select>
        <label htmlFor="flatTypeFilter">Flat Type:</label>
        <select id="flatTypeFilter" name="flatType" value={filters.flatType} onChange={handleFilterChange}>
          <option value="">All Types</option>
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
          onChange={handleFilterChange}
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
      <Box mt={4}>
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
      </Box>
    </div>
  );
};

export default Dashboard;