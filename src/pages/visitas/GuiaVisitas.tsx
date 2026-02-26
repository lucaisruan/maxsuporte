import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Brain, Users, Lightbulb, CheckCircle, BookOpen } from "lucide-react";

export default function GuiaVisitas() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Guia do Módulo de Visitas
          </h1>
          <p className="text-muted-foreground mt-1">Tudo que você precisa saber sobre o módulo de visitas com IA</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> O que é o módulo de Visitas?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <p>O módulo de Visitas permite que implantadores registrem situações, dúvidas e oportunidades detectadas durante visitas a clientes. Cada visita gera uma análise automática por IA e permite interação colaborativa.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <div className="space-y-2">
              <p><strong>1. Criação da Visita:</strong> O implantador seleciona o cliente, descreve a situação e escolhe o tipo (visita técnica, dúvida, diagnóstico ou oportunidade).</p>
              <p><strong>2. Análise IA:</strong> Automaticamente, a IA analisa a descrição usando a base de conhecimento institucional e gera uma resposta com sugestões.</p>
              <p><strong>3. Conversa Colaborativa:</strong> Implantadores e administradores podem interagir na conversa. A cada nova mensagem, a IA pode complementar sua análise.</p>
              <p><strong>4. Recomendações:</strong> A IA gera recomendações de serviços, treinamentos e ações com base na situação descrita.</p>
              <p><strong>5. Resolução:</strong> Um administrador pode marcar a visita como resolvida quando a situação for concluída.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Base de Conhecimento IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <p>Administradores podem "educar" a IA cadastrando diretrizes na Base de Conhecimento. A IA prioriza essas diretrizes sobre inferências genéricas.</p>
            <div className="space-y-2 mt-2">
              <p><strong>Categorias disponíveis:</strong></p>
              <div className="flex flex-wrap gap-2">
                {["Produto", "Treinamento", "Comportamento", "Processo", "Comercial"].map((c) => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <p><strong>O que cadastrar:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Decisões estratégicas da empresa</li>
                <li>Recomendações padrão para cenários comuns</li>
                <li>Serviços adicionais (ex: MaxBip, AutoMax)</li>
                <li>Abordagens para perfis comportamentais de clientes</li>
                <li>Cenários de diagnóstico e soluções</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-warning" /> Tipos de Visita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <Badge variant="outline" className="mb-1">Visita Técnica</Badge>
                <p className="text-muted-foreground">Para registros de visitas presenciais ou remotas com o cliente.</p>
              </div>
              <div className="rounded-lg border p-3">
                <Badge variant="outline" className="mb-1">Dúvida</Badge>
                <p className="text-muted-foreground">Quando o implantador tem uma dúvida sobre processo, produto ou abordagem.</p>
              </div>
              <div className="rounded-lg border p-3">
                <Badge variant="outline" className="mb-1">Diagnóstico</Badge>
                <p className="text-muted-foreground">Para análise de problemas complexos que precisam de investigação.</p>
              </div>
              <div className="rounded-lg border p-3">
                <Badge variant="outline" className="mb-1">Oportunidade</Badge>
                <p className="text-muted-foreground">Quando se identifica potencial para novos serviços ou produtos.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /> Permissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium text-foreground mb-1">Implantador</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>✓ Criar visitas</li>
                  <li>✓ Comentar em visitas</li>
                  <li>✓ Visualizar visitas da equipe</li>
                  <li>✓ Ver respostas da IA</li>
                </ul>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium text-foreground mb-1">Administrador</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>✓ Tudo do implantador</li>
                  <li>✓ Marcar visita como resolvida</li>
                  <li>✓ Gerenciar base de conhecimento</li>
                  <li>✓ Cadastrar diretrizes e serviços</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
