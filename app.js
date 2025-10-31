// ================== IMPORTAÇÕES ==================
import fs from "fs";
import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

// ================== CONFIGURAÇÃO BASE ==================
const app = express();

app.use(express.json());

// trust proxy (importante para cookies secure quando atrás de load balancer / Railway)
app.set('trust proxy', 1);

// session (cookie segura em produção)
app.use(session({
  secret: "segredo",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// CORS dinâmico — permite requests do front hospedado no mesmo domínio ou de localhost em dev
app.use(cors({
  origin: true,
  credentials: true
}));

// ================== CONFIGURAÇÕES DE CAMINHO ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================== CONEXÃO COM MYSQL ==================
async function connectToDatabase() {
  try {
    const pool = await mysql.createPool({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log("✅ Conectado ao MySQL!");
    return pool;
  } catch (err) {
    console.error("❌ Erro ao conectar ao banco:", err.message);
    throw err;
  }
}

const pooldb = await connectToDatabase();

// ================== IMPORTAÇÃO AUTOMÁTICA DO BANCO ==================
const dbPath = path.resolve(__dirname, "banco.sql");

async function importarBanco() {
  if (!fs.existsSync(dbPath)) {
    console.warn("⚠️ Nenhum arquivo banco.sql encontrado em:", dbPath);
    return;
  }

  try {
    console.log("📦 Importando banco de dados...");
    const sqlScript = fs.readFileSync(dbPath, "utf8");
    const comandos = sqlScript.split(/;\s*$/m);

    for (let comando of comandos) {
      if (comando.trim()) {
        try {
          await pooldb.query(comando);
        } catch (error) {
          if (!String(error.message).toLowerCase().includes("already exists")) {
            console.error("⚠️ Erro SQL:", error.message);
          }
        }
      }
    }
    console.log("✅ Banco importado ou já existente.");
  } catch (err) {
    console.error("❌ Falha ao importar banco:", err.message);
  }
}

// ================== FRONTEND (pasta public) ==================
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================== FUNÇÃO DE AUTENTICAÇÃO ==================
function autenticar(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ erro: "Usuário não autenticado" });
  }
  next();
}

// ================== ROTAS ==================

app.post("/api/registro", async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: "Preencha todos os campos" });
  try {
    const [existe] = await pooldb.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (existe.length > 0) return res.status(400).json({ erro: "Email já cadastrado" });
    await pooldb.query("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)", [nome, email, senha]);
    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: "Email e senha obrigatórios" });
  try {
    const [rows] = await pooldb.query("SELECT * FROM usuarios WHERE email = ? AND senha = ?", [email, senha]);
    if (rows.length === 0) return res.status(401).json({ erro: "Credenciais inválidas" });
    req.session.usuario = rows[0];
    res.json({ mensagem: "Login realizado com sucesso", usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});



// ADICIONE ESTA NOVA ROTA AQUI
app.get("/api/primeira-visita", autenticar, async (req, res) => {
  const idUsuario = req.session.usuario.id;
  try {
    // 1. Busca o usuário no banco
    const [rows] = await pooldb.query("SELECT metaMensal, rendaMensal FROM usuarios WHERE id = ?", [idUsuario]);

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const usuario = rows[0];

    // 2. Verifica se a meta ou a renda estão nulas (indicando primeira visita)
    if (usuario.metaMensal === null || usuario.rendaMensal === null) {
      res.json({ primeiraVisita: true });
    } else {
      res.json({ primeiraVisita: false });
    }
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


app.post("/api/primeira-visita", autenticar, async (req, res) => {
  const { metaMensal, rendaMensal } = req.body;
  const idUsuario = req.session.usuario.id;
  try {
    await pooldb.query("UPDATE usuarios SET metaMensal = ?, rendaMensal = ? WHERE id = ?", [metaMensal, rendaMensal, idUsuario]);
    res.json({ mensagem: "Informações da primeira visita salvas!" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});





app.post("/api/despesas", autenticar, async (req, res) => {
  const { descricao, valor, categoria, data } = req.body;
  const idUsuario = req.session.usuario.id;
  try {
    await pooldb.query(
      "INSERT INTO despesas (id_usuario, descricao, valor, categoria, data) VALUES (?, ?, ?, ?, ?)",
      [idUsuario, descricao, valor, categoria, data]
    );
    res.json({ mensagem: "Despesa adicionada com sucesso!" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/despesas", autenticar, async (req, res) => {
  const idUsuario = req.session.usuario.id;
  try {
    const [rows] = await pooldb.query("SELECT * FROM despesas WHERE id_usuario = ?", [idUsuario]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/usuario", autenticar, (req, res) => {
  res.json(req.session.usuario);
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ erro: "Erro ao encerrar sessão" });
    res.json({ mensagem: "Logout realizado" });
  });
});

// ================== INICIAR SERVIDOR ==================
const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ Nenhuma porta recebida via process.env.PORT (Railway exige isso).");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  importarBanco();
});
