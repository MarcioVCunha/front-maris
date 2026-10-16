// Políticas de Trocas, Garantia e Cuidados da Maris Semijoias.
// Textos configuráveis aprováveis pelos sócios.

export const STORE_WHATSAPP_NUMBER = "5519992732874"

export const TROCAS_WHATSAPP_MESSAGE = "Oi, gostaria de tirar uma dúvida sobre trocas ou garantia da Maris"

export const STORE_POLICIES = {
  garantia: {
    id: "garantia",
    title: "Garantia das Semijoias",
    badge: "90 dias de garantia",
    summary: "Nossas semijoias contam com garantia legal de 90 dias a partir do recebimento contra defeitos de fabricação e banho. Para compras exclusivas realizadas em nosso site, oferecemos também prazo de 1 mês para troca ou retorno.",
    topics: [
      {
        title: "O que a garantia cobre",
        text: "Falhas comprovadas de fabricação, defeitos no fecho original da peça (sem sinal de tração ou ruptura forçada) e desprendimento anômalo do banho."
      },
      {
        title: "Prazo e comprovação",
        text: "Prazo de 90 (noventa) dias corridos a partir da data de entrega da encomenda, em conformidade com o Código de Defesa do Consumidor (CDC art. 26)."
      },
      {
        title: "O que não é coberto",
        text: "Desgaste natural de uso contínuo, quebras por quedas, amassados, riscos causados por atrito, perda de pedras ou zircônias por impacto, além de oxidação decorrente de contato com cloro, água salgada, perfumes, cremes ou produtos de limpeza."
      }
    ]
  },
  trocas: {
    id: "trocas",
    title: "Trocas e Devoluções",
    badge: "Troca ou retorno em até 1 mês",
    summary: "Para compras exclusivas realizadas em nosso site, garantimos a troca ou retorno (devolução) em até 1 mês (30 dias corridos) a partir do recebimento da peça, sem complicações.",
    topics: [
      {
        title: "Prazo exclusivo do site (até 1 mês / 30 dias)",
        text: "Enquanto o prazo legal padrão do Código de Defesa do Consumidor (CDC art. 49) é de 7 dias, oferecemos um prazo especial estendido de até 1 mês (30 dias corridos) para troca ou retorno de compras realizadas exclusivamente no site da Maris."
      },
      {
        title: "Condições para a troca ou retorno",
        text: "A peça deve estar sem indícios de uso, na embalagem original, com as tags intactas e acompanhada de todos os acessórios ou divisões do conjunto."
      },
      {
        title: "Como solicitar",
        text: "Envie uma mensagem para o nosso WhatsApp oficial informando seu nome completo e a foto da peça. Nossa equipe combina todo o envio de forma rápida e transparente."
      }
    ]
  },
  envio: {
    id: "envio",
    title: "Envio Seguro pelas Plataformas",
    badge: "Frete pelas plataformas",
    summary: "Nossas entregas são realizadas exclusivamente com a infraestrutura das principais plataformas do Brasil.",
    topics: [
      {
        title: "Marketplaces parceiros",
        text: "Trabalhamos com o envio integrado de plataformas como Shopee, Mercado Livre e TikTok Shop, proporcionando frete competitivo, seguro de carga e código de rastreamento em tempo real."
      },
      {
        title: "Embalagem reforçada",
        text: "Todas as encomendas são enviadas em envelope de segurança reforçado com plástico bolha protetor (80 g e 20 × 17 × 5 cm), mantendo sua semijoia segura durante todo o trajeto."
      }
    ]
  },
  cuidados: {
    id: "cuidados",
    title: "Dicas de Cuidados e Durabilidade",
    badge: "Preserve o brilho",
    summary: "Semijoias são delicadas e merecem carinho. Pequenos hábitos diários mantêm suas peças lindas por anos.",
    topics: [
      {
        title: "Perfumes e cosméticos",
        text: "Aplique perfume, hidratante, protetor solar ou maquiagem e aguarde secar na pele antes de colocar suas semijoias."
      },
      {
        title: "Água, praia e piscina",
        text: "Retire suas peças antes do banho de chuveiro, piscina ou mar. O cloro e o sal aceleram o desgaste do banho."
      },
      {
        title: "Atividades físicas",
        text: "O suor excessivo contém ácido úrico que pode alterar a coloração da peça. Retire as semijoias antes de praticar esportes."
      },
      {
        title: "Armazenamento e limpeza",
        text: "Guarde as peças individualmente em saquinhos plásticos ou de veludo para evitar atrito. Para limpar, use apenas uma flanela macia e seca, sem nenhum produto químico."
      }
    ]
  }
}

export function trocasWhatsappUrl(message = TROCAS_WHATSAPP_MESSAGE, phone = STORE_WHATSAPP_NUMBER) {
  const cleanPhone = String(phone || "").replace(/\D/g, "")
  const text = encodeURIComponent(String(message || "").trim())
  return `https://wa.me/${cleanPhone}?text=${text}`
}

export function getPoliciesList(policies = STORE_POLICIES) {
  return Object.values(policies || {})
}
