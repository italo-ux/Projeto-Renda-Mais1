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

// ================== IMPORTAR BANCO (se não existir) ==================
const dbPath = path.resolve(__dirname, "banco.sql");

if (fs.existsSync(dbPath)) {
  try {
    console.log("📦 Importando banco de dados...");
    const sqlScript = fs.readFileSync(dbPath, "utf8");
    const comandos = sqlScript.split(/;\s*$/m);

    for (let comando of comandos) {
      if (comando.trim()) {
        try {
          await pooldb.query(comando);
        } catch (error) {
          // Ignora erro de tabela já existente
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
} else {
  console.warn("⚠️ Nenhum arquivo banco.sql encontrado em:", dbPath);
}

// ================== FRONTEND ==================
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================== SUAS ROTAS (mantidas iguais) ==================
// Exemplo rápido:
app.get("/api/usuarios", async (req, res) => {
  try {
    const [rows] = await pooldb.query("SELECT * FROM usuarios");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== INICIAR SERVIDOR ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
