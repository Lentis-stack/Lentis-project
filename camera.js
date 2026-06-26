const params = new URLSearchParams(window.location.search);
const guestName = (params.get('name') || 'Guest').trim();
const eventCode = params.get('event') || '';

document.getElementById('guestPill').textContent = eventCode ? `Event: ${eventCode}` : guestName;
document.getElementById('guestSubtitle').textContent = `Hi ${guestName} — take a photo or video.`;

const cameraBg = document.getElementById('cameraBg');
// IMPORTANT: set your background image here
cameraBg.style.backgroundImage = 'url("wedding bgd 2.jpg")';

const video = document.getElementById('video');
const captureCanvas = document.getElementById('captureCanvas');
const capturedItems = document.getElementById('capturedItems');

const enableCameraBtn = document.getElementById('enableCameraBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');
const recordVideoBtn = document.getElementById('recordVideoBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');

const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const clearBtn = document.getElementById('clearBtn');

let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// Preferred approach for mobile reliability:
// Switch by deviceId (facingMode is unreliable on many iOS devices).
// Fallback: facingMode best-effort.
let currentFacing = 'user'; // 'user' (front) | 'environment' (back)
let switching = false;
let cachedVideoDevices = []; // [{deviceId,label,facingHint}]

function supportsMediaRecorder(){
  return typeof MediaRecorder !== 'undefined';
}

function stopStreamTracks(){
  if (!stream) return;
  try{
    stream.getTracks().forEach(t => t.stop());
  }catch{}
  stream = null;
}

async function refreshVideoDevices(){
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevs = devices.filter(d => d.kind === 'videoinput');

    // labels may be empty until permission granted
    cachedVideoDevices = videoDevs.map(d => {
      const label = d.label || '';
      const lower = label.toLowerCase();

      // best-effort facing hints
      const isFront = /front|user|self|facetime|true(depth)?/i.test(label);
      const isBack = /back|rear|environment|wide/i.test(label);

      return {
        deviceId: d.deviceId,
        label,
        facingHint: isBack ? 'environment' : (isFront ? 'user' : null)
      };
    });
  }catch{
    cachedVideoDevices = [];
  }
}

function pickDeviceIdForFacing(facing){
  // 1) Exact hint match
  const hinted = cachedVideoDevices.filter(d => d.facingHint === facing);
  if (hinted[0]?.deviceId) return hinted[0].deviceId;

  // 2) Fallback heuristics: pick second device for environment
  if (cachedVideoDevices.length >= 2){
    if (facing === 'user') return cachedVideoDevices[0].deviceId;
    return cachedVideoDevices[1].deviceId;
  }

  return null;
}

function humanizeCameraError(err){
  const name = err?.name || 'Error';
  const msg = err?.message ? String(err.message) : '';
  const lower = `${name} ${msg}`.toLowerCase();

  let hint = 'Camera access failed due to browser/security/device restrictions.';
  if (lower.includes('notallowed') || lower.includes('permission')) {
    hint = 'Permission was denied by the browser. Allow Camera permission for this site.';
  } else if (lower.includes('insecure') || lower.includes('https') || lower.includes('secure')) {
    hint = 'This page must be served over HTTPS (or localhost) for camera access.';
  } else if (lower.includes('notfound') || lower.includes('overconstrained')) {
    hint = 'No camera device matched the requested constraints. Try switching again or use Upload.';
  } else if (lower.includes('notreadable') || lower.includes('busy')) {
    hint = 'Camera is already in use by another app/tab. Close other camera usage and retry.';
  }

  return { name, msg, hint };
}

async function startCamera({ facing = currentFacing, deviceId = null } = {}){
  if (switching) return;
  switching = true;

  try{
    // Ensure devices list is up to date (labels require permission)
    if (!cachedVideoDevices.length) await refreshVideoDevices();

    // Stop previous stream before requesting new one
    stopStreamTracks();

    let constraints;
    const chosenDeviceId = deviceId ?? pickDeviceIdForFacing(facing);

    if (chosenDeviceId){
      constraints = {
        video: {
          deviceId: { exact: chosenDeviceId }
        },
        audio: false
      };
    } else {
      // Fallback for devices where we can't use deviceId switching
      constraints = {
        video: {
          facingMode: { ideal: facing }
        },
        audio: false
      };
    }

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    // Some mobile browsers require explicit play() after srcObject swap
    try{ await video.play(); }catch{}

    // Enable capture controls after camera is ready
    capturePhotoBtn.disabled = false;
    recordVideoBtn.disabled = false;
    if (switchCameraBtn) switchCameraBtn.disabled = false;

  }catch(err){
    console.error(err);

    const { name, msg, hint } = humanizeCameraError(err);

    alert(
      'Camera access failed (' + name + ').\n' +
      (msg ? (msg + '\n') : '') +
      hint +
      '\n\n1) Ensure you opened this in Safari/Chrome (not in-app browser)\n' +
      '2) If it still fails, use the Upload button as a fallback.'
    );

    capturePhotoBtn.disabled = true;
    recordVideoBtn.disabled = true;
    if (switchCameraBtn) switchCameraBtn.disabled = true;
  }finally{
    switching = false;
  }
}

async function switchCamera(){
  if (!stream) return;
  if (switching) return;
  if (isRecording) return; // keep stable on mobile

  const nextFacing = currentFacing === 'user' ? 'environment' : 'user';

  if (switchCameraBtn) switchCameraBtn.disabled = true;
  capturePhotoBtn.disabled = true;
  recordVideoBtn.disabled = true;
  stopRecordBtn.disabled = true;

  currentFacing = nextFacing;

  // Refresh devices after we have permission (labels now available)
  await refreshVideoDevices();

  await startCamera({ facing: currentFacing });
}

function addThumbnailFromBlob(blob, type){
  const wrap = document.createElement('div');
  wrap.className = 'thumb';

  const url = URL.createObjectURL(blob);

  if (type && type.startsWith('video/')){
    const v = document.createElement('video');
    v.src = url;
    v.controls = true;
    v.playsInline = true;
    wrap.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Captured media';
    wrap.appendChild(img);
  }

  capturedItems.prepend(wrap);
}

capturePhotoBtn.addEventListener('click', () => {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;

  captureCanvas.width = w;
  captureCanvas.height = h;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);

  captureCanvas.toBlob((blob) => {
    if (!blob) return;
    addThumbnailFromBlob(blob, blob.type || 'image/png');
  }, 'image/jpeg', 0.92);
});

function safeDisableWhileRecording(){
  recordVideoBtn.disabled = true;
  stopRecordBtn.disabled = false;
}

recordVideoBtn.addEventListener('click', async () => {
  if (!supportsMediaRecorder()){
    alert('Recording is not supported on this device/browser. You can still upload files.');
    return;
  }

  if (!stream) await startCamera({ facing: currentFacing });
  if (!stream) return;

  recordedChunks = [];

  const options = (() => {
    const candidates = [
      { mimeType: 'video/webm;codecs=vp9' },
      { mimeType: 'video/webm;codecs=vp8' },
      { mimeType: 'video/webm' }
    ];
    for (const c of candidates){
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.mimeType)) return c;
    }
    return {};
  })();

  try{
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: recordedChunks[0]?.type || 'video/webm' });
      addThumbnailFromBlob(blob, blob.type);
      isRecording = false;

      // restore UI
      stopRecordBtn.disabled = true;
      recordVideoBtn.disabled = false;
      stopRecordBtn.style.opacity = '1';
      recordVideoBtn.style.opacity = '1';
      if (switchCameraBtn) switchCameraBtn.disabled = false;
    };

    safeDisableWhileRecording();

    mediaRecorder.start();
    isRecording = true;
    recordVideoBtn.style.opacity = '0.75';
    stopRecordBtn.style.opacity = '1';

    if (switchCameraBtn) switchCameraBtn.disabled = true;

  }catch(err){
    console.error(err);
    alert('Could not start video recording.');
  }
});

stopRecordBtn.addEventListener('click', () => {
  if (!mediaRecorder || !isRecording) return;
  try{ mediaRecorder.stop(); }catch{}
});

uploadBtn.addEventListener('click', () => {
  const files = Array.from(fileInput.files || []);
  if (!files.length) return;

  for (const f of files){
    addThumbnailFromBlob(f, f.type);
  }

  fileInput.value = '';
});

clearBtn.addEventListener('click', () => {
  capturedItems.innerHTML = '';
});

// start camera after explicit user gesture (mobile browsers block autoplay permissions)
const enableCamera = enableCameraBtn;
if (enableCamera){
  enableCamera.addEventListener('click', async () => {
    enableCamera.disabled = true;
    enableCamera.textContent = 'Opening camera...';

    currentFacing = 'user';
    await refreshVideoDevices();
    await startCamera({ facing: currentFacing });

    if (stream){
      enableCamera.style.display = 'none';
      capturePhotoBtn.disabled = false;
      recordVideoBtn.disabled = false;
      if (switchCameraBtn) switchCameraBtn.disabled = false;
    }else{
      enableCamera.disabled = false;
      enableCamera.textContent = 'Enable Camera';
    }
  });
}

if (switchCameraBtn){
  switchCameraBtn.addEventListener('click', async () => {
    await switchCamera();
  });
}

// Secondary safety: attempt camera on first user interaction if not started.
let triedOnce = false;
window.addEventListener('touchstart', async () => {
  if (triedOnce) return;
  triedOnce = true;

  if (!stream){
    try{
      currentFacing = 'user';
      await refreshVideoDevices();
      await startCamera({ facing: currentFacing });
    }catch{}
  }
},{ once:true });

// cleanup
window.addEventListener('beforeunload', () => {
  try{
    if (stream){
      stream.getTracks().forEach(t => t.stop());
    }
  }catch{}
});

