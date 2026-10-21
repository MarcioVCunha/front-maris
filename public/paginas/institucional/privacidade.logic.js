// Conteúdo da Política de Privacidade (LGPD) — Fase L0.
// Dados de contato vêm de /compartilhado/loja-info.js (MarisLojaInfo.LOJA).

export function buildPrivacySections(loja) {
  const info = loja || {}
  const email = info.email || "contato@lojamaris.com.br"
  const doc = info.documento || "[PREENCHER: CPF ou CNPJ]"
  const encarregado = info.encarregadoNome || "Marcio"
  const endereco = info.endereco
    ? `${info.endereco.logradouro}, ${info.endereco.bairro}, ${info.endereco.cidade}-${info.endereco.uf}, CEP ${info.endereco.cep}`
    : "[PREENCHER: endereço]"

  return [
    {
      id: "controladora",
      title: "Quem controla seus dados",
      paragraphs: [
        `A controladora é ${info.razaoSocial || "Maris"} (${info.nomeFantasia || "Maris Semijoias"}), documento ${doc}, com endereço em ${endereco}.`,
        `Canal de contato para privacidade e direitos do titular: ${email}. Encarregado (contato): ${encarregado}.`,
        "Pequenos negócios podem ter tratamento diferenciado perante a ANPD (Res. CD/ANPD nº 2/2022); mesmo assim indicamos um canal claro de atendimento.",
      ],
    },
    {
      id: "dados",
      title: "Dados que coletamos",
      paragraphs: [
        "Hoje podemos coletar: nome, WhatsApp, e-mail (quando informado) e dados do pedido (itens, valores, status).",
        "No futuro, com login e entrega, também poderemos coletar CPF, endereço de entrega e dados da conta, sempre com a finalidade informada no momento da coleta.",
        "Também registramos, de forma agregada ou técnica, informações de uso do site (por exemplo, via Vercel Analytics e Speed Insights), sem cookies de rastreamento publicitário.",
      ],
    },
    {
      id: "finalidades",
      title: "Finalidades e bases legais",
      paragraphs: [
        "Pedido e pagamento: executar o contrato de compra (confirmação, reserva, pagamento e acompanhamento).",
        "E-mail: confirmação e acompanhamento do pedido. Quando a retirada na loja estiver disponível com compra como convidada, o e-mail será obrigatório para o link de acompanhamento.",
        "Lista de espera (“Quero essa peça”): legítimo interesse em avisar só sobre aquela peça, quando você deixar contato.",
        "Cupons e indicações: aplicar o benefício e falar sobre o pedido; o contato do indicado só deve ser usado quando ele mesmo comprar.",
        "Marketing (novidades): somente com consentimento explícito, quando houver essa opção. Sem opt-in, o contato é só sobre o pedido ou a peça pedida.",
      ],
    },
    {
      id: "operadores",
      title: "Com quem compartilhamos",
      paragraphs: [
        "Operadores e prestadores que podem receber dados necessários ao serviço:",
        "InfinitePay (pagamento); Supabase (banco e autenticação); Vercel (hospedagem, Analytics e Speed Insights); Resend (e-mails); Melhor Envio e transportadoras (quando houver envio); Google Fonts e jsDelivr (carregamento de fontes e bibliotecas); provedor de WhatsApp (mensagens de atendimento).",
        "Enviamos a cada operador apenas o necessário para a finalidade (por exemplo, nome e telefone no checkout; endereço e CPF na etiqueta de envio, quando existir).",
      ],
    },
    {
      id: "retencao",
      title: "Por quanto tempo guardamos",
      paragraphs: [
        "Carrinhos não convertidos: até 90 dias (depois anonimizamos ou apagamos o contato).",
        "Lista de espera: até 180 dias ou após o aviso de reposição.",
        "Pedidos cancelados ou expirados: contato anonimizado em até 90 dias.",
        "Pedidos pagos: retenção de até 5 anos por obrigação fiscal.",
        "Backups temporários com dados pessoais são apagados após a rotina de limpeza (em geral em até 24 h após o uso operacional) e não ficam acessíveis ao público.",
        "Dados salvos neste aparelho (nome, WhatsApp, e-mail) ficam só no seu navegador, se você marcar “Lembrar meus dados”, e podem ser apagados com “Esquecer meus dados”.",
      ],
    },
    {
      id: "direitos",
      title: "Seus direitos (LGPD)",
      paragraphs: [
        "Você pode solicitar acesso, correção, exclusão, portabilidade, informação sobre compartilhamentos e revogação de consentimento (quando aplicável).",
        `Escreva para ${email}. Respondemos em até 15 dias.`,
        "Com a conta de cliente (em breve), também será possível editar dados, baixar seus dados e solicitar a exclusão da conta pela área “Minha conta”.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies e tecnologias semelhantes",
      paragraphs: [
        "O Vercel Analytics e o Speed Insights não usam cookies de publicidade; medem desempenho e visitas de forma agregada.",
        "Fontes do Google Fonts e scripts do jsDelivr podem receber o endereço IP do visitante ao carregar. Podemos, no futuro, hospedar esses recursos localmente.",
      ],
    },
    {
      id: "alteracoes",
      title: "Alterações desta política",
      paragraphs: [
        `Esta política pode ser atualizada. A versão vigente fica em ${info.site || "https://lojamaris.com.br"}/privacidade.`,
      ],
    },
  ]
}
