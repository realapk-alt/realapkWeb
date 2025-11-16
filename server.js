// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Main endpoint
app.post('/api/fetch', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'No url provided' });

  // validate domain
  try {
    const u = new URL(url);
    if (!/(instagram\.com|facebook\.com)/i.test(u.hostname)) {
      return res.status(400).json({ error: 'Only Instagram / Facebook URLs supported in this demo' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
    await page.setViewport({ width: 412, height: 915 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const out = { found: false, methods: {} };
      try {
        const vid = document.querySelector('video');
        if (vid && vid.src) {
          out.found = true;
          out.methods.video_src = vid.src;
        }
        if (!out.found) {
          const m = document.querySelector('meta[property="og:video:secure_url"]') ||
                    document.querySelector('meta[property="og:video"]') ||
                    document.querySelector('meta[property="og:video:url"]');
          if (m && m.content) {
            out.found = true;
            out.methods.og_video = m.content;
          }
        }
        if (!out.found) {
          const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
          for (const s of scripts) {
            try {
              const j = JSON.parse(s.textContent);
              if (j && j.contentUrl) {
                out.found = true;
                out.methods.ld_contentUrl = j.contentUrl;
                break;
              }
              if (j && j.video && j.video.contentUrl) {
                out.found = true;
                out.methods.ld_video_contentUrl = j.video.contentUrl;
                break;
              }
            } catch (e) {}
          }
        }
        if (!out.found) {
          try {
            const w = window._sharedData || window.__additionalData || window.__INITIAL_STATE__ || window.__INITIAL_DATA__;
            const walker = (node) => {
              if (!node || typeof node !== 'object') return null;
              if (node.video_url && typeof node.video_url === 'string') return node.video_url;
              if (node.display_url && typeof node.display_url === 'string') return node.display_url;
              for (const k in node) {
                try {
                  const r = walker(node[k]);
                  if (r) return r;
                } catch (e) {}
              }
              return null;
            };
            const v = walker(w);
            if (v) {
              out.found = true;
              out.methods.shared_data = v;
            }
          } catch (e) {}
        }
        if (!out.found) {
          const html = document.documentElement.innerHTML;
          const m = html.match(/https?:\/\/[^"']+\.mp4[^"']*/i);
          if (m && m[0]) {
            out.found = true;
            out.methods.bruteforce_mp4 = m[0];
          }
        }
      } catch (err) {
        out.error = String(err);
      }
      return out;
    });

    let videoUrl = null;
    if (result.found) {
      const methods = result.methods || {};
      const candidates = [methods.video_src, methods.og_video, methods.ld_contentUrl, methods.ld_video_contentUrl, methods.shared_data, methods.bruteforce_mp4];
      for (const c of candidates) {
        if (c && typeof c === 'string' && c.startsWith('http')) {
          videoUrl = c;
          break;
        }
      }
    }

    if (videoUrl && videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

    if (!videoUrl) {
      await browser.close();
      return res.status(404).json({ error: 'Video not found / private or blocked', debug: result });
    }

    const urlPath = new URL(videoUrl).pathname;
    const filename = path.basename(urlPath) || 'video.mp4';

    await browser.close();
    return res.json({ video_url: videoUrl, filename, debug: result });
  } catch (err) {
    if (browser) try { await browser.close(); } catch (e) {}
    console.error('Fetch error', err);
    return res.status(500).json({ error: 'Server error fetching remote page', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
