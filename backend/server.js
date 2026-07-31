// server.js
// Backend unificado: API + dataset search (com traduções) + endpoint de conversão FFmpeg com fila simples

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const fsExtra = require('fs-extra');
const os = require('os');
const multer = require('multer');
const { pipeline } = require('stream');
const { promisify } = require('util');

const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Servir frontend
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/favicon.ico'));
});
app.use(express.static(path.join(__dirname, '../frontend')));

const SECRET_KEY = process.env.SECRET_KEY || "chave_secreta_fitapp_producao";

/* ------------------- Dataset & Translations loading ------------------- */

const DATASET_OWNER = 'hasaneyldrm';
const DATASET_REPO = 'exercises-dataset';
const DATASET_BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${DATASET_OWNER}/${DATASET_REPO}/${DATASET_BRANCH}/`;

let exercisesDataset = [];
let translations = {}; // english -> portuguese
let reverseTranslations = {}; // normalized portuguese -> [englishKeys]

function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
}

function loadTranslations() {
    try {
        const p = path.join(__dirname, 'translations.json');
        if (fs.existsSync(p)) {
            translations = JSON.parse(fs.readFileSync(p, 'utf8'));
            // build reverse index: normalized(pt) -> [engKey,...]
            reverseTranslations = {};
            for (const [eng, pt] of Object.entries(translations)) {
                const n = normalize(pt);
                if (!reverseTranslations[n]) reverseTranslations[n] = [];
                reverseTranslations[n].push(eng);
            }
            console.log(`✅ translations.json carregado (${Object.keys(translations).length} entradas).`);
        } else {
            console.warn('⚠️ translations.json não encontrado.');
            translations = {};
            reverseTranslations = {};
        }
    } catch (e) {
        console.warn('Erro ao carregar translations.json:', e.message);
        translations = {};
        reverseTranslations = {};
    }
}
loadTranslations();

/* dataset loading (try require, fallback to GitHub raw fetch) */
function getRawUrl(p) {
    if (!p) return null;
    const trimmed = String(p).replace(/^\/*/, '');
    return RAW_BASE + trimmed;
}
function isHttpUrl(s) {
    return typeof s === 'string' && /^https?:\/\//i.test(s);
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
    return !!lower.match(/\.(mp4|webm|ogg|gif|jpe?g|png|webp)(\?|$)/) || lower.includes('youtube.com') || lower.includes('youtu.be');
}

function getUrlFromItem(item) {
    if (!item) return null;
    const keys = ['demonstration','demonstracao','demo','video','videos','youtube','video_url','videoUrl','gif','gif_url','image','image_url','media','url','link','files','resources','assets'];
    for (const k of keys) {
        if (k in item && item[k]) {
            const cand = item[k];
            if (typeof cand === 'string') {
                const s = cand.trim();
                if (isVideoOrImageFileString(s)) {
                    if (!isHttpUrl(s)) return getRawUrl(s);
                    // map youtube id -> watch url
                    const yt = extractYouTubeIdFromUrl(s);
                    if (yt) return `https://www.youtube.com/watch?v=${yt}`;
                    return s;
                }
                if (/^[A-Za-z0-9_-]{11}$/.test(s)) return `https://www.youtube.com/watch?v=${s}`;
                if (s.match(/^(images|videos|assets)\/.+/i)) return getRawUrl(s);
            } else if (Array.isArray(cand) || typeof cand === 'object') {
                // try deeper
                const rec = findVideoUrlInObject(cand);
                if (rec) return rec;
            }
        }
    }
    const rec = findVideoUrlInObject(item);
    if (rec) return rec;
    return null;
}
function findVideoUrlInObject(obj, depth = 0) {
    if (!obj || depth > 6) return null;
    if (typeof obj === 'string') {
        const s = obj.trim();
        if (isVideoOrImageFileString(s)) {
            if (!isHttpUrl(s)) return getRawUrl(s);
            const yt = extractYouTubeIdFromUrl(s);
            if (yt) return `https://www.youtube.com/watch?v=${yt}`;
            return s;
        }
        if (/^[A-Za-z0-9_-]{11}$/.test(s)) {
            return `https://www.youtube.com/watch?v=${s}`;
        }
        if (s.match(/^(images|videos|assets)\/.+/i)) {
            return getRawUrl(s);
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
        for (const k of Object.keys(obj)) {
            const found = findVideoUrlInObject(obj[k], depth + 1);
            if (found) return found;
        }
    }
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
        const client = url.startsWith('https') ? https : http;
        client.get(url, { timeout: timeoutMs }, (res) => {
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
loadExercisesDataset()
    .then(() => buildDatasetIndex())
    .catch(e => {
        exercisesDataset = [];
        console.warn('Erro ao carregar dataset:', e.message);
    });

/* ------------------- Search & matching (melhorias para PT-BR) ------------------- */

// Dicionário de MOVIMENTOS base (o "nome principal" do exercício). Frases mais
// longas ficam primeiro em cada bloco para serem casadas antes das curtas.
const MOVIMENTOS_DICT = [
    ['bench press', 'Supino'],
    ['squat', 'Agachamento'],
    ['deadlift', 'Levantamento Terra'],
    ['pull up', 'Barra Fixa'],
    ['pullup', 'Barra Fixa'],
    ['chin up', 'Barra Supinada'],
    ['chinup', 'Barra Supinada'],
    ['lat pulldown', 'Puxada na Frente'],
    ['pulldown', 'Puxada'],
    ['seated row', 'Remada Sentada'],
    ['bent over row', 'Remada Curvada'],
    ['upright row', 'Remada Alta'],
    ['inverted row', 'Remada Invertida'],
    ['cable row', 'Remada no Cabo'],
    ['row', 'Remada'],
    ['overhead press', 'Desenvolvimento'],
    ['military press', 'Desenvolvimento Militar'],
    ['shoulder press', 'Desenvolvimento de Ombro'],
    ['press', 'Desenvolvimento'],
    ['lateral raise', 'Elevação Lateral'],
    ['front raise', 'Elevação Frontal'],
    ['leg raise', 'Elevação de Pernas'],
    ['calf raise', 'Elevação de Panturrilha'],
    ['hip thrust', 'Hip Thrust'],
    ['glute bridge', 'Ponte para Glúteos'],
    ['raise', 'Elevação'],
    ['reverse fly', 'Crucifixo Invertido'],
    ['chest fly', 'Crucifixo'],
    ['fly', 'Crucifixo'],
    ['flye', 'Crucifixo'],
    ['biceps curl', 'Rosca Bíceps'],
    ['bicep curl', 'Rosca Bíceps'],
    ['hammer curl', 'Rosca Martelo'],
    ['leg curl', 'Flexão de Pernas'],
    ['curl', 'Rosca'],
    ['triceps extension', 'Extensão de Tríceps'],
    ['tricep extension', 'Extensão de Tríceps'],
    ['leg extension', 'Extensão de Pernas'],
    ['extension', 'Extensão'],
    ['triceps pushdown', 'Puxada de Tríceps'],
    ['tricep pushdown', 'Puxada de Tríceps'],
    ['pushdown', 'Puxada'],
    ['dips', 'Mergulho'],
    ['dip', 'Mergulho'],
    ['walking lunges', 'Avanço Andando'],
    ['lunges', 'Avanço'],
    ['lunge', 'Avanço'],
    ['step up', 'Step-up'],
    ['leg press', 'Leg Press'],
    ['kettlebell swing', 'Swing'],
    ['swing', 'Swing'],
    ['burpee', 'Burpee'],
    ['mountain climber', 'Alpinista'],
    ['side plank', 'Prancha Lateral'],
    ['plank', 'Prancha'],
    ['russian twist', 'Torção Russa'],
    ['twist', 'Torção'],
    ['bicycle crunch', 'Abdominal Bicicleta'],
    ['crunch', 'Abdominal'],
    ['sit up', 'Abdominal (Sit-up)'],
    ['situp', 'Abdominal (Sit-up)'],
    ['pec deck', 'Peck Deck'],
    ['face pull', 'Face Pull'],
    ['farmers walk', 'Caminhada do Fazendeiro'],
    ["farmer's walk", 'Caminhada do Fazendeiro'],
    ['box jump', 'Salto no Caixote'],
    ['jump', 'Salto'],
    ['jumping jacks', 'Polichinelos'],
    ['pullover', 'Pullover'],
    ['cable crossover', 'Crossover no Cabo'],
    ['crossover', 'Crossover'],
    ['skull crusher', 'Skull Crusher'],
    ['good morning', 'Good Morning'],
    ['high pull', 'High Pull'],
];

// Dicionário de MODIFICADORES (equipamento, posição, direção, lateralidade etc.)
// Cada entrada é [regex de palavra(s) em inglês, tradução em português].
const MODIFICADORES_DICT = [
    ['barbell', 'com barra'],
    ['dumbbell', 'com halteres'],
    ['dumbbells', 'com halteres'],
    ['kettlebell', 'com kettlebell'],
    ['resistance band', 'com elástico'],
    ['band', 'com elástico'],
    ['bodyweight', 'com peso corporal'],
    ['machine', 'na máquina'],
    ['smith machine', 'na máquina smith'],
    ['smith', 'na máquina smith'],
    ['cable', 'no cabo'],
    ['plate', 'com anilha'],
    ['incline', 'inclinado'],
    ['decline', 'declinado'],
    ['flat', 'reto'],
    ['seated', 'sentado'],
    ['standing', 'em pé'],
    ['lying', 'deitado'],
    ['bent over', 'curvado'],
    ['single arm', 'unilateral'],
    ['single leg', 'unilateral'],
    ['one arm', 'unilateral'],
    ['one leg', 'unilateral'],
    ['alternating', 'alternado'],
    ['close grip', 'pegada fechada'],
    ['wide grip', 'pegada aberta'],
    ['neutral grip', 'pegada neutra'],
    ['underhand', 'pegada supinada'],
    ['overhand', 'pegada pronada'],
    ['reverse grip', 'pegada invertida'],
    ['reverse', 'invertido'],
    ['assisted', 'assistido'],
    ['weighted', 'com peso'],
    ['front', 'frontal'],
    ['back', 'nas costas'],
    ['overhead', 'acima da cabeça'],
    ['lateral', 'lateral'],
    ['romanian', 'romeno'],
    ['sumo', 'sumô'],
    ['hip', 'de quadril'],
    ['glute', 'de glúteo'],
    ['chest', 'de peitoral'],
    ['shoulder', 'de ombro'],
    ['leg', 'de perna'],
    ['calf', 'de panturrilha'],
    ['biceps', 'de bíceps'],
    ['bicep', 'de bíceps'],
    ['triceps', 'de tríceps'],
    ['tricep', 'de tríceps'],
    ['dumbbell press', 'com halteres'],
];

function translateWordDict(text, dict) {
    // Aplica o dicionário buscando, em ordem, as chaves como frases inteiras
    // (com limites de palavra), removendo o que for encontrado do texto restante.
    let remaining = ` ${text} `;
    let found = [];
    for (const [en, pt] of dict) {
        const re = new RegExp(`\\s${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'i');
        if (re.test(remaining)) {
            found.push(pt);
            remaining = remaining.replace(re, ' ');
        }
    }
    return { found, remaining: remaining.trim() };
}

function translateNameToPt(originalName) {
    if (!originalName) return originalName || '';
    const key = String(originalName).toLowerCase().trim();

    // 1) Prioridade máxima: match exato/curado em translations.json
    if (translations[key]) return translations[key];
    const norm = normalize(originalName);
    for (const engKey of Object.keys(translations)) {
        if (normalize(engKey) === norm) return translations[engKey];
    }

    // 2) Tradução por peças: separa "movimento" (ex: bench press) dos
    // "modificadores" (ex: barbell, incline) e monta a frase em português.
    let working = ` ${normalize(originalName)} `;
    let movimentoPt = null;

    for (const [en, pt] of MOVIMENTOS_DICT) {
        const re = new RegExp(`\\s${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'i');
        if (re.test(working)) {
            movimentoPt = pt;
            working = working.replace(re, ' ');
            break; // usa apenas o primeiro (mais específico) movimento encontrado
        }
    }

    const { found: modificadoresPt } = translateWordDict(working, MODIFICADORES_DICT);

    if (movimentoPt) {
        const partes = [movimentoPt, ...modificadoresPt];
        return partes.join(' ').replace(/\s+/g, ' ').trim();
    }

    // 3) Nada reconhecido como movimento: tenta traduzir modificadores mesmo
    // assim (melhor que nada) e mantém o restante como veio.
    if (modificadoresPt.length > 0) {
        const capitalizado = originalName.charAt(0).toUpperCase() + originalName.slice(1);
        return `${capitalizado} (${modificadoresPt.join(', ')})`;
    }

    // 4) Fallback final: devolve o nome original sem tradução.
    return originalName;
}

/* Índice pré-computado do dataset (nome original + nome em PT + urls),
   construído uma vez após o dataset carregar, para buscas rápidas e
   sempre em português. */
let datasetIndex = [];

function buildDatasetIndex() {
    datasetIndex = [];
    for (const item of exercisesDataset) {
        const originalName = String(item.name || item.title || item.nome || item.label || item.exercise || '').trim();
        if (!originalName) continue;
        const namePt = translateNameToPt(originalName);
        datasetIndex.push({
            item,
            originalName,
            namePt,
            normalizedPt: normalize(namePt),
            normalizedEn: normalize(originalName),
            url: getUrlFromItem(item)
        });
    }
    console.log(`✅ Índice de exercícios traduzido para PT-BR (${datasetIndex.length} itens).`);
}

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

function scoreAgainst(qTokens, q, normalizedTarget) {
    const nTokens = normalizedTarget.split(' ').filter(Boolean);
    const common = qTokens.filter(t => nTokens.includes(t)).length;
    const tokenRatio = qTokens.length ? (common / qTokens.length) : 0;
    const contains = normalizedTarget.includes(q) ? 1 : 0;
    const dist = levenshtein(normalizedTarget, q);
    const levSim = 1 - (dist / Math.max(1, Math.max(normalizedTarget.length, q.length)));
    let score = 0;
    if (normalizedTarget === q) score += 200;
    score += tokenRatio * 100;
    score += contains ? 100 : 0;
    score += levSim * 40;
    return score;
}

function findMatchesSimple(query, limit = 6) {
    if (!query) return [];
    if (!datasetIndex || datasetIndex.length === 0) return [];

    const q = normalize(query);
    const qTokens = q.split(' ').filter(Boolean);

    const scored = [];
    for (const entry of datasetIndex) {
        // Pontua contra o nome em português (prioridade) e contra o nome em
        // inglês (caso o usuário digite em inglês) — usa o maior dos dois.
        const scorePt = scoreAgainst(qTokens, q, entry.normalizedPt);
        const scoreEn = scoreAgainst(qTokens, q, entry.normalizedEn) * 0.85;
        const score = Math.max(scorePt, scoreEn) + (entry.url ? 10 : 0);

        if (score > 5) {
            scored.push({ entry, score });
        }
    }

    scored.sort((a, b) => b.score - a.score);

    const unique = [];
    const seen = new Set();
    for (const s of scored) {
        const dedupeKey = s.entry.normalizedPt;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        unique.push({
            name: s.entry.namePt,
            original_name: s.entry.originalName,
            url: s.entry.url || null,
            score: Math.round(s.score),
            raw: s.entry.item
        });
        if (unique.length >= limit) break;
    }
    return unique;
}

/* ------------------- Auth middleware ------------------- */
function authenticateToken(req, res, next) {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

    jwt.verify(token.replace('Bearer ', ''), SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
}

/* ------------------- Routes (existing ones) ------------------- */

// Login
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

// Cadastro
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

// Listar alunos
app.get('/api/alunos', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'personal') {
        return res.status(403).json({ error: 'Acesso restrito a treinadores e administradores.' });
    }
    db.all("SELECT id, nome_completo, username FROM users WHERE role = 'aluno'", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Avaliacoes
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

/* ------------------- Search route (improved) ------------------- */
app.get('/api/exercicios/search', (req, res) => {
    const name = req.query.name || '';
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || '6', 10)));
    if (!name) return res.status(400).json({ error: 'Parâmetro name é obrigatório.' });
    const matches = findMatchesSimple(name, limit);
    res.json({ matches });
});

/* ------------------- Treinos (insert + get) ------------------- */
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
                    if (demo && !isHttpUrl(demo) && demo.trim() !== '') demo = getRawUrl(demo);
                    // traduzir nomes se o exercício for do dataset (em inglês) - se estiver em PT, deixamos
                    const translated = translateNameToPt(e.nome);
                    return { ...e, demonstracao_url: demo || '', nome_pt: translated };
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

/* ------------------- Toggle / Delete ------------------- */
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

// NOVA ROTA: apagar usuário (apenas admin)
app.delete('/api/users/:id', authenticateToken, (req, res) => {
    const userId = req.params.id;
    // Apenas administradores podem apagar contas
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    db.run("DELETE FROM users WHERE id = ?", [userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
        res.json({ message: 'Usuário removido com sucesso.' });
    });
});

/* ------------------- FFmpeg conversion integrated (fila simples) ------------------- */

// TMP dir
const TMP_DIR = path.join(os.tmpdir(), 'fitapp-ffmpeg-tmp');
fsExtra.ensureDirSync(TMP_DIR);

// multer for uploads (disk)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g,'_')}`)
});
const upload = multer({ storage, limits: { fileSize: 300 * 1024 * 1024 } }); // 300MB limite (ajuste)

// Simple concurrency queue
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_FFMPEG_CONCURRENCY || '2', 10);
let activeJobs = 0;
const jobQueue = [];

function enqueueJob(jobFn) {
    return new Promise((resolve, reject) => {
        const task = async () => {
            activeJobs++;
            try {
                const result = await jobFn();
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                activeJobs--;
                // start next queued job
                if (jobQueue.length > 0) {
                    const next = jobQueue.shift();
                    next();
                }
            }
        };

        if (activeJobs < MAX_CONCURRENT_JOBS) {
            task();
        } else {
            jobQueue.push(task);
        }
    });
}

// helper to download remote file to dest
function downloadFileTo(url, destPath, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // follow redirect
                return downloadFileTo(res.headers.location, destPath, timeoutMs).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Erro ao baixar (status ${res.statusCode}) ${url}`));
                res.resume();
                return;
            }
            const fileStream = fs.createWriteStream(destPath);
            pipeline(res, fileStream, (err) => {
                if (err) return reject(err);
                resolve(destPath);
            });
        }).on('error', (err) => reject(err)).setTimeout(timeoutMs, () => {
            req.abort();
            reject(new Error('Timeout ao baixar arquivo.'));
        });
    });
}

const pipelineAsync = promisify(pipeline);

// function to run ffmpeg palette -> gif (inputPath can be local file)
function convertToGifWithPalette({ inputPath, fps = 15, width = 640, start, duration, dither = 'sierra2_4a', outputPath }) {
    return new Promise((resolve, reject) => {
        const palettePath = path.join(TMP_DIR, `palette-${Date.now()}-${Math.random().toString(36).slice(2,8)}.png`);

        // step 1: palettegen
        let p1 = ffmpeg(inputPath)
            .videoFilters([
                `fps=${fps}`,
                `scale=${width}:-1:flags=lanczos`,
                `palettegen=stats_mode=full`
            ])
            .outputOptions(['-y'])
            .frames(1)
            .output(palettePath)
            .on('error', (err) => {
                // cleanup palette if exists
                try { fs.unlinkSync(palettePath); } catch(e){ }
                reject(err);
            })
            .on('end', () => {
                // step 2: paletteuse
                // build complex filter to apply fps+scale then paletteuse
                const filters = [
                    { filter: 'fps', options: fps, inputs: '0:v', outputs: 'vfps' },
                    { filter: 'scale', options: { w: width, h: -1, flags: 'lanczos' }, inputs: 'vfps', outputs: 'vscaled' },
                    { filter: 'paletteuse', options: { dither: dither }, inputs: ['vscaled', '1:v'], outputs: 'gifout' }
                ];
                let p2 = ffmpeg()
                    .input(inputPath)
                    .input(palettePath)
                    .complexFilter(filters, 'gifout')
                    .outputOptions(['-y'])
                    .output(outputPath)
                    .on('error', (err2) => {
                        try { fs.unlinkSync(palettePath); } catch(e){ }
                        reject(err2);
                    })
                    .on('end', () => {
                        try { fs.unlinkSync(palettePath); } catch(e){ }
                        resolve(outputPath);
                    });

                if (start) p2 = p2.seekInput(start);
                if (duration) p2 = p2.duration(duration);

                p2.run();
            });

        if (start) p1 = p1.seekInput(start);
        if (duration) p1 = p1.duration(duration);
        p1.run();
    });
}

// POST /api/convert-to-gif
// Accepts multipart upload (field 'video') OR JSON body with datasetQuery (string).
// Optional params: fps, width, start, duration, dither
app.post('/api/convert-to-gif', upload.single('video'), async (req, res) => {
    // parse params
    const fps = Math.max(6, Math.min(30, parseInt(req.body.fps || req.query.fps || '15', 10)));
    const width = req.body.width ? Math.max(120, parseInt(req.body.width, 10)) : (req.body.width ? parseInt(req.body.width,10) : 640);
    const start = req.body.start || req.query.start;
    const duration = req.body.duration || req.query.duration;
    const dither = req.body.dither || req.query.dither || 'sierra2_4a';

    // job is either an uploaded file or a dataset query
    let inputFilePath = null;
    let cleanupPaths = [];

    try {
        if (req.file) {
            inputFilePath = req.file.path;
            cleanupPaths.push(inputFilePath);
        } else if (req.body.datasetQuery || req.query.datasetQuery) {
            const q = req.body.datasetQuery || req.query.datasetQuery;
            const matches = findMatchesSimple(q, 1);
            if (!matches || matches.length === 0) {
                return res.status(404).json({ error: 'Nenhuma demonstração encontrada no dataset para esse termo.' });
            }
            const match = matches[0];
            const url = match.url;
            if (!url) return res.status(404).json({ error: 'Item encontrado no dataset não possui URL de vídeo diretoa para download.' });

            // Do not support YouTube downloads here
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                return res.status(400).json({ error: 'Downloads de YouTube não são suportados por este endpoint. Forneça um arquivo de vídeo direto ou um link direto (.mp4/.webm/.gif).' });
            }

            // download remote file to tmp
            const tmpInput = path.join(TMP_DIR, `download-${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(new URL(url).pathname) || '.mp4'}`);
            await downloadFileTo(url, tmpInput);
            inputFilePath = tmpInput;
            cleanupPaths.push(tmpInput);
        } else {
            return res.status(400).json({ error: 'Envie um arquivo no campo "video" ou forneça datasetQuery.' });
        }

        // create output path
        const outPath = path.join(TMP_DIR, `out-${Date.now()}-${Math.random().toString(36).slice(2,8)}.gif`);
        cleanupPaths.push(outPath);

        // enqueue conversion
        await enqueueJob(async () => {
            // run ffmpeg conversion
            await convertToGifWithPalette({ inputPath: inputFilePath, fps, width, start, duration, dither, outputPath: outPath });
        });

        // stream GIF back to client
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Content-Disposition', `attachment; filename="animation-${Date.now()}.gif"`);
        const stream = fs.createReadStream(outPath);
        stream.pipe(res);

        // cleanup after response finishes
        res.on('finish', async () => {
            setTimeout(async () => {
                for (const p of cleanupPaths) {
                    try { await fsExtra.remove(p); } catch (e) { }
                }
            }, 1000 * 20);
        });

    } catch (err) {
        console.error('Erro na conversão:', err && err.message ? err.message : err);
        // try cleanup
        for (const p of cleanupPaths) {
            try { await fsExtra.remove(p); } catch(e){ }
        }
        if (!res.headersSent) {
            res.status(500).json({ error: 'Falha ao gerar GIF', detail: String(err.message || err) });
        } else {
            // headers already sent: just end
            try { res.end(); } catch(e){ }
        }
    }
});

/* simple health ping */
app.get('/ping', (req, res) => res.json({ ok: true, ffmpeg: !!ffmpegPath, concurrent: { max: MAX_CONCURRENT_JOBS, active: activeJobs, queued: jobQueue.length } }));

/* ------------------- Start server ------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor FitPro ativo em http://localhost:${PORT}`);
    console.log(`   FFmpeg path: ${ffmpegPath || '(não encontrado)'}`);
});