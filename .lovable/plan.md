

# Correcao: Permitir Data Retroativa no Cadastro de Implantacao

## Problema

O campo "Data de Inicio" no formulario de nova implantacao possui o atributo `min` configurado para a data atual, impedindo a selecao de datas passadas.

**Linha 293 do arquivo `src/pages/admin/NovaImplantacao.tsx`:**
```text
min={new Date().toISOString().split("T")[0]}
```

Esse atributo HTML bloqueia qualquer data anterior a hoje.

## Solucao

Remover o atributo `min` do campo de data, permitindo que o administrador informe datas retroativas livremente.

Adicionalmente, ajustar a logica de determinacao de status (linhas 143-145) para tratar corretamente datas passadas:

- Data passada ou hoje: status = `em_andamento`
- Data futura: status = `agendada`

A logica atual ja funciona corretamente para isso (`startDate > today` retorna false para datas passadas), entao nenhuma mudanca adicional e necessaria na logica de status.

## Alteracao

**Arquivo:** `src/pages/admin/NovaImplantacao.tsx`

- **Remover** o atributo `min` da linha 293
- **Atualizar** o texto auxiliar (linha 296-298) para indicar que datas passadas e futuras sao permitidas

## Detalhes Tecnicos

Mudanca unica no componente `Input` de data:

```text
Antes:
  <Input type="date" ... min={new Date().toISOString().split("T")[0]} />
  <p>Datas futuras criam implantacoes agendadas</p>

Depois:
  <Input type="date" ... />
  <p>Datas futuras criam implantacoes agendadas. Datas passadas iniciam como "Em andamento".</p>
```

Nenhuma outra alteracao e necessaria. O restante da logica (status, `actual_start_date`) ja trata corretamente ambos os cenarios.
