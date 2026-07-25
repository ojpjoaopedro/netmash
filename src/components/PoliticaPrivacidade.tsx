"use client";
import React from "react";

/**
 * Política de Privacidade do Minhas Métricas (MINHAS METRICAS INOVA SIMPLES I.S.,
 * CNPJ 68.176.907/0001-40). Adaptada à LGPD (Lei 13.709/2018). Empresa de software
 * de gestão financeira — não é instituição de pagamento.
 */
const H: React.CSSProperties = { fontSize: 15, fontWeight: 800, margin: "18px 0 6px", color: "var(--txt)" };
const P: React.CSSProperties = { margin: "0 0 8px", lineHeight: 1.7 };

const Item = ({ children }: { children: React.ReactNode }) => <li style={{ marginBottom: 4, lineHeight: 1.6 }}>{children}</li>;

export default function PoliticaPrivacidade() {
  return (
    <div style={{ fontSize: 13.5, color: "var(--txt-2)" }}>
      <div style={H}>1. Objetivo</div>
      <p style={P}>Esta Política de Privacidade tem como fundamento a legislação brasileira, especialmente a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD) e suas atualizações. Dados pessoais são informações de uma pessoa física que a identifiquem ou a tornem identificável (por exemplo, CPF, RG, e-mail, endereço, endereço IP e idade).</p>
      <p style={P}>Esta Política demonstra o compromisso do <b>Minhas Métricas</b> em: proteger os direitos dos titulares de dados; adotar processos que assegurem o cumprimento das normas e boas práticas de proteção de dados; promover transparência sobre o tratamento de dados; e adotar medidas de proteção contra incidentes de segurança. Ao se cadastrar no Minhas Métricas, você concorda com as condições a seguir.</p>

      <div style={H}>2. Referências</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>Lei 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD);</Item>
        <Item>Boas práticas e diretrizes da Autoridade Nacional de Proteção de Dados (ANPD).</Item>
      </ul>

      <div style={H}>3. Abrangência</div>
      <p style={P}>Esta Política aplica-se a todos os serviços oferecidos pelo Minhas Métricas (a "plataforma" ou "aplicação") e a todos que de alguma forma têm contato com os serviços — clientes (donos de negócio e suas equipes), parceiros e usuários do site, app ou demais recursos ("Titulares").</p>

      <div style={H}>4. Conceitos</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item><b>Controlador:</b> quem toma as decisões referentes ao tratamento dos dados pessoais.</Item>
        <Item><b>Operador:</b> quem trata dados pessoais em nome do Controlador.</Item>
        <Item><b>Dado Pessoal:</b> qualquer informação relacionada a pessoa identificada ou identificável (nome, CPF, e-mail, IP, localização, etc.).</Item>
        <Item><b>Dado Pessoal Sensível:</b> dado sobre saúde, biometria, orientação religiosa/política/sexual, etc.</Item>
        <Item><b>Cookies:</b> pequenos arquivos baixados no dispositivo que permitem reconhecer o equipamento e personalizar a experiência.</Item>
        <Item><b>Encarregado (DPO):</b> responsável pela proteção de dados perante titulares e a ANPD.</Item>
        <Item><b>Titular:</b> pessoa física a quem se referem os dados pessoais.</Item>
        <Item><b>Tratamento:</b> qualquer operação com dados (coleta, uso, acesso, armazenamento, eliminação, etc.).</Item>
      </ul>

      <div style={H}>5. Agentes de Tratamento</div>
      <p style={P}>Em relação aos dados das pessoas com quem se relaciona diretamente (representantes dos clientes, membros de suas equipes, fornecedores e usuários do site), o Minhas Métricas atua como <b>Controlador</b>. Em relação aos dados de terceiros inseridos na plataforma pelos clientes (colaboradores, contatos e demais registros lançados pelo cliente), o Minhas Métricas atua como <b>Operador</b>, sendo o cliente o Controlador desses dados.</p>

      <div style={H}>6. Como tratamos dados pessoais</div>
      <p style={P}>Coletamos e tratamos dados como nome, CPF/CNPJ, e-mail, telefone, endereço e imagem, além de dados de uso da plataforma, para as seguintes finalidades:</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>Identificar e autenticar o Titular e conceder acesso à plataforma;</Item>
        <Item>Disponibilizar as funcionalidades de gestão financeira (receitas, custos, fluxo de caixa, equipe, relatórios, calendário de pagamentos, etc.);</Item>
        <Item>Prestar suporte, esclarecer dúvidas e melhorar continuamente os serviços;</Item>
        <Item>Manter a segurança e a integridade dos serviços, prevenir fraudes e cumprir obrigações legais e fiscais;</Item>
        <Item>Realizar cobranças, gerir a assinatura e emitir comprovantes;</Item>
        <Item>Enviar comunicados sobre a conta e, mediante interesse, conteúdos informativos e promocionais.</Item>
      </ul>

      <div style={H}>7. Cookies</div>
      <p style={P}>Utilizamos cookies para melhorar a navegação, personalizar conteúdo e analisar o tráfego. Você pode gerenciar os cookies nas configurações do seu navegador.</p>

      <div style={H}>8. Compartilhamento</div>
      <p style={P}>Para viabilizar as funcionalidades e cumprir obrigações legais, poderemos compartilhar dados com: provedores de infraestrutura e armazenamento em nuvem; prestadores de serviço que apoiam a operação (envio de mensagens, verificação de identidade, pagamentos da assinatura); e autoridades públicas, quando exigido por lei. Em todos os casos, exigimos aderência às boas práticas de segurança e conformidade legal.</p>

      <div style={H}>9. Segurança das informações</div>
      <p style={P}>Adotamos medidas técnicas e administrativas para proteger a confidencialidade, integridade e disponibilidade dos dados, incluindo controles de acesso, criptografia, gestão de vulnerabilidades e tratamento de incidentes, restringindo o acesso a pessoas autorizadas.</p>

      <div style={H}>10. Dados de crianças e adolescentes</div>
      <p style={P}>Não coletamos intencionalmente dados de crianças e adolescentes. Caso seja identificado tratamento indevido, os dados serão descartados de forma segura e definitiva.</p>

      <div style={H}>11. Transferência internacional</div>
      <p style={P}>Em regra, não realizamos transferência internacional de dados. Quando ocorrer de forma indireta (ex.: armazenamento em nuvem de terceiros), observaremos a LGPD e as salvaguardas aplicáveis.</p>

      <div style={H}>12. Manutenção dos dados</div>
      <p style={P}>Os dados são mantidos pelo tempo necessário ao cumprimento de suas finalidades e das obrigações legais e regulatórias, ou para o exercício regular de direitos.</p>

      <div style={H}>13. Direitos dos titulares</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>Confirmação da existência de tratamento e acesso aos dados;</Item>
        <Item>Correção de dados incompletos, inexatos ou desatualizados;</Item>
        <Item>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a LGPD;</Item>
        <Item>Portabilidade e eliminação dos dados tratados com consentimento;</Item>
        <Item>Informação sobre compartilhamentos e revogação do consentimento.</Item>
      </ul>

      <div style={H}>14. Atendimento sobre dados pessoais</div>
      <p style={P}>Para assuntos relacionados ao tratamento de dados pessoais, entre em contato com o nosso Encarregado (DPO) pelo e-mail <b>minhasmetricas@gmail.com</b>.</p>

      <div style={H}>15. Orientações de segurança</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <Item>Mantenha a confidencialidade das suas credenciais de acesso (login e senha);</Item>
        <Item>Forneça informações verídicas e mantenha-as atualizadas;</Item>
        <Item>Comunique qualquer suspeita de uso indevido dos seus dados pelos canais oficiais;</Item>
        <Item>Responsabilize-se pelos dados de terceiros que inserir na plataforma, observando a LGPD.</Item>
      </ul>

      <div style={H}>16. Vigência e validade</div>
      <p style={P}>Esta Política será revisada periodicamente ou sempre que houver alterações relevantes na regulamentação, nas diretrizes ou nos processos da organização, de forma a permanecer consistente com a realidade operacional do Minhas Métricas.</p>
    </div>
  );
}
