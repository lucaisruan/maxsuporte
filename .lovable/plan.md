

# Plano: Edição de Episódios + Auditoria + Visibilidade Multi-Analistas

## Resumo

Três entregas principais:
1. Permitir edição de episódios (analista autor ou admin)
2. Criar tabela de auditoria com histórico de alterações
3. Exibir nome do analista criador em cada episódio + garantir visibilidade

---

## Análise da Situação Atual

- **RLS de episodes (SELECT)**: Já permite que todos os analistas vinculados vejam todos os episódios da implantação. A query no frontend também busca por `implementation_id` sem filtro de `created_by`. **A visibilidade já funciona no nível de dados.**
- **RLS de episodes (UPDATE)**: Permite update se `created_by = auth.uid()` OU admin. Isso está correto para a regra solicitada.
- **Interface**: Não exibe quem criou o episódio. Não permite edição. O `Episode` interface não inclui `created_by`.

---

## Etapas de Implementação

### 1. Criar tabela `episode_audit_logs` (migração SQL)

```sql
CREATE TABLE public.episode_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  edited_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.episode_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view audit logs"
  ON public.episode_audit_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserção permitida para autenticados (o sistema insere via código)
CREATE POLICY "Authenticated can insert audit logs"
  ON public.episode_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (edited_by = auth.uid());
```

### 2. Atualizar interface `Episode` no frontend

Adicionar `created_by` ao tipo e à query de busca de episódios. Também buscar o perfil do criador via join:

```typescript
interface Episode {
  // ... campos existentes
  created_by: string | null;
  creator_profile?: { name: string } | null;
}
```

Query atualizada:
```typescript
.select("*, creator_profile:profiles!episodes_created_by_fkey(name)")
```

Como não há FK explícita, faremos um segundo fetch dos profiles ou usaremos um map local com os profiles já carregados.

### 3. Adicionar funcionalidade de edição de episódio

- Novo estado `editingEpisode` para controlar qual episódio está sendo editado
- Reutilizar o dialog de episódio existente, preenchendo os campos com os valores atuais
- Botão "Editar" visível apenas se `episode.created_by === user.id` OU `role === 'admin'`
- Ao salvar: comparar valores antigos vs novos, inserir logs de auditoria na tabela `episode_audit_logs`, depois fazer update no episódio

### 4. Exibir nome do criador nos episódios

Na listagem de episódios, adicionar badge/texto com o nome do analista que criou cada episódio. Buscar profiles vinculados ao `created_by` dos episódios.

### 5. Botão "Ver histórico de alterações" (apenas admin)

- Dialog que busca `episode_audit_logs` para o episódio selecionado
- Exibe: usuário que editou, data/hora, campo alterado, valor antigo → valor novo
- Buscar nome do editor via profiles

### 6. Verificar visibilidade (confirmação)

A RLS e queries já estão corretas para multi-analistas. A única melhoria é garantir que o `created_by` é exibido na UI para distinguir quem criou cada episódio.

---

## Arquivos Impactados

| Arquivo | Alteração |
|---|---|
| Migração SQL (nova) | Criar tabela `episode_audit_logs` |
| `src/pages/ImplantacaoDetalhe.tsx` | Adicionar edição, auditoria, nome do criador, histórico |
| `src/integrations/supabase/types.ts` | Auto-atualizado após migração |

---

## O Que NÃO Será Alterado

- Webhooks existentes
- Cálculo de horas/comissão
- Checklist
- Dashboard
- Relatórios de produtividade

