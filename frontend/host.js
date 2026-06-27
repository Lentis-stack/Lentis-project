// =============================
// Host page (password protected)
// =============================

const PASSWORD = 'HOST1234'; // TODO: replace with real auth / backend validation

const params = new URLSearchParams(window.location.search);
const eventCode = params.get('event') || '';

// Background
const hostBg = document.getElementById('hostBg');
hostBg.style.backgroundImage = 'url("./assets/wedding background 1.jpg")';

// Pill label
const hostPill = document.getElementById('hostPill');
hostPill.textContent = eventCode ? `Host • Event: ${eventCode}` : 'Host';

// Gate elements
const gateSection = document.getElementById('gateSection');
const hostSection = document.getElementById('hostSection');
const hostPasswordEl = document.getElementById('hostPassword');
const hostLoginBtn = document.getElementById('hostLoginBtn');
const gateError = document.getElementById('gateError');
const gateRetryBtn = document.getElementById('gateRetryBtn');

function showGateError(msg){
  gateError.textContent = msg;
  gateError.style.display = 'block';
}

function hideGateError(){
  gateError.textContent = '';
  gateError.style.display = 'none';
}

function setGateVisible(visible){
  gateSection.style.display = visible ? '' : 'none';
  hostSection.style.display = visible ? 'none' : '';
}

function isLoggedIn(){
  // demo session stored in memory + sessionStorage
  return sessionStorage.getItem('host_authed') === '1';
}

function logout(){
  sessionStorage.removeItem('host_authed');
  setGateVisible(true);
  hideGateError();
  hostPasswordEl.value = '';
  hostPasswordEl.focus();
}

document.getElementById('logoutBtn')?.addEventListener('click', logout);

async function handleLogin(){
  hideGateError();
  const entered = (hostPasswordEl.value || '').trim();

  if (!entered){
    showGateError('Password is required.');
    hostPasswordEl.focus();
    return;
  }

  if (entered !== PASSWORD){
    showGateError('Incorrect password. Please try again.');
    hostPasswordEl.value = '';
    hostPasswordEl.focus();
    return;
  }

  sessionStorage.setItem('host_authed', '1');
  setGateVisible(false);

  // init host UI
  initHost();
}

hostLoginBtn.addEventListener('click', handleLogin);
hostPasswordEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});

gateRetryBtn.addEventListener('click', () => {
  hideGateError();
  hostPasswordEl.focus();
});

// If already logged in (session)
if (isLoggedIn()){
  setGateVisible(false);
  // init host only once
  initHost();
}

// =============================
// Host UI + slideshow
// =============================
let slideshowTimer = null;
let slideshowMs = 2500;
let currentIndex = 0;
let slideshowItems = [];

const slideshowImg = document.getElementById('slideshowImg');
const slideIndexEl = document.getElementById('slideIndex');
const slideTotalEl = document.getElementById('slideTotal');
const slideLabelEl = document.getElementById('slideLabel');

const hostThumbs = document.getElementById('hostThumbs');

function renderThumbs(){
  if (!hostThumbs) return;
  hostThumbs.innerHTML = '';

  slideshowItems.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'thumb';

    const img = document.createElement('img');
    img.alt = `Slide ${i + 1}`;
    img.src = item.src;
    el.appendChild(img);

    el.addEventListener('click', () => {
      showSlide(i, true);
    });

    hostThumbs.appendChild(el);
  });
}

function showSlide(index, fromUser = false){
  if (!slideshowItems.length) return;
  const n = slideshowItems.length;
  currentIndex = ((index % n) + n) % n;

  const item = slideshowItems[currentIndex];
  slideshowImg.src = item.src;
  slideIndexEl.textContent = String(currentIndex + 1);
  slideTotalEl.textContent = String(n);
  slideLabelEl.textContent = item.label || 'Guest uploads';

  // thumbnails highlight
  const thumbs = hostThumbs?.querySelectorAll('.thumb');
  thumbs?.forEach((t, i) => {
    if (i === currentIndex) t.style.outline = '3px solid rgba(0,212,255,.55)';
    else t.style.outline = 'none';
  });

  // optional future hook: notify backend of slide event
  if (fromUser) {
    // placeholder
  }
}

function startSlideshow(){
  stopSlideshow();
  if (!slideshowItems.length) return;
  showSlide(currentIndex);
  slideshowTimer = window.setInterval(() => {
    showSlide(currentIndex + 1);
  }, slideshowMs);
}

