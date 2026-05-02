/* ============================================================
   js/supabase.js — Configuração Supabase + Utilitários
   ============================================================ */

// ---- CONFIGURE AQUI ----
const SUPABASE_URL = 'https://kwbistfghouywwxkdegb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oZqGwKmPsXQHyx-JsFflSQ__nrUjYCf';
// -------------------------

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Helpers ---------- */
const DB = {
  /** Inserir registro */
  async insert(table, data) {
    const { data: res, error } = await _sb.from(table).insert(data).select().single();
    if (error) throw error;
    return res;
  },
  /** Atualizar registro */
  async update(table, id, data) {
    const { data: res, error } = await _sb.from(table).update(data).eq('id', id).select().single();
    if (error) throw error;
    return res;
  },
  /** Listar com filtros opcionais */
  async list(table, { filter, order, limit } = {}) {
    let q = _sb.from(table).select('*');
    if (filter) Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v); });
    if (order) q = q.order(order.col, { ascending: order.asc ?? false });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
  /** Buscar por ID */
  async get(table, id) {
    const { data, error } = await _sb.from(table).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  /** Deletar por ID */
  async delete(table, id) {
    const { error } = await _sb.from(table).delete().eq('id', id);
    if (error) throw error;
  },
  /** Buscar OP com dados relacionados */
  async getOpFull(opId) {
    const [op, envios, retornos, consumos, entradas] = await Promise.all([
      _sb.from('ordens_producao').select('*').eq('id', opId).single(),
      _sb.from('notas_envio_faccao').select('*').eq('op_id', opId).order('created_at'),
      _sb.from('notas_retorno_faccao').select('*').eq('op_id', opId).order('created_at'),
      _sb.from('consumo_material').select('*').eq('op_id', opId).order('data_consumo'),
      _sb.from('entradas_producao').select('*').eq('op_id', opId).order('created_at'),
    ]);
    if (op.error) throw op.error;
    return {
      op: op.data,
      envios: envios.data ?? [],
      retornos: retornos.data ?? [],
      consumos: consumos.data ?? [],
      entradas: entradas.data ?? [],
    };
  },
  /** Deletar OP com cascata manual para evitar erro de FK */
  async deleteOPCascade(opId) {
    // 1. Deletar retornos
    await _sb.from('notas_retorno_faccao').delete().eq('op_id', opId);
    // 2. Deletar envios
    await _sb.from('notas_envio_faccao').delete().eq('op_id', opId);
    // 3. Deletar consumos
    await _sb.from('consumo_material').delete().eq('op_id', opId);
    // 4. Deletar entradas finais
    await _sb.from('entradas_producao').delete().eq('op_id', opId);
    // 5. Por fim, deletar a OP
    const { error } = await _sb.from('ordens_producao').delete().eq('id', opId);
    if (error) throw error;
  },
};

/* ---------- UI Helpers ---------- */

/** Toast de notificação */
function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: '✔', error: '✖', info: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/** Loading overlay */
function showLoading(msg = 'Aguarde...') {
  let el = document.getElementById('global-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-loading';
    el.className = 'loading-overlay';
    el.innerHTML = `<div class="spinner"></div><p style="color:var(--text-secondary);font-size:13px">${msg}</p>`;
    document.body.appendChild(el);
  }
}
function hideLoading() {
  document.getElementById('global-loading')?.remove();
}

/** Formatar data BR */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

/** Badge de status OP */
const STATUS_CLASSES = {
  aberta: 'badge-blue',
  em_producao: 'badge-orange',
  aguardando_retorno: 'badge-purple',
  em_conferencia: 'badge-gold',
  finalizada: 'badge-green',
  cancelada: 'badge-gray',
};
const STATUS_LABELS = {
  aberta: 'Aberta',
  em_producao: 'Em Produção',
  aguardando_retorno: 'Ag. Retorno',
  em_conferencia: 'Em Conferência',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};
const PRIORIDADE_CLASSES = {
  baixa: 'badge-gray', normal: 'badge-blue',
  alta: 'badge-orange', urgente: 'badge-red',
};

function statusBadge(s)    { return `<span class="badge ${STATUS_CLASSES[s]||'badge-gray'}">${STATUS_LABELS[s]||s}</span>`; }
function prioridadeBadge(p){ return `<span class="badge ${PRIORIDADE_CLASSES[p]||'badge-gray'}">${p||'—'}</span>`; }

/** Número sequencial de OP (fallback local) */
function gerarNumeroOP() {
  const d = new Date();
  const ano = d.getFullYear().toString().slice(2);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const rnd = String(Math.floor(Math.random() * 9000) + 1000);
  return `OP${ano}${mes}-${rnd}`;
}
function gerarNumeroNota(prefix = 'NE') {
  const d = new Date();
  const rnd = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${rnd}`;
}

/** Sidebar e Navegação */
function openSidebar() {
  document.querySelector('.sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('visible');
}

function closeSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
}

function initSidebar() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';
  
  document.querySelectorAll('.nav-link').forEach(l => {
    // Marca link ativo
    if (l.getAttribute('href') === page) {
      l.classList.add('active');
    }
    // Fecha sidebar ao clicar (útil para mobile/ancoras)
    l.addEventListener('click', closeSidebar);
  });
}

/** Confirmação simples */
function confirmar(msg) { return confirm(msg); }

document.addEventListener('DOMContentLoaded', initSidebar);
