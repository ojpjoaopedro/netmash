"use client";
import React from "react";

/**
 * Termo de Proteção de Dados do Minhas Métricas, alinhado à LGPD (Lei 13.709/2018).
 * MINHAS METRICAS INOVA SIMPLES (I.S.), CNPJ 68.176.907/0001-40 — empresa de software.
 */
const H: React.CSSProperties = { fontSize: 15, fontWeight: 800, margin: "18px 0 6px", color: "var(--txt)" };
const P: React.CSSProperties = { margin: "0 0 8px", lineHeight: 1.7 };
const Item = ({ children }: { children: React.ReactNode }) => <li style={{ marginBottom: 4, lineHeight: 1.6 }}>{children}</li>;

export default function ProtecaoDeDados() {
  return (
    <div style={{ fontSize: 13.5, color: "var(--txt-2)" }}>
      <div style={H}>1. Objetivo e abrangência</div>
      <p style={P}>Este documento descreve como o <b>Minhas Métricas</b> protege os dados pessoais que trata, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD). Aplica-se a todos os titulares que se relacionam com a plataforma: clientes, membros de suas equipes, parceiros e visitantes.</p>

      <div style={H}>2. Princípios (art. 6º da LGPD)</div>
      <p style={P}>O tratamento observa os princípios de: <b>finalidade</b> (uso para propósitos legítimos e informados), <b>adequação</b>, <b>necessidade</b> (mínimo de dados necessário), <b>livre acesso</b>, <b>qualidade dos dados</b>, <b>transparência</b>, <b>segurança</b>, <b>prevenção</b>, <b>não discriminação</b> e <b>responsabilização e prestação de contas</b>.</p>

      <div style={H}>3. Bases legais do tratamento (art. 7º)</div>
      <p style={P}>Tratamos dados pessoais apenas quando amparados por uma base legal, entre elas:</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item><b>Execução de contrato</b>: para operar os serviços contratados (a plataforma de gestão);</Item>
        <Item><b>Cumprimento de obrigação legal ou regulatória</b>;</Item>
        <Item><b>Legítimo interesse</b>: para segurança, prevenção a fraudes e melhoria dos serviços, sempre respeitando os direitos do titular;</Item>
        <Item><b>Consentimento</b>: quando aplicável, por exemplo para comunicações de marketing, podendo ser revogado a qualquer momento.</Item>
      </ul>

      <div style={H}>4. Dados tratados</div>
      <p style={P}>Coletamos apenas o necessário, como: dados de cadastro (nome, CPF/CNPJ, e-mail, telefone, endereço), dados de acesso (credenciais e registros de uso) e os dados financeiros de gestão inseridos pelo próprio cliente. Não coletamos dados pessoais sensíveis de forma intencional.</p>

      <div style={H}>5. Medidas de segurança</div>
      <p style={P}>Adotamos medidas técnicas e administrativas adequadas para proteger os dados contra acessos não autorizados, perda, alteração ou divulgação indevida, incluindo:</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>Criptografia de dados em trânsito e controle de armazenamento;</Item>
        <Item>Controle de acesso por credenciais e por níveis de permissão;</Item>
        <Item>Registros de atividade (logs) e monitoramento;</Item>
        <Item>Rotinas de backup e recuperação;</Item>
        <Item>Gestão de vulnerabilidades e políticas internas de segurança da informação.</Item>
      </ul>

      <div style={H}>6. Operadores e compartilhamento</div>
      <p style={P}>Quando necessário, contamos com prestadores de serviço (operadores), como provedores de hospedagem em nuvem, que tratam dados exclusivamente em nome do Minhas Métricas e sob instruções contratuais que exigem o mesmo nível de proteção. Não vendemos dados pessoais.</p>

      <div style={H}>7. Retenção e eliminação</div>
      <p style={P}>Os dados são mantidos apenas pelo tempo necessário às finalidades ou ao cumprimento de obrigações legais. Encerrada essa necessidade, os dados são eliminados ou anonimizados de forma segura, ressalvadas as hipóteses de guarda permitidas pela LGPD.</p>

      <div style={H}>8. Incidentes de segurança (art. 48)</div>
      <p style={P}>Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, o Minhas Métricas comunicará a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares afetados em prazo razoável, informando a natureza do incidente e as medidas adotadas para mitigar os efeitos.</p>

      <div style={H}>9. Direitos dos titulares (art. 18)</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>Confirmação da existência de tratamento e acesso aos dados;</Item>
        <Item>Correção de dados incompletos, inexatos ou desatualizados;</Item>
        <Item>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</Item>
        <Item>Portabilidade a outro fornecedor, observados os segredos comercial e industrial;</Item>
        <Item>Eliminação dos dados tratados com consentimento;</Item>
        <Item>Informação sobre compartilhamentos e revogação do consentimento;</Item>
        <Item>Revisão de decisões tomadas unicamente por tratamento automatizado.</Item>
      </ul>

      <div style={H}>10. Encarregado (DPO)</div>
      <p style={P}>Para exercer seus direitos ou tirar dúvidas sobre proteção de dados, entre em contato com o nosso Encarregado pelo tratamento de dados pessoais (DPO) pelo e-mail <b>minhasmetricas@gmail.com</b>.</p>

      <div style={H}>11. Transferência internacional</div>
      <p style={P}>Em regra, não realizamos transferência internacional de dados. Quando ocorrer de forma indireta (por exemplo, armazenamento em nuvem de terceiros), observaremos a LGPD e adotaremos as salvaguardas exigidas.</p>

      <div style={H}>12. Atualizações</div>
      <p style={P}>Este documento pode ser revisado periodicamente para refletir mudanças na legislação, nas diretrizes da ANPD ou nos processos do Minhas Métricas. Recomendamos a consulta regular a esta página.</p>
    </div>
  );
}
