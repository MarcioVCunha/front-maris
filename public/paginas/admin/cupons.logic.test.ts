import { assertEquals } from "jsr:@std/assert@1"
import {
  computeCouponStatus,
  computeCouponsMetrics,
  computeReferralStatus,
  computeReferralsMetrics,
  filterCoupons,
  filterReferrals,
  formatCouponDiscount,
  formatCouponRules,
  renderCouponCard,
  renderCouponsPage,
  validateCouponPayload,
  validateReferralCodePayload
} from "./cupons.logic.js"

Deno.test("computeCouponStatus: inativo, expirado, esgotado, agendado e ativo", () => {
  const baseTime = new Date("2026-10-18T12:00:00Z").getTime()

  // Inativo
  assertEquals(computeCouponStatus({ is_active: false }, baseTime), { label: "Inativo", tone: "inactive" })

  // Esgotado
  assertEquals(
    computeCouponStatus({ is_active: true, max_uses: 10, current_uses: 10 }, baseTime),
    { label: "Esgotado", tone: "expired" }
  )

  // Expirado
  assertEquals(
    computeCouponStatus({ is_active: true, expires_at: "2026-10-17T00:00:00Z" }, baseTime),
    { label: "Expirado", tone: "expired" }
  )

  // Agendado
  assertEquals(
    computeCouponStatus({ is_active: true, starts_at: "2026-10-20T00:00:00Z" }, baseTime),
    { label: "Agendado", tone: "scheduled" }
  )

  // Ativo
  assertEquals(
    computeCouponStatus({ is_active: true, max_uses: 10, current_uses: 2, starts_at: "2026-10-10T00:00:00Z" }, baseTime),
    { label: "Ativo", tone: "active" }
  )
})

Deno.test("formatCouponDiscount: percent e fixed", () => {
  assertEquals(formatCouponDiscount({ discount_type: "percent", discount_value: 15 }), "15% OFF")
  assertEquals(formatCouponDiscount({ discount_type: "fixed", discount_value: 20 }), "R$ 20,00 OFF")
  // Suporte a campos de banco (value)
  assertEquals(formatCouponDiscount({ discount_type: "percent", value: 10 }), "10% OFF")
})

Deno.test("formatCouponRules: regras combinadas e nomes de campos do banco", () => {
  const rules = formatCouponRules({
    min_order_value: 150,
    first_purchase_only: true,
    max_uses: 50,
    current_uses: 12,
    is_referral: true,
    referrer_name: "Mariana"
  })
  assertEquals(rules.includes("Mínimo R$ 150,00"), true)
  assertEquals(rules.includes("1ª compra"), true)
  assertEquals(rules.includes("12/50 usos"), true)
  assertEquals(rules.includes("Indicação (Mariana)"), true)

  const dbRules = formatCouponRules({
    min_order_subtotal: 80,
    is_first_purchase_only: true,
    uses_count: 5,
    referrer_whatsapp: "5519999998888",
    referrer_name: "Carla"
  })
  assertEquals(dbRules.includes("Mínimo R$ 80,00"), true)
  assertEquals(dbRules.includes("1ª compra"), true)
  assertEquals(dbRules.includes("5 usos"), true)
  assertEquals(dbRules.includes("Indicação (Carla)"), true)
})

Deno.test("computeReferralStatus: pendente, confirmado, cancelado", () => {
  assertEquals(computeReferralStatus({ status: "pendente" }), { label: "Pendente", tone: "pending" })
  assertEquals(computeReferralStatus({ status: "confirmado" }), { label: "Confirmado", tone: "confirmed" })
  assertEquals(computeReferralStatus({ status: "cancelado" }), { label: "Cancelado", tone: "cancelled" })
})

Deno.test("filterCoupons: busca por texto e filtro de status", () => {
  const coupons = [
    { code: "BEMVINDA10", description: "Primeira compra", is_active: true },
    { code: "NATAL20", description: "Campanha de natal", is_active: false },
    { code: "CARLA-ABC123", description: "Indicação Carla", is_referral: true, referrer_name: "Carla", is_active: true }
  ]

  assertEquals(filterCoupons(coupons, { query: "natal" }).length, 1)
  assertEquals(filterCoupons(coupons, { query: "carla" }).length, 1)
  assertEquals(filterCoupons(coupons, { status: "inactive" }).length, 1)
  assertEquals(filterCoupons(coupons, { status: "referral" }).length, 1)
})

