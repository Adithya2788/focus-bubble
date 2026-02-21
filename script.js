// ============================================================
// DATA & STATE
// ============================================================
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Focused, hard work is the real key to success.", author: "John Carmack" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Cal Newport" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
];

let currentUser = null;
let sessionInterval = null;
let sessionSeconds = 0;
let focusScore = 100;
let mediaStream = null;
let audioContext = null;
let analyser = null;
let detectionModel = null;
let detectionInterval = null;
let scoreUpdateInterval = null;
let quoteInterval = null;
let sessionStartTime = null;

// Penalty tracking to avoid spam
let noisePenaltyTime = 0;
let peoplePenaltyTime = 0;
let lightPenaltyTime = 0;
const PENALTY_COOLDOWN = 8000; // ms

// ============================================================
// UTILS
// ============================================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

// ============================================================
// QUOTES ROTATION
// ============================================================
let quoteIdx = 0;
function rotateQuote(textId, authorId) {
  const el = document.getElementById(textId);
  const au = document.getElementById(authorId);
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    const q = QUOTES[quoteIdx % QUOTES.length];
    el.textContent = q.text;
    if (au) au.textContent = `— ${q.author}`;
    el.style.opacity = '1';
    quoteIdx++;
  }, 300);
}
function rotateQuoteFocus() {
  const el = document.getElementById('focus-quote-text');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    const q = QUOTES[quoteIdx % QUOTES.length];
    el.textContent = q.text;
    el.style.opacity = '1';
    quoteIdx++;
  }, 300);
}
// Start landing quotes
rotateQuote('quote-text', 'quote-author');
setInterval(() => rotateQuote('quote-text', 'quote-author'), 5000);

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================
function getUsers() { return JSON.parse(localStorage.getItem('fb_users') || '[]'); }
function saveUsers(u) { localStorage.setItem('fb_users', JSON.stringify(u)); }
function getSessions() { return JSON.parse(localStorage.getItem('fb_sessions') || '[]'); }
function saveSessions(s) { localStorage.setItem('fb_sessions', JSON.stringify(s)); }

// ============================================================
// AUTH
// ============================================================
function register() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  let valid = true;
  ['err-reg-name','err-reg-email','err-reg-pass'].forEach(e => document.getElementById(e).style.display = 'none');
  if (!name) { document.getElementById('err-reg-name').style.display = 'block'; valid = false; }
  if (!email || !email.includes('@')) { document.getElementById('err-reg-email').style.display = 'block'; valid = false; }
  if (pass.length < 6) { document.getElementById('err-reg-pass').style.display = 'block'; valid = false; }
  if (!valid) return;
  const users = getUsers();
  if (users.find(u => u.email === email)) { showToast('Email already registered.', 'warn'); return; }
  users.push({ name, email, pass });
  saveUsers(users);
  currentUser = { name, email };
  showToast(`Welcome, ${name}! Account created.`, 'success');
  loadDashboard();
  showPage('page-dashboard');
}

function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  ['err-login-email','err-login-pass'].forEach(e => document.getElementById(e).style.display = 'none');
  const users = getUsers();
  const user = users.find(u => u.email === email && u.pass === pass);
  if (!user) { document.getElementById('err-login-pass').style.display = 'block'; return; }
  currentUser = { name: user.name, email: user.email };
  showToast(`Welcome back, ${user.name}!`, 'success');
  loadDashboard();
  showPage('page-dashboard');
}

function logout() {
  currentUser = null;
  showPage('page-landing');
}

// ============================================================
// DASHBOARD
// ============================================================
function loadDashboard() {
  if (!currentUser) return;
  document.getElementById('dashboard-greeting').textContent = `${getTimeGreeting()}, ${currentUser.name.split(' ')[0]}!`;
  document.getElementById('dashboard-avatar').textContent = currentUser.name[0].toUpperCase();
  const sessions = getSessions().filter(s => s.user === currentUser.email);
  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.timestamp).toDateString() === today);
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSessions = sessions.filter(s => s.timestamp > weekAgo);
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b.score, 0) / arr.length) : null;
  const todayBest = todaySessions.length ? Math.max(...todaySessions.map(s => s.score)) : null;
  document.getElementById('dash-today').textContent = todayBest !== null ? todayBest : '—';
  document.getElementById('dash-week').textContent = avg(weekSessions) !== null ? avg(weekSessions) : '—';
  document.getElementById('dash-sessions').textContent = sessions.length;
  // Pre-warm permissions silently in background so the stream is ready when session starts
  prewarmPermissions();
}

