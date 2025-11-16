import React, { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {getResaleData, getStats, fetchPrediction} from './ResaleData';
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
  insightType: string;
}

interface predict_query{
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

const defaultPredict: predict_query = {
  flat_type: "1 ROOM",
  storey_range: "01 TO 03",
  remaining_lease_numeric: 0,
  floor_area_sqm: 0,
  flat_model: "Standard",
  town: "ANG MO KIO"
};

const defaultFilters: Filters = {
  town: 'all',
  flatType: 'all',
  insightType: 'Town'
};

const Premium: React.FC = () => {
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

  const handleChangeInsightType = (event: SelectChangeEvent) => {
    // setInsightType(event.target.value);
    setFilters(f => ({ ...f, insightType: event.target.value }));
  }

  const [query, setQuery] = useState<predict_query>(defaultPredict);
  const [isPredicting, setIsPredicting] = useState(false);

  const handleChangeQuery = (field: keyof predict_query) => (event: any) => {
    setQuery(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleNumberInput = (field: 'remaining_lease_numeric' | 'floor_area_sqm') => (event: React.ChangeEvent<HTMLInputElement>) => {
  const value = event.target.value;
  const numValue = parseFloat(value);
  
  if (value === '' || (numValue > 0)) {
    let finalValue = value === '' ? 0 : numValue;
    
    // Add validation for remaining_lease_numeric
    if (field === 'remaining_lease_numeric' && numValue > 99) {
      finalValue = 99; // Cap at 99 years
    }
    
    setQuery(prev => ({
      ...prev,
      [field]: finalValue
    }));
  }
};

  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  // const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    if (!isFormValid) return;
    
    // setLoading(true);
    setError(null);
    setIsPredicting(true);
    
    try {
      const result = await fetchPrediction(query);
      setPredictionData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      // setLoading(false);
      setIsPredicting(false);
    }
  };

  // if (isPredicting && !loading && (data || error)) {
  //   setIsPredicting(false);
  // }

  // const isFormValid = query.flat_type && query.storey_range && query.flat_model && 
  //                    query.town && query.remaining_lease_numeric > 0 && query.floor_area_sqm > 0;
  const { data} = getResaleData(filters.town, filters.flatType);
  const { stats} = getStats();

  // if (isPredicting && !loading && (predictionData || error)) {
  //   setIsPredicting(false);
  // }

  const isFormValid = query.flat_type && query.storey_range && query.flat_model && 
                     query.town && query.remaining_lease_numeric > 0 && query.floor_area_sqm > 0;
  // Compute filter options
  const towns = ["ANG MO KIO","BEDOK","BISHAN","BUKIT BATOK","BUKIT MERAH","BUKIT PANJANG","BUKIT TIMAH","CENTRAL AREA","CHOA CHU KANG","CLEMENTI","GEYLANG","HOUGANG","JURONG EAST","JURONG WEST","KALLANG/WHAMPOA","MARINE PARADE","PASIR RIS","PUNGGOL","QUEENSTOWN","SEMBAWANG","SENGKANG","SERANGOON","TAMPINES","TOA PAYOH","WOODLANDS","YISHUN"];
  const flatTypes = ['1 ROOM', '2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE', 'MULTI-GENERATION'];
  const storey_ranges = ['01 TO 03', '04 TO 06', '07 TO 09', '10 TO 12', '13 TO 15', '16 TO 18', '19 TO 21', '22 TO 24', '25 TO 27', '28 TO 30', '31 TO 33', '34 TO 36', '37 TO 39', '40 TO 42', '43 TO 45', '46 TO 48', '49 TO 51'];
  const flat_models = ['Improved', 'New Generation', 'DBSS', 'Standard', 'Apartment', 'Simplified', 'Model A', 'Premium Apartment', 'Adjoined flat', 'Model A-Maisonette', 'Maisonette', 'Type S1', 'Type S2', 'Model A2', 'Terrace', 'Improved-Maisonette', 'Premium Maisonette', 'Multi Generation', 'Premium Apartment Loft', '2-room', '3Gen'];
  const insight_types = ['Town', 'Flat Model', 'Storey Range', 'Remaining Years', 'Transaction / Year', 'Price per sqm (Violin)', 'Correlation Matrix']
  
    // Map insight types to environment variables
    const insightImageMap = {
      'Town': import.meta.env.VITE_TOWN_URL,
      'Flat Model': import.meta.env.VITE_FLAT_URL,
      'Storey Range': import.meta.env.VITE_STOREY_URL,
      'Remaining Years': import.meta.env.VITE_REMAINING_YEARS_URL,
      'Transaction / Year': import.meta.env.VITE_PER_YEAR_URL,
      'Price per sqm (Violin)': import.meta.env.VITE_PRICE_URL,
      'Correlation Matrix': import.meta.env.VITE_CORR_URL,
    };

// In your component
  const currentImageUrl = insightImageMap[filters.insightType as keyof typeof insightImageMap || 'null'];
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

  const predictionChartData = useMemo(() => {
    if (!predictionData?.data || predictionData.data.length === 0) return { labels: [], datasets: [] };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: predictionData.data.length }, (_, i) => 
      (currentYear + i).toString()
    );

    const dataset = {
      label: 'Predicted Price',
      data: predictionData.data.map(price => Math.round(price)),
      borderColor: '#007bff',
      backgroundColor: '#007bff33',
      borderWidth: 3,
      tension: 0.1,
      fill: false,
    };

    return {
      labels: years,
      datasets: [dataset],
    };
  }, [predictionData]);