Deno.test("filterReferrals: busca por cliente e status", () => {
  const refs = [
    { referrer_name: "Camila", referrer_whatsapp: "5519999991111", referee_name: "Fernanda", referee_whatsapp: "5519999992222", status: "pendente" },
    { referrer_name: "Patricia", referrer_whatsapp: "5519999993333", referee_name: "Julia", referee_whatsapp: "5519999994444", status: "confirmado", reward_coupon_code: "OBRIGADA-123456" },
    { referrer_name: "Roberta", referrer_whatsapp: "5519999995555", referee_name: "Aline", referee_whatsapp: "5519999996666", status: "cancelado" }
  ]

  assertEquals(filterReferrals(refs, { query: "fernanda" }).length, 1)
  assertEquals(filterReferrals(refs, { query: "OBRIGADA" }).length, 1)
  assertEquals(filterReferrals(refs, { status: "confirmado" }).length, 1)
  assertEquals(filterReferrals(refs, { status: "pendente" }).length, 1)
  assertEquals(filterReferrals(refs, { status: "cancelado" }).length, 1)
})

Deno.test("validateCouponPayload: validação de campos", () => {
  // Código inválido
  const invCode = validateCouponPayload({ code: "AB", discount_type: "percent", discount_value: 10 })
  assertEquals(invCode.ok, false)

  // Tipo inválido
  const invType = validateCouponPayload({ code: "VALIDO10", discount_type: "outro", discount_value: 10 })
  assertEquals(invType.ok, false)

  // Valor > 100%
  const invVal = validateCouponPayload({ code: "VALIDO10", discount_type: "percent", discount_value: 120 })
  assertEquals(invVal.ok, false)

  // Válido
  const valid = validateCouponPayload({
    code: "maris10",
    discount_type: "percent",
    discount_value: 10,
    min_order_value: 50,
    first_purchase_only: true
  })
  assertEquals(valid.ok, true)
  assertEquals(valid.data?.code, "MARIS10")
  assertEquals(valid.data?.discount_value, 10)
  assertEquals(valid.data?.first_purchase_only, true)
})

Deno.test("validateReferralCodePayload: validação de WhatsApp e percentual", () => {
  // Sem nome
  const noName = validateReferralCodePayload({ referrer_name: "", referrer_whatsapp: "19999998888" })
  assertEquals(noName.ok, false)

  // WhatsApp inválido
  const invPhone = validateReferralCodePayload({ referrer_name: "Ana", referrer_whatsapp: "123" })
  assertEquals(invPhone.ok, false)

  // Válido com DDD (normaliza com 55)
  const valid = validateReferralCodePayload({
    referrer_name: "Ana Silva",
    referrer_whatsapp: "(19) 99999-8888",
    discount_percent: 10
  })
  assertEquals(valid.ok, true)
  assertEquals(valid.data?.referrer_name, "Ana Silva")
  assertEquals(valid.data?.referrer_whatsapp, "5519999998888")
  assertEquals(valid.data?.discount_percent, 10)
})

Deno.test("computeCouponsMetrics: calcula totais, vendas, descontos e cupom campeão", () => {
  const coupons = [
    {
      code: "BEMVINDA10",
      is_active: true,
      uses_count: 10,
      orders_count: 10,
      total_sales: 1500.00,
      total_discount: 150.00
    },
    {
      code: "FRETEGRATIS",
      is_active: true,
      uses_count: 25,
      orders_count: 22,
      total_sales: 3200.50,
      total_discount: 450.00
    },
    {
      code: "EXPIRADO",
      is_active: false,
      uses_count: 2,
      orders_count: 2,
      total_sales: 180.00,
      total_discount: 20.00
    }
  ]

  const metrics = computeCouponsMetrics(coupons)
  assertEquals(metrics.totalCoupons, 3)
  assertEquals(metrics.activeCoupons, 2)
  assertEquals(metrics.totalUses, 37)
  assertEquals(metrics.totalOrders, 34)
  assertEquals(metrics.totalSales, 4880.50)
  assertEquals(metrics.totalDiscount, 620.00)
  assertEquals(metrics.topCoupon?.code, "FRETEGRATIS")
  assertEquals(metrics.topCoupon?.uses, 25)
  assertEquals(Math.round(metrics.averageTicket), 132)

  // Lista vazia não deve quebrar
  const emptyMetrics = computeCouponsMetrics([])
  assertEquals(emptyMetrics.totalCoupons, 0)
  assertEquals(emptyMetrics.totalUses, 0)
  assertEquals(emptyMetrics.totalSales, 0)
  assertEquals(emptyMetrics.topCoupon, null)
  assertEquals(emptyMetrics.averageTicket, 0)
})