// ============================================================
// PERMISSION PRE-WARMING
// ============================================================
async function prewarmPermissions() {
  // If we already have a live stream, nothing to do
  if (mediaStream && mediaStream.active) return;
  try {
    // Use the Permissions API to check without prompting first
    const [camPerm, micPerm] = await Promise.all([
      navigator.permissions.query({ name: 'camera' }).catch(() => ({ state: 'prompt' })),
      navigator.permissions.query({ name: 'microphone' }).catch(() => ({ state: 'prompt' })),
    ]);
    // Only silently pre-acquire if already granted (no dialog shown)
    if (camPerm.state === 'granted' && micPerm.state === 'granted') {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Attach to video element so it's ready; don't navigate yet
      const video = document.getElementById('camera-preview');
      video.srcObject = mediaStream;
    }
  } catch (e) {
    // Silently fail — permissions will be requested properly on session start
  }
}

// ============================================================
// START SESSION
// ============================================================
async function startSession() {
  const btn = document.querySelector('.start-session-btn');
  if (btn) { btn.textContent = '⏳ Starting…'; btn.disabled = true; }

  try {
    // Reuse existing live stream if available (from pre-warm), otherwise request fresh
    if (!mediaStream || !mediaStream.active) {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }

    const video = document.getElementById('camera-preview');
    // Re-attach srcObject in case it was cleared
    if (video.srcObject !== mediaStream) {
      video.srcObject = mediaStream;
    }
    if (video.paused) await video.play();

    setupAudio(mediaStream);
    await loadModel();
    startSessionTimer();
    startScoreLoop();
    quoteInterval = setInterval(rotateQuoteFocus, 6000);
    focusScore = 100;
    sessionStartTime = Date.now();
    updateBubble();
    showPage('page-focus');
  } catch (e) {
    showPermissionError(e);
  } finally {
    if (btn) { btn.textContent = '▶ Start Focus Session'; btn.disabled = false; }
  }
}

function showPermissionError(e) {
  if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
    showToast('⚠️ Camera/Mic permission denied. Please click the lock icon in your browser address bar and allow both, then refresh.', 'danger');
  } else if (e.name === 'NotFoundError') {
    showToast('⚠️ No camera or microphone detected. Please connect one and try again.', 'danger');
  } else {
    showToast('⚠️ Could not access camera/microphone: ' + e.message, 'danger');
  }
  console.error(e);
}

// ============================================================
// AUDIO ANALYSIS
// ============================================================
function setupAudio(stream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
}

function getDecibels() {
  if (!analyser) return 0;
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  const rms = Math.sqrt(sum / data.length);
  const db = 20 * Math.log10(Math.max(rms, 1e-10)) + 90;
  return Math.max(0, Math.min(100, Math.round(db)));
}

// ============================================================
// PERSON DETECTION (COCO-SSD)
// ============================================================
async function loadModel() {
  try {
    detectionModel = await cocoSsd.load();
  } catch (e) {
    console.warn('COCO-SSD failed to load:', e);
  }
}

async function detectPeople() {
  if (!detectionModel) return 0;
  const video = document.getElementById('camera-preview');
  if (video.readyState < 2) return 0;
  try {
    const predictions = await detectionModel.detect(video);
    const canvas = document.getElementById('detection-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const people = predictions.filter(p => p.class === 'person');
    people.forEach(p => {
      ctx.strokeStyle = 'rgba(124,106,255,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(...p.bbox);
      ctx.fillStyle = 'rgba(124,106,255,0.7)';
      ctx.fillRect(p.bbox[0], p.bbox[1] - 18, 60, 18);
      ctx.fillStyle = '#fff';
      ctx.font = '11px DM Sans';
      ctx.fillText('Person', p.bbox[0] + 4, p.bbox[1] - 4);
    });
    return people.length;
  } catch { return 0; }
}

// ============================================================
// LIGHT ESTIMATION (via canvas brightness)
// ============================================================
function estimateLightLevel() {
  const video = document.getElementById('camera-preview');
  if (!video || video.readyState < 2) return null;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 48;
  const ctx = c.getContext('2d');
  ctx.drawImage(video, 0, 0, 64, 48);
  const d = ctx.getImageData(0, 0, 64, 48).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114);
  const avg = sum / (64 * 48);
  // Scale 0-255 to approximate lux 0-800
  return Math.round((avg / 255) * 800);
}

