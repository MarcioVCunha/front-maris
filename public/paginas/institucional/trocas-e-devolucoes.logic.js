// Políticas de trocas e devoluções — Fase L0 (CDC + decisões DC2/DC5).

export const TROCAS_DEVOLUCOES = {
  id: "trocas-e-devolucoes",
  title: "Trocas e devoluções",
  badge: "7 dias de arrependimento",
  summary:
    "Nas compras pelo site da Maris, você tem 7 dias para desistir da compra (CDC art. 49), com reembolso integral. Também tratamos troca por defeito e troca por gosto.",
  topics: [
    {
      title: "Arrependimento em até 7 dias (CDC art. 49)",
      text:
        "Contados do recebimento da encomenda (ou da retirada na loja). A peça deve estar sem uso, na embalagem original, com tags e acessórios. O reembolso é integral (peças e frete pago). No arrependimento, a loja cobre o frete de devolução do envio; na retirada, você traz a semijoia de volta à loja.",
    },
    {
      title: "Retirada na loja",
      text:
        "A compra online com retirada também tem os 7 dias de arrependimento, contados da data em que você retirou a peça. É preciso trazer a semijoia à loja para o reembolso.",
    },
    {
      title: "Troca por defeito",
      text:
        "Defeito de fabricação ou no banho entra na garantia. Fale conosco com nome, foto da peça e, se possível, o número do pedido. Combinamos a troca ou o reparo sem custo indevido.",
    },
    {
      title: "Troca por gosto",
      text:
        "Fora do prazo de arrependimento, a troca por preferência (tamanho, modelo, cor) pode ser combinada. Nesse caso, o frete da troca fica por sua conta, salvo acordo diferente no atendimento.",
    },
    {
      title: "Como solicitar",
      text:
        "Envie e-mail para contato@lojamaris.com.br ou fale pelo WhatsApp oficial, com seu nome e a foto da peça. Respondemos em horário comercial.",
    },
  ],
}

export function getTrocasDevolucoesSections() {
  return [TROCAS_DEVOLUCOES]
}
