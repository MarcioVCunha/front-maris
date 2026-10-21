// Política de garantia — Fase L0 (DC3 + CDC art. 26, II).

export const GARANTIA_POLITICA = {
  id: "garantia",
  title: "Garantia das semijoias",
  badge: "1 ano no banho",
  summary:
    "Garantia de 1 ano no banho das semijoias, que inclui os 90 dias legais de garantia contra vícios (CDC art. 26, II). Não cobre mau uso, química nem atrito excessivo.",
  topics: [
    {
      title: "O que a garantia cobre",
      text:
        "Falhas de fabricação, defeitos no fecho original (sem sinal de tração forçada) e desprendimento anômalo do banho dentro do prazo de 1 ano a partir do recebimento ou da retirada.",
    },
    {
      title: "Prazo legal e prazo Maris",
      text:
        "Os 90 dias do CDC estão incluídos no prazo de 1 ano no banho oferecido pela Maris.",
    },
    {
      title: "O que não é coberto",
      text:
        "Desgaste natural, quedas, amassados, riscos por atrito, perda de pedras por impacto, e oxidação ou desgaste por cloro, água salgada, perfumes, cremes, produtos de limpeza ou suor excessivo (mau uso / química / atrito).",
    },
    {
      title: "Semijoia banhada",
      text:
        "Nossas peças são semijoias banhadas a ouro ou ródio (ou aço). Não são ouro maciço. O banho exige os cuidados descritos na página da peça e nesta política.",
    },
    {
      title: "Como acionar",
      text:
        "Fale pelo e-mail contato@lojamaris.com.br ou pelo WhatsApp, com nome, foto da peça e número do pedido, se tiver.",
    },
  ],
}

export function getGarantiaSections() {
  return [GARANTIA_POLITICA]
}
