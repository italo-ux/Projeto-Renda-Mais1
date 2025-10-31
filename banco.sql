-- ===============================
-- BANCO DE DADOS: railway
-- Compatível com app.js e script.js
-- ===============================

DROP DATABASE IF EXISTS railway;
CREATE DATABASE railway;
USE railway;

---

-- ===============================
-- TABELA DE USUÁRIOS
-- ===============================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    metaMensal DECIMAL(10,2) DEFAULT NULL,
    rendaMensal DECIMAL(10,2) DEFAULT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

---

-- ===============================
-- TABELA DE DESPESAS
-- ===============================
CREATE TABLE despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    descricao VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(50) DEFAULT 'Outro',
    data DATE,
    -- NOVA COLUNA: Usada para rastrear se a despesa foi paga (1) ou está pendente (0)
    paga BOOLEAN DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);