// ============================================================
// SCORE & LOOP
// ============================================================
function startScoreLoop() {
  scoreUpdateInterval = setInterval(async () => {
    const db = getDecibels();
    const lux = estimateLightLevel();
    const people = await detectPeople();
    const now = Date.now();

    // Update UI
    document.getElementById('noise-val').textContent = db;
    document.getElementById('noise-bar').style.width = Math.min(db, 100) + '%';
    document.getElementById('people-val').textContent = people;
    document.getElementById('people-bar').style.width = Math.min(people * 33, 100) + '%';
    if (lux !== null) {
      document.getElementById('light-val').textContent = lux;
      document.getElementById('light-bar').style.width = Math.min((lux / 800) * 100, 100) + '%';
    }

    // Penalties
    if (db > 35 && now - noisePenaltyTime > PENALTY_COOLDOWN) {
      focusScore = Math.max(0, focusScore - 10);
      noisePenaltyTime = now;
      setMetricStatus('noise', 'bad');
      showToast('🔊 Noise increasing. Take a break or change your position.', 'warn');
    } else if (db > 25) {
      setMetricStatus('noise', 'warn');
    } else {
      setMetricStatus('noise', 'good');
    }

    if (people > 1 && now - peoplePenaltyTime > PENALTY_COOLDOWN) {
      focusScore = Math.max(0, focusScore - 5);
      peoplePenaltyTime = now;
      setMetricStatus('people', 'bad');
      showToast('👥 Distraction detected: Another person entered the study area.', 'warn');
    } else if (people === 1) {
      setMetricStatus('people', 'good');
    } else if (people === 0) {
      setMetricStatus('people', 'good');
    } else {
      setMetricStatus('people', 'warn');
    }

    if (lux !== null) {
      if (lux < 300 && now - lightPenaltyTime > PENALTY_COOLDOWN) {
        focusScore = Math.max(0, focusScore - 5);
        lightPenaltyTime = now;
        setMetricStatus('light', 'bad');
        showToast('💡 The light is too dull for studying. Increase the light or change location.', 'warn');
      } else if (lux < 400) {
        setMetricStatus('light', 'warn');
      } else {
        setMetricStatus('light', 'good');
      }
    }

    // Slowly recover score
    if (db <= 25 && people <= 1 && (lux === null || lux >= 300)) {
      focusScore = Math.min(100, focusScore + 1);
    }

    // Strong alert
    if (focusScore < 40) {
      const alertEl = document.getElementById('focus-bubble');
      alertEl.style.animation = 'shake 0.5s';
      setTimeout(() => { alertEl.style.animation = ''; }, 500);
    }

    updateBubble();
  }, 2000);
}

function setMetricStatus(type, status) {
  const el = document.getElementById(`${type}-status`);
  el.className = `metric-status status-${status}`;
  el.textContent = status === 'good' ? 'OK' : status === 'warn' ? 'Caution' : 'Alert!';
}

function updateBubble() {
  const s = Math.round(focusScore);
  document.getElementById('bubble-score-val').textContent = s;
  const bubble = document.getElementById('focus-bubble');
  if (s >= 80) {
    bubble.style.background = 'radial-gradient(circle at 35% 35%, #3aff9e, #22d3a0)';
    bubble.style.boxShadow = '0 0 60px rgba(34,211,160,0.6), 0 0 120px rgba(34,211,160,0.25)';
  } else if (s >= 40) {
    bubble.style.background = 'radial-gradient(circle at 35% 35%, #ffe066, #f5c842)';
    bubble.style.boxShadow = '0 0 60px rgba(245,200,66,0.6), 0 0 120px rgba(245,200,66,0.25)';
  } else {
    bubble.style.background = 'radial-gradient(circle at 35% 35%, #ff7096, #ff4d6d)';
    bubble.style.boxShadow = '0 0 60px rgba(255,77,109,0.7), 0 0 120px rgba(255,77,109,0.3)';
    if (s < 40) {
      showToast('🚨 You are too distracted. Avoid distractions and study hard.', 'danger');
    }
  }
}

function startDetection() {
  // Detection already handled inside score loop
}

