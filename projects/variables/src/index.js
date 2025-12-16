// index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const openDb = require('./db');
const dbFile = process.env.DATABASE_FILE || './mnemosyne.sqlite';
const db = openDb();

const {
  slugifyTitle,
  parseWikiLinks,
  personTemplate,
  placeTemplate,
  thingTemplate,
  memoryTemplate
} = require('./utils');

const {
  commitWithRetry,
  createOrUpdateFile,
  ensureBranchExists,
  COMMIT_BRANCH
} = require('./github');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
const upload = multer({ dest: './tmp_uploads' });

// Helper: run SQL with Promise
function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function getSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function allSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// auth: register/login
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const existing = await getSql('SELECT * FROM users WHERE email = ?', [email]).catch(()=>null);
  if (existing) return res.status(409).json({ error: 'user exists' });
  const hash = await bcrypt.hash(password, 10);
  const stmt = await runSql('INSERT INTO users (email,password_hash,display_name,approved,is_admin) VALUES (?,?,?,?,?)',
    [email, hash, displayName || email.split('@')[0], 0, 0]);
  return res.json({ success: true, message: 'Registered; waiting for admin approval' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await getSql('SELECT * FROM users WHERE email=?', [email]).catch(()=>null);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  if (!user.approved) return res.status(403).json({ error: 'account not approved' });
  // issue JWT
  const token = jwt.sign({ id: user.id, email: user.email, is_admin: !!user.is_admin, display_name: user.display_name }, JWT_SECRET, { expiresIn: '8h' });
  // httpOnly cookie
  res.cookie('mnemo_token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ success: true, user: { id: user.id, email: user.email, display_name: user.display_name, is_admin: user.is_admin } });
});

// auth middleware
function authRequired(req, res, next) {
  const token = req.cookies?.mnemo_token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'auth required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'admin only' });
    next();
  });
}

// Admin endpoints
app.get('/api/admin/pending', adminRequired, async (req, res) => {
  const rows = await allSql('SELECT id, email, display_name, created_at FROM users WHERE approved=0');
  res.json({ pending: rows });
});
app.post('/api/admin/approve', adminRequired, async (req, res) => {
  const { id, approve } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  await runSql('UPDATE users SET approved=? WHERE id=?', [approve ? 1 : 0, id]);
  res.json({ success: true });
});

// Entries: search, create, get, graph
app.get('/api/search', authRequired, async (req, res) => {
  // simple param
  const q = (req.query.query || '').trim();
  if (!q) return res.json({ results: [] });
  // search in DB first, fallback to case-insensitive title match
  const rows = await allSql('SELECT id, title, type, path FROM entries WHERE title LIKE ? LIMIT 20', [`%${q}%`]);
  res.json({ results: rows });
});

app.get('/api/entries', authRequired, async (req, res) => {
  const type = req.query.type;
  const limit = parseInt(req.query.limit || '50');
  const offset = parseInt(req.query.offset || '0');
  let sql = 'SELECT id,title,type,path,created_by,created_at FROM entries';
  const params = [];
  if (type) {
    sql += ' WHERE type=?';
    params.push(type);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const rows = await allSql(sql, params);
  res.json({ entries: rows });
});

app.get('/api/entries/:id', authRequired, async (req, res) => {
  const id = req.params.id;
  const row = await getSql('SELECT * FROM entries WHERE id=?', [id]);
  if (!row) return res.status(404).json({ error: 'not found' });
  // fetch file content from GitHub branch
  try {
    const f = await require('./github').getFileOnBranch(row.path, COMMIT_BRANCH);
    const content = Buffer.from(f.content, 'base64').toString('utf8');
    res.json({ meta: row, markdown: content });
  } catch (e) {
    return res.status(500).json({ error: 'failed to read file', detail: e.message || e });
  }
});

// image upload (temp store then commit)
app.post('/api/upload-image', authRequired, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const tmpPath = req.file.path;
  const originalName = req.file.originalname || 'image';
  const uniqueName = `${Date.now()}_${originalName.replace(/\s+/g,'_')}`;
  const destPath = `assets/images/${uniqueName}`;
  const buf = fs.readFileSync(tmpPath);
  try {
    const msg = `Mnemosyne: Add Image ${uniqueName} (by ${req.user.email})`;
    const result = await commitWithRetry(destPath, buf, msg, 3, req.user.email);
    fs.unlinkSync(tmpPath);
    // return canonical path that user templates should reference
    const publicPath = destPath;
    res.json({ success: true, path: publicPath, commit: result });
  } catch (e) {
    fs.unlinkSync(tmpPath);
    res.status(500).json({ error: 'commit failed', detail: e.message || e });
  }
});

