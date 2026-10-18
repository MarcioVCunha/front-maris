import { assertEquals } from "jsr:@std/assert@1"
import {
  computeCouponStatus,
  computeReferralStatus,
  filterCoupons,
  filterReferrals,
  formatCouponDiscount,
  formatCouponRules,
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
})

Deno.test("formatCouponRules: regras combinadas", () => {
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
    { referrer_name: "Patricia", referrer_whatsapp: "5519999993333", referee_name: "Julia", referee_whatsapp: "5519999994444", status: "confirmado", reward_coupon_code: "OBRIGADA-123456" }
  ]

  assertEquals(filterReferrals(refs, { query: "fernanda" }).length, 1)
  assertEquals(filterReferrals(refs, { query: "OBRIGADA" }).length, 1)
  assertEquals(filterReferrals(refs, { status: "confirmado" }).length, 1)
  assertEquals(filterReferrals(refs, { status: "pendente" }).length, 1)
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
