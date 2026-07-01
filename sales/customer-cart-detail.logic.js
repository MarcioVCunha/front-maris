export function computeCartSaleTotals(selectedLines, payment, roundMoney) {
  let subtotal = 0
  for (const line of selectedLines) {
    if (!line.checked) continue
    subtotal += line.total_value
  }
  const rounded = roundMoney(subtotal)
  const discount = payment === "pix" ? roundMoney(rounded * 0.05) : 0
  return { subtotal: rounded, discount, total: roundMoney(rounded - discount) }
}

export function buildWhatsappSummary({
  paymentMethod,
  buyerName,
  lines,
  subtotal,
  discount,
  total,
  formatMoneyBRL,
}) {
  const methodLabel = {
    pix: "Pix",
    cartao_credito: "Cartão de crédito",
    cartao_debito: "Cartão de débito",
    dinheiro: "Dinheiro",
    transferencia: "Transferência",
  }[paymentMethod] || paymentMethod

  const linesText = lines
    .map((line) =>
      `- ${line.product_name} (${line.display_code || line.product_code || "-"}) x${line.quantity} = ${formatMoneyBRL(line.total_value)}`
    )
    .join("\n")

  return [
    `Oi ${buyerName || "cliente"}! Sua compra foi finalizada com sucesso.`,
    "",
    `Pagamento: ${methodLabel}`,
    "",
    "Resumo dos itens:",
    linesText,
    "",
    `Subtotal: ${formatMoneyBRL(subtotal)}`,
    `Desconto: ${formatMoneyBRL(discount)}`,
    `Total: ${formatMoneyBRL(total)}`,
    "",
    "Obrigada por comprar com a Maris Semijoias!",
  ].join("\n")
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisCartDetailLogic = {
    computeCartSaleTotals,
    buildWhatsappSummary,
  }
}
