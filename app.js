import fs from "fs";
import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const app = express();

// ================== CONFIGURAÇÕES GERAIS ==================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: "segredo",
  resave: false,
  saveUninitialized: true
}));

app.use(cors());

// ================== CONFIGURAÇÕES DE CAMINHO ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================== CONEXÃO COM MYSQL (RAILWAY) ==================
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

// ================== IMPORTAÇÃO DO BANCO ==================
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
          if (!error.message.includes("already exists")) {
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

// ================== ROTAS DO SISTEMA ==================

// 🔹 Registro de usuário
app.post("/api/registro", async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const [existe] = await pooldb.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (existe.length > 0) {
      return res.status(400).json({ erro: "Email já cadastrado" });
    }

    await pooldb.query("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)", [nome, email, senha]);
    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🔹 Login de usuário
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const [rows] = await pooldb.query("SELECT * FROM usuarios WHERE email = ? AND senha = ?", [email, senha]);
    if (rows.length === 0) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    req.session.usuario = rows[0];
    res.json({ mensagem: "Login realizado com sucesso", usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🔹 Verificar se o usuário está logado
app.get("/api/usuario", (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ erro: "Usuário não autenticado" });
  }
  res.json(req.session.usuario);
});

// 🔹 Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ erro: "Erro ao encerrar sessão" });
    res.json({ mensagem: "Logout realizado" });
  });
});

// 🔹 Lista de usuários (exemplo)
app.get("/api/usuarios", async (req, res) => {
  try {
    const [rows] = await pooldb.query("SELECT id, nome, email FROM usuarios");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ================== INICIAR SERVIDOR ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  importarBanco(); // Importa o banco depois que o servidor sobe
});
