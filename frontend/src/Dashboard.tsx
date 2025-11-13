import React, { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {getResaleData} from './ResaleData';
// import dotenv from 'dotenv';
// dotenv.config();

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
import { Grid } from '@mui/material';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

interface Filters {
  town: string;
  flatType: string;
}

const defaultFilters: Filters = {
  town: 'all',
  flatType: 'all'
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const handleChangeTown = (event: SelectChangeEvent) => {
    // setTown(event.target.value);
    setFilters(f => ({ ...f, town: event.target.value }));
  };

  const handleChangeFlatType = (event: SelectChangeEvent) => {
    // setFlatType(event.target.value);
    setFilters(f => ({ ...f, flatType: event.target.value }));
  };
  const apiId = import.meta.env.VITE_API_ID || '';
  const { data} = getResaleData(filters.town, filters.flatType, apiId);
  // Compute filter options
  const towns = ["ANG MO KIO","BEDOK","BISHAN","BUKIT BATOK","BUKIT MERAH","BUKIT PANJANG","BUKIT TIMAH","CENTRAL AREA","CHOA CHU KANG","CLEMENTI","GEYLANG","HOUGANG","JURONG EAST","JURONG WEST","KALLANG/WHAMPOA","MARINE PARADE","PASIR RIS","PUNGGOL","QUEENSTOWN","SEMBAWANG","SENGKANG","SERANGOON","TAMPINES","TOA PAYOH","WOODLANDS","YISHUN"];
  const flatTypes = ['1 ROOM', '2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE', 'MULTI-GENERATION'];

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

  return (
    <div>
      <Button 
        variant="contained"
        onClick={() => navigate('/premium')}
        sx={{ 
          display: 'block',
          marginLeft: 'auto',
          marginRight: 0,
          marginBottom: 2
        }}
      >
        Premium Version
      </Button>

      <Typography 
        component="h1" 
        variant="h4" 
        sx={{ 
          textAlign: 'left',
          marginBottom: 3,
          fontWeight: 'bold'
        }}
      >
        PropSights: SG Housing At A Glance
      </Typography>
      <div className="filters">
        <Stack
          direction="row"
          sx={{
            display: { xs: 'none', md: 'flex' },
            width: '100%',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            maxWidth: { sm: '100%', md: '1700px' },
            pt: 1.5,
          }}
          spacing={2}
        >
          <Typography component="h1" variant="h6" sx={{ mb: 2 }}>
            Query the Data
          </Typography>
          <Stack direction="row" sx={{ gap: 1, minWidth: 400 }}>
            <FormControl fullWidth>
              <InputLabel>Town</InputLabel>
              <Select
                value={filters.town}
                onChange={handleChangeTown}
                label="Town">
                <MenuItem value='all'>ALL</MenuItem>
                {towns.map(town => (
                  <MenuItem value={town}>{town}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Flat Type</InputLabel>
              <Select
                value={filters.flatType}
                onChange={handleChangeFlatType}
                label="FlatType">
                <MenuItem value='all'>ALL</MenuItem>
                {flatTypes.map(type => (
                  <MenuItem value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
        <Grid
          container
          spacing={2}
          columns={12}
          sx={{ width: '100%', marginTop: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography component="h2" variant="subtitle2">
                    Total Sales
                  </Typography>
                  <Typography component="h3" variant="h4" sx={{ mt: 2, color: "#007bff" }}>
                    {totalSales.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography component="h2" variant="subtitle2">
                    Avg Price
                  </Typography>
                  <Typography component="h3" variant="h4" sx={{ mt: 2, color: "#007bff" }}>
                    {avgPrice.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography component="h2" variant="subtitle2">
                    Latest Month
                  </Typography>
                  <Typography component="h3" variant="h4" sx={{ mt: 2, color: "#007bff" }}>
                    {latestMonth}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography component="h2" variant="subtitle2">
                    Highest Price
                  </Typography>
                  <Typography component="h3" variant="h4" sx={{ mt: 2, color: "#007bff" }}>
                    {maxPrice.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
        </Grid>
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
    </div>
  );
};

export default Dashboard;