  return (
    <div>
      <Button 
        variant="contained"
        onClick={() => navigate('/')}
        sx={{ 
          display: 'block',
          marginLeft: 'auto',
          marginRight: 0,
          marginBottom: 2
        }}
      >
        Free Version
      </Button>

      <Typography 
        component="h1" 
        variant="h4" 
        sx={{ 
          textAlign: 'left',
          marginBottom: 3,
          fontWeight: 'bold',
          color: 'black',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        PropSights: SG Housing At A Glance
        <span style={{ 
          fontSize: '0.6em', 
          backgroundColor: 'gold', 
          color: 'black',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 'bold'
        }}>
          PREMIUM
        </span>
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
            Overall Insights
          </Typography>
          <Stack direction="row" sx={{ gap: 1, minWidth: 400 }}>
            <FormControl fullWidth>
              <InputLabel>Type of Insight</InputLabel>
              <Select
                value={filters.insightType}
                onChange={handleChangeInsightType}
                label="Type of Insight">
                {insight_types.map(type => (
                  <MenuItem value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </div>

      <div className='chart-container' style={{ marginTop: 32}}>
        {currentImageUrl && (
          <Box 
            component="img"
            src={currentImageUrl}
            sx={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 2,
              boxShadow: 2,
              display: 'block',
              margin: '0 auto'
            }}
          />
        )}
      </div>

      <div className='chart-container' style={{ marginTop: 32 }}>

        
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 2 }}>
          <Typography variant="h5" gutterBottom={false}>
            Town Distribution Statistics
          </Typography>
          {stats?.updated_at && (
          <Typography variant="caption" color="text.secondary">
            Updated at {new Date(stats.updated_at).toLocaleString()}
          </Typography>
        )}
        </Box>
        
         <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Rank</strong>
                </TableCell>
                <TableCell>
                  <strong>Town</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Percentage</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats?.town_stats.slice(0, 10).map((townStat, index) => (
                <TableRow key={townStat.town}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{townStat.town}</TableCell>
                  <TableCell align="right">{townStat.percent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <div className="filters" style={{ marginTop: 32 }}>
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

      <div className="filters" style={{ marginTop: 32 }}>
        <Stack spacing={3} sx={{ mt: 4, mb: 3 }}>
          {/* Heading - now inside the Stack and at the top */}
          <Typography 
            variant="h4" 
            component="h2" 
            align="center" 
            sx={{ 
              mb: 2
            }}
          >
            HDB Price Forecast
          </Typography>

          {/* First row: Dropdowns only */}
          <Stack 
            direction="row"
            spacing={3}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 3
            }}
          >
            {/* Town Dropdown */}
            <FormControl fullWidth>
              <InputLabel>Town</InputLabel>
              <Select
                value={query.town}
                onChange={handleChangeQuery('town')}
                label="Town"
              >
                {towns.map(town => (
                  <MenuItem key={town} value={town}>{town}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Flat Type Dropdown */}
            <FormControl fullWidth>
              <InputLabel>Flat Type</InputLabel>
              <Select
                value={query.flat_type}
                onChange={handleChangeQuery('flat_type')}
                label="Flat Type"
              >
                {flatTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Storey Range Dropdown */}
            <FormControl fullWidth>
              <InputLabel>Storey Range</InputLabel>
              <Select
                value={query.storey_range}
                onChange={handleChangeQuery('storey_range')}
                label="Storey Range"
              >
                {storey_ranges.map(range => (
                  <MenuItem key={range} value={range}>{range}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Flat Model Dropdown */}
            <FormControl fullWidth>
              <InputLabel>Flat Model</InputLabel>
              <Select
                value={query.flat_model}
                onChange={handleChangeQuery('flat_model')}
                label="Flat Model"
              >
                {flat_models.map(model => (
                  <MenuItem key={model} value={model}>{model}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Second row: Number inputs and button */}
          <Stack 
            direction="row"
            spacing={3}
            alignItems="flex-end"
          >
            {/* Remaining Lease (Number Input) */}
            <TextField
              fullWidth
              label="Remaining Lease (years)"
              type="number"
              inputProps={{ min: "1", step: "1" }}
              value={query.remaining_lease_numeric || ''}
              onChange={handleNumberInput('remaining_lease_numeric')}
              placeholder="Enter years"
            />

            {/* Floor Area (Number Input) */}
            <TextField
              fullWidth
              label="Floor Area (sqm)"
              type="number"
              inputProps={{ min: "1", step: "0.1" }}
              value={query.floor_area_sqm || ''}
              onChange={handleNumberInput('floor_area_sqm')}
              placeholder="Enter square meters"
            />

            {/* Predict Button */}
            <Button
              variant="contained"
              onClick={handlePredict}
              disabled={!isFormValid || isPredicting}
              size="large"
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '16px',
                fontWeight: 'bold',
                minWidth: '140px'
              }}
            >
              {isPredicting ? 'Predicting...' : 'Predict Price'}
            </Button>
          </Stack>
        </Stack>
      </div>

      {/* Error and Chart placed outside in separate container */}
      <div className="chart-container">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {predictionData?.data && (
          <div style={{ marginTop: 32 }}>
            <h2>Price Prediction Over Next 5 Years</h2>
            <Line 
              data={predictionChartData} 
              options={{
                responsive: true,
                plugins: {
                  legend: { display: true },
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
                  x: {
                    title: {
                      display: true,
                      text: 'Year'
                    }
                  }
                },
              }} 
            />
          </div>
        )}
      </div>

      </div>
    
  );
};

export default Premium;