function buildMarkdownByType(type, fields) {
  if (type === 'person') return personTemplate(fields);
  if (type === 'place') return placeTemplate(fields);
  if (type === 'thing') return thingTemplate(fields);
  if (type === 'memory') return memoryTemplate(fields);
  throw new Error('unknown type');
}

app.post('/api/entries', authRequired, async (req, res) => {
  const { type, fields } = req.body;
  if (!type || !fields) return res.status(400).json({ error: 'type and fields required' });
  // validate required per type (simplified)
  if (type === 'person' && !fields.first_name && !fields.displayName) {
    return res.status(400).json({ error: 'first_name or displayName required' });
  }
  // build markdown
  const markdown = buildMarkdownByType(type, fields);
  const title = fields.displayName || `${fields.first_name || ''} ${fields.last_name || ''}`.trim() || fields.title || 'Untitled';
  const slug = slugifyTitle(title);
  const filepath = `assets/${type}s/${slug}.md`;

  // commit markdown
  const buffer = Buffer.from(markdown, 'utf8');
  const commitMsg = `Mnemosyne: Add ${type} ${title} (by ${req.user.email})`;

  try {
    const commitRes = await commitWithRetry(filepath, buffer, commitMsg, 3, req.user.email);
    // store metadata in DB
    const ins = await runSql('INSERT INTO entries (title,type,path,created_by,commit_sha) VALUES (?,?,?,?,?)',
      [title, type, filepath, req.user.id, commitRes?.content?.sha || (commitRes.pr ? commitRes.pr.head.sha : null)]);
    res.json({ success: true, path: filepath, commit: commitRes });
  } catch (e) {
    // fallback: write to local file as recovery
    const localDir = './offline_saves';
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir);
    const localFile = path.join(localDir, `${slug}.md`);
    fs.writeFileSync(localFile, markdown);
    return res.status(500).json({ error: 'commit failed; saved locally', detail: e.message || e, local: localFile });
  }
});

app.put('/api/entries/:id', authRequired, async (req, res) => {
  const id = req.params.id;
  const { fields } = req.body;
  const row = await getSql('SELECT * FROM entries WHERE id=?', [id]);
  if (!row) return res.status(404).json({ error: 'entry not found' });
  const markdown = buildMarkdownByType(row.type, fields);
  const buffer = Buffer.from(markdown, 'utf8');
  const commitMsg = `Mnemosyne: Update ${row.type} ${row.title} (by ${req.user.email})`;
  try {
    const commitRes = await commitWithRetry(row.path, buffer, commitMsg, 3, req.user.email);
    await runSql('UPDATE entries SET commit_sha=? WHERE id=?', [commitRes?.content?.sha || null, id]);
    res.json({ success: true, commit: commitRes });
  } catch (e) {
    return res.status(500).json({ error: 'commit failed', detail: e.message || e });
  }
});

// graph endpoint: read all entries from DB, fetch files and parse wiki links
app.get('/api/graph', authRequired, async (req, res) => {
  try {
    // read DB index
    const all = await allSql('SELECT id,title,type,path FROM entries');
    const nodes = all.map(r => ({ id: r.id, title: r.title, path: r.path, type: r.type }));
    const edges = [];
    // fetch each file content from GitHub
    const { getFileOnBranch } = require('./github');
    for (const r of all) {
      try {
        const f = await getFileOnBranch(r.path, COMMIT_BRANCH);
        if (!f) continue;
        const txt = Buffer.from(f.content, 'base64').toString('utf8');
        const links = parseWikiLinks(txt);
        for (const linkTitle of links) {
          // find node id by title (simple approach)
          const target = all.find(x => x.title === linkTitle);
          if (target) edges.push({ from: r.id, to: target.id });
        }
      } catch (e) {
        // ignore single file errors
      }
    }
    res.json({ nodes, edges });
  } catch (e) {
    res.status(500).json({ error: 'graph failed', detail: e.message || e });
  }
});

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// static files for debugging
app.use('/static', express.static(path.join(__dirname, 'static')));

app.listen(PORT, () => console.log(`Mnemosyne backend listening on ${PORT}`));
