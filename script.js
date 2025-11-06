const API_URL = 'https://script.google.com/macros/s/AKfycbw0v5iCUWXB_tAokshSc-yJh4ml0a_HMVLtYHT9JrlquB0p8HqIyAQ6XzhfMvMFHqeI/exec';

// Outage type classification codes
const OUTAGE_CODES = {
    "Momentary outage": "A",
    "Sustained fault trip": "B", 
    "Grid failure outage": "C",
    "Planned shutdown outage": "D",
    "Emergency shutdown outage": "E"
};

// Chart colors for bar charts
const BAR_CHART_COLORS = {
    frequency: '#2E7D32', // Dark Green
    duration: '#D1D100'   // Yellow-Green
};

// Chart instances
let outageTypeChart, dzongkhagChart;
let availableMonths = [];
let currentSelectedMonth = '';

// Initialize dashboard
async function initDashboard() {
    try {
        showLoading();
        console.log('🔄 Initializing dashboard...');
        
        // Load available months first
        await loadAvailableMonths();
        
        // Setup month selector change event
        setupMonthSelector();
        
        // Load initial data
        await loadInitialData();
        
        hideLoading();
        
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        console.log('Falling back to sample data...');
        loadSampleData();
        hideLoading();
    }
}

// Load available months from API
async function loadAvailableMonths() {
    try {
        console.log('📅 Loading available months...');
        const monthsData = await fetchWithJSONP('available-months');
        
        if (monthsData && monthsData.success && monthsData.months && monthsData.months.length > 0) {
            availableMonths = monthsData.months;
            populateMonthSelector(availableMonths);
            console.log('✅ Available months loaded:', availableMonths);
        } else {
            throw new Error('No months data available');
        }
    } catch (error) {
        console.error('❌ Error loading months:', error);
        // Generate sample months if API fails
        generateSampleMonths();
    }
}

// Populate month selector dropdown
function populateMonthSelector(months) {
    const monthSelect = document.getElementById('monthSelect');
    monthSelect.innerHTML = '';
    
    // Sort months in descending order (newest first)
    const sortedMonths = months.sort().reverse();
    
    sortedMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = formatMonthDisplay(month);
        monthSelect.appendChild(option);
    });
    
    // Set default to current month or first available month
    const currentMonth = getCurrentMonth();
    const defaultMonth = sortedMonths.includes(currentMonth) ? currentMonth : sortedMonths[0];
    monthSelect.value = defaultMonth;
    currentSelectedMonth = defaultMonth;
    
    console.log('📅 Month selector populated with', sortedMonths.length, 'months');
}

// Format month for display (e.g., "2024-01" -> "January 2024")
function formatMonthDisplay(monthString) {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Get current month in YYYY-MM format
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Generate sample months for fallback
function generateSampleMonths() {
    const months = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push(month);
    }
    
    availableMonths = months;
    populateMonthSelector(availableMonths);
    console.log('📅 Sample months generated:', months);
}

// Setup month selector change event
function setupMonthSelector() {
    const monthSelect = document.getElementById('monthSelect');
    monthSelect.addEventListener('change', async function(e) {
        const selectedMonth = e.target.value;
        if (selectedMonth && selectedMonth !== currentSelectedMonth) {
            console.log('🔄 Switching to month:', selectedMonth);
            currentSelectedMonth = selectedMonth;
            await loadDataForMonth(selectedMonth);
        }
    });
}

// Load initial data
async function loadInitialData() {
    if (availableMonths.length > 0) {
        const initialMonth = document.getElementById('monthSelect').value;
        await loadDataForMonth(initialMonth);
    } else {
        loadSampleData();
    }
}

// Load data for specific month
async function loadDataForMonth(month) {
    try {
        showLoading();
        console.log(`📊 Loading data for month: ${month}`);
        
        // Try to load live data
        const apiResponse = await loadLiveData(month);
        
        if (apiResponse && apiResponse.success) {
            console.log('✅ Live data loaded successfully for', month);
            displayData(apiResponse.data, month);
            showNotification(`Data loaded for ${formatMonthDisplay(month)}`, 'success');
        } else {
            console.log('📊 Loading sample data for', month);
            loadSampleDataForMonth(month);
        }
        
    } catch (error) {
        console.error('❌ Error loading data for month:', month, error);
        console.log('Falling back to sample data...');
        loadSampleDataForMonth(month);
    } finally {
        hideLoading();
    }
}

// Load live data for specific month
async function loadLiveData(month) {
    try {
        const data = await fetchWithJSONP('all-statistics', { month: month });
        return data;
    } catch (error) {
        console.log('Live data loading failed:', error);
        return null;
    }
}

// JSONP implementation that works with Google Apps Script
function fetchWithJSONP(action = 'all-statistics', params = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = 'callback_' + Date.now();
        const script = document.createElement('script');
        
        // Build URL with parameters
        let url = `${API_URL}?action=${action}&callback=${callbackName}`;
        
        // Add additional parameters
        Object.keys(params).forEach(key => {
            if (params[key]) {
                url += `&${key}=${encodeURIComponent(params[key])}`;
            }
        });
        
        script.src = url;
        
        // Set timeout
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Request timeout'));
        }, 10000);
        
        // Cleanup function
        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }
        
        // Success callback
        window[callbackName] = function(data) {
            cleanup();
            console.log('JSONP callback received:', data);
            if (data && data.success) {
                resolve(data);
            } else {
                reject(new Error('Invalid response data'));
            }
        };
        
        // Error handling
        script.onerror = function() {
            cleanup();
            reject(new Error('Script loading failed'));
        };
        
        // Add to document
        document.head.appendChild(script);
    });
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Enhanced sample data with month parameter
function loadSampleDataForMonth(month) {
    const sampleData = generateRealisticSampleData(month);
    displayData(sampleData, month);
    showNotification(`Sample data for ${formatMonthDisplay(month)}`, 'warning');
}

// Generate realistic sample data for specific month
function generateRealisticSampleData(month) {
    const dzongkhags = [
        "Bumthang", "Chukha", "Dagana", "Gasa", "Haa", "Lhuntse", "Mongar", 
        "Paro", "Pemagatshel", "Punakha", "Samdrup Jongkhar", "Samtse", 
        "Sarpang", "Thimphu", "Trashigang", "Trashiyangtse", "Trongsa", 
        "Tsirang", "Wangdue Phodrang", "Zhemgang"
    ];
    
    // Generate realistic outage data for each dzongkhag
    const dzongkhagWise = {};
    let totalOutageCount = 0;
    let totalOutageDuration = 0;
    
    dzongkhags.forEach(dzongkhag => {
        const outageCount = Math.floor(Math.random() * 12) + 3; // 3-15 outages
        const totalDuration = parseFloat((Math.random() * 8 + 0.5).toFixed(2)); // 0.5-8.5 hours
        
        dzongkhagWise[dzongkhag] = {
            totalOutageCount: outageCount,
            totalOutageDuration: totalDuration
        };
        
        totalOutageCount += outageCount;
        totalOutageDuration += totalDuration;
    });
    
    // Generate outage class statistics
    const outageClass = {
        "Momentary outage": { 
            frequency: Math.floor(totalOutageCount * 0.4),
            duration: parseFloat((totalOutageDuration * 0.05).toFixed(2)),
            frequencyPercentage: 40,
            durationPercentage: 5
        },
        "Sustained fault trip": { 
            frequency: Math.floor(totalOutageCount * 0.25),
            duration: parseFloat((totalOutageDuration * 0.25).toFixed(2)),
            frequencyPercentage: 25,
            durationPercentage: 25
        },
        "Grid failure outage": { 
            frequency: Math.floor(totalOutageCount * 0.05),
            duration: parseFloat((totalOutageDuration * 0.15).toFixed(2)),
            frequencyPercentage: 5,
            durationPercentage: 15
        },
        "Planned shutdown outage": { 
            frequency: Math.floor(totalOutageCount * 0.1),
            duration: parseFloat((totalOutageDuration * 0.35).toFixed(2)),
            frequencyPercentage: 10,
            durationPercentage: 35
        },
        "Emergency shutdown outage": { 
            frequency: Math.floor(totalOutageCount * 0.2),
            duration: parseFloat((totalOutageDuration * 0.2).toFixed(2)),
            frequencyPercentage: 20,
            durationPercentage: 20
        }
    };
    
    return {
        overview: {
            totalOutageCount: totalOutageCount,
            totalOutageDuration: parseFloat(totalOutageDuration.toFixed(2)),
            minRestorationTime: 0.017,
            maxRestorationTime: 4.25
        },
        outageClass: outageClass,
        dzongkhagWise: dzongkhagWise,
        timestamp: new Date().toISOString(),
        month: month
    };
}

