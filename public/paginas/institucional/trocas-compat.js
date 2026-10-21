import { GARANTIA_POLITICA } from "./garantia.logic.js"
import { TROCAS_DEVOLUCOES } from "./trocas-e-devolucoes.logic.js"

export const STORE_WHATSAPP_NUMBER = "5519992732874"

export const TROCAS_WHATSAPP_MESSAGE = "Oi, gostaria de tirar uma dúvida sobre trocas ou garantia da Maris"

export const STORE_POLICIES = {
  garantia: {
    id: GARANTIA_POLITICA.id,
    title: GARANTIA_POLITICA.title,
    badge: GARANTIA_POLITICA.badge,
    summary: GARANTIA_POLITICA.summary,
    topics: GARANTIA_POLITICA.topics,
  },
  trocas: {
    id: TROCAS_DEVOLUCOES.id,
    title: TROCAS_DEVOLUCOES.title,
    badge: TROCAS_DEVOLUCOES.badge,
    summary: TROCAS_DEVOLUCOES.summary,
    topics: TROCAS_DEVOLUCOES.topics,
  },
  envio: {
    id: "envio",
    title: "Envio Seguro pelas Plataformas",
    badge: "Frete pelas plataformas",
    summary: "Nossas entregas são realizadas exclusivamente com a infraestrutura das principais plataformas do Brasil.",
    topics: [
      {
        title: "Marketplaces parceiros",
        text: "Trabalhamos com o envio integrado de plataformas como Shopee, Mercado Livre e TikTok Shop, proporcionando frete competitivo, seguro de carga e código de rastreamento em tempo real.",
      },
      {
        title: "Embalagem reforçada",
        text: "Todas as encomendas são enviadas em envelope de segurança reforçado com plástico bolha protetor (80 g e 20 × 17 × 5 cm), mantendo sua semijoia segura durante todo o trajeto.",
      },
    ],
  },
  cuidados: {
    id: "cuidados",
    title: "Dicas de Cuidados e Durabilidade",
    badge: "Preserve o brilho",
    summary: "Semijoias são delicadas e merecem carinho. Pequenos hábitos diários mantêm suas peças lindas por anos.",
    topics: [
      {
        title: "Perfumes e cosméticos",
        text: "Aplique perfume, hidratante, protetor solar ou maquiagem e aguarde secar na pele antes de colocar suas semijoias.",
      },
      {
        title: "Água, praia e piscina",
        text: "Retire suas peças antes do banho de chuveiro, piscina ou mar. O cloro e o sal aceleram o desgaste do banho.",
      },
      {
        title: "Atividades físicas",
        text: "O suor excessivo contém ácido úrico que pode alterar a coloração da peça. Retire as semijoias antes de praticar esportes.",
      },
      {
        title: "Armazenamento e limpeza",
        text: "Guarde as peças individualmente em saquinhos plásticos ou de veludo para evitar atrito. Para limpar, use apenas uma flanela macia e seca, sem nenhum produto químico.",
      },
    ],
  },
}

export function trocasWhatsappUrl(message = TROCAS_WHATSAPP_MESSAGE, phone = STORE_WHATSAPP_NUMBER) {
  const cleanPhone = String(phone || "").replace(/\D/g, "")
  const text = encodeURIComponent(String(message || "").trim())
  return `https://wa.me/${cleanPhone}?text=${text}`
}

export function getPoliciesList(policies = STORE_POLICIES) {
  return Object.values(policies || {})
}
