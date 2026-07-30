// app.js - Vanilla JS frontend
const API_URL = '/api';

// UI helpers
function el(id){ return document.getElementById(id); }
function show(elm){ elm.style.display = ''; }
function hide(elm){ elm.style.display = 'none'; }

// Auth toggles used on index.html
function toggleAuth() {
    const login = el('login-box');
    const reg = el('register-box');
    if (!login || !reg) return;
    if (login.classList.contains('hidden')) {
        login.classList.remove('hidden'); reg.classList.add('hidden');
    } else {
        login.classList.add('hidden'); reg.classList.remove('hidden');
    }
}

// Cadastro
async function fazerCadastro() {
    const nome_completo = el('reg-name').value.trim();
    const username = el('reg-username').value.trim();
    const password = el('reg-password').value.trim();
    if (!nome_completo || !username || !password) { alert('Preencha todos os campos'); return; }

    try {
        const res = await fetch(`${API_URL}/cadastrar`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ nome_completo, username, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Cadastro realizado! Faça login agora.');
            toggleAuth();
        } else {
            alert('Erro: ' + (data.error || 'erro'));
        }
    } catch (e) {
        alert('Erro de conexão');
        console.error(e);
    }
}

// Login
async function fazerLogin() {
    const username = el('login-username').value.trim();
    const password = el('login-password').value.trim();
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('nome', data.nome);
            localStorage.setItem('id', data.id);
            window.location.href = 'dashboard.html';
        } else {
            alert('Erro: ' + (data.error || 'Credenciais inválidas'));
        }
    } catch (e) {
        alert('Erro de conexão');
        console.error(e);
    }
}

// Dashboard logic
async function carregarDashboard() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const nome = localStorage.getItem('nome');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    el('user-name-display').innerText = `Olá, ${nome}`;
    el('user-role-badge').innerText = `[${(role||'').toUpperCase()}]`;

    if (role === 'admin' || role === 'personal') {
        document.getElementById('area-admin').classList.remove('hidden');
        carregarListaAlunos();
    } else {
        document.getElementById('area-aluno').classList.remove('hidden');
        carregarMeusTreinos(localStorage.getItem('id'));
    }
}

async function carregarListaAlunos() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/alunos`, { headers: { 'Authorization': `Bearer ${token}` } });
        const alunos = await res.json();
        const tbody = document.querySelector('#tabela-alunos tbody');
        tbody.innerHTML = '';
        if (!alunos || alunos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">Nenhum aluno cadastrado</td></tr>';
            return;
        }
        alunos.forEach(aluno => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${aluno.id}</td>
                <td>${aluno.nome_completo}</td>
                <td>${aluno.username}</td>
                <td><button class="btn btn-ghost btn-sm" onclick="verFicha(${aluno.id})">Ver Ficha</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
    }
}

function verFicha(alunoId) {
    // redireciona para dashboard detalhado (recarrega area de admin com o aluno selecionado)
    // aqui simplificamos: carrega treinos do aluno selecionado em /api/treinos/aluno/:id usando token admin
    carregarTreinosAluno(alunoId);
}

// Carrega treinos de um aluno e mostra no painel (admin view)
async function carregarTreinosAluno(alunoId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/treinos/aluno/${alunoId}`, { headers: { 'Authorization': `Bearer ${token}` }});
        const treinos = await res.json();
        renderTreinos(treinos);
    } catch (e) {
        console.error(e);
    }
}

// Para aluno ver seus treinos
async function carregarMeusTreinos(alunoId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/treinos/aluno/${alunoId}`, { headers: { 'Authorization': `Bearer ${token}` }});
        const treinos = await res.json();
        renderTreinos(treinos);
    } catch (e) {
        console.error(e);
    }
}

function renderTreinos(treinos) {
    const container = el('meus-treinos');
    container.innerHTML = '';
    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<p class="text-xs" style="color:#9aa7b6">Nenhum treino encontrado.</p>';
        return;
    }
    treinos.forEach(tr => {
        const div = document.createElement('div');
        div.className = 'card';
        const exercisesHtml = (tr.exercicios || []).map(ex => {
            const demoHtml = ex.demonstracao_url ? `<img src="${ex.demonstracao_url}" class="demo-thumb" data-url="${ex.demonstracao_url}" />` : '<span style="color:#9aa7b6">Sem demonstração</span>';
            return `<div style="margin-bottom:10px;">
                        <strong>${ex.nome}</strong>
                        <div style="font-size:13px;color:#aab2c0">${ex.series}x ${ex.repeticoes} • ${ex.carga} • ${ex.descanso}</div>
                        <div style="margin-top:8px">${demoHtml}</div>
                    </div>`;
        }).join('');
        div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <div><strong>${tr.titulo}</strong><div style="font-size:13px;color:#aab2c0">${tr.nivel}</div></div>
                            <div><button class="btn btn-ghost btn-sm" onclick="deletarTreino(${tr.id})">Excluir</button></div>
                         </div>
                         <div>${exercisesHtml}</div>`;
        container.appendChild(div);
    });

    // Add click handlers to thumbnails (delegation)
    document.querySelectorAll('.demo-thumb').forEach(img => {
        img.addEventListener('click', (e) => {
            const url = e.currentTarget.getAttribute('data-url');
            openMediaModal(url);
        });
    });
}

async function deletarTreino(id) {
    if (!confirm('Remover este treino?')) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/treinos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
            alert('Treino removido');
            carregarDashboard();
        } else {
            const d = await res.json();
            alert('Erro: ' + (d.error || 'falha'));
        }
    } catch (e) {
        console.error(e);
    }
}

// Modal para exibir GIF/vídeo em fullscreen
function openMediaModal(url) {
    const modal = el('media-modal');
    const content = el('media-content');
    content.innerHTML = '';
    if (!url) return;
    const low = url.toLowerCase();
    if (low.match(/\.(gif|png|jpe?g|webp)(\?|$)/)) {
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '96vw';
        img.style.maxHeight = '96vh';
        img.style.objectFit = 'contain';
        content.appendChild(img);
    } else if (low.match(/\.(mp4|webm|ogg)(\?|$)/)) {
        const vid = document.createElement('video');
        vid.src = url;
        vid.controls = true;
        vid.autoplay = true;
        vid.style.maxWidth = '96vw';
        vid.style.maxHeight = '96vh';
        content.appendChild(vid);
    } else if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
        const idMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/) || url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
        const id = idMatch ? idMatch[1] : null;
        const iframe = document.createElement('iframe');
        iframe.width = '960';
        iframe.height = '540';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.src = id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
        iframe.style.maxWidth = '96vw';
        iframe.style.maxHeight = '96vh';
        content.appendChild(iframe);
    } else {
        // fallback open in new tab
        window.open(url, '_blank');
        return;
    }
    modal.style.display = 'flex';
}
el('media-close')?.addEventListener && el('media-close').addEventListener('click', () => {
    el('media-modal').style.display = 'none';
    el('media-content').innerHTML = '';
});
el('media-modal')?.addEventListener && el('media-modal').addEventListener('click', (e) => {
    if (e.target.id === 'media-modal') {
        el('media-modal').style.display = 'none';
        el('media-content').innerHTML = '';
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        el('media-modal') && (el('media-modal').style.display = 'none');
        el('media-content') && (el('media-content').innerHTML = '');
    }
});

// Logout
function sair() {
    localStorage.clear();
    window.location.href = 'index.html';
}