Deno.test("computeReferralsMetrics: calcula taxa de conversão, bônus gerados/usados e top indicadora", () => {
  const referrals = [
    { referrer_name: "Camila", status: "confirmado", reward_coupon_code: "OBRIGADA-1", reward_coupon_used: true },
    { referrer_name: "Camila", status: "confirmado", reward_coupon_code: "OBRIGADA-2", reward_coupon_used: false },
    { referrer_name: "Camila", status: "pendente" },
    { referrer_name: "Mariana", status: "confirmado", reward_coupon_code: "OBRIGADA-3", reward_coupon_used: false },
    { referrer_name: "Juliana", status: "cancelado" }
  ]

  const metrics = computeReferralsMetrics(referrals)
  assertEquals(metrics.totalReferrals, 5)
  assertEquals(metrics.pendingReferrals, 1)
  assertEquals(metrics.confirmedReferrals, 3)
  assertEquals(metrics.cancelledReferrals, 1)
  assertEquals(metrics.conversionRate, 60.0) // 3 / 5 = 60%
  assertEquals(metrics.rewardsIssued, 3)
  assertEquals(metrics.rewardsUsed, 1)
  assertEquals(metrics.topReferrer?.name, "Camila")
  assertEquals(metrics.topReferrer?.count, 3)

  // Lista vazia não quebra
  const emptyMetrics = computeReferralsMetrics([])
  assertEquals(emptyMetrics.totalReferrals, 0)
  assertEquals(emptyMetrics.conversionRate, 0)
  assertEquals(emptyMetrics.topReferrer, null)
})

Deno.test("renderCouponCard: exibe pills de desempenho quando houver vendas", () => {
  const cardWithPerf = renderCouponCard({
    id: 1,
    code: "VERAO10",
    discount_type: "percent",
    discount_value: 10,
    uses_count: 8,
    total_sales: 1200,
    total_discount: 120,
    is_active: true
  })
  assertEquals(cardWithPerf.includes("8 usos"), true)
  assertEquals(cardWithPerf.includes("R$ 1200,00 em vendas"), true)
  assertEquals(cardWithPerf.includes("-R$ 120,00"), true)

  const cardWithoutPerf = renderCouponCard({
    id: 2,
    code: "NOVO0",
    discount_type: "percent",
    discount_value: 5,
    uses_count: 0,
    is_active: true
  })
  assertEquals(cardWithoutPerf.includes("coupon-card__perf"), false)
})

Deno.test("renderCouponsPage: renderiza barras de KPI na aba de cupons e na de indicações", () => {
  const coupons = [
    { id: 1, code: "MARIS10", discount_type: "percent", value: 10, uses_count: 5, total_sales: 600, is_active: true }
  ]
  const referrals = [
    { id: 1, referrer_name: "Beatriz", referee_name: "Carla", status: "confirmado", reward_coupon_code: "OBRIGADA-99", reward_coupon_used: true, order_id: 101, order_total: 250 }
  ]

  // Aba cupons
  const pageCoupons = renderCouponsPage(coupons, referrals, { tab: "coupons" })
  assertEquals(pageCoupons.includes("coupons-summary-bar"), true)
  assertEquals(pageCoupons.includes("Vendas com Cupom"), true)
  assertEquals(pageCoupons.includes("Descontos Concedidos"), true)
  assertEquals(pageCoupons.includes("MARIS10"), true)

  // Aba indicações
  const pageRefs = renderCouponsPage(coupons, referrals, { tab: "referrals" })
  assertEquals(pageRefs.includes("referrals-summary-bar"), true)
  assertEquals(pageRefs.includes("Taxa de Conversão"), true)
  assertEquals(pageRefs.includes("Bônus Gerados (10%)"), true)
  assertEquals(pageRefs.includes("Indicadora Campeã"), true)
  assertEquals(pageRefs.includes("Beatriz"), true)
  assertEquals(pageRefs.includes("Resgatado"), true)
})
