const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
const API_BASE = 'https://data.gov.sg/api/action/datastore_search';
let allData = [];
let priceChart = null;
let townChart = null;
let flatTypeChart = null;
let table = null;

// Fetch full dataset with pagination
async function fetchFullDataset() {
    const limit = 100; // API limit per request
    let offset = 0;
    let total = Infinity;
    allData = [];
    toggleLoading(true, 'Fetching full dataset (~216K rows, please wait)...');

    while (offset < total) {
        try {
            const url = `${API_BASE}?resource_id=${RESOURCE_ID}&limit=${limit}&offset=${offset}`;
            const response = await fetch(url);
            const result = await response.json();
            if (!result.success) throw new Error('API query failed');
            allData.push(...result.result.records);
            total = result.result.total;
            offset += limit;
            document.getElementById('loading').textContent = `Fetched ${allData.length}/${total} records...`;
        } catch (error) {
            console.error('Fetch error:', error);
            if (confirm('Failed to fetch data. Retry?')) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            } else {
                throw error;
            }
        }
    }
}

// Show/Hide loading
function toggleLoading(show, message = 'Loading data...') {
    const loading = document.getElementById('loading');
    loading.textContent = message;
    loading.style.display = show ? 'block' : 'none';
}

// Fetch on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await fetchFullDataset();
        initDashboard();
    } catch (error) {
        console.error('Error initializing:', error);
        alert('Failed to load full dataset. Check console.');
        toggleLoading(false);
    }
});

// Initialize
function initDashboard() {
    populateFilters();
    updateDashboard(getFilters());
    setupEventListeners();
}

// Get current filters
function getFilters() {
    return {
        town: document.getElementById('townFilter').value,
        flatType: document.getElementById('flatTypeFilter').value,
        maxPrice: parseInt(document.getElementById('priceRange').value)
    };
}

// Populate dropdowns
function populateFilters() {
    const towns = [...new Set(allData.map(d => d.town))].sort();
    const flatTypes = [...new Set(allData.map(d => d.flat_type))].sort();

    const townSelect = document.getElementById('townFilter');
    towns.forEach(town => {
        const option = document.createElement('option');
        option.value = town;
        option.textContent = town;
        townSelect.appendChild(option);
    });

    const flatTypeSelect = document.getElementById('flatTypeFilter');
    flatTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        flatTypeSelect.appendChild(option);
    });

    // Set price slider max
    const maxPrice = Math.max(...allData.map(d => parseInt(d.resale_price)));
    const maxSlider = Math.ceil(maxPrice / 50000) * 50000;
    const priceRange = document.getElementById('priceRange');
    priceRange.max = maxSlider;
    priceRange.value = maxSlider;
    document.getElementById('priceValue').textContent = `Up to $${maxSlider.toLocaleString()}`;
}

// Update dashboard with filters
function updateDashboard(filters) {
    toggleLoading(true);
    try {
        const filteredData = allData.filter(row => (
            (!filters.town || row.town === filters.town) &&
            (!filters.flatType || row.flat_type === filters.flatType) &&
            parseInt(row.resale_price) <= filters.maxPrice
        ));

        updateStats(filteredData);
        renderPriceChart(filteredData);
        renderTownChart(filteredData);
        renderFlatTypeChart(filteredData);
        renderTable(filteredData);
    } finally {
        toggleLoading(false);
    }
}

// Update stats cards
function updateStats(data) {
    const totalSales = data.length;
    const avgPrice = data.length ? Math.round(data.reduce((sum, d) => sum + parseInt(d.resale_price), 0) / totalSales) : 0;
    const latestMonth = data.sort((a, b) => new Date(b.month) - new Date(a.month))[0]?.month || '-';
    const maxPrice = data.length ? Math.max(...data.map(d => parseInt(d.resale_price))) : 0;

    document.getElementById('totalSales').textContent = totalSales.toLocaleString();
    document.getElementById('avgPrice').textContent = `$${avgPrice.toLocaleString()}`;
    document.getElementById('latestMonth').textContent = latestMonth;
    document.getElementById('maxPrice').textContent = `$${maxPrice.toLocaleString()}`;
}

