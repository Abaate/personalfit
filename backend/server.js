// server.js (versão atualizada — integra conversão via FFmpeg + fila + busca no dataset)
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const fsExtra = require('fs-extra');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Serve favicon (evita 404 no console)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/favicon.ico'));
});

// Servir frontend estático (ajuste o path se necessário)
const FRONTEND_DIR = path.join(__dirname, '../frontend');
app.use(express.static(FRONTEND_DIR));

const SECRET_KEY = process.env.SECRET_KEY || "chave_secreta_fitapp_producao";

/* ---------------- Dataset loading (mesmo comportamento anterior) ---------------- */
const DATASET_OWNER = 'hasaneyldrm';
const DATASET_REPO = 'exercises-dataset';
const DATASET_BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${DATASET_OWNER}/${DATASET_REPO}/${DATASET_BRANCH}/`;

let exercisesDataset = [];

/* utility functions reused/ported */
function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
}
function isHttpUrl(s) {
    return typeof s === 'string' && /^https?:\/\//i.test(s);
}
function resolveRelativePathToRaw(p) {
    if (!p || typeof p !== 'string') return null;
    const trimmed = p.replace(/^\/*/, '');
    return RAW_BASE + trimmed;
}
function extractYouTubeIdFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const m1 = url.match(/(?:youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m1) return m1[1];
    const m2 = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (m2) return m2[1];
    const m3 = url.match(/\/embed\/([A-Za-z0-9_-]{11})/);
    if (m3) return m3[1];
    return null;
}
function isVideoOrImageFileString(s) {
    if (!s || typeof s !== 'string') return false;
    const lower = s.toLowerCase();
    return lower.match(/\.(mp4|webm|ogg|gif|jpe?g|png|webp)(\?|$)/) || lower.includes('youtube.com') || lower.includes('youtu.be');
}
function findVideoUrlInObject(obj, depth = 0) {
    if (!obj || depth > 6) return null;
    if (typeof obj === 'string') {
        const s = obj.trim();
        if (isVideoOrImageFileString(s)) {
            if (!isHttpUrl(s)) {
                return resolveRelativePathToRaw(s);
            }
            const yt = extractYouTubeIdFromUrl(s);
            if (yt) return `https://www.youtube.com/watch?v=${yt}`;
            return s;
        }
        if (/^[A-Za-z0-9_-]{11}$/.test(s)) {
            return `https://www.youtube.com/watch?v=${s}`;
        }
        if (s.match(/^(images|videos|assets)\/.+/i)) {
            return resolveRelativePathToRaw(s);
        }
        return null;
    }
    if (Array.isArray(obj)) {
        for (const v of obj) {
            const found = findVideoUrlInObject(v, depth + 1);
            if (found) return found;
        }
        return null;
    }
    if (typeof obj === 'object') {
        const priorityKeys = ['video', 'videos', 'video_url', 'videoUrl', 'gif_url', 'gif', 'image', 'image_url', 'imageUrl', 'youtube', 'youtube_id', 'media', 'demonstration', 'demo', 'url', 'link', 'files', 'resources', 'assets'];
        for (const k of priorityKeys) {
            if (k in obj && obj[k]) {
                const found = findVideoUrlInObject(obj[k], depth + 1);
                if (found) return found;
            }
        }
        for (const key of Object.keys(obj)) {
            const found = findVideoUrlInObject(obj[key], depth + 1);
            if (found) return found;
        }
    }
    return null;
}
function getUrlFromItem(item) {
    if (!item) return null;
    const directKeys = ['demonstration', 'demonstracao', 'demo', 'video', 'videos', 'youtube', 'video_url', 'videoUrl', 'gif_url', 'gif', 'image', 'image_url', 'media', 'url', 'link'];
    for (const k of directKeys) {
        if (k in item && item[k]) {
            const cand = item[k];
            if (typeof cand === 'string') {
                const s = cand.trim();
                if (isVideoOrImageFileString(s)) {
                    if (!isHttpUrl(s)) return resolveRelativePathToRaw(s);
                    const yt = extractYouTubeIdFromUrl(s);
                    if (yt) return `https://www.youtube.com/watch?v=${yt}`;
                    return s;
                }
                if (/^[A-Za-z0-9_-]{11}$/.test(s)) return `https://www.youtube.com/watch?v=${s}`;
                if (s.match(/^(images|videos|assets)\/.+/i)) return resolveRelativePathToRaw(s);
            } else {
                const rec = findVideoUrlInObject(cand);
                if (rec) return rec;
            }
        }
    }
    const rec = findVideoUrlInObject(item);
    if (rec) return rec;
    return null;
}

function tryRequireDataset() {
    try {
        const pkg = require('@hasaneyldrm/exercises-dataset');
        if (Array.isArray(pkg)) return pkg;
        if (Array.isArray(pkg.exercises)) return pkg.exercises;
        if (Array.isArray(pkg.default)) return pkg.default;
        if (Array.isArray(pkg.default?.exercises)) return pkg.default.exercises;
        if (pkg && typeof pkg === 'object') {
            const arr = Object.values(pkg).find(v => Array.isArray(v));
            if (arr) return arr;
        }
        return [];
    } catch (e) {
        return null;
    }
}
function fetchJsonRaw(url, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        https.get(url, { timeout: timeoutMs }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} ao buscar ${url}`));
                res.resume();
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (err) {
                    reject(new Error('JSON parse error from ' + url + ': ' + err.message));
                }
            });
        }).on('error', (err) => reject(err));
    });
}
async function tryFetchFromGitHub() {
    const filePath = 'data/exercises.json';
    const url = `${RAW_BASE}${filePath}`;
    try {
        const result = await fetchJsonRaw(url, 60000);
        if (Array.isArray(result)) return result;
        if (Array.isArray(result.exercises)) return result.exercises;
        if (Array.isArray(result.default)) return result.default;
        if (Array.isArray(result.default?.exercises)) return result.default.exercises;
        const arr = Object.values(result).find(v => Array.isArray(v));
        if (arr) return arr;
        return [];
    } catch (err) {
        console.warn('Erro ao buscar exercises.json do GitHub:', err.message);
        return [];
    }
}

async function loadExercisesDataset() {
    const required = tryRequireDataset();
    if (required === null) {
        console.log('⚠️ Pacote @hasaneyldrm/exercises-dataset não encontrado via require. Tentando baixar data/exercises.json do GitHub...');
        const fetched = await tryFetchFromGitHub();
        if (fetched && fetched.length) {
            exercisesDataset = fetched;
            console.log(`✅ Dataset carregado via GitHub raw (${exercisesDataset.length} itens).`);
            return;
        } else {
            exercisesDataset = [];
            console.warn('⚠️ Não foi possível carregar dataset do GitHub (resultado vazio).');
            return;
        }
    } else {
        exercisesDataset = required;
        console.log(`✅ Dataset carregado via require (${exercisesDataset.length} itens).`);
        return;
    }
}
loadExercisesDataset().catch(e => {
    exercisesDataset = [];
    console.warn('⚠️ Erro ao carregar exercises-dataset:', e.message);
});

/* ---------------- Simple levenshtein & search (copiado) ---------------- */
function levenshtein(a, b) {
    if (a === b) return 0;
    const al = a.length;
    const bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    let v0 = new Array(bl + 1);
    let v1 = new Array(bl + 1);
    for (let i = 0; i <= bl; i++) v0[i] = i;
    for (let i = 0; i < al; i++) {
        v1[0] = i + 1;
        for (let j = 0; j < bl; j++) {
            const cost = a[i] === b[j] ? 0 : 1;
            v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
        }
        const tmp = v0;
        v0 = v1;
        v1 = tmp;
    }
    return v0[bl];
}
function findMatchesSimple(query, limit = 6) {
    if (!query || !exercisesDataset || exercisesDataset.length === 0) return [];
    const q = normalize(query);
    const qTokens = q.split(' ').filter(Boolean);
    const scored = [];

    for (const item of exercisesDataset) {
        const originalName = item.name || item.title || item.nome || item.exercise || item.label || '';
        const n = normalize(originalName);
        if (!n) continue;
        const url = getUrlFromItem(item);

        // compute scores
        const nTokens = n.split(' ').filter(Boolean);
        const common = qTokens.filter(t => nTokens.includes(t)).length;
        const tokenRatio = qTokens.length ? (common / qTokens.length) : 0;
        const contains = n.includes(q) ? 1 : 0;
        const dist = levenshtein(n, q);
        const levSim = 1 - (dist / Math.max(1, Math.max(n.length, q.length)));
        let score = 0;
        if (n === q) score += 200;
        score += tokenRatio * 100;
        score += contains ? 100 : 0;
        score += levSim * 40;
        if (url) score += 10;

        if (score > 5) {
            scored.push({ item, name: originalName, normalized: n, url, score });
        }
    }

    scored.sort((a,b) => b.score - a.score);
    const unique = [];
    const seen = new Set();
    for (const s of scored) {
        if (seen.has(s.normalized)) continue;
        seen.add(s.normalized);
        unique.push({ name: s.name, url: s.url || null, score: Math.round(s.score), raw: s.item });
        if (unique.length >= limit) break;
    }
    return unique;
}

/* ---------------- Auth middleware (mesmo) ---------------- */
function authenticateToken(req, res, next) {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

    jwt.verify(token.replace('Bearer ', ''), SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
}

/* ---------------- Existing routes (login, cadastro, etc.) ---------------- */
// -- (mantenho as rotas originais que você já tinha; copio aqui apenas para contexto, sem mudanças relevantes)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }
        const token = jwt.sign({ id: user.id, role: user.role, nome: user.nome_completo }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: user.role, id: user.id, nome: user.nome_completo });
    });
});

app.post('/api/cadastrar', async (req, res) => {
    const { nome_completo, username, password, role = 'aluno' } = req.body;
    if (!nome_completo || !username || !password) {
        return res.status(400).json({ error: 'nome_completo, username e password são obrigatórios.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (nome_completo, username, password, role) VALUES (?, ?, ?, ?)",
        [nome_completo, username, hashedPassword, role],
        function(err) {
            if (err) return res.status(400).json({ error: 'Nome de usuário já existe.' });
            res.status(201).json({ message: 'Cadastro realizado com sucesso!', id: this.lastID });
        }
    );
});

app.get('/api/alunos', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'personal') {
        return res.status(403).json({ error: 'Acesso restrito a treinadores e administradores.' });
    }
    db.all("SELECT id, nome_completo, username FROM users WHERE role = 'aluno'", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/avaliacoes', authenticateToken, (req, res) => {
    const { aluno_id, peso, altura, bf, cintura, braco, coxa, peitoral } = req.body;
    if (!aluno_id || peso == null || altura == null) {
        return res.status(400).json({ error: 'Aluno, peso e altura são obrigatórios.' });
    }
    const imc = parseFloat((peso / (altura * altura)).toFixed(2));
    db.run(
        `INSERT INTO avaliacoes (aluno_id, peso, altura, imc, bf, cintura, braco, coxa, peitoral) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [aluno_id, peso, altura, imc, bf || 0, cintura || 0, braco || 0, coxa || 0, peitoral || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Avaliação física registrada com sucesso!', id: this.lastID, imc });
        }
    );
});
app.get('/api/avaliacoes/aluno/:aluno_id', authenticateToken, (req, res) => {
    const alunoId = req.params.aluno_id;
    db.all("SELECT * FROM avaliacoes WHERE aluno_id = ? ORDER BY data DESC", [alunoId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/exercicios/search', (req, res) => {
    const name = req.query.name || '';
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || '6', 10)));
    if (!name) return res.status(400).json({ error: 'Parâmetro name é obrigatório.' });
    const matches = findMatchesSimple(name, limit);
    res.json({ matches });
});

app.post('/api/treinos', authenticateToken, (req, res) => {
    const { aluno_id, titulo, nivel, descricao, exercicios } = req.body;
    if (!aluno_id || !titulo || !exercicios || !exercicios.length) {
        return res.status(400).json({ error: 'Preencha o aluno, o título do treino e adicione ao menos 1 exercício.' });
    }

    db.run("INSERT INTO treinos (aluno_id, titulo, nivel, descricao) VALUES (?, ?, ?, ?)",
        [aluno_id, titulo, nivel || 'Intermediário', descricao || ''],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const treinoId = this.lastID;
            const stmt = db.prepare(
                `INSERT INTO exercicios (treino_id, nome, series, repeticoes, carga, descanso, grupo_muscular, observacoes, demonstracao_url, instrucao_texto) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            exercicios.forEach(ex => {
                stmt.run(
                    treinoId,
                    ex.nome,
                    ex.series || 4,
                    ex.repeticoes || '10',
                    ex.carga || '0kg',
                    ex.descanso || '60s',
                    ex.grupo_muscular || 'Geral',
                    ex.observacoes || '',
                    ex.demonstracao_url || '',
                    ex.instrucao_texto || ''
                );
            });
            stmt.finalize((stmtErr) => {
                if (stmtErr) return res.status(500).json({ error: stmtErr.message });
                res.status(201).json({ message: 'Treino cadastrado com sucesso!', treino_id: treinoId });
            });
        }
    );
});

app.get('/api/treinos/aluno/:aluno_id', authenticateToken, (req, res) => {
    const alunoId = req.params.aluno_id;
    db.all("SELECT * FROM treinos WHERE aluno_id = ? ORDER BY id DESC", [alunoId], (err, treinos) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!treinos || treinos.length === 0) return res.json([]);

        let treinosCarregados = 0;
        const resultadoFinal = [];

        treinos.forEach(treino => {
            db.all("SELECT * FROM exercicios WHERE treino_id = ? ORDER BY id ASC", [treino.id], (exErr, exercicios) => {
                if (exErr) {
                    resultadoFinal.push({ ...treino, exercicios: [] });
                    treinosCarregados++;
                    if (treinosCarregados === treinos.length) res.json(resultadoFinal);
                    return;
                }
                const normalizedEx = (exercicios || []).map(e => {
                    let demo = e.demonstracao_url;
                    if (demo && !isHttpUrl(demo) && demo.trim() !== '') demo = resolveRelativePathToRaw(demo);
                    return { ...e, demonstracao_url: demo || '' };
                });
                resultadoFinal.push({ ...treino, exercicios: normalizedEx });
                treinosCarregados++;
                if (treinosCarregados === treinos.length) {
                    res.json(resultadoFinal);
                }
            });
        });
    });
});

app.put('/api/exercicios/:id/toggle', authenticateToken, (req, res) => {
    const exId = req.params.id;
    db.get("SELECT concluido FROM exercicios WHERE id = ?", [exId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Exercício não encontrado.' });
        const novoStatus = row.concluido ? 0 : 1;
        db.run("UPDATE exercicios SET concluido = ? WHERE id = ?", [novoStatus, exId], (upErr) => {
            if (upErr) return res.status(500).json({ error: upErr.message });
            res.json({ message: 'Status atualizado com sucesso.', concluido: novoStatus });
        });
    });
});

app.delete('/api/treinos/:id', authenticateToken, (req, res) => {
    const treinoId = req.params.id;
    db.run("DELETE FROM treinos WHERE id = ?", [treinoId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Treino removido com sucesso.' });
    });
});

/* -------------------- Convertion endpoint + queue -------------------- */
// TMP DIR
const TMP_DIR = path.join(os.tmpdir(), 'fitapp-ffmpeg-tmp');
fsExtra.ensureDirSync(TMP_DIR);

// multer setup (disk)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g,'_')}`)
});
const upload = multer({ storage, limits: { fileSize: 400 * 1024 * 1024 } }); // 400MB

// simple queue
const MAX_CONCURRENT = 2;
let activeJobs = 0;
const queue = [];

function enqueueConversion(task) {
  queue.push(task);
  processQueue();
}
function processQueue() {
  if (activeJobs >= MAX_CONCURRENT) return;
  const task = queue.shift();
  if (!task) return;
  activeJobs++;
  runConversionTask(task)
    .catch((err) => {
      // if runConversionTask did not already respond, respond with error
      if (!task.res.headersSent) {
        try { task.res.status(500).json({ error: 'Erro interno na conversão', detail: String(err.message || err) }); } catch(e){ }
      }
    })
    .finally(() => {
      activeJobs--;
      // process next
      setImmediate(processQueue);
    });
}

// small downloader (follows basic redirects, returns promise)
function downloadToFile(url, destPath, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const opts = new URL(url);
    const req = lib.get(opts, (res) => {
      // follow redirects (max 5)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (opts.redirectCount && opts.redirectCount > 5) {
          return reject(new Error('Too many redirects'));
        }
        // follow
        const nextOpts = new URL(res.headers.location, url).toString();
        res.resume();
        return downloadToFile(nextOpts, destPath, timeoutMs).then(resolve).catch(reject);
      } else if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} ao baixar ${url}`));
      } else {
        const stream = fs.createWriteStream(destPath);
        res.pipe(stream);
        stream.on('finish', () => stream.close(() => resolve(destPath)));
        stream.on('error', (err) => reject(err));
      }
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

// conversion function using palettegen + paletteuse
async function convertVideoToGif(inputPath, options = {}) {
  const fps = Math.max(6, Math.min(30, parseInt(options.fps || '15', 10)));
  const width = options.width ? Math.max(120, parseInt(options.width,10)) : 640;
  const start = options.start;
  const duration = options.duration;
  const dither = options.dither || 'sierra2_4a';
  const uid = uuidv4();
  const palettePath = path.join(TMP_DIR, `palette-${uid}.png`);
  const outputGifPath = path.join(TMP_DIR, `out-${uid}.gif`);

  // generate palette
  await new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath)
      .videoFilters([
        `fps=${fps}`,
        `scale=${width}:-1:flags=lanczos`,
        `palettegen=stats_mode=full`
      ])
      .frames(1)
      .output(palettePath)
      .on('end', resolve)
      .on('error', reject);

    if (start) cmd = cmd.seekInput(start);
    if (duration) cmd = cmd.duration(duration);

    cmd.run();
  });

  // use palette to create gif
  await new Promise((resolve, reject) => {
    // build filter complex path
    // [0:v] fps,scale -> [vscaled]; [vscaled][1:v] paletteuse
    const filters = [
      `fps=${fps}`,
      `scale=${width}:-1:flags=lanczos`
    ].join(',');

    let cmd = ffmpeg()
      .input(inputPath)
      .input(palettePath)
      .complexFilter([
        // apply fps and scale to the main input and then paletteuse with second input
        {
          filter: 'fps',
          options: fps,
          inputs: '0:v',
          outputs: 'vfps'
        },
        {
          filter: 'scale',
          options: { w: width, h: -1, flags: 'lanczos' },
          inputs: 'vfps',
          outputs: 'vscaled'
        },
        {
          filter: 'paletteuse',
          options: { dither: dither },
          inputs: ['vscaled', '1:v'],
          outputs: 'gifout'
        }
      ], 'gifout')
      .outputOptions(['-y'])
      .output(outputGifPath)
      .on('end', resolve)
      .on('error', reject);

    if (start) cmd = cmd.seekInput(start);
    if (duration) cmd = cmd.duration(duration);

    cmd.run();
  });

  return { outputGifPath, palettePath };
}

// the worker that runs the conversion and streams result to response
async function runConversionTask(task) {
  const { req, res, params } = task;

  // params: { fps, width, start, duration, dither, sourceUrl, keepTemp }
  let inputPath = null;
  let tempDownloaded = false;
  try {
    if (req.file && req.file.path) {
      inputPath = req.file.path;
    } else if (params && params.sourceUrl) {
      const url = params.sourceUrl;
      // Do not attempt to fetch YouTube (explicitly blocked here)
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return res.status(400).json({ error: 'YouTube URLs não são suportadas para download automático. Faça upload do arquivo ou forneça um URL direto (.mp4/.webm/.gif).' });
      }
      const dest = path.join(TMP_DIR, `${Date.now()}-remote-${path.basename(new URL(url).pathname) || 'download'}`);
      await downloadToFile(url, dest, 120000); // 2min timeout
      inputPath = dest;
      tempDownloaded = true;
    } else {
      return res.status(400).json({ error: 'Nenhum vídeo enviado nem sourceUrl informado.' });
    }

    // Convert now
    const { outputGifPath, palettePath } = await convertVideoToGif(inputPath, params);

    // Stream result
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Disposition', `attachment; filename="animation-${Date.now()}.gif"`);
    const stream = fs.createReadStream(outputGifPath);
    stream.pipe(res);

    // cleanup when finished
    res.on('finish', async () => {
      try { await fsExtra.remove(outputGifPath); } catch(e){ }
      try { await fsExtra.remove(palettePath); } catch(e){ }
      // remove downloaded or uploaded input file (but don't remove if originally provided by other part that should persist)
      try {
        if (tempDownloaded) await fsExtra.remove(inputPath);
        else if (req.file && req.file.path) await fsExtra.remove(req.file.path);
      } catch(e) { }
    });

  } catch (err) {
    console.error('Erro durante conversão:', err);
    // cleanup immediate temp files
    try { if (req.file && req.file.path) await fsExtra.remove(req.file.path); } catch(e){}
    return res.status(500).json({ error: 'Falha ao gerar GIF', detail: String(err.message || err) });
  }
}

// Endpoint: convert-to-gif
// Accepts multipart/form-data (file field 'video') OR JSON body with { exercise_name } to fetch from dataset
// Optional params: fps, width, start, duration, dither
app.post('/api/convert-to-gif', upload.single('video'), async (req, res) => {
  try {
    // parse params from body or query
    const fps = req.body.fps || req.query.fps;
    const width = req.body.width || req.query.width;
    const start = req.body.start || req.query.start;
    const duration = req.body.duration || req.query.duration;
    const dither = req.body.dither || req.query.dither;

    // If no uploaded file, see if user provided exercise_name to lookup in dataset
    let sourceUrl = null;
    if (!req.file) {
      const exerciseName = req.body.exercise_name || req.query.exercise_name;
      const sourceUrlProvided = req.body.source_url || req.query.source_url;
      if (sourceUrlProvided) {
        sourceUrl = sourceUrlProvided;
      } else if (exerciseName) {
        // find in dataset
        const matches = findMatchesSimple(exerciseName, 6);
        if (!matches || matches.length === 0) {
          return res.status(404).json({ error: 'Nenhuma demonstração encontrada para esse exercício no dataset.' });
        }
        // pick first match that has a usable url (non-YouTube ideally)
        const found = matches.find(m => m.url && !m.url.includes('youtube.com') && !m.url.includes('youtu.be')) || matches[0];
        if (!found.url) {
          return res.status(404).json({ error: 'Encontrado exercício mas sem URL utilizável (forneça URL direto ou faça upload do arquivo).' });
        }
        sourceUrl = found.url;
      } else {
        // no file and no exercise_name
        return res.status(400).json({ error: 'Envie um arquivo via form-data (campo "video"), ou forneça exercise_name ou source_url.' });
      }
    }

    // prepare params object
    const params = { fps, width, start, duration, dither, sourceUrl };

    // enqueue job (we pass req so uploaded file path is accessible by worker)
    enqueueConversion({ req, res, params });
    // response will be handled by worker; do not send anything here.

  } catch (err) {
    console.error('Erro endpoint convert-to-gif:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/* -------------------- Convenience endpoints for frontend serving (fix Vercel 404 on /dashboard) -------------------- */
// Serve dashboard.html explicitly (helps when static hosting doesn't map root)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'dashboard.html'));
});
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'dashboard.html'));
});

// SPA fallback: serve index.html for non-API routes (must be after API routes)
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

/* ---------------- Start server ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor ativo em http://localhost:${PORT}`);
    console.log(`FFmpeg ativo}`);
});