function stopSlideshow(){
  if (slideshowTimer) window.clearInterval(slideshowTimer);
  slideshowTimer = null;
}

function setSlideshowItems(items){
  // items: [{src,label}]
  slideshowItems = Array.isArray(items) ? items.filter(x => x?.src) : [];
  currentIndex = 0;

  slideTotalEl.textContent = String(slideshowItems.length);
  renderThumbs();

  if (slideshowItems.length){
    showSlide(0);
  }

  // storage demo
  const storageCount = document.getElementById('storageCount');
  if (storageCount) storageCount.textContent = String(slideshowItems.length);
}

// demo init items (reuse existing local images)
function initDemoSlideshow(){
  setSlideshowItems([
{ src: './assets/picture landing 2.jpg', label: 'Guest photo #1' },
    { src: './assets/pictyure landing 2.jpg', label: 'Guest photo #2' },
    { src: './assets/0eb80f4dc4274d438ac84652820437e4.jpg', label: 'Guest photo #3' }
  ]);
}

function initControls(){
  document.getElementById('slideshowStartBtn')?.addEventListener('click', () => startSlideshow());
  document.getElementById('slideshowStopBtn')?.addEventListener('click', () => stopSlideshow());

  document.getElementById('prevSlideBtn')?.addEventListener('click', () => showSlide(currentIndex - 1, true));
  document.getElementById('nextSlideBtn')?.addEventListener('click', () => showSlide(currentIndex + 1, true));

  document.getElementById('speedSlowBtn')?.addEventListener('click', () => {
    slideshowMs = 5000;
    startSlideshow();
  });
  document.getElementById('speedNormalBtn')?.addEventListener('click', () => {
    slideshowMs = 2500;
    startSlideshow();
  });
  document.getElementById('speedFastBtn')?.addEventListener('click', () => {
    slideshowMs = 1200;
    startSlideshow();
  });
}

// Event management demo
function initEventManagement(){
  const titleEl = document.getElementById('eventTitle');
  const statusEl = document.getElementById('eventStatus');
  const saveBtn = document.getElementById('saveEventBtn');
  const resetBtn = document.getElementById('resetEventBtn');

  const defaults = {
    title: titleEl?.value || 'TARAGOLD2026',
    status: statusEl?.value || 'live'
  };

  saveBtn?.addEventListener('click', () => {
    // demo only
    saveBtn.textContent = 'Saved!';
    setTimeout(() => saveBtn.textContent = 'Save', 1200);
  });

  resetBtn?.addEventListener('click', () => {
    if (titleEl) titleEl.value = defaults.title;
    if (statusEl) statusEl.value = defaults.status;
    resetBtn.textContent = 'Reset!';
    setTimeout(() => resetBtn.textContent = 'Reset', 1200);
  });
}

function getGuestLink(){
  const base = window.location.origin + window.location.pathname;
  // guest landing is index.html in same directory
  const url = new URL('./index.html', base);
  if (eventCode) url.searchParams.set('event', eventCode);
  return url.toString();
}

