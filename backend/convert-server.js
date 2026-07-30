// convert-server.js
// Instalação necessária:
// npm install express multer fluent-ffmpeg ffmpeg-static uuid fs-extra cors

const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());

// diretório temporário para uploads e resultados
const TMP_DIR = path.join(os.tmpdir(), 'fitapp-ffmpeg-tmp');
fs.ensureDirSync(TMP_DIR);

// multer config (memória poderia vazar, então disco)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g,'_')}`)
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // limite 200MB (ajuste)

// Endpoints:
// POST /convert-to-gif
// form-data: video (file), optional: fps, width, start, duration, dither
app.post('/convert-to-gif', upload.single('video'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Envie um arquivo de vídeo no campo "video".' });

  // parâmetros opcionais
  const fps = Math.max(6, Math.min(30, parseInt(req.body.fps || '15', 10))); // 6-30
  const width = req.body.width ? Math.max(120, parseInt(req.body.width,10)) : 640; // largura alvo
  const start = req.body.start; // em segundos ou HH:MM:SS
  const duration = req.body.duration; // em segundos
  const dither = req.body.dither || 'sierra2_4a'; // none, bayer, floyd_steinberg, sierra2_4a

  const uid = uuidv4();
  const inputPath = file.path;
  const palettePath = path.join(TMP_DIR, `palette-${uid}.png`);
  const outputGifPath = path.join(TMP_DIR, `out-${uid}.gif`);

  // Função cleanup
  const cleanup = async () => {
    try {
      await fs.remove(inputPath);
      await fs.remove(palettePath);
      //keep gif for client to download - remove after some time if desired
    } catch (e) {
      // ignore
    }
  };

  try {
    // etapa 1: gerar palette
    await new Promise((resolve, reject) => {
      let proc = ffmpeg(inputPath)
        .videoFilters([
          // fps and scale with lanczos
          `fps=${fps}`,
          `scale=${width}:-1:flags=lanczos`,
          // palettegen
          `palettegen=stats_mode=full`
        ])
        .frames(1) // palettegen writes a single image
        .output(palettePath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        ;

      if (start) proc = proc.seekInput(start);
      if (duration) proc = proc.duration(duration);

      proc.run();
    });

    // etapa 2: aplicar palette para gerar gif
    await new Promise((resolve, reject) => {
      // build filter_complex pipeline
      // We re-apply fps+scale to the main stream and use the palette file as second input
      const filters = [
        `fps=${fps}`,
        `scale=${width}:-1:flags=lanczos`
      ].join(',');

      let proc = ffmpeg()
        .input(inputPath)
        .input(palettePath)
        .complexFilter([
          // [0:v] applies filters -> temp stream [x]
          { filter: 'split', inputs: '0:v', outputs: ['a','b'] }, // sometimes used, but we can simpler use thread below
        ])
        // Simpler: use -filter_complex "[0:v] fps=...,scale=...,split [x][y];[y][1:v] paletteuse=dither=..."
        .complexFilter([
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
            // now apply paletteuse with second input which is stream index 1:v
            filter: 'paletteuse',
            options: { dither: dither },
            inputs: ['vscaled', '1:v'],
            outputs: 'gifout'
          }
        ], 'gifout')
        .outputOptions(['-y'])
        .output(outputGifPath)
        .on('error', (err) => reject(err))
        .on('end', () => resolve());

      if (start) proc = proc.seekInput(start);
      if (duration) proc = proc.duration(duration);

      proc.run();
    });

    // Enviar GIF como download
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Disposition', `attachment; filename="animation-${uid}.gif"`);
    const stream = fs.createReadStream(outputGifPath);
    stream.pipe(res);

    // cleanup after response finished
    res.on('finish', async () => {
      // remove intermediate and output after a short delay (optionally keep)
      setTimeout(async () => {
        try { await fs.remove(outputGifPath); } catch(e){ }
        try { await fs.remove(palettePath); } catch(e){ }
        try { await fs.remove(inputPath); } catch(e){ }
      }, 1000 * 30); // 30s
    });

  } catch (err) {
    console.error('Erro durante conversão:', err);
    await cleanup();
    return res.status(500).json({ error: 'Falha ao gerar GIF', detail: String(err.message || err) });
  }
});

// opcional: endpoint health
app.get('/ping', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`FFmpeg convert server running on :${PORT}`));