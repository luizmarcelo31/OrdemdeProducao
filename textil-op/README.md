# Sistema de Gestão Têxtil / Confecção

## Configuração em 5 passos

---

### 1. Criar projeto no Supabase

Acesse https://supabase.com e crie um novo projeto. Anote:
- **URL do projeto** (ex: `https://xyzabc.supabase.co`)
- **Anon Key** (em Project Settings → API)

---

### 2. Criar as tabelas

No Supabase, acesse **SQL Editor** e execute todo o conteúdo do arquivo `schema.sql`.

Isso criará as tabelas:
- `ordens_producao`
- `notas_envio_faccao`
- `notas_retorno_faccao`
- `consumo_material`
- `entradas_producao`

---

### 3. Configurar credenciais

Abra o arquivo `js/supabase.js` e substitua as linhas:

```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_KEY = 'SUA_ANON_KEY_AQUI';
```

---

### 4. Configurar RLS (Row Level Security)

Para uso sem autenticação (modo operacional interno), vá em cada tabela no Supabase e adicione políticas de acesso público, ou **desative o RLS** para uso local/intranet:

```sql
-- Para cada tabela, execute:
ALTER TABLE ordens_producao DISABLE ROW LEVEL SECURITY;
ALTER TABLE notas_envio_faccao DISABLE ROW LEVEL SECURITY;
ALTER TABLE notas_retorno_faccao DISABLE ROW LEVEL SECURITY;
ALTER TABLE consumo_material DISABLE ROW LEVEL SECURITY;
ALTER TABLE entradas_producao DISABLE ROW LEVEL SECURITY;
```

> **Alternativa mais segura para intranet:** crie uma política permissiva:
```sql
CREATE POLICY "permitir_tudo" ON ordens_producao FOR ALL USING (true) WITH CHECK (true);
-- (repetir para cada tabela)
```

---

### 5. Abrir o sistema

Abra o arquivo `index.html` em qualquer navegador moderno.
Recomendado usar com um servidor local simples (ex: VS Code Live Server, ou `python -m http.server 8000`).

---

## Estrutura de arquivos

```
textil-op/
├── index.html          → Dashboard
├── production.html     → Ordens de Produção (OP)
├── outsource.html      → Envio e Retorno de Facção
├── inventory.html      → Consumo de Material
├── entries.html        → Entradas Finais de Produção
├── reports.html        → Relatórios e Geração de PDF
├── schema.sql          → SQL completo para Supabase
├── css/
│   └── style.css       → Estilos globais
└── js/
    ├── supabase.js     → Configuração + utilitários
    ├── production.js   → Lógica de OPs
    └── pdf.js          → Geração de PDFs
```

---

## Fluxo operacional

```
1. production.html → Criar OP
        ↓
2. outsource.html  → Registrar Envio para Facção
        ↓
3. outsource.html  → Registrar Retorno da Facção
        ↓
4. inventory.html  → Registrar Consumo de Material (opcional)
        ↓
5. entries.html    → Registrar Entrada Final
        ↓
6. reports.html    → Gerar PDFs
```

---

## PDFs disponíveis

| Documento | Onde gerar |
|---|---|
| Ficha Completa da OP | production.html → botão "Ficha" / reports.html |
| Nota de Envio para Facção | outsource.html → botão "Gerar PDF" / reports.html |
| Relatório de Movimentação | reports.html → "Gerar Relatório PDF" |

---

## Dependências (CDN — sem instalação)

- **Supabase JS v2** — banco de dados
- **jsPDF 2.5.1** — geração de PDF

Nenhum Node.js, npm ou build step necessário.
