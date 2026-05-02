-- ============================================================
-- SISTEMA DE GESTÃO TÊXTIL / CONFECÇÃO
-- Schema Supabase - Versão 1.0
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: ordens_producao
-- Controle central de cada Ordem de Produção
-- ============================================================
CREATE TABLE ordens_producao (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_op     TEXT NOT NULL UNIQUE,
  data_op       DATE NOT NULL,
  modelo        TEXT NOT NULL,
  descricao     TEXT,
  quantidade    INTEGER NOT NULL CHECK (quantidade > 0),
  cor           TEXT NOT NULL,
  tamanho       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'aberta'
                  CHECK (status IN ('aberta','em_producao','aguardando_retorno','em_conferencia','finalizada','cancelada')),
  prioridade    TEXT NOT NULL DEFAULT 'normal'
                  CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  responsavel   TEXT NOT NULL,
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: notas_envio_faccao
-- Controle de envio de peças para facção terceirizada
-- ============================================================
CREATE TABLE notas_envio_faccao (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_nota       TEXT NOT NULL UNIQUE,
  op_id             UUID NOT NULL REFERENCES ordens_producao(id) ON DELETE RESTRICT,
  nome_faccao       TEXT NOT NULL,
  tipo_servico      TEXT NOT NULL,
  quantidade_env    INTEGER NOT NULL CHECK (quantidade_env > 0),
  data_envio        DATE NOT NULL,
  prazo_retorno     DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'enviada'
                      CHECK (status IN ('enviada','em_producao','atrasada','retornada','cancelada')),
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: notas_retorno_faccao
-- Controle de retorno das peças da facção
-- ============================================================
CREATE TABLE notas_retorno_faccao (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  op_id               UUID NOT NULL REFERENCES ordens_producao(id) ON DELETE RESTRICT,
  envio_id            UUID REFERENCES notas_envio_faccao(id) ON DELETE SET NULL,
  nome_faccao         TEXT NOT NULL,
  quantidade_recebida INTEGER NOT NULL CHECK (quantidade_recebida >= 0),
  perdas              INTEGER NOT NULL DEFAULT 0 CHECK (perdas >= 0),
  avarias             INTEGER NOT NULL DEFAULT 0 CHECK (avarias >= 0),
  data_retorno        DATE NOT NULL,
  status_conferencia  TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status_conferencia IN ('pendente','conferido','aprovado','reprovado','parcial')),
  responsavel_conf    TEXT,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: consumo_material
-- Rastreio de materiais consumidos por OP
-- ============================================================
CREATE TABLE consumo_material (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  op_id             UUID NOT NULL REFERENCES ordens_producao(id) ON DELETE RESTRICT,
  material          TEXT NOT NULL,
  quantidade        NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  unidade           TEXT NOT NULL CHECK (unidade IN ('un','m','m2','kg','g','L','ml','rolo','cx','pc')),
  custo_unitario    NUMERIC(10,2),
  responsavel       TEXT NOT NULL,
  data_consumo      DATE NOT NULL,
  lote              TEXT,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: entradas_producao
-- Registro de entrada final (produção concluída)
-- ============================================================
CREATE TABLE entradas_producao (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  op_id               UUID NOT NULL REFERENCES ordens_producao(id) ON DELETE RESTRICT,
  quantidade_final    INTEGER NOT NULL CHECK (quantidade_final >= 0),
  rejeicoes           INTEGER NOT NULL DEFAULT 0 CHECK (rejeicoes >= 0),
  data_entrada        DATE NOT NULL,
  conferencia_final   TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (conferencia_final IN ('pendente','aprovado','reprovado','aprovado_ressalvas')),
  responsavel         TEXT NOT NULL,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: atualização automática de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_op
  BEFORE UPDATE ON ordens_producao
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_envio
  BEFORE UPDATE ON notas_envio_faccao
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_retorno
  BEFORE UPDATE ON notas_retorno_faccao
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_consumo
  BEFORE UPDATE ON consumo_material
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_entrada
  BEFORE UPDATE ON entradas_producao
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX idx_op_status ON ordens_producao(status);
CREATE INDEX idx_op_prioridade ON ordens_producao(prioridade);
CREATE INDEX idx_op_data ON ordens_producao(data_op);
CREATE INDEX idx_envio_op ON notas_envio_faccao(op_id);
CREATE INDEX idx_envio_status ON notas_envio_faccao(status);
CREATE INDEX idx_retorno_op ON notas_retorno_faccao(op_id);
CREATE INDEX idx_consumo_op ON consumo_material(op_id);
CREATE INDEX idx_entrada_op ON entradas_producao(op_id);

-- ============================================================
-- ROW LEVEL SECURITY (desativado para uso inicial)
-- Habilite conforme necessidade de múltiplos usuários
-- ============================================================
-- ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notas_envio_faccao ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notas_retorno_faccao ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE consumo_material ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE entradas_producao ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VIEW: resumo_ops (para relatórios)
-- ============================================================
CREATE OR REPLACE VIEW vw_resumo_ops AS
SELECT
  op.id,
  op.numero_op,
  op.data_op,
  op.modelo,
  op.quantidade,
  op.cor,
  op.tamanho,
  op.status,
  op.prioridade,
  op.responsavel,
  COALESCE(SUM(DISTINCT env.quantidade_env), 0)      AS total_enviado_faccao,
  COALESCE(SUM(DISTINCT ret.quantidade_recebida), 0)  AS total_retornado_faccao,
  COALESCE(SUM(DISTINCT ent.quantidade_final), 0)     AS total_entrada_final,
  COALESCE(SUM(DISTINCT ent.rejeicoes), 0)            AS total_rejeicoes
FROM ordens_producao op
LEFT JOIN notas_envio_faccao env ON env.op_id = op.id
LEFT JOIN notas_retorno_faccao ret ON ret.op_id = op.id
LEFT JOIN entradas_producao ent ON ent.op_id = op.id
GROUP BY op.id;