// Legacy function for backward compatibility
function loadSampleData() {
    loadSampleDataForMonth(getCurrentMonth());
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 4000);
}

// Display functions with safe data handling
function displayData(apiData, month) {
    if (!apiData) {
        console.error('No data provided to displayData');
        return;
    }
    
    console.log('Displaying data for month:', month, apiData);
    
    // Safe data extraction with fallbacks
    const data = apiData.data || apiData;
    const overview = data.overview || {};
    const outageClass = data.outageClass || {};
    const dzongkhagWise = data.dzongkhagWise || {};
    const displayMonth = month || data.month || getCurrentMonth();
    
    displayOverview(overview);
    createOutageTypeChart(outageClass);
    createDzongkhagChart(dzongkhagWise);
    displayOutageTypeDetails(outageClass);
    displayDzongkhagDetails(dzongkhagWise);
}

function displayOverview(overview) {
    // Safe overview data with defaults
    const safeOverview = {
        totalOutageCount: overview.totalOutageCount || 0,
        totalOutageDuration: overview.totalOutageDuration || 0,
        minRestorationTime: overview.minRestorationTime || 0,
        maxRestorationTime: overview.maxRestorationTime || 0
    };
    
    document.getElementById('totalOutages').textContent = safeOverview.totalOutageCount;
    document.getElementById('totalDuration').textContent = `${safeOverview.totalOutageDuration.toFixed(1)}h`;
    document.getElementById('minRestoration').textContent = `${safeOverview.minRestorationTime.toFixed(3)}h`;
    document.getElementById('maxRestoration').textContent = `${safeOverview.maxRestorationTime.toFixed(3)}h`;
}

// Create outage type legend
function createOutageTypeLegend(outageClass) {
    const legendContainer = document.getElementById('outageTypeLegend');
    legendContainer.innerHTML = '<h4>Outage Type Codes</h4>';
    
    Object.keys(outageClass || {}).forEach(type => {
        const code = OUTAGE_CODES[type] || type.charAt(0);
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${BAR_CHART_COLORS.frequency}"></div>
            <span class="legend-code">${code}</span>
            <span class="legend-text">${type}</span>
        `;
        legendContainer.appendChild(legendItem);
    });
}

// Create bar chart for outage type analysis
function createOutageTypeChart(outageClass) {
    const labels = Object.keys(outageClass || {});
    const frequencyData = labels.map(type => outageClass[type].frequency || 0);
    const durationData = labels.map(type => outageClass[type].duration || 0);
    
    // Create coded labels for x-axis (just codes)
    const codedLabels = labels.map(type => OUTAGE_CODES[type] || type.charAt(0));

    // Create legend
    createOutageTypeLegend(outageClass);

    // Create Outage Type Bar Chart
    const ctx = document.getElementById('outageTypeChart').getContext('2d');
    if (outageTypeChart) outageTypeChart.destroy();

    if (labels.length > 0) {
        outageTypeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: codedLabels, // Just codes on x-axis
                datasets: [
                    {
                        label: 'Outage Count',
                        data: frequencyData,
                        backgroundColor: BAR_CHART_COLORS.frequency,
                        borderColor: BAR_CHART_COLORS.frequency,
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Total Duration (hours)',
                        data: durationData,
                        backgroundColor: BAR_CHART_COLORS.duration,
                        borderColor: BAR_CHART_COLORS.duration,
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Outage Type Codes',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { 
                            display: true, 
                            text: 'Outage Count',
                            font: {
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { 
                            display: true, 
                            text: 'Duration (hours)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: { drawOnChartArea: false },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const index = context[0].dataIndex;
                                const outageType = Object.keys(outageClass)[index];
                                return `${OUTAGE_CODES[outageType]}: ${outageType}`;
                            },
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                if (label.includes('Count')) {
                                    return `${label}: ${value} outages`;
                                } else {
                                    return `${label}: ${value.toFixed(2)} hours`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}

// Dzongkhag Chart - Optimized for 20 dzongkhags
function createDzongkhagChart(dzongkhagWise) {
    const ctx = document.getElementById('dzongkhagChart').getContext('2d');
    if (dzongkhagChart) dzongkhagChart.destroy();
    
    const dzongkhags = Object.keys(dzongkhagWise || {});
    const outageCounts = dzongkhags.map(dz => dzongkhagWise[dz].totalOutageCount || 0);
    const durations = dzongkhags.map(dz => dzongkhagWise[dz].totalOutageDuration || 0);
    
    if (dzongkhags.length > 0) {
        dzongkhagChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dzongkhags,
                datasets: [
                    {
                        label: 'Outage Count',
                        data: outageCounts,
                        backgroundColor: '#2E7D32',
                        borderColor: '#1B5E20',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Total Duration (hours)',
                        data: durations,
                        backgroundColor: '#D1D100',
                        borderColor: '#4CAF50',
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Outage Count' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Duration (hours)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }
}

function displayOutageTypeDetails(outageClass) {
    const tbody = document.getElementById('outageTypeDetails');
    tbody.innerHTML = '';
    
    if (!outageClass) return;
    
    Object.entries(outageClass).forEach(([type, stats]) => {
        const safeStats = stats || {};
        const code = OUTAGE_CODES[type] || '-';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${code}</strong></td>
            <td>${type}</td>
            <td>${safeStats.frequency || 0}</td>
            <td>${(safeStats.duration || 0).toFixed(2)}h</td>
            <td>
                ${(safeStats.frequencyPercentage || 0).toFixed(1)}%
                <div class="percentage-bar">
                    <div class="percentage-fill" style="width: ${safeStats.frequencyPercentage || 0}%"></div>
                </div>
            </td>
            <td>
                ${(safeStats.durationPercentage || 0).toFixed(1)}%
                <div class="percentage-bar">
                    <div class="percentage-fill" style="width: ${safeStats.durationPercentage || 0}%"></div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function displayDzongkhagDetails(dzongkhagWise) {
    const tbody = document.getElementById('dzongkhagDetails');
    tbody.innerHTML = '';
    
    if (!dzongkhagWise) return;
    
    Object.entries(dzongkhagWise).forEach(([dzongkhag, stats]) => {
        const safeStats = stats || {};
        const totalOutageCount = safeStats.totalOutageCount || 0;
        const totalOutageDuration = safeStats.totalOutageDuration || 0;
        
        const avgDuration = totalOutageCount > 0 
            ? (totalOutageDuration / totalOutageCount).toFixed(2)
            : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${dzongkhag}</strong></td>
            <td>${totalOutageCount}</td>
            <td>${totalOutageDuration.toFixed(2)}h</td>
            <td>${avgDuration}h</td>
            <!-- Status column removed -->
        `;
        tbody.appendChild(row);
    });
}

// Mobile menu functionality
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNav = document.getElementById('mobileNav');

if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        mobileNav.classList.toggle('active');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.top-header-content') && !event.target.closest('.mobile-nav')) {
            mobileMenuBtn.classList.remove('active');
            mobileNav.classList.remove('active');
        }
    });
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initDashboard);

// Auto-refresh every 2 minutes (only for current month)
setInterval(() => {
    const currentMonth = getCurrentMonth();
    const selectedMonth = document.getElementById('monthSelect').value;
    
    // Only auto-refresh if viewing current month
    if (selectedMonth === currentMonth) {
        console.log('🔄 Auto-refreshing data...');
        loadDataForMonth(currentMonth);
    }
}, 2 * 60 * 1000);