function startSessionTimer() {
  sessionSeconds = 0;
  sessionInterval = setInterval(() => {
    sessionSeconds++;
    document.getElementById('session-timer').textContent = formatTime(sessionSeconds);
  }, 1000);
}

// ============================================================
// END SESSION
// ============================================================
function endSession() {
  if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
  if (scoreUpdateInterval) { clearInterval(scoreUpdateInterval); scoreUpdateInterval = null; }
  if (quoteInterval) { clearInterval(quoteInterval); quoteInterval = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  analyser = null;

  const finalScore = Math.round(focusScore);
  const sessions = getSessions();
  sessions.push({ user: currentUser.email, score: finalScore, duration: sessionSeconds, timestamp: Date.now() });
  saveSessions(sessions);
  showToast(`Session ended! Final score: ${finalScore}`, finalScore >= 70 ? 'success' : 'warn');
  loadDashboard();
  showPage('page-dashboard');
}

// ============================================================
// PROFILE
// ============================================================
function showProfile() {
  if (!currentUser) return;
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-email').textContent = currentUser.email;
  document.getElementById('profile-avatar-letter').textContent = currentUser.name[0].toUpperCase();
  const sessions = getSessions().filter(s => s.user === currentUser.email).sort((a,b) => b.timestamp - a.timestamp);
  const today = new Date().toDateString();
  const todaySess = sessions.filter(s => new Date(s.timestamp).toDateString() === today);
  const weekAgo = Date.now() - 7 * 86400000;
  const monthAgo = Date.now() - 30 * 86400000;
  const weekSess = sessions.filter(s => s.timestamp > weekAgo);
  const monthSess = sessions.filter(s => s.timestamp > monthAgo);
  const avg = arr => arr.length ? Math.round(arr.reduce((a,b) => a + b.score, 0) / arr.length) : null;
  const todayBest = todaySess.length ? Math.max(...todaySess.map(s => s.score)) : null;
  document.getElementById('pstat-today').textContent = todayBest !== null ? todayBest : '—';
  document.getElementById('pstat-week').textContent = avg(weekSess) !== null ? avg(weekSess) : '—';
  document.getElementById('pstat-month').textContent = avg(monthSess) !== null ? avg(monthSess) : '—';
  renderChart(sessions);
  renderSessionsList(sessions.slice(0, 10));
  showPage('page-profile');
}

function renderChart(sessions) {
  const ctx = document.getElementById('score-chart').getContext('2d');
  const last14 = sessions.slice(0, 14).reverse();
  const labels = last14.map(s => new Date(s.timestamp).toLocaleDateString('en-US', { month:'short', day:'numeric' }));
  const scores = last14.map(s => s.score);
  if (window._focusChart) window._focusChart.destroy();
  window._focusChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Focus Score',
        data: scores,
        borderColor: '#7c6aff',
        backgroundColor: 'rgba(124,106,255,0.08)',
        pointBackgroundColor: scores.map(s => s >= 80 ? '#22d3a0' : s >= 40 ? '#f5c842' : '#ff4d6d'),
        pointRadius: 5,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { size: 11 } } },
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { size: 11 } } }
      },
      responsive: true,
    }
  });
}

function renderSessionsList(sessions) {
  const el = document.getElementById('sessions-list');
  if (!sessions.length) { el.innerHTML = '<div class="empty-state">No sessions yet. Start your first session!</div>'; return; }
  el.innerHTML = sessions.map(s => {
    const cls = s.score >= 80 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
    const date = new Date(s.timestamp).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const dur = formatTime(s.duration || 0);
    return `<div class="session-item">
      <div>
        <div style="font-size:13px;font-weight:500">${date}</div>
        <div class="session-date">Duration: ${dur}</div>
      </div>
      <div class="session-score ${cls}">${s.score}</div>
    </div>`;
  }).join('');
}

// ============================================================
// ADD SHAKE ANIMATION
// ============================================================
const style = document.createElement('style');
style.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0);}
  20%{transform:translateX(-8px);}
  40%{transform:translateX(8px);}
  60%{transform:translateX(-5px);}
  80%{transform:translateX(5px);}
}`;
document.head.appendChild(style);

// ============================================================
// EXPOSE ALL FUNCTIONS TO WINDOW (fixes "not defined" errors)
// ============================================================
window.showPage       = showPage;
window.register       = register;
window.login          = login;
window.logout         = logout;
window.startSession   = startSession;
window.endSession     = endSession;
window.showProfile    = showProfile;