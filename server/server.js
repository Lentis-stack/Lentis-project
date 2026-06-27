require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { nanoid } = require('nanoid');

const app = express();

const PORT = process.env.PORT || 3001;
// PUBLIC_URL is used to generate links to uploaded media.
// Keep it flexible for mobile: set PUBLIC_URL to the LAN IP of the machine running this server.
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;


// Directory storage (demo-local). Hosts can later swap to S3/Dropbox/etc.
const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(__dirname, 'uploads');

// Ensure storage root exists
fs.mkdirSync(STORAGE_ROOT, { recursive: true });

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// Serve frontend + shared assets (images, styles.css, html) from project root.
const STATIC_ROOT = process.env.STATIC_ROOT || path.join(__dirname, '..');
app.use(express.static(STATIC_ROOT));
app.use('/frontend', express.static(path.join(STATIC_ROOT, 'frontend')));
app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(STATIC_ROOT, 'frontend', 'styles.css'));
});


// Serve uploaded media statically
app.use('/uploads', express.static(STORAGE_ROOT, {



  setHeaders(res) {
    // Improve cache behavior; host can always append cache-busting query if desired.
    res.setHeader('Cache-Control', 'public, max-age=60');
  }
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const eventCode = (req.body.eventCode || '').trim();
    if (!eventCode) return cb(new Error('eventCode is required'));

    const guestId = (req.body.guestId || 'guest').trim();
    const uploadId = req.body.uploadId;

    // uploads/<eventCode>/<uploadId>/...
    const dir = path.join(STORAGE_ROOT, eventCode, uploadId, guestId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const originalExt = path.extname(file.originalname) || '';
    const safeExt = originalExt.length <= 10 ? originalExt : '';
    const unique = nanoid(10);
    cb(null, `${file.fieldname}-${Date.now()}-${unique}${safeExt}`);
  }
});

// 3000 images + 500 videos capacity is a marketing requirement; real capacity is based on disk.
// We enforce reasonable per-file limits so large uploads don't kill your server.
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || String(60 * 1024 * 1024), 10) // 60MB
  }
});

// In-memory index (demo). For production, persist to a DB.
// Structure:
// events[eventCode] = [{ id, guestName, type, mime, url, createdAt }]
const events = new Map();

function getEventList(eventCode) {
  const k = eventCode.trim();
  if (!events.has(k)) events.set(k, []);
  return events.get(k);
}

function makePublicUrl(filePathInsideUploads) {
  // filePathInsideUploads is relative to STORAGE_ROOT
  return `${PUBLIC_URL}/uploads/${filePathInsideUploads.split(path.sep).join('/')}`;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Upload one or more files for a specific event.
// Accepts multipart form:
// - eventCode (required)
// - guestName (required)
// - guestId (optional, defaults to guest)
// - media: files (field name "media")
app.post(
  '/api/upload',
  upload.array('media', 12),
  (req, res, next) => {
    try {
      const eventCode = (req.body.eventCode || '').trim();
      const guestName = (req.body.guestName || '').trim();
      const guestId = (req.body.guestId || 'guest').trim();
      const uploadId = req.body.uploadId || nanoid(12);

      if (!eventCode) return res.status(400).json({ error: 'eventCode is required' });
      if (!guestName) return res.status(400).json({ error: 'guestName is required' });
      if (!req.files || !req.files.length) return res.status(400).json({ error: 'media files are required' });

      const list = getEventList(eventCode);

      const createdAt = new Date().toISOString();
      const uploaded = req.files.map((f) => {
        // f.path is absolute: STORAGE_ROOT/<eventCode>/<uploadId>/<guestId>/<filename>
        const rel = path.relative(STORAGE_ROOT, f.path);
        const url = makePublicUrl(rel);
        const type = (f.mimetype || '').startsWith('video/') ? 'video' : 'image';

        const id = nanoid(16);
        const item = {
          id,
          uploadId,
          guestId,
          guestName,
          eventCode,
          type,
          mime: f.mimetype,
          url,
          createdAt
        };
        list.push(item);
        return item;
      });

      // Capacity enforcement (soft):
      // - Keep at most 3500 images and 800 videos per event in memory.
      // For real persistence + strict limits, use DB.
      const images = list.filter((x) => x.type === 'image');
      const videos = list.filter((x) => x.type === 'video');

      const maxImages = parseInt(process.env.MAX_IMAGES_PER_EVENT || '3000', 10);
      const maxVideos = parseInt(process.env.MAX_VIDEOS_PER_EVENT || '500', 10);

      if (images.length > maxImages) {
        // remove oldest extra images from index (files remain on disk for now)
        const keepImages = images.slice(images.length - maxImages).map((x) => x.id);
        events.set(eventCode, list.filter((x) => (x.type === 'video') || keepImages.includes(x.id)));
      }
      if (videos.length > maxVideos) {
        const current = events.get(eventCode);
        const imgs = current.filter((x) => x.type === 'image');
        const keepVideoIds = current
          .filter((x) => x.type === 'video')
          .slice(-maxVideos)
          .map((x) => x.id);
        events.set(eventCode, imgs.concat(current.filter((x) => x.type === 'video' && keepVideoIds.includes(x.id))));
      }

      res.json({ ok: true, uploaded });
    } catch (e) {
      next(e);
    }
  }
);

app.get('/api/events/:eventCode/slides', (req, res) => {
  const eventCode = req.params.eventCode || '';
  const list = getEventList(eventCode);

  // Return newest first for a host gallery; slideshow can decide ordering.
  const slides = list
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((item) => ({
      id: item.id,
      type: item.type,
      mime: item.mime,
      url: item.url,
      label: item.guestName
    }));

  res.json({ ok: true, eventCode, count: slides.length, slides });
});

// Optional: host view for gallery pagination
app.get('/api/events/:eventCode/media', (req, res) => {
  const eventCode = req.params.eventCode || '';
  const list = getEventList(eventCode);

  const limit = Math.min(parseInt(req.query.limit || '60', 10), 200);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

  const sorted = list
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const page = sorted.slice(offset, offset + limit).map((item) => ({
    id: item.id,
    type: item.type,
    mime: item.mime,
    url: item.url,
    label: item.guestName,
    createdAt: item.createdAt
  }));

  res.json({ ok: true, eventCode, count: list.length, items: page, limit, offset });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err?.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Event Gallery backend listening on ${PUBLIC_URL}`);
  console.log(`Uploads directory: ${STORAGE_ROOT}`);
});

