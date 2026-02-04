
# Plano de Evolução do Módulo de Comissões

## Status: ✅ Implementado

## Conceito Unificado

O sistema agora trata **Modo de Implantação** e **Comissão** como uma **única entidade conceitual**:

- Ao cadastrar um modo de implantação, o admin define o nome e a comissão associada
- No cadastro de implantação, o campo "Modo de Implantação" lista automaticamente os modos ativos
- O sistema deriva automaticamente o modo de implantação a partir da comissão cadastrada

---

## Alterações Realizadas

### Banco de Dados
- Campo `commission_type_id` adicionado à tabela `implementations`
- Dados migrados automaticamente do antigo `implementation_type` (ENUM) para o novo modelo
- Retrocompatibilidade com implantações existentes mantida

### Formulários Atualizados
- `NovaImplantacao.tsx`: Campo "Modo de Implantação" agora busca da tabela `commission_types`
- `EditarImplantacao.tsx`: Mesmo comportamento, exibe modos inativos se já selecionados
- `ImplantacaoDetalhe.tsx`: Exibe nome do modo de implantação ao invés do ENUM

### Listagens
- `ImplantacoesAdmin.tsx`: Coluna "Modo" adicionada exibindo o nome do modo de implantação

### Tela de Configuração
- `ConfiguracaoComissoes.tsx`: Renomeada para "Modos de Implantação"
- Terminologia atualizada para refletir o conceito unificado

### Relatórios
- `RelatorioComissoes.tsx`: Mantém retrocompatibilidade com dados antigos

## Visão Geral

Este plano descreve as alterações necessárias para permitir a criação de tipos de comissão customizáveis, mantendo compatibilidade com o sistema atual de comissões por tipo de implantação.

---

## Arquitetura Atual vs. Proposta

### Sistema Atual
- Comissões fixas por tipo de implantação (Web, Manager, Basic)
- Valor único de comissão por implantação (campo `commission_value` na tabela `implementations`)
- Trigger automático vincula comissão baseado no `implementation_type`

### Sistema Proposto
- Tipos de comissão customizáveis e ilimitados
- Possibilidade de múltiplas comissões por implantação
- Manutenção do histórico de valores no momento da vinculação
- Compatibilidade retroativa com dados existentes

---

## Fase 1: Alterações no Banco de Dados

### 1.1 Nova Tabela `commission_types`
Criação de tabela para tipos de comissão customizáveis:

```text
+---------------------------+
|     commission_types      |
+---------------------------+
| id (uuid, PK)            |
| name (text, NOT NULL)    |
| description (text)       |
| value (decimal)          |
| is_active (boolean)      |
| created_by (uuid)        |
| created_at (timestamp)   |
| updated_at (timestamp)   |
+---------------------------+
```

### 1.2 Nova Tabela `implementation_commissions`
Tabela de relacionamento para múltiplas comissões por implantação:

```text
+-------------------------------+
|   implementation_commissions  |
+-------------------------------+
| id (uuid, PK)                |
| implementation_id (uuid, FK) |
| commission_type_id (uuid, FK)|
| commission_name (text)       |  -- Snapshot do nome
| commission_value (decimal)   |  -- Snapshot do valor
| created_by (uuid)            |
| created_at (timestamp)       |
+-------------------------------+
```

### 1.3 Políticas de Segurança (RLS)
- `commission_types`: Apenas administradores podem criar, editar e visualizar
- `implementation_commissions`: Apenas administradores podem criar/editar; implantadores sem acesso

### 1.4 Migração de Dados Existentes
- Migrar automaticamente as regras da tabela `commission_rules` para `commission_types`
- Manter dados históricos intactos

---

## Fase 2: Tela de Cadastro de Tipos de Comissão

### 2.1 Atualização da Página `ConfiguracaoComissoes.tsx`

Funcionalidades:
- Listagem de todos os tipos de comissão (existentes e novos)
- Formulário para criar novo tipo:
  - Nome (obrigatório)
  - Valor em R$ (obrigatório)
  - Descrição (opcional)
  - Status Ativo/Inativo
- Edição de tipos existentes
- Desativação (não exclusão) de tipos
- Validação: tipos já utilizados não podem ser excluídos

Layout proposto:
```text
+------------------------------------------------+
| Configuração de Comissões                      |
+------------------------------------------------+
| [+ Novo Tipo de Comissão]                      |
+------------------------------------------------+
| Nome         | Valor    | Status  | Ações     |
|--------------|----------|---------|-----------|
| Web          | R$ 100   | Ativo   | [Ed] [De] |
| Manager      | R$ 300   | Ativo   | [Ed] [De] |
| Treinamento  | R$ 150   | Ativo   | [Ed] [De] |
| Suporte Esp. | R$ 200   | Inativo | [Ed] [At] |
+------------------------------------------------+
```

