/* ============================================================
   js/pdf.js — Geração de PDFs Profissionais
   Usa: jsPDF + html2canvas (via CDN)
   ============================================================ */

const PDFGen = {

  /* --- Cores e estilos padrão --- */
  COLORS: {
    primary: [25, 27, 36],        // bg-surface
    accent: [232, 184, 75],       // dourado
    text: [238, 240, 246],        // text-primary
    muted: [92, 100, 128],        // text-muted
    border: [45, 51, 72],         // border
    white: [255, 255, 255],
    success: [46, 204, 113],
    warning: [230, 126, 34],
    danger: [231, 76, 60],
  },

  /* --- Cabeçalho padrão de página --- */
  _header(doc, title, subtitle, numDoc) {
    const W = doc.internal.pageSize.getWidth();

    // Fundo cabeçalho
    doc.setFillColor(...this.COLORS.primary);
    doc.rect(0, 0, W, 36, 'F');

    // Barra accent
    doc.setFillColor(...this.COLORS.accent);
    doc.rect(0, 36, W, 2, 'F');

    // Logo / empresa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...this.COLORS.accent);
    doc.text('GESTÃO TÊXTIL', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...[170,175,195]);
    doc.text('SISTEMA DE CONTROLE DE PRODUÇÃO', 14, 20);

    // Título do documento
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...this.COLORS.white);
    doc.text(title, W / 2, 16, { align: 'center' });

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...[180,185,205]);
      doc.text(subtitle, W / 2, 24, { align: 'center' });
    }

    // Número do documento (canto direito)
    if (numDoc) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...this.COLORS.accent);
      doc.text(numDoc, W - 14, 14, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...[170,175,195]);
      doc.text(new Date().toLocaleString('pt-BR'), W - 14, 21, { align: 'right' });
    }

    return 46; // retorna Y após cabeçalho
  },

  /* --- Rodapé --- */
  _footer(doc, pageNum, totalPages) {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    doc.setFillColor(...[30, 35, 48]);
    doc.rect(0, H - 16, W, 16, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...[100,110,140]);
    doc.text('Documento gerado automaticamente pelo Sistema de Gestão Têxtil', 14, H - 6);
    doc.text(`Página ${pageNum} de ${totalPages}`, W - 14, H - 6, { align: 'right' });
  },

  /* --- Linha de dados (label: valor) --- */
  _row(doc, y, label, value, x = 14, w = 85) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...[140,150,180]);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...[220,225,240]);
    doc.text(String(value || '—'), x, y + 5);
    return y + 14;
  },

  /* --- Seção com fundo --- */
  _section(doc, y, title) {
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(...[30, 35, 55]);
    doc.rect(14, y, W - 28, 8, 'F');
    doc.setFillColor(...this.COLORS.accent);
    doc.rect(14, y, 2, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...this.COLORS.accent);
    doc.text(title.toUpperCase(), 20, y + 5.5);
    return y + 14;
  },

  /* --- Tabela simples --- */
  _table(doc, y, headers, rows, colWidths) {
    const W = doc.internal.pageSize.getWidth();
    const startX = 14;
    const rowH = 8;

    // Cabeçalho
    doc.setFillColor(...[35, 42, 65]);
    doc.rect(startX, y, W - 28, rowH + 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...[140,150,180]);

    let cx = startX + 3;
    headers.forEach((h, i) => {
      doc.text(h.toUpperCase(), cx, y + 6);
      cx += colWidths[i];
    });
    y += rowH + 2;

    // Linhas
    rows.forEach((row, ri) => {
      if (ri % 2 === 0) {
        doc.setFillColor(...[20, 23, 36]);
        doc.rect(startX, y, W - 28, rowH, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...[210,215,235]);

      cx = startX + 3;
      row.forEach((cell, ci) => {
        const txt = String(cell ?? '—');
        doc.text(txt.length > 22 ? txt.slice(0, 20) + '…' : txt, cx, y + 5.5);
        cx += colWidths[ci];
      });

      // Linha divisória
      doc.setDrawColor(...[45, 51, 72]);
      doc.setLineWidth(0.2);
      doc.line(startX, y + rowH, startX + W - 28, y + rowH);
      y += rowH;
    });

    return y + 4;
  },

  /* --- Bloco de assinatura --- */
  _assinaturas(doc, y, campos) {
    const W = doc.internal.pageSize.getWidth();
    const slotW = (W - 28) / campos.length;

    campos.forEach((c, i) => {
      const x = 14 + i * slotW;
      doc.setDrawColor(...[60, 70, 100]);
      doc.setLineWidth(0.5);
      doc.line(x + 4, y + 14, x + slotW - 8, y + 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...[120, 130, 160]);
      doc.text(c, x + slotW / 2 - 4, y + 20, { align: 'center' });
    });
    return y + 28;
  },

  /* ============================================================
     FICHA DE PRODUÇÃO (OP)
     ============================================================ */
  async gerarFichaOP(opData) {
    const { op, envios, retornos, consumos, entradas } = opData;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // Fundo total da página
    doc.setFillColor(...[15, 17, 23]);
    doc.rect(0, 0, W, 297, 'F');

    // --- Cabeçalho ---
    let y = this._header(doc, 'FICHA DE ORDEM DE PRODUÇÃO', op.modelo, op.numero_op);

    // --- Bloco principal OP ---
    y = this._section(doc, y, '01 · Dados da Ordem de Produção');

    // Grid de dados
    const col1 = 14, col2 = W / 2 - 10;
    this._row(doc, y, 'Número OP', op.numero_op, col1);
    this._row(doc, y, 'Data', fmtDate(op.data_op), col2);
    y += 14;

    this._row(doc, y, 'Modelo / Produto', op.modelo, col1);
    this._row(doc, y, 'Descrição', op.descricao, col2);
    y += 14;

    this._row(doc, y, 'Cor', op.cor, col1);
    this._row(doc, y, 'Tamanho', op.tamanho, col2);
    y += 14;

    this._row(doc, y, 'Quantidade Total', op.quantidade + ' peças', col1);
    this._row(doc, y, 'Responsável', op.responsavel, col2);
    y += 14;

    this._row(doc, y, 'Status', STATUS_LABELS[op.status] || op.status, col1);
    this._row(doc, y, 'Prioridade', (op.prioridade || '').toUpperCase(), col2);
    y += 14;

    if (op.observacoes) {
      this._row(doc, y, 'Observações', op.observacoes, col1, W - 28);
      y += 14;
    }

    // --- Envios ---
    if (envios.length > 0) {
      y += 4;
      y = this._section(doc, y, '02 · Notas de Envio para Facção');
      y = this._table(doc, y,
        ['Nota', 'Facção', 'Serviço', 'Qtd Enviada', 'Envio', 'Prazo'],
        envios.map(e => [e.numero_nota, e.nome_faccao, e.tipo_servico, e.quantidade_env, fmtDate(e.data_envio), fmtDate(e.prazo_retorno)]),
        [28, 38, 38, 22, 22, 22]
      );
    }

    // --- Retornos ---
    if (retornos.length > 0) {
      y += 4;
      y = this._section(doc, y, '03 · Retornos da Facção');
      y = this._table(doc, y,
        ['Facção', 'Qtd Recebida', 'Perdas', 'Avarias', 'Data Retorno', 'Conferência'],
        retornos.map(r => [r.nome_faccao, r.quantidade_recebida, r.perdas, r.avarias, fmtDate(r.data_retorno), r.status_conferencia]),
        [40, 25, 18, 18, 28, 28]
      );
    }

    // --- Consumo ---
    if (consumos.length > 0) {
      y += 4;
      y = this._section(doc, y, '04 · Consumo de Material');
      y = this._table(doc, y,
        ['Material', 'Quantidade', 'Unidade', 'Responsável', 'Data'],
        consumos.map(c => [c.material, c.quantidade, c.unidade, c.responsavel, fmtDate(c.data_consumo)]),
        [48, 22, 18, 36, 28]
      );
    }

    // --- Entrada Final ---
    if (entradas.length > 0) {
      y += 4;
      y = this._section(doc, y, '05 · Entrada de Produção Finalizada');
      y = this._table(doc, y,
        ['Qtd Final', 'Rejeições', 'Data Entrada', 'Conferência', 'Responsável'],
        entradas.map(e => [e.quantidade_final, e.rejeicoes, fmtDate(e.data_entrada), e.conferencia_final, e.responsavel]),
        [28, 22, 28, 32, 50]
      );
    }

    // --- Resumo ---
    y += 8;
    const totalFinal = entradas.reduce((s, e) => s + (e.quantidade_final || 0), 0);
    const totalRej = entradas.reduce((s, e) => s + (e.rejeicoes || 0), 0);

    doc.setFillColor(...[20, 25, 45]);
    doc.rect(14, y, W - 28, 22, 'F');
    doc.setFillColor(...this.COLORS.accent);
    doc.rect(14, y, 3, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...this.COLORS.accent);
    doc.text('RESUMO DE PRODUÇÃO', 22, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...[220, 225, 240]);
    doc.text(`Previsto: ${op.quantidade} pç   |   Finalizado: ${totalFinal} pç   |   Rejeições: ${totalRej} pç   |   Eficiência: ${op.quantidade ? ((totalFinal / op.quantidade) * 100).toFixed(1) : 0}%`, 22, y + 16);

    y += 30;

    // --- Assinaturas ---
    y = this._section(doc, y, '06 · Conferência e Assinaturas');
    y += 6;
    this._assinaturas(doc, y, ['Responsável Produção', 'Conferência Qualidade', 'Aprovação Gerência']);

    // Rodapé
    this._footer(doc, 1, 1);

    return doc;
  },

  /* ============================================================
     NOTA DE ENVIO PARA FACÇÃO
     ============================================================ */
  async gerarNotaEnvio(envioData, opData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(...[15, 17, 23]);
    doc.rect(0, 0, W, 297, 'F');

    let y = this._header(doc, 'NOTA DE ENVIO PARA FACÇÃO', envioData.nome_faccao, envioData.numero_nota);

    // --- OP Vinculada ---
    y = this._section(doc, y, '01 · Ordem de Produção Vinculada');
    const col1 = 14, col2 = W / 2 - 10;
    this._row(doc, y, 'Número OP', opData.numero_op, col1);
    this._row(doc, y, 'Modelo', opData.modelo, col2);
    y += 14;
    this._row(doc, y, 'Cor', opData.cor, col1);
    this._row(doc, y, 'Tamanho', opData.tamanho, col2);
    y += 14;
    this._row(doc, y, 'Quantidade Total da OP', opData.quantidade + ' peças', col1);
    this._row(doc, y, 'Status OP', STATUS_LABELS[opData.status] || opData.status, col2);
    y += 18;

    // --- Dados Nota ---
    y = this._section(doc, y, '02 · Dados do Envio');
    this._row(doc, y, 'Número da Nota', envioData.numero_nota, col1);
    this._row(doc, y, 'Data de Envio', fmtDate(envioData.data_envio), col2);
    y += 14;
    this._row(doc, y, 'Facção / Prestador', envioData.nome_faccao, col1);
    this._row(doc, y, 'Tipo de Serviço', envioData.tipo_servico, col2);
    y += 14;
    this._row(doc, y, 'Quantidade Enviada', envioData.quantidade_env + ' peças', col1);
    this._row(doc, y, 'Prazo de Retorno', fmtDate(envioData.prazo_retorno), col2);
    y += 14;
    if (envioData.observacoes) {
      this._row(doc, y, 'Observações / Instruções', envioData.observacoes, col1, W - 28);
      y += 14;
    }
    y += 6;

    // --- Tabela de itens ---
    y = this._section(doc, y, '03 · Relação de Itens Enviados');
    y = this._table(doc, y,
      ['Item', 'Descrição', 'Cor', 'Tamanho', 'Quantidade', 'Obs'],
      [['01', opData.modelo, opData.cor, opData.tamanho, envioData.quantidade_env + ' pç', '']],
      [12, 50, 28, 24, 26, 30]
    );
    y += 8;

    // Caixa de quantidade (destaque)
    doc.setFillColor(...[18, 22, 40]);
    doc.rect(14, y, W - 28, 18, 'F');
    doc.setFillColor(...this.COLORS.accent);
    doc.rect(W - 80, y, 66, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...[160, 170, 200]);
    doc.text('TOTAL DE PEÇAS ENVIADAS:', 20, y + 11);

    doc.setFontSize(14);
    doc.setTextColor(...[15, 17, 23]);
    doc.text(String(envioData.quantidade_env), W - 47, y + 12, { align: 'center' });

    y += 28;

    // --- Assinatura ---
    y = this._section(doc, y, '04 · Recebimento e Confirmação');
    y += 6;

    // Caixa de declaração
    doc.setFillColor(...[18, 22, 40]);
    doc.rect(14, y, W - 28, 14, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...[120, 130, 160]);
    doc.text(
      `Declaro ter recebido os itens descritos nesta nota em perfeito estado, conforme especificado acima. Prazo de retorno: ${fmtDate(envioData.prazo_retorno)}.`,
      W / 2, y + 8, { align: 'center', maxWidth: W - 40 }
    );
    y += 22;

    this._assinaturas(doc, y, ['Responsável pelo Envio', 'Recebido pela Facção (Ass./Carimbo)', 'Data de Recebimento']);

    this._footer(doc, 1, 1);
    return doc;
  },

  /* ============================================================
     RELATÓRIO DE MOVIMENTAÇÃO
     ============================================================ */
  async gerarRelatorio(ops) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(...[15, 17, 23]);
    doc.rect(0, 0, W, 297, 'F');

    const hoje = new Date().toLocaleDateString('pt-BR');
    let y = this._header(doc, 'RELATÓRIO DE MOVIMENTAÇÃO', `Gerado em ${hoje}`, `REL-${Date.now().toString().slice(-6)}`);

    // KPIs
    y = this._section(doc, y, '01 · Resumo Geral');
    const totais = {
      total: ops.length,
      abertas: ops.filter(o => o.status === 'aberta').length,
      producao: ops.filter(o => o.status === 'em_producao').length,
      finalizadas: ops.filter(o => o.status === 'finalizada').length,
      urgentes: ops.filter(o => o.prioridade === 'urgente').length,
    };

    const kpiW = (W - 28) / 5;
    const kpis = [
      ['Total OPs', totais.total],
      ['Abertas', totais.abertas],
      ['Em Produção', totais.producao],
      ['Finalizadas', totais.finalizadas],
      ['Urgentes', totais.urgentes],
    ];
    kpis.forEach(([label, val], i) => {
      const x = 14 + i * kpiW;
      doc.setFillColor(...[22, 26, 42]);
      doc.rect(x, y, kpiW - 2, 18, 'F');
      doc.setFillColor(...this.COLORS.accent);
      doc.rect(x, y, kpiW - 2, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...[230, 235, 250]);
      doc.text(String(val), x + kpiW / 2 - 1, y + 10, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...[130, 140, 170]);
      doc.text(label.toUpperCase(), x + kpiW / 2 - 1, y + 15, { align: 'center' });
    });
    y += 26;

    // Lista de OPs
    y = this._section(doc, y, '02 · Ordens de Produção');
    y = this._table(doc, y,
      ['Nº OP', 'Data', 'Modelo', 'Cor', 'Tam', 'Qtd', 'Status', 'Resp.'],
      ops.map(o => [
        o.numero_op,
        fmtDate(o.data_op),
        (o.modelo || '').slice(0, 18),
        o.cor,
        o.tamanho,
        o.quantidade,
        (STATUS_LABELS[o.status] || o.status),
        (o.responsavel || '').slice(0, 12),
      ]),
      [26, 20, 38, 22, 12, 14, 28, 26]
    );

    this._footer(doc, 1, 1);
    return doc;
  },

  /* --- Download helper --- */
  baixar(doc, nome) {
    doc.save(nome);
    showToast(`PDF "${nome}" gerado com sucesso!`, 'success');
  },
};
