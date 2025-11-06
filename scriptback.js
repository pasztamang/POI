const API_URL = 'https://script.google.com/macros/s/AKfycbw0v5iCUWXB_tAokshSc-yJh4ml0a_HMVLtYHT9JrlquB0p8HqIyAQ6XzhfMvMFHqeI/exec';

// Chart instances
let outageFrequencyChart, outageDurationChart, dzongkhagChart;

// Initialize dashboard
async function initDashboard() {
    try {
        showLoading();
        console.log('🔄 Loading data from API...');
        
        // Try to load live data first
        const apiResponse = await loadLiveData();
        
        if (apiResponse && apiResponse.success) {
            console.log('✅ Live data loaded successfully', apiResponse);
            displayData(apiResponse.data);
            updateDataBadge('live');
            showNotification('Live data loaded successfully', 'success');
        } else {
            console.log('📊 Loading sample data...');
            loadSampleData();
        }
        
        hideLoading();
        setupNavigation();
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.log('Falling back to sample data...');
        loadSampleData();
        setupNavigation();
    }
}

// Simple function to load live data
async function loadLiveData() {
    try {
        // Use JSONP approach which works with Google Apps Script
        const data = await fetchWithJSONP();
        console.log('API Response:', data);
        return data;
    } catch (error) {
        console.log('Live data loading failed:', error);
        return null;
    }
}

// JSONP implementation that works with Google Apps Script
function fetchWithJSONP() {
    return new Promise((resolve, reject) => {
        const callbackName = 'callback_' + Date.now();
        const script = document.createElement('script');
        
        // Your API URL with JSONP callback
        script.src = `${API_URL}?action=all-statistics&callback=${callbackName}`;
        
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

// Setup navigation
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            navButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            switchPage(page);
        });
    });
}

// Page switching function
function switchPage(page) {
    // Hide all pages
    const allPages = document.querySelectorAll('.main-content');
    allPages.forEach(page => page.style.display = 'none');
    
    // Show selected page
    const selectedPage = document.getElementById(page + 'Page');
    if (selectedPage) {
        selectedPage.style.display = 'block';
    }
    
    // Show notification for placeholder pages
    if (page !== 'dashboard') {
        showNotification(`${getPageTitle(page)} page loaded`, 'info');
    }
}

// Get page title for notifications
function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
        'history': 'Outage History',
        'reports': 'Reports',
        'notifications': 'Notifications'
    };
    return titles[page] || 'Page';
}

function updateDataBadge(type) {
    const headerInfo = document.querySelector('.header-info');
    if (headerInfo) {
        // Remove any existing badges
        const existingBadges = headerInfo.querySelectorAll('.data-badge');
        existingBadges.forEach(badge => badge.remove());
        
        const badge = document.createElement('span');
        badge.className = 'data-badge ' + (type === 'live' ? 'live-badge' : 'demo-badge');
        badge.textContent = type === 'live' ? 'Live Data' : 'Demo Data';
        headerInfo.appendChild(badge);
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    const allPages = document.querySelectorAll('.main-content');
    allPages.forEach(page => page.style.display = 'none');
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
}

// Enhanced sample data with realistic statistics
function loadSampleData() {
    const sampleData = generateRealisticSampleData();
    updateDataBadge('demo');
    displayData(sampleData);
    hideLoading();
    showNotification('Using demonstration data', 'warning');
}

// Generate realistic sample data
function generateRealisticSampleData() {
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
        month: new Date().toLocaleString('default', { year: 'numeric', month: 'long' })
    };
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
function displayData(apiData) {
    if (!apiData) {
        console.error('No data provided to displayData');
        return;
    }
    
    console.log('Displaying data:', apiData);
    
    // Safe data extraction with fallbacks
    const data = apiData.data || apiData;
    const overview = data.overview || {};
    const outageClass = data.outageClass || {};
    const dzongkhagWise = data.dzongkhagWise || {};
    const month = data.month || new Date().toLocaleString('default', { year: 'numeric', month: 'long' });
    const timestamp = data.timestamp || new Date().toISOString();
    
    document.getElementById('currentMonth').textContent = `Month: ${month}`;
    document.getElementById('lastUpdated').textContent = `Last updated: ${new Date(timestamp).toLocaleString()}`;
    
    displayOverview(overview);
    createOutageTypeCharts(outageClass);
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

// Create separate charts for outage frequency and duration
function createOutageTypeCharts(outageClass) {
    const labels = Object.keys(outageClass || {});
    const frequencyData = labels.map(type => outageClass[type].frequency || 0);
    const durationData = labels.map(type => outageClass[type].duration || 0);
    
    // Frequency Chart
    const freqCtx = document.getElementById('outageFrequencyChart').getContext('2d');
    if (outageFrequencyChart) outageFrequencyChart.destroy();
    
    if (labels.length > 0) {
        outageFrequencyChart = new Chart(freqCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: frequencyData,
                    backgroundColor: '#4CAF50',
                    borderColor: '#2E7D32',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Outages' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
    
    // Duration Chart
    const durationCtx = document.getElementById('outageDurationChart').getContext('2d');
    if (outageDurationChart) outageDurationChart.destroy();
    
    if (labels.length > 0) {
        outageDurationChart = new Chart(durationCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Duration (hours)',
                    data: durationData,
                    backgroundColor: '#81C784',
                    borderColor: '#4CAF50',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Duration (hours)' }
                    }
                },
                plugins: {
                    legend: { display: false }
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
                        backgroundColor: '#81C784',
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
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${type}</strong></td>
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
        
        let status = 'status-good';
        let statusText = 'Good';
        
        if (totalOutageDuration > 5) {
            status = 'status-critical';
            statusText = 'Critical';
        } else if (totalOutageDuration > 2) {
            status = 'status-warning';
            statusText = 'Warning';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${dzongkhag}</strong></td>
            <td>${totalOutageCount}</td>
            <td>${totalOutageDuration.toFixed(2)}h</td>
            <td>${avgDuration}h</td>
            <td><span class="status-badge ${status}">${statusText}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initDashboard);

// Auto-refresh every 2 minutes
setInterval(() => {
    if (document.getElementById('dashboardPage').style.display !== 'none') {
        initDashboard();
    }
}, 2 * 60 * 1000);