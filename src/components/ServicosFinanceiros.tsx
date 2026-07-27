"use client";
import React from "react";

/**
 * Termos de Uso dos Serviços Financeiros (de GESTÃO) do Minhas Métricas.
 * MINHAS METRICAS INOVA SIMPLES (I.S.), CNPJ 68.176.907/0001-40 — empresa de
 * SOFTWARE. NÃO é instituição de pagamento; não movimenta dinheiro, não oferece
 * conta, Pix, TED, boleto ou antecipação. São ferramentas de gestão financeira.
 */
const H: React.CSSProperties = { fontSize: 15, fontWeight: 800, margin: "18px 0 6px", color: "var(--txt)" };
const P: React.CSSProperties = { margin: "0 0 8px", lineHeight: 1.7 };
const Item = ({ children }: { children: React.ReactNode }) => <li style={{ marginBottom: 4, lineHeight: 1.6 }}>{children}</li>;

export default function ServicosFinanceiros() {
  return (
    <div style={{ fontSize: 13.5, color: "var(--txt-2)" }}>
      {/* Aviso importante */}
      <div style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.4)", borderRadius: 10, padding: "12px 14px", margin: "4px 0 14px" }}>
        <b style={{ color: "#B45309" }}>Importante:</b> o Minhas Métricas é um <b>software de gestão financeira</b>. <b>Não</b> é instituição de pagamento nem banco: não movimenta dinheiro, não realiza pagamentos, transferências, Pix, TED, boletos ou antecipação de recebíveis. Os &ldquo;serviços financeiros&rdquo; aqui referidos são as <b>ferramentas de gestão</b> (registro de receitas e custos, fluxo de caixa, DRE, relatórios e calendário de pagamentos).
      </div>

      <div style={H}>Responsabilidade sobre os valores</div>
      <p style={P}>Os dados financeiros são inseridos e conferidos pelo próprio Cliente. Assim:</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>O Minhas Métricas <b>não tem responsabilidade sobre os valores cadastrados</b>.</Item>
        <Item><b>Não emitimos declarações oficiais</b> e <b>não substituímos de forma alguma a contabilidade</b> da empresa.</Item>
        <Item>Erros em <b>fluxo de caixa</b> e nas informações <b>não são de nossa responsabilidade</b>.</Item>
        <Item>Não estimulamos tomadas de decisão e <b>não interferimos nos dados</b> do Cliente.</Item>
        <Item><b>Sempre pergunte ao seu contador</b> e <b>sempre confira os dados</b> antes de qualquer decisão.</Item>
        <Item>Se encontrar erros de cálculo, <b>informe imediatamente</b> para tomarmos as providências.</Item>
      </ul>

      <div style={H}>1. Aceite e concordância</div>
      <p style={P}>O cadastro, o acesso e a utilização do Minhas Métricas implicam a aceitação integral destes Termos de Uso e da Política de Privacidade. O aceite é validado pelo uso das credenciais do cliente, que é responsável por sua guarda e sigilo. O uso continuado após a entrada em vigor de eventuais revisões será interpretado como aceitação das condições atualizadas.</p>

      <div style={H}>2. Definições</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item><b>Plataforma / Software:</b> o sistema Minhas Métricas, acessado via web ou aplicativo.</Item>
        <Item><b>Cliente:</b> a pessoa física ou jurídica que contrata e utiliza a Plataforma.</Item>
        <Item><b>Serviços Financeiros (de gestão):</b> as funcionalidades de organização e análise financeira da empresa, sem qualquer movimentação de recursos.</Item>
        <Item><b>LGPD:</b> Lei 13.709/2018 — Lei Geral de Proteção de Dados Pessoais.</Item>
      </ul>

      <div style={H}>3. Objeto e funcionalidades</div>
      <p style={P}>O Minhas Métricas disponibiliza ferramentas para o Cliente <b>organizar e acompanhar</b> a vida financeira do seu negócio, entre elas:</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>Registro de receitas e custos e estrutura de receitas e despesas;</Item>
        <Item>Dashboards, faturamento e despesas mês a mês e composição por canal/custo;</Item>
        <Item>Geração de DRE (Demonstração do Resultado do Exercício) e relatórios gerenciais;</Item>
        <Item>Calendário de pagamentos, com vencimentos e recorrências;</Item>
        <Item>Gestão de equipe e usuários com níveis de permissão.</Item>
      </ul>
      <p style={P}>Todos os valores exibidos são <b>informativos e gerenciais</b>, inseridos e conferidos pelo próprio Cliente. O Minhas Métricas não executa transações financeiras nem substitui a contabilidade oficial da empresa.</p>

      <div style={H}>4. Cadastro e conta de acesso</div>
      <p style={P}>Para usar a Plataforma, o Cliente deve fornecer informações verdadeiras, completas e atualizadas. O acesso é pessoal e as credenciais são de responsabilidade do Cliente. O Cliente é responsável por todas as ações realizadas com suas credenciais.</p>

      <div style={H}>5. Planos e tarifas</div>
      <p style={P}>A criação da conta pode ser gratuita, e determinados recursos avançados podem estar disponíveis em planos pagos. Os valores e as condições de cada plano são apresentados na Plataforma antes da contratação. Alterações de preço serão comunicadas previamente.</p>

      <div style={H}>6. Responsabilidades do Cliente</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>Manter a veracidade e a atualização dos dados fornecidos;</Item>
        <Item>Usar a Plataforma de forma lícita e conforme estes Termos;</Item>
        <Item>Preservar o sigilo das credenciais de acesso;</Item>
        <Item>Conferir os dados lançados, já que os relatórios refletem o que for inserido pelo Cliente.</Item>
      </ul>

      <div style={H}>7. Segurança</div>
      <p style={P}>Adotamos medidas técnicas e administrativas para proteger os dados (controles de acesso, criptografia e boas práticas de segurança). O Minhas Métricas jamais solicitará sua senha por telefone, e-mail ou mensagem.</p>

      <div style={H}>8. Suspensão e bloqueio</div>
      <p style={P}>A conta poderá ser suspensa ou bloqueada em caso de: uso indevido ou ilegal da Plataforma; descumprimento destes Termos ou da Política de Privacidade; indícios de acesso não autorizado; ou determinação legal. Sempre que possível, o Cliente será previamente comunicado.</p>

      <div style={H}>9. Rescisão e encerramento</div>
      <p style={P}>O Cliente pode encerrar o uso a qualquer momento. O Minhas Métricas também poderá encerrar a conta em caso de inatividade prolongada, uso indevido ou descumprimento destes Termos. Os dados poderão ser exportados pelo Cliente antes do encerramento, observados os prazos legais de retenção.</p>

      <div style={H}>10. Dados e privacidade (LGPD)</div>
      <p style={P}>O tratamento de dados pessoais segue a LGPD e a <b>Política de Privacidade</b> do Minhas Métricas, disponível nesta mesma tela de Termos de uso.</p>

      <div style={H}>11. Limitação de responsabilidade</div>
      <p style={P}>Por ser uma ferramenta de apoio à gestão, o Minhas Métricas não se responsabiliza por decisões tomadas com base nos relatórios, nem por dados incorretos inseridos pelo Cliente. A responsabilidade total, quando aplicável, limita-se ao valor pago pelo Cliente pelo serviço nos 12 (doze) meses anteriores ao evento.</p>

      <div style={H}>12. Canais de atendimento</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>E-mail: <b>minhasmetricas@gmail.com</b></Item>
        <Item>Telefone/WhatsApp: <b>(62) 9479-7664</b> — dias úteis, horário comercial.</Item>
      </ul>

      <div style={H}>13. Foro e vigência</div>
      <p style={P}>Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de Aparecida de Goiânia/GO para dirimir controvérsias. Este documento poderá ser revisado periodicamente, permanecendo consistente com a realidade operacional do Minhas Métricas.</p>
    </div>
  );
}