// QR code generation (no external libs). We render a simple “fake QR” fallback.
// For real QR, include a QR library (qrcode.js) and render to canvas.
function renderQrFallback(text){
  const qr = document.getElementById('qrCode');
  if (!qr) return;

  // Create a deterministic grid from the text hash.
  const canvas = document.createElement('canvas');
  const size = 240;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const modules = 29; // odd like QR
  const cell = Math.floor(size / modules);

  function hash(str){
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  const h = hash(text);

  ctx.fillStyle = '#0b0b18';
  ctx.fillRect(0,0,size,size);

  // finder-like squares
  const drawFinder = (ox, oy) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(ox, oy, cell*7, cell*7);
    ctx.fillStyle = '#0b0b18';
    ctx.fillRect(ox+cell*1, oy+cell*1, cell*5, cell*5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(ox+cell*2, oy+cell*2, cell*3, cell*3);
  };

  drawFinder(0,0);
  drawFinder((modules-7)*cell,0);
  drawFinder(0,(modules-7)*cell);

  // data modules
  for (let y = 0; y < modules; y++){
    for (let x = 0; x < modules; x++){
      // skip finder areas
      const inTL = x < 7 && y < 7;
      const inTR = x >= modules-7 && y < 7;
      const inBL = x < 7 && y >= modules-7;
      if (inTL || inTR || inBL) continue;

      const bit = ((h >>> ((x + y*modules) % 24)) & 1) ^ ((x*y) & 1);
      if (bit){
        ctx.fillStyle = '#fff';
        ctx.fillRect(x*cell, y*cell, cell, cell);
      }
    }
  }

  qr.innerHTML = '';
  qr.appendChild(canvas);
}

function initQr(){
  const guestLinkTextEl = document.getElementById('qrLinkText');
  const guestLink = getGuestLink();
  if (guestLinkTextEl) guestLinkTextEl.textContent = guestLink;

  // fallback QR
  renderQrFallback(guestLink);

  document.getElementById('copyQrLinkBtn')?.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(guestLink);
      const btn = document.getElementById('copyQrLinkBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy guest link', 1200);
    }catch{
      alert('Clipboard not available in this browser. Copy manually from the QR link text.');
    }
  });

  document.getElementById('downloadQrBtn')?.addEventListener('click', () => {
    const canvas = document.querySelector('#qrCode canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'guest-qr.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
}

let hostInitialized = false;

const BACKEND_BASE_URL = window.BACKEND_BASE_URL || '';
const API_BASE = `${BACKEND_BASE_URL}`;

let slidesPollTimer = null;
let slidesPollingMs = 2000;

function getEventCodeFromUrl(){
  const params = new URLSearchParams(window.location.search);
  return (params.get('event') || '').trim();
}

async function fetchSlides(eventCode){
  if (!eventCode) return { slides: [] };
  const endpoint = `${API_BASE}/api/events/${encodeURIComponent(eventCode)}/slides`;
  const res = await fetch(endpoint, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Slides fetch failed: ${res.status}`);
  return res.json();
}

function toSlideshowItems(slides){
  // host.js setSlideshowItems expects [{src,label}]
  return (slides || []).map(s => ({
    src: s.url,
    label: s.type === 'video' ? `Guest video • ${s.label}` : `Guest photo • ${s.label}`
  }));
}

async function refreshHostSlidesOnce(){
  const eventCode = getEventCodeFromUrl();
  const galleryStatus = document.getElementById('galleryStatus');
  const hostGallery = document.getElementById('hostGallery');

  try{
    const data = await fetchSlides(eventCode);
    const slides = data.slides || [];
    const items = toSlideshowItems(slides);
    window.setSlideshowItems(items);

    if (galleryStatus) galleryStatus.textContent = `Loaded ${slides.length} uploads`;

    // render gallery thumbnails (newest first = server already sorts by createdAt)
    if (hostGallery){
      hostGallery.innerHTML = '';
      for (const s of slides.slice(0, 120)){
        const item = document.createElement('div');
        item.className = 'gallery-item';

        if (s.type === 'video'){
          const v = document.createElement('video');
          v.src = s.url;
          v.controls = false;
          v.muted = true;
          v.playsInline = true;
          item.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = s.url;
          img.alt = s.label || 'Guest upload';
          item.appendChild(img);
        }

        const meta = document.createElement('div');
        meta.className = 'gallery-meta';
        meta.textContent = s.label || 'Guest';
        item.appendChild(meta);

        hostGallery.appendChild(item);
      }
    }

    // storage demo fields
    const storageCount = document.getElementById('storageCount');
    if (storageCount) storageCount.textContent = String((data.slides || []).length);
    const slideTotalEl = document.getElementById('slideTotal');
    if (slideTotalEl) slideTotalEl.textContent = String(items.length);

  }catch(e){
    console.error(e);
    if (document.getElementById('galleryStatus')){
      document.getElementById('galleryStatus').textContent = 'Backend not reachable / no uploads yet';
    }
  }
}

function startSlidesPolling(){
  stopSlidesPolling();
  refreshHostSlidesOnce();
  slidesPollTimer = window.setInterval(() => {
    refreshHostSlidesOnce();
  }, slidesPollingMs);
}

function stopSlidesPolling(){
  if (slidesPollTimer) window.clearInterval(slidesPollTimer);
  slidesPollTimer = null;
}

function initHost(){
  if (hostInitialized) return;
  hostInitialized = true;

  // If backend is reachable, we’ll replace demo slides with real ones.
  initDemoSlideshow();
  initControls();
  initEventManagement();
  initQr();

  document.getElementById('galleryRefreshBtn')?.addEventListener('click', () => {
    refreshHostSlidesOnce();
  });

  // default behavior
  startSlideshow();

  // live updates
  startSlidesPolling();
}

// Expose hook for later backend integration
window.setSlideshowItems = setSlideshowItems;