---

## Fase 3: Vinculação de Comissões na Conclusão

### 3.1 Atualização da Página `ImplantacaoDetalhe.tsx`

Ao concluir uma implantação (mudança de status para "concluída"):
1. Modal de seleção de comissões aparece para o administrador
2. Exibe lista de tipos de comissão ativos com checkbox
3. Cada tipo mostra nome e valor atual
4. Admin seleciona um ou mais tipos
5. Sistema registra as comissões selecionadas com valores congelados

Fluxo:
```text
Admin altera status → "Concluída"
           ↓
    [Modal de Comissões]
    ┌─────────────────────────────────┐
    │ Vincular Comissões              │
    │                                 │
    │ ☑ Web - R$ 100,00              │
    │ ☐ Manager - R$ 300,00          │
    │ ☑ Treinamento Extra - R$ 150,00│
    │                                 │
    │ Total: R$ 250,00               │
    │                                 │
    │ [Cancelar]  [Confirmar]        │
    └─────────────────────────────────┘
           ↓
   Registros salvos em
   implementation_commissions
```

### 3.2 Remoção do Trigger Automático
- O trigger `set_commission_on_completion` será removido
- A vinculação passa a ser manual pelo administrador no momento da conclusão

---

## Fase 4: Atualização do Relatório de Comissões

### 4.1 Alterações em `RelatorioComissoes.tsx`

Ajustes para suportar múltiplas comissões:
- Buscar dados da tabela `implementation_commissions`
- Exibir detalhamento por tipo de comissão
- Manter filtros existentes (período, implantador, tipo)
- Adicionar filtro por tipo de comissão

Nova estrutura da tabela:
```text
| Cliente | Implantador | Comissões              | Data | Total   | Status |
|---------|-------------|------------------------|------|---------|--------|
| ACME    | João        | Web (R$100)            | 15/01| R$ 250  | Pago   |
|         |             | Treinamento (R$150)    |      |         |        |
| Beta SA | Maria       | Manager (R$300)        | 18/01| R$ 300  | Pend.  |
```

### 4.2 Cálculos Atualizados
- Total por implantação = soma de todas as comissões vinculadas
- Total por implantador = soma de comissões das implantações do período
- Retrocompatibilidade: implantações antigas com `commission_value` na tabela principal continuam funcionando

---

## Fase 5: Validações e Regras de Negócio

### 5.1 Proteções
- Tipos de comissão já utilizados: não podem ser excluídos (apenas desativados)
- Tipos inativos: não aparecem na seleção ao concluir implantação
- Valores históricos: salvos no momento da vinculação, imutáveis
- Apenas administradores: podem criar/gerenciar tipos e vincular comissões

### 5.2 Retrocompatibilidade
- Implantações já concluídas mantêm o `commission_value` original
- Relatórios consideram tanto o campo antigo quanto a nova tabela de relacionamento

---

## Arquivos a Serem Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `supabase/migrations/...` | Nova migração | Criar tabelas e políticas RLS |
| `src/integrations/supabase/types.ts` | Auto-gerado | Atualizado automaticamente |
| `src/pages/admin/ConfiguracaoComissoes.tsx` | Edição | Tela de cadastro de tipos |
| `src/pages/ImplantacaoDetalhe.tsx` | Edição | Modal de vinculação de comissões |
| `src/pages/admin/RelatorioComissoes.tsx` | Edição | Suporte a múltiplas comissões |

---

## Detalhes Técnicos

### Migração SQL Proposta

```text
1. Criar tabela commission_types
   - Campos: id, name, description, value, is_active, created_by, timestamps
   - Unique constraint no nome

2. Criar tabela implementation_commissions
   - Campos: id, implementation_id, commission_type_id, commission_name, 
             commission_value, created_by, created_at
   - Foreign keys para implementations e commission_types

3. Migrar dados existentes
   - INSERT INTO commission_types a partir de commission_rules

4. Configurar RLS
   - Admins: full access em ambas tabelas
   - Implantadores: sem acesso

5. Manter tabela commission_rules
   - Para retrocompatibilidade
   - Pode ser removida em migração futura
```

### Componentes React Novos
1. `CommissionTypeForm` - Formulário de criação/edição de tipo
2. `CommissionSelectionModal` - Modal para seleção ao concluir implantação

---

## Resumo de Entregas

1. Banco de dados expandido com novas tabelas e políticas de segurança
2. Tela de configuração atualizada para CRUD de tipos customizáveis
3. Fluxo de conclusão com seleção de múltiplas comissões
4. Relatório atualizado para exibir múltiplas comissões por implantação
5. Compatibilidade total com dados e funcionalidades existentes
