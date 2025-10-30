-- ===============================
-- BANCO DE DADOS: railway
-- Compatível com app.js e script do front
-- ===============================

DROP DATABASE IF EXISTS railway;
CREATE DATABASE railway;
USE railway;

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

-- ===============================
-- TABELA DE DESPESAS
-- ===============================
CREATE TABLE despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    descricao VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(50),
    data DATE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);
