import mysql from "mysql2";
import fs from "fs";
import express from "express";
import session from "express-session";
import cors from "cors";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: "segredo",
  resave: false,
  saveUninitialized: true 
}));
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Configuração do banco


const pooldb = mysql.createPool({
  host: "turntable.proxy.rlwy.net",
  user: "root",
  password: "mhLdcrWhwuIFFjemcoIQDrXYjRdtLIZp",
  database: "railway",
  port: 50717,
});


const dbPromise = pooldb.promise();


// Testa conexão
(async () => {
  try {
    await dbPromise.query('SELECT 1');
    console.log("Conectado ao banco");
  } catch (err) {
    console.error("Erro ao conectar ao banco:", err.message);
  }
})();

app.use(express.static("public"));

// ================= ROTAS ==================

// Registro
app.post('/registro', (req, res) => {
  const { nome, email, senha } = req.body;

  pooldb.query('SELECT id FROM usuarios_db.usuarios WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).send('Erro interno');

    if (results.length > 0) {
      return res.send('<script>alert("Email já cadastrado"); window.location="/registro.html";</script>');
    }

    pooldb.query(
      'INSERT INTO usuarios_db.usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, senha],
      (err2) => {
        if (err2) return res.status(500).send('Erro ao registrar usuário');
        res.send('<script>alert("Usuário registrado com sucesso!"); window.location="/login.html";</script>');
      }
    );
  });
});

// Login
app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  pooldb.query('SELECT * FROM usuarios_db.usuarios WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).send('Erro interno');

    if (results.length === 0 || results[0].senha !== senha) {
      return res.send('<script>alert("Senha ou Email incorreto. Tente novamente."); window.location="/login.html";</script>');
    }

    const usuario = results[0];
    req.session.userId = usuario.id;
    req.session.nome = usuario.nome;
    res.redirect('/usuario.html');
  });
});

// Pegar todos usuários 
app.get("/api/usuarios", (req, res) => {
  pooldb.query("SELECT * FROM usuarios_db.usuarios;", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Verificação de primeira visita
app.get("/verificar-visita/:id", (req, res) => {
  const userId = req.params.id;

  pooldb.query(
    "SELECT primeira_visita FROM usuarios_db.usuarios WHERE id = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const primeiraVisita = results[0].primeira_visita;

      if (primeiraVisita) {
        pooldb.query(
          "UPDATE usuarios_db.usuarios SET primeira_visita = FALSE WHERE id = ?",
          [userId],
          (err) => {
            if (err) console.error(err);
          }
        );
      }

      res.json({ primeiraVisita });
    }
  );
});
// api sessao
app.get("/api/sessao", (req, res) => {
  if (!req.session.userId) {
    return res.json({}); // usuário não logado
  }
  res.json({ userId: req.session.userId, nome: req.session.nome });
});


// Rota para adicionar despesa
app.post("/api/despesas", (req, res) => {
  console.log('POST /api/despesas body:', req.body);

  const { descricao, valor, dataVencimento} = req.body;

  if (!descricao || !valor || !dataVencimento) {
    return res.status(400).json({ message: "Campos obrigatórios: descricao, valor, dataVencimento" });
  }


  const valorNum = Number(String(valor).replace(',', '.'));
  if (Number.isNaN(valorNum)) {
    return res.status(400).json({ message: "Campo 'valor' deve ser um número" });
  }

  const sql = "INSERT INTO usuarios_db.despesas (descricao, valor, data_vencimento) VALUES (?, ?, ?)";
  pooldb.query(sql, [descricao, valorNum, dataVencimento], (err) => {
    if (err) {
      console.error("Erro ao adicionar despesa (query):", err);
      return res.status(500).json({ message: "Erro ao adicionar despesa", error: err.message });
    }
    res.json({ message: "Despesa adicionada com sucesso!" });
  });
});



//pegar despesas
app.get("/api/despesas", (req, res) => {
  pooldb.query("SELECT * FROM usuarios_db.despesas;", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});



// Inicia servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
