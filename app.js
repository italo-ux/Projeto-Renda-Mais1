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
    // AJUSTADO: Seleciona as colunas de configuração, incluindo dinheiroGuardado
    const [rows] = await pooldb.query(
      "SELECT id, nome, email, rendaMensal, metaMensal, dinheiroGuardado, primeira_visita FROM usuarios WHERE email = ? AND senha = ?", 
      [email, senha]
    );
    
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
    const [rows] = await pooldb.query(
      "SELECT primeira_visita FROM usuarios WHERE id = ?",
      [idUsuario]
    );
    
    if (!rows.length) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }
    
    res.json({ primeiraVisita: Boolean(rows[0].primeira_visita) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

app.post("/api/primeira-visita", autenticar, async (req, res) => {
  const { metaMensal, rendaMensal } = req.body;
  const idUsuario = req.session.usuario.id;

  if (!metaMensal || !rendaMensal) {
    return res.status(400).json({ erro: "Dados inválidos" });
  }

  try {
    await pooldb.query(
      "UPDATE usuarios SET metaMensal = ?, rendaMensal = ?, primeira_visita = FALSE WHERE id = ?",
      [metaMensal, rendaMensal, idUsuario]
    );
    
    res.json({ mensagem: "Informações salvas com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar informações" });
  }
});

// ================== ROTA DINHEIRO GUARDADO / ATUALIZAR CONFIG (NOVA ROTA) ==================
app.post("/api/atualizar-config", autenticar, async (req, res) => {
  const { rendaMensal, dinheiroGuardado } = req.body;
  const idUsuario = req.session.usuario.id;

  if (rendaMensal === undefined || dinheiroGuardado === undefined) {
    return res.status(400).json({ erro: "Campos rendaMensal e dinheiroGuardado são obrigatórios." });
  }

  try {
    // 1. Atualizar no Banco de Dados (rendaMensal e dinheiroGuardado)
    await pooldb.query(
      "UPDATE usuarios SET rendaMensal = ?, dinheiroGuardado = ? WHERE id = ?",
      [rendaMensal, dinheiroGuardado, idUsuario]
    );

    // 2. Buscar dados atualizados para atualizar a sessão
    const [rows] = await pooldb.query(
      "SELECT id, nome, email, rendaMensal, metaMensal, dinheiroGuardado, primeira_visita FROM usuarios WHERE id = ?",
      [idUsuario]
    );
    
    if (rows.length > 0) {
      // Atualiza a sessão com os novos valores para uso imediato
      req.session.usuario = rows[0]; 
    }

    res.json({ mensagem: "Configurações de renda e dinheiro guardado atualizadas com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar configurações:", err);
    res.status(500).json({ erro: "Erro ao salvar informações: " + err.message });
  }
});
// ==============================================================================

// Rota específica para atualizar apenas o dinheiro guardado (compatível com frontend)
app.post("/api/guardado", autenticar, async (req, res) => {
    const { guardado } = req.body;
    const idUsuario = req.session.usuario.id;

    if (guardado === undefined) {
        return res.status(400).json({ erro: "Campo guardado é obrigatório" });
    }

    try {
        await pooldb.query(
            "UPDATE usuarios SET dinheiroGuardado = ? WHERE id = ?",
            [guardado, idUsuario]
        );

        // Busca valor atualizado
        const [rows] = await pooldb.query(
            "SELECT dinheiroGuardado FROM usuarios WHERE id = ?",
            [idUsuario]
        );

        // Atualiza sessão
        req.session.usuario.dinheiroGuardado = rows[0].dinheiroGuardado;

        res.json({ 
            mensagem: "Valor guardado atualizado",
            guardado: rows[0].dinheiroGuardado 
        });
    } catch (err) {
        console.error("Erro ao atualizar guardado:", err);
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

app.get("/api/usuario", autenticar, async (req, res) => {
  const idUsuario = req.session.usuario.id;
  try {
    // AJUSTADO: Busca o usuário mais recente do banco de dados (garantindo valores atualizados)
    const [rows] = await pooldb.query(
      "SELECT id, nome, email, rendaMensal, metaMensal, dinheiroGuardado, primeira_visita FROM usuarios WHERE id = ?",
      [idUsuario]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ erro: "Dados do usuário não encontrados." });
    }

    // Atualiza a sessão e envia os dados mais recentes (incluindo dinheiroGuardado)
    req.session.usuario = rows[0];
    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
    res.status(500).json({ erro: "Erro ao buscar dados do usuário" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ erro: "Erro ao encerrar sessão" });
    res.json({ mensagem: "Logout realizado" });
  });
});

// Rota para pagar despesa
app.post("/api/despesas/:id/pagar", autenticar, async (req, res) => {
  const { id } = req.params;
  const idUsuario = req.session.usuario.id;
  
  try {
    await pooldb.query(
      "UPDATE despesas SET pago = TRUE WHERE id = ? AND id_usuario = ?",
      [id, idUsuario]
    );
    res.json({ mensagem: "Despesa marcada como paga" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Rota para editar despesa
app.put("/api/despesas/:id", autenticar, async (req, res) => {
  const { id } = req.params;
  const { descricao, valor, categoria, data } = req.body;
  const idUsuario = req.session.usuario.id;

  try {
    await pooldb.query(
      "UPDATE despesas SET descricao = ?, valor = ?, categoria = ?, data = ? WHERE id = ? AND id_usuario = ?",
      [descricao, valor, categoria, data, id, idUsuario]
    );
    res.json({ mensagem: "Despesa atualizada" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Rota para excluir despesa
app.delete("/api/despesas/:id", autenticar, async (req, res) => {
  const { id } = req.params;
  const idUsuario = req.session.usuario.id;

  try {
    await pooldb.query(
      "DELETE FROM despesas WHERE id = ? AND id_usuario = ?",
      [id, idUsuario]
    );
    res.json({ mensagem: "Despesa excluída" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Rotas para metas
app.post("/api/metas", autenticar, async (req, res) => {
  const { titulo, descricao, valor, guardado, dataPrevista } = req.body;
  const idUsuario = req.session.usuario.id;

  try {
    const [result] = await pooldb.query(
      "INSERT INTO metas (id_usuario, titulo, descricao, valor, guardado, dataPrevista) VALUES (?, ?, ?, ?, ?, ?)",
      [idUsuario, titulo, descricao, valor, guardado || 0, dataPrevista]
    );
    res.json({ id: result.insertId, mensagem: "Meta criada com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/metas", autenticar, async (req, res) => {
  const idUsuario = req.session.usuario.id;
  try {
    const [rows] = await pooldb.query(
      "SELECT * FROM metas WHERE id_usuario = ? ORDER BY criado_em DESC",
      [idUsuario]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/metas/:id", autenticar, async (req, res) => {
  const { id } = req.params;
  const idUsuario = req.session.usuario.id;
  try {
    const [rows] = await pooldb.query(
      "SELECT * FROM metas WHERE id = ? AND id_usuario = ?",
      [id, idUsuario]
    );
    if (!rows.length) return res.status(404).json({ erro: "Meta não encontrada" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put("/api/metas/:id", autenticar, async (req, res) => {
  const { id } = req.params;
  const { titulo, descricao, valor, guardado, dataPrevista } = req.body;
  const idUsuario = req.session.usuario.id;

  try {
    await pooldb.query(
      "UPDATE metas SET titulo = ?, descricao = ?, valor = ?, guardado = ?, dataPrevista = ? WHERE id = ? AND id_usuario = ?",
      [titulo, descricao, valor, guardado, dataPrevista, id, idUsuario]
    );
    res.json({ mensagem: "Meta atualizada" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete("/api/metas/:id", autenticar, async (req, res) => {
  const { id } = req.params;
  const idUsuario = req.session.usuario.id;

  try {
    await pooldb.query(
      "DELETE FROM metas WHERE id = ? AND id_usuario = ?",
      [id, idUsuario]
    );
    res.json({ mensagem: "Meta removida" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/metas/:id/concluir", autenticar, async (req, res) => {
  const { id } = req.params;
  const idUsuario = req.session.usuario.id;

  try {
    await pooldb.query(
      "UPDATE metas SET concluida = TRUE WHERE id = ? AND id_usuario = ?",
      [id, idUsuario]
    );
    res.json({ mensagem: "Meta concluída" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
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

// Rota para obter o valor guardado atual do usuário
app.get("/api/guardado", autenticar, async (req, res) => {
	const idUsuario = req.session.usuario.id;
	try {
		const [rows] = await pooldb.query(
			"SELECT dinheiroGuardado FROM usuarios WHERE id = ?",
			[idUsuario]
		);
		if (!rows.length) return res.status(404).json({ erro: "Usuário não encontrado" });
		return res.json({ guardado: rows[0].dinheiroGuardado || 0 });
	} catch (err) {
		console.error("Erro ao obter guardado:", err);
		res.status(500).json({ erro: err.message });
	}
});