// Render price over time (line)
function renderPriceChart(data) {
    const monthlyData = {};
    data.forEach(row => {
        const month = row.month;
        const price = parseInt(row.resale_price);
        if (!monthlyData[month]) monthlyData[month] = { total: 0, count: 0 };
        monthlyData[month].total += price;
        monthlyData[month].count += 1;
    });

    const labels = Object.keys(monthlyData).sort();
    const prices = labels.map(month => Math.round(monthlyData[month].total / monthlyData[month].count));

    const ctx = document.getElementById('priceChart').getContext('2d');
    if (priceChart) priceChart.destroy();
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{ label: 'Avg Resale Price (SGD)', data: prices, borderColor: '#007bff', backgroundColor: 'rgba(0, 123, 255, 0.1)', fill: true, tension: 0.1 }]
        },
        options: { responsive: true, scales: { y: { ticks: { callback: v => `$${v.toLocaleString()}` } } } }
    });
}

// Render avg price by town (bar)
function renderTownChart(data) {
    const townData = {};
    data.forEach(row => {
        const town = row.town;
        const price = parseInt(row.resale_price);
        if (!townData[town]) townData[town] = { total: 0, count: 0 };
        townData[town].total += price;
        townData[town].count += 1;
    });

    const labels = Object.keys(townData).sort((a, b) => townData[b].total / townData[b].count - townData[a].total / townData[a].count);
    const prices = labels.map(town => Math.round(townData[town].total / townData[town].count));

    const ctx = document.getElementById('townChart').getContext('2d');
    if (townChart) townChart.destroy();
    townChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'Avg Price (SGD)', data: prices, backgroundColor: '#007bff' }]
        },
        options: { responsive: true, scales: { y: { ticks: { callback: v => `$${v.toLocaleString()}` } } }, plugins: { legend: { display: false } } }
    });
}

// Render flat type distribution (pie)
function renderFlatTypeChart(data) {
    const flatData = {};
    data.forEach(row => {
        const type = row.flat_type;
        flatData[type] = (flatData[type] || 0) + 1;
    });

    const total = data.length;
    const labels = Object.keys(flatData).sort();
    const counts = labels.map(type => flatData[type]);
    const percentages = counts.map(c => ((c / total) * 100).toFixed(1));
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#17a2b8'];

    const ctx = document.getElementById('flatTypeChart').getContext('2d');
    if (flatTypeChart) flatTypeChart.destroy();
    flatTypeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map((l, i) => `${l} (${percentages[i]}%)`),
            datasets: [{ data: counts, backgroundColor: colors.slice(0, labels.length) }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });
}

// Render table (latest 1000)
function renderTable(data) {
    const tableBody = document.querySelector('#salesTable tbody');
    tableBody.innerHTML = '';
    data.slice(-1000).reverse().forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.month}</td>
            <td>${row.town}</td>
            <td>${row.flat_type}</td>
            <td>${row.block}</td>
            <td>${row.street_name}</td>
            <td>${row.storey_range}</td>
            <td>${row.floor_area_sqm}</td>
            <td>$${parseInt(row.resale_price).toLocaleString()}</td>
        `;
        tableBody.appendChild(tr);
    });

    if (table) table.destroy();
    table = $('#salesTable').DataTable({
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        lengthChange: false,
        pageLength: 10
    });
}

// Event listeners
function setupEventListeners() {
    document.getElementById('updateFilters').addEventListener('click', () => updateDashboard(getFilters()));
    document.getElementById('priceRange').addEventListener('input', (e) => {
        document.getElementById('priceValue').textContent = `Up to $${e.target.value.toLocaleString()}`;
    });
}