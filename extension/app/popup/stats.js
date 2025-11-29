// DOM Elements
const backBtn = document.getElementById('backBtn');
const todayWork = document.getElementById('todayWork');
const todayFocus = document.getElementById('todayFocus');
const streak = document.getElementById('streak');
const totalWork = document.getElementById('totalWork');
const totalSessions = document.getElementById('totalSessions');
const avgSession = document.getElementById('avgSession');
const bestDay = document.getElementById('bestDay');
const sitesList = document.getElementById('sitesList');
const goalInput = document.getElementById('goalInput');
const setGoalBtn = document.getElementById('setGoalBtn');
const goalProgress = document.getElementById('goalProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resetStatsBtn = document.getElementById('resetStatsBtn');
const periodBtns = document.querySelectorAll('.period-btn');

let chart = null;

// Format time helpers
function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatHours(ms) {
  const hours = Math.floor(ms / 3600000);
  return `${hours}h`;
}

// Load all statistics
function loadStats() {
  chrome.storage.local.get([
    'timerState',
    'weeklyStats',
    'allTimeStats',
    'timeBreakdown',
    'dailyGoal',
    'streak'
  ], (result) => {
    const timerState = result.timerState || {};
    const weeklyStats = result.weeklyStats || getEmptyWeek();
    const allTimeStats = result.allTimeStats || {
      totalTime: 0,
      totalSessions: 0,
      bestDayTime: 0,
      bestDayDate: null
    };
    const timeBreakdown = result.timeBreakdown || {};
    const dailyGoal = result.dailyGoal || 0;
    const currentStreak = result.streak || 0;
    
    // Today's summary
    todayWork.textContent = formatTime(timerState.todayTotalTime || 0);
    const focusScore = calculateFocusScore(timerState);
    todayFocus.textContent = focusScore + '%';
    streak.textContent = currentStreak;
    
    // All time stats
    totalWork.textContent = formatHours(allTimeStats.totalTime);
    totalSessions.textContent = allTimeStats.totalSessions;
    avgSession.textContent = allTimeStats.totalSessions > 0 
      ? formatTime(allTimeStats.totalTime / allTimeStats.totalSessions)
      : '0m';
    bestDay.textContent = allTimeStats.bestDayDate 
      ? formatShortDate(allTimeStats.bestDayDate)
      : '-';
    
    // Weekly chart
    renderChart(weeklyStats);
    
    // Sites list
    renderSitesList(timeBreakdown);
    
    // Goal progress
    if (dailyGoal > 0) {
      goalInput.value = dailyGoal;
      showGoalProgress(timerState.todayTotalTime || 0, dailyGoal);
    }
  });
}

// Calculate focus score
function calculateFocusScore(timerState) {
  const totalTime = timerState.todayTotalTime || 0;
  const distractTime = timerState.distractionTime || 0;
  
  if (totalTime === 0) return 100;
  
  return Math.max(0, Math.round(((totalTime - distractTime) / totalTime) * 100));
}

// Get empty week structure
function getEmptyWeek() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const week = {};
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayName = days[date.getDay()];
    week[dayName] = 0;
  }
  
  return week;
}

// Render chart
function renderChart(weeklyStats) {
  const canvas = document.getElementById('weeklyChart');
  const ctx = canvas.getContext('2d');
  
  // Clear previous chart
  if (chart) {
    chart = null;
  }
  
  const days = Object.keys(weeklyStats);
  const values = Object.values(weeklyStats).map(v => v / 3600000); // Convert to hours
  
  // Simple bar chart
  const maxValue = Math.max(...values, 1);
  const padding = 40;
  const barWidth = (canvas.width - padding * 2) / days.length - 10;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw bars
  days.forEach((day, i) => {
    const value = values[i];
    const barHeight = (value / maxValue) * (canvas.height - padding * 2);
    const x = padding + i * (barWidth + 10);
    const y = canvas.height - padding - barHeight;
    
    // Gradient
    const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - padding);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#8b5cf6');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Day label
    ctx.fillStyle = '#71717a';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "SF Pro Display"';
    ctx.textAlign = 'center';
    ctx.fillText(day, x + barWidth / 2, canvas.height - padding + 20);
    
    // Value label
    if (value > 0) {
      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "SF Pro Display"';
      ctx.fillText(value.toFixed(1) + 'h', x + barWidth / 2, y - 5);
    }
  });
}

// Render sites list
function renderSitesList(timeBreakdown) {
  const sites = Object.entries(timeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (sites.length === 0) {
    sitesList.innerHTML = '<div class="sites-empty">No data yet</div>';
    return;
  }
  
  sitesList.innerHTML = sites.map(([site, time]) => `
    <div class="site-item">
      <span class="site-name">${site}</span>
      <span class="site-time">${formatTime(time)}</span>
    </div>
  `).join('');
}

// Show goal progress
function showGoalProgress(todayTime, goalHours) {
  const goalMs = goalHours * 3600000;
  const percentage = Math.min(100, Math.round((todayTime / goalMs) * 100));
  
  goalProgress.style.display = 'block';
  progressFill.style.width = percentage + '%';
  progressText.textContent = `${percentage}% of daily goal`;
}

// Set daily goal
function setDailyGoal() {
  const goal = parseInt(goalInput.value);
  
  if (!goal || goal < 1 || goal > 24) {
    alert('Please enter a valid goal between 1-24 hours');
    return;
  }
  
  chrome.storage.local.set({ dailyGoal: goal }, () => {
    loadStats();
  });
}

// Format short date
function formatShortDate(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

// Reset all statistics
function resetStats() {
  if (confirm('Are you sure? This will permanently delete all your statistics and cannot be undone.')) {
    chrome.storage.local.set({
      weeklyStats: getEmptyWeek(),
      allTimeStats: {
        totalTime: 0,
        totalSessions: 0,
        bestDayTime: 0,
        bestDayDate: null
      },
      timeBreakdown: {},
      dailyGoal: 0,
      streak: 0,
      timerState: {
        isRunning: false,
        isPaused: false,
        startTime: null,
        pausedTime: 0,
        elapsedTime: 0,
        currentSessionTime: 0,
        todayTotalTime: 0,
        distractionTime: 0
      }
    }, () => {
      loadStats();
    });
  }
}

// Event listeners
backBtn.addEventListener('click', () => {
  window.location.href = 'popup.html';
});

setGoalBtn.addEventListener('click', setDailyGoal);

goalInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    setDailyGoal();
  }
});

resetStatsBtn.addEventListener('click', resetStats);

periodBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    periodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Could add monthly view here in future
  });
});

// Initialize
loadStats();

// Refresh stats every 5 seconds
setInterval(loadStats, 5000);