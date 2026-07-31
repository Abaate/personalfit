// database.js
require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'fitapp.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Banco de dados SQLite conectado em:', dbPath);
    }
});


db.serialize(async () => {

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_completo TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )`);


    db.run(`CREATE TABLE IF NOT EXISTS avaliacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        aluno_id INTEGER NOT NULL,
        peso REAL NOT NULL,
        altura REAL NOT NULL,
        imc REAL,
        bf REAL,
        cintura REAL,
        braco REAL,
        coxa REAL,
        peitoral REAL,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(aluno_id) REFERENCES users(id) ON DELETE CASCADE
    )`);


    db.run(`CREATE TABLE IF NOT EXISTS treinos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        aluno_id INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        nivel TEXT DEFAULT 'Intermediário',
        descricao TEXT,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(aluno_id) REFERENCES users(id) ON DELETE CASCADE
    )`);


    db.run(`CREATE TABLE IF NOT EXISTS exercicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        treino_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        series INTEGER DEFAULT 4,
        repeticoes TEXT DEFAULT '10',
        carga TEXT DEFAULT '0kg',
        descanso TEXT DEFAULT '60s',
        grupo_muscular TEXT DEFAULT 'Geral',
        observacoes TEXT,
        concluido BOOLEAN DEFAULT 0,
        demonstracao_url TEXT DEFAULT '',
        instrucao_texto TEXT DEFAULT '',
        FOREIGN KEY(treino_id) REFERENCES treinos(id) ON DELETE CASCADE
    )`);


    const colunasParaAdicionar = [
        { tabela: 'treinos', coluna: `nivel TEXT DEFAULT 'Intermediário'` },
        { tabela: 'treinos', coluna: `descricao TEXT` },
        { tabela: 'exercicios', coluna: `descanso TEXT` },
        { tabela: 'exercicios', coluna: `grupo_muscular TEXT` },
        { tabela: 'exercicios', coluna: `observacoes TEXT` },
        { tabela: 'exercicios', coluna: `demonstracao_url TEXT DEFAULT ''` },
        { tabela: 'exercicios', coluna: `instrucao_texto TEXT DEFAULT ''` },
        { tabela: 'avaliacoes', coluna: `imc REAL` },
        { tabela: 'avaliacoes', coluna: `cintura REAL` },
        { tabela: 'avaliacoes', coluna: `braco REAL` },
        { tabela: 'avaliacoes', coluna: `coxa REAL` },
        { tabela: 'avaliacoes', coluna: `peitoral REAL` }
    ];


    colunasParaAdicionar.forEach(({ tabela, coluna }) => {

        db.run(
            `ALTER TABLE ${tabela} ADD COLUMN ${coluna}`,
            () => {}
        );

    });



    // Criar administrador usando .env
    try {

        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;


        if (!adminUsername || !adminPassword) {
            console.log(
                'ADMIN_USERNAME ou ADMIN_PASSWORD não configurados.'
            );
            return;
        }


        const senhaHash = await bcrypt.hash(adminPassword, 10);


        db.get(
            "SELECT * FROM users WHERE username = ?",
            [adminUsername],
            (err, row) => {

                if (err) {
                    console.error(
                        'Erro ao verificar admin:',
                        err.message
                    );
                    return;
                }


                if (!row) {

                    db.run(
                        `
                        INSERT INTO users 
                        (nome_completo, username, password, role)
                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            'Administrador Supremo',
                            adminUsername,
                            senhaHash,
                            'admin'
                        ],
                        (insertErr) => {

                            if (insertErr) {
                                console.error(
                                    'Erro ao criar admin:',
                                    insertErr.message
                                );
                            } else {
                                console.log(
                                    'Conta admin criada pelo'
                                );
                            }

                        }
                    );


                } else {

                    console.log('Conta admin já existe.');

                }

            }
        );


    } catch (error) {

        console.error(
            'Erro ao criar administrador:',
            error.message
        );

    }

});


module.exports = db;