/* ============================================================
   js/production.js — Lógica de Ordens de Produção
   ============================================================ */

const ProdPage = {
  ops: [],

  async init() {
    await this.loadOPs();
    this.bindEvents();
    document.getElementById('num-op').value = gerarNumeroOP();
    document.getElementById('data-op').value = new Date().toISOString().split('T')[0];
  },

  async loadOPs() {
    try {
      showLoading('Carregando ordens...');
      this.ops = await DB.list('ordens_producao', { order: { col: 'created_at', asc: false } });
      this.renderTable();
      this.updateKPIs();
    } catch (e) {
      showToast('Erro ao carregar ordens: ' + e.message, 'error');
    } finally {
      hideLoading();
    }
  },

  updateKPIs() {
    const ops = this.ops;
    document.getElementById('kpi-total').textContent = ops.length;
    document.getElementById('kpi-abertas').textContent = ops.filter(o => o.status === 'aberta').length;
    document.getElementById('kpi-producao').textContent = ops.filter(o => ['em_producao','aguardando_retorno'].includes(o.status)).length;
    document.getElementById('kpi-finalizadas').textContent = ops.filter(o => o.status === 'finalizada').length;
    document.getElementById('kpi-urgentes').textContent = ops.filter(o => o.prioridade === 'urgente').length;
  },

  renderTable(filter = '') {
    const tbody = document.getElementById('ops-tbody');
    let ops = this.ops;
    if (filter) {
      const f = filter.toLowerCase();
      ops = ops.filter(o =>
        o.numero_op?.toLowerCase().includes(f) ||
        o.modelo?.toLowerCase().includes(f) ||
        o.responsavel?.toLowerCase().includes(f) ||
        o.cor?.toLowerCase().includes(f)
      );
    }
    if (ops.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">NENHUMA ORDEM DE PRODUÇÃO ENCONTRADA</div><div class="empty-text">Crie sua primeira Ordem de Produção</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = ops.map(op => `
      <tr>
        <td class="td-mono">${op.numero_op}</td>
        <td>${fmtDate(op.data_op)}</td>
        <td><strong>${op.modelo}</strong><br><small class="text-muted">${op.cor} / ${op.tamanho}</small></td>
        <td class="td-mono" style="text-align:right">${op.quantidade}</td>
        <td>${statusBadge(op.status)}</td>
        <td>${prioridadeBadge(op.prioridade)}</td>
        <td>${op.responsavel}</td>
        <td>${fmtDate(op.created_at?.split('T')[0])}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-outline btn-sm" onclick="ProdPage.verFicha('${op.id}')">ABRIR FICHA</button>
            <button class="btn btn-outline btn-sm" onclick="ProdPage.editarOP('${op.id}')">EDITAR OP</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="ProdPage.deletarOP('${op.id}','${op.numero_op}')">X</button>
          </div>
        </td>
      </tr>`).join('');
  },

  bindEvents() {
    document.getElementById('form-op').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.salvarOP();
    });
    document.getElementById('busca-op').addEventListener('input', (e) => {
      this.renderTable(e.target.value);
    });
    document.getElementById('filtro-status').addEventListener('change', (e) => {
      const v = e.target.value;
      const ops = v ? this.ops.filter(o => o.status === v) : this.ops;
      const tbody = document.getElementById('ops-tbody');
      this._renderRows(ops, tbody);
    });
  },

  _renderRows(ops, tbody) {
    if (ops.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Nenhum resultado</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = ops.map(op => `
      <tr>
        <td class="td-mono">${op.numero_op}</td>
        <td>${fmtDate(op.data_op)}</td>
        <td><strong>${op.modelo}</strong><br><small class="text-muted">${op.cor} / ${op.tamanho}</small></td>
        <td class="td-mono" style="text-align:right">${op.quantidade}</td>
        <td>${statusBadge(op.status)}</td>
        <td>${prioridadeBadge(op.prioridade)}</td>
        <td>${op.responsavel}</td>
        <td>${fmtDate(op.created_at?.split('T')[0])}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-outline btn-sm" onclick="ProdPage.verFicha('${op.id}')">📄 Ficha</button>
            <button class="btn btn-outline btn-sm" onclick="ProdPage.editarOP('${op.id}')">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="ProdPage.deletarOP('${op.id}','${op.numero_op}')">🗑</button>
          </div>
        </td>
      </tr>`).join('');
  },

  async salvarOP() {
    const f = document.getElementById('form-op');
    const id = document.getElementById('op-edit-id').value;

    const payload = {
      numero_op: document.getElementById('num-op').value.trim(),
      data_op: document.getElementById('data-op').value,
      modelo: document.getElementById('modelo').value.trim(),
      descricao: document.getElementById('descricao').value.trim(),
      quantidade: parseInt(document.getElementById('quantidade').value),
      cor: document.getElementById('cor').value.trim(),
      tamanho: document.getElementById('tamanho').value.trim(),
      status: document.getElementById('status-op').value,
      prioridade: document.getElementById('prioridade').value,
      responsavel: document.getElementById('responsavel').value.trim(),
      observacoes: document.getElementById('obs-op').value.trim(),
    };

    if (!payload.numero_op || !payload.data_op || !payload.modelo || !payload.quantidade || !payload.responsavel) {
      showToast('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    try {
      showLoading('Salvando...');
      if (id) {
        await DB.update('ordens_producao', id, payload);
        showToast(`ORDEM DE PRODUÇÃO ${payload.numero_op} atualizada!`, 'success');
      } else {
        await DB.insert('ordens_producao', payload);
        showToast(`ORDEM DE PRODUÇÃO ${payload.numero_op} criada com sucesso!`, 'success');
      }
      f.reset();
      document.getElementById('op-edit-id').value = '';
      document.getElementById('num-op').value = gerarNumeroOP();
      document.getElementById('data-op').value = new Date().toISOString().split('T')[0];
      document.getElementById('form-title').textContent = 'Nova Ordem de Produção';
      document.getElementById('btn-cancelar').classList.add('hidden');
      await this.loadOPs();
    } catch (e) {
      showToast('Erro: ' + e.message, 'error');
    } finally {
      hideLoading();
    }
  },

  async editarOP(id) {
    try {
      const op = await DB.get('ordens_producao', id);
      document.getElementById('op-edit-id').value = op.id;
      document.getElementById('num-op').value = op.numero_op;
      document.getElementById('data-op').value = op.data_op;
      document.getElementById('modelo').value = op.modelo;
      document.getElementById('descricao').value = op.descricao || '';
      document.getElementById('quantidade').value = op.quantidade;
      document.getElementById('cor').value = op.cor;
      document.getElementById('tamanho').value = op.tamanho;
      document.getElementById('status-op').value = op.status;
      document.getElementById('prioridade').value = op.prioridade;
      document.getElementById('responsavel').value = op.responsavel;
      document.getElementById('obs-op').value = op.observacoes || '';
      document.getElementById('form-title').textContent = `EDITAR ORDEM DE PRODUÇÃO: ${op.numero_op}`;
      document.getElementById('btn-cancelar').classList.remove('hidden');
      document.getElementById('form-op').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      showToast('Erro ao carregar ORDEM DE PRODUÇÃO: ' + e.message, 'error');
    }
  },

  cancelarEdicao() {
    document.getElementById('form-op').reset();
    document.getElementById('op-edit-id').value = '';
    document.getElementById('num-op').value = gerarNumeroOP();
    document.getElementById('data-op').value = new Date().toISOString().split('T')[0];
    document.getElementById('form-title').textContent = 'Nova Ordem de Produção';
    document.getElementById('btn-cancelar').classList.add('hidden');
  },

  async deletarOP(id, num) {
    const msg = `⚠️ AVISO CRÍTICO: Você está prestes a excluir a ORDEM DE PRODUÇÃO ${num}.\n\n` +
                `Esta ação irá APAGAR PERMANENTEMENTE:\n` +
                `• Todas as notas de envio e retorno\n` +
                `• Todo o histórico de consumo de material\n` +
                `• Todos os registros de entrada final vinculados.\n\n` +
                `Deseja realmente prosseguir?`;
                
    if (!confirmar(msg)) return;
    
    try {
      showLoading('Excluindo OP e dependências...');
      await DB.deleteOPCascade(id);
      showToast(`ORDEM DE PRODUÇÃO ${num} e seus vínculos foram excluídos.`, 'info');
      await this.loadOPs();
    } catch (e) {
      showToast('Não foi possível excluir: ' + e.message, 'error');
    } finally {
      hideLoading();
    }
  },

  async verFicha(id) {
    try {
      showLoading('Carregando ficha...');
      const data = await DB.getOpFull(id);
      hideLoading();
      this._abrirModalFicha(data);
    } catch (e) {
      hideLoading();
      showToast('Erro: ' + e.message, 'error');
    }
  },

  _abrirModalFicha(data) {
    const { op, envios, retornos, consumos, entradas } = data;
    const totalFinal = entradas.reduce((s, e) => s + (e.quantidade_final || 0), 0);
    const totalRej = entradas.reduce((s, e) => s + (e.rejeicoes || 0), 0);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', `Ficha da Ordem de Produção: ${op.numero_op}`);
    modal.innerHTML = `
      <div class="modal-box" style="max-width:820px">
        <div class="modal-header">
          <div>
            <div class="modal-title">FICHA DA ORDEM DE PRODUÇÃO: ${op.numero_op}</div>
            <div class="card-subtitle">${op.modelo} — ${op.cor} / ${op.tamanho}</div>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary btn-sm" id="btn-pdf-ficha">📄 Gerar PDF</button>
            <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕ Fechar</button>
          </div>
        </div>
        <div class="modal-body">
          <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
            <div class="kpi-card"><div class="kpi-label">Quantidade</div><div class="kpi-value">${op.quantidade}</div><div class="kpi-sub">peças previstas</div></div>
            <div class="kpi-card"><div class="kpi-label">Enviado</div><div class="kpi-value">${envios.reduce((s,e)=>s+e.quantidade_env,0)}</div><div class="kpi-sub">para facção</div></div>
            <div class="kpi-card"><div class="kpi-label">Recebido</div><div class="kpi-value">${retornos.reduce((s,r)=>s+r.quantidade_recebida,0)}</div><div class="kpi-sub">da facção</div></div>
            <div class="kpi-card"><div class="kpi-label">Finalizado</div><div class="kpi-value">${totalFinal}</div><div class="kpi-sub">entrada final (${totalRej} rej.)</div></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div><span class="form-label">Status</span><div style="margin-top:4px">${statusBadge(op.status)}</div></div>
            <div><span class="form-label">Prioridade</span><div style="margin-top:4px">${prioridadeBadge(op.prioridade)}</div></div>
            <div><span class="form-label">Responsável</span><div style="color:var(--text-primary);margin-top:4px">${op.responsavel}</div></div>
            <div><span class="form-label">Data</span><div style="color:var(--text-primary);margin-top:4px">${fmtDate(op.data_op)}</div></div>
          </div>
          ${op.observacoes ? `<div style="background:var(--bg-elevated);padding:10px 12px;border-radius:6px;border-left:2px solid var(--accent);font-size:12px;color:var(--text-secondary);margin-bottom:16px">${op.observacoes}</div>` : ''}

          ${envios.length > 0 ? `
          <div class="card-header" style="margin-top:12px"><span class="card-title">Envios para Facção</span></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Nota</th><th>Facção</th><th>Serviço</th><th>Qtd</th><th>Envio</th><th>Prazo</th><th>Status</th></tr></thead>
            <tbody>${envios.map(e=>`<tr>
              <td class="td-mono">${e.numero_nota}</td><td>${e.nome_faccao}</td><td>${e.tipo_servico}</td>
              <td>${e.quantidade_env}</td><td>${fmtDate(e.data_envio)}</td><td>${fmtDate(e.prazo_retorno)}</td>
              <td>${statusBadge(e.status)}</td>
            </tr>`).join('')}</tbody>
          </table></div>` : ''}

          ${retornos.length > 0 ? `
          <div class="card-header" style="margin-top:12px"><span class="card-title">Retornos da Facção</span></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Facção</th><th>Recebido</th><th>Perdas</th><th>Avarias</th><th>Data</th><th>Conferência</th></tr></thead>
            <tbody>${retornos.map(r=>`<tr>
              <td>${r.nome_faccao}</td><td>${r.quantidade_recebida}</td><td>${r.perdas}</td><td>${r.avarias}</td>
              <td>${fmtDate(r.data_retorno)}</td><td><span class="badge badge-blue">${r.status_conferencia}</span></td>
            </tr>`).join('')}</tbody>
          </table></div>` : ''}
        </div>
      </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('btn-pdf-ficha').addEventListener('click', async () => {
      try {
        showLoading('Gerando PDF...');
        const doc = await PDFGen.gerarFichaOP(data);
        PDFGen.baixar(doc, `Ficha_OP_${op.numero_op}.pdf`);
      } catch(e) {
        showToast('Erro ao gerar PDF: ' + e.message, 'error');
      } finally {
        hideLoading();
      }
    });
  },
};

document.addEventListener('DOMContentLoaded', () => ProdPage.init());
