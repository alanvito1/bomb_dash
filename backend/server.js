const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database.js'); // Nosso módulo de banco de dados

const app = express();
const PORT = process.env.PORT || 3000; // Porta do servidor
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key'; // Mude em produção!
const SALT_ROUNDS = 10;

// Middleware
app.use(cors()); // Habilita CORS para todas as rotas
app.use(express.json()); // Para parsear JSON no corpo das requisições

// Função de Middleware para verificar Token JWT
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1]; // Pega o token do formato "Bearer <token>"
        jwt.verify(bearerToken, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error("JWT verification error:", err.message);
                return res.status(403).json({ success: false, message: 'Token inválido ou expirado.' });
            }
            req.user = decoded; // Adiciona o payload decodificado (ex: { username: 'user1' }) à requisição
            next();
        });
    } else {
        res.status(401).json({ success: false, message: 'Token de autenticação não fornecido.' });
    }
}

// --- Endpoints da API ---

// POST /api/register - Registrar um novo usuário
app.post('/api/register', async (req, res) => {
    const { username, pin } = req.body;

    // Validação básica
    if (!username || !pin) {
        return res.status(400).json({ success: false, message: 'Usuário e PIN são obrigatórios.' });
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { // Validar se o PIN tem 4 dígitos numéricos
        return res.status(400).json({ success: false, message: 'PIN deve ter 4 dígitos numéricos.' });
    }
     if (/\s/.test(username) || username.length < 3) {
        return res.status(400).json({ success: false, message: 'Usuário deve ter pelo menos 3 caracteres e não conter espaços.' });
    }


    try {
        // Verificar se o usuário já existe
        const existingUser = await db.findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Usuário já existe.' }); // 409 Conflict
        }

        const hashedPassword = await bcrypt.hash(pin, SALT_ROUNDS);
        const result = await db.createUser(username, hashedPassword);
        if (result.success) {
            res.status(201).json({ success: true, message: 'Usuário registrado com sucesso!', userId: result.userId });
        } else {
            // Este caso é mais genérico, pois o createUser já trata o UNIQUE constraint
            res.status(500).json({ success: false, message: 'Erro ao registrar usuário.' });
        }
    } catch (error) {
        console.error("Register error:", error);
        if (error.message && error.message.toLowerCase().includes("username already exists")) {
             return res.status(409).json({ success: false, message: 'Usuário já existe.' });
        }
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao registrar.' });
    }
});

// POST /api/login - Autenticar um usuário
app.post('/api/login', async (req, res) => {
    const { username, pin } = req.body;

    if (!username || !pin) {
        return res.status(400).json({ success: false, message: 'Usuário e PIN são obrigatórios.' });
    }

    try {
        const user = await db.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Usuário ou PIN inválido.' }); // Usuário não encontrado
        }

        const isMatch = await bcrypt.compare(pin, user.password_hash);
        if (isMatch) {
            // Gerar token JWT
            const tokenPayload = { username: user.username, userId: user.id }; // Incluir ID do usuário no token se útil
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' }); // Token expira em 24 horas

            res.json({
                success: true,
                message: 'Login bem-sucedido!',
                token: token,
                user: {
                    username: user.username,
                    max_score: user.max_score
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Usuário ou PIN inválido.' }); // Senha não confere
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao fazer login.' });
    }
});

// POST /api/scores - Submeter uma nova pontuação (protegido por JWT)
app.post('/api/scores', verifyToken, async (req, res) => {
    const { score } = req.body;
    const username = req.user.username; // Obtido do token JWT verificado

    if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ success: false, message: 'Pontuação inválida.' });
    }

    // Adicionar uma validação de limite de pontuação, se necessário
    const MAX_POSSIBLE_SCORE = 1000000; // Exemplo, defina um limite razoável
    if (score > MAX_POSSIBLE_SCORE) {
        console.warn(`Score ${score} for user ${username} exceeds MAX_POSSIBLE_SCORE. Clamping or rejecting.`);
        // Poderia retornar erro ou apenas registrar a pontuação máxima permitida
        // return res.status(400).json({ success: false, message: 'Pontuação excede o limite máximo permitido.' });
    }


    try {
        const result = await db.updateUserScore(username, score);
        if (result.success) {
            res.json({
                success: true,
                message: result.message || 'Pontuação atualizada com sucesso!',
                new_max_score: result.new_max_score
            });
        } else {
            // Se updateUserScore resolve com success: false (ex: pontuação não é maior)
            res.status(200).json({ // Ainda é um sucesso da requisição, mas a pontuação pode não ter sido atualizada
                success: true, // Ou false, dependendo de como quer tratar "não foi novo recorde"
                message: result.message || 'Não foi um novo recorde ou usuário não encontrado.',
                current_max_score: result.current_max_score || (await db.findUserByUsername(username)).max_score
            });
        }
    } catch (error) {
        console.error("Update score error:", error);
        if(error.message === "User not found.") { // Tratamento específico se o usuário do token não for encontrado no BD
             return res.status(404).json({ success: false, message: 'Usuário do token não encontrado no banco de dados.' });
        }
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao atualizar pontuação.' });
    }
});

// GET /api/ranking - Obter o top 10 do ranking
app.get('/api/ranking', async (req, res) => {
    try {
        const ranking = await db.getTop10Players();
        res.json({ success: true, ranking: ranking });
    } catch (error) {
        console.error("Get ranking error:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao buscar ranking.' });
    }
});

// Inicializar o BD e então iniciar o servidor
db.initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor Bomb Dash rodando na porta ${PORT}`);
            console.log(`Endpoints disponíveis:`);
            console.log(`  POST /api/register`);
            console.log(`  POST /api/login`);
            console.log(`  POST /api/scores (protegido por JWT)`);
            console.log(`  GET /api/ranking`);
            console.log(`JWT_SECRET está configurado como: ${JWT_SECRET === 'your-very-strong-secret-key' ? 'CHAVE PADRÃO (INSEGURA!)' : 'CHAVE PERSONALIZADA'}`)
            if (JWT_SECRET === 'your-very-strong-secret-key') {
                console.warn("AVISO: JWT_SECRET está usando a chave padrão. Mude para uma chave forte em um ambiente de produção!");
            }
        });
    })
    .catch(err => {
        console.error("Falha ao inicializar o banco de dados. Servidor não iniciado.", err);
        process.exit(1); // Termina o processo se o BD não puder ser inicializado
    });

// Graceful shutdown - fechar conexão com BD
process.on('SIGINT', () => {
    console.log('Recebido SIGINT. Fechando conexões...');
    db.closeDb();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Recebido SIGTERM. Fechando conexões...');
    db.closeDb();
    process.exit(0);
});

module.exports = app; // Para possíveis testes
