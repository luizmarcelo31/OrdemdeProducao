# Atualizações do Sistema de Gestão Têxtil

Este documento resume as alterações recentes realizadas para melhorar a estabilidade, segurança e usabilidade do sistema.

## 1. Navegação e Mobile
- **Correção do Menu Lateral**: O botão hamburger (menu) não funcionava em dispositivos móveis nas páginas de Consumo, Entradas e Relatórios. 
- **Centralização da Lógica**: As funções de abrir/fechar o menu foram movidas para o arquivo global `js/supabase.js`, garantindo que funcionem em todas as páginas atuais e futuras.
- **Fechamento Automático**: O menu agora fecha automaticamente ao clicar em qualquer link de navegação.

## 2. Segurança e Exclusão de Dados
- **Avisos Críticos**: Implementação de mensagens de confirmação obrigatórias antes de apagar qualquer dado importante (OPs, Notas de Envio, Consumo de Material).
- **Exclusão em Cascata**: Corrigido o erro que impedia a exclusão de uma Ordem de Produção (OP) que possuía vínculos. Agora, ao apagar uma OP, o sistema remove automaticamente todos os registros dependentes (após confirmação do usuário).

## 3. Correções Técnicas (Bugs)
- **Script Loading**: Corrigido o erro `ProdPage is not defined` que aparecia no console da página de produção devido à ordem de carregamento dos scripts.
- **Botões de Ação**: Adicionados botões de exclusão que faltavam nas tabelas de Envio e Retorno de Facção.

## Arquivos Alterados
- `js/supabase.js`: Adicionada lógica global de sidebar e exclusão em cascata.
- `js/production.js`: Atualizada lógica de exclusão com avisos críticos.
- `production.html`: Correção de carregamento de script e remoção de redundâncias.
- `inventory.html`: Adicionado aviso crítico na exclusão de consumo.
- `outsource.html`: Adicionada funcionalidade de exclusão para notas de envio e retorno com avisos.

---
*Atualizado em: 27 de Abril de 2026*
