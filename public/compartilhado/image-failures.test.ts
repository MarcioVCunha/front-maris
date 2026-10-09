import { assertEquals } from "jsr:@std/assert@1"
import { formatImageFailuresWarning } from "./image-failures.js"

const HEADER_ONE =
  "A peça foi salva, mas 1 foto(s) não foram copiadas para o nosso armazenamento e continuam vindo do fornecedor:"
const HEADER_THREE =
  "A peça foi salva, mas 3 foto(s) não foram copiadas para o nosso armazenamento e continuam vindo do fornecedor:"

Deno.test("aviso de fotos some quando o campo não vem", () => {
  assertEquals(formatImageFailuresWarning(null), "")
  assertEquals(formatImageFailuresWarning({ ok: true, code: "BM1" }), "")
  assertEquals(formatImageFailuresWarning({ image_failures: null }), "")
  assertEquals(formatImageFailuresWarning({ image_failures: "falhou" }), "")
})

Deno.test("aviso de fotos some quando a lista vem vazia", () => {
  assertEquals(formatImageFailuresWarning({ image_failures: [] }), "")
  assertEquals(formatImageFailuresWarning({ image_failures: [null, {}] }), "")
})

Deno.test("aviso de fotos lista uma falha com código e motivo", () => {
  assertEquals(
    formatImageFailuresWarning({
      image_failures: [{ code: "BM1786-O", url: "https://fornecedor.example/a.jpg", reason: "link inválido" }],
    }),
    `${HEADER_ONE}\nBM1786-O — link inválido`,
  )
})

Deno.test("foto pulada por falta de tempo entra no mesmo aviso", () => {
  const text = formatImageFailuresWarning({
    image_failures: [
      { code: "BM1786-O", url: "https://fornecedor.example/a.jpg", reason: "tempo esgotado ao copiar a foto" },
      { code: "CJ2", url: "https://fornecedor.example/b.jpg", reason: "link inválido" },
    ],
  }, { groupByCode: true })
  assertEquals(
    text,
    "A peça foi salva, mas 2 foto(s) não foram copiadas para o nosso armazenamento e continuam vindo do fornecedor:\nBM1786-O\ntempo esgotado ao copiar a foto\n\nCJ2\nlink inválido",
  )
})

Deno.test("aviso de fotos agrupa várias falhas de códigos diferentes", () => {
  const data = {
    image_failures: [
      { code: "BM1", url: "https://fornecedor.example/a.jpg", reason: "link inválido" },
      { code: "CJ2", url: "https://fornecedor.example/b.jpg", reason: "foto indisponível" },
      { code: "BM1", url: "https://fornecedor.example/c.jpg", reason: "tempo esgotado <script>" },
    ],
  }
  assertEquals(
    formatImageFailuresWarning(data),
    `${HEADER_THREE}\nBM1 — link inválido\nCJ2 — foto indisponível\nBM1 — tempo esgotado <script>`,
  )
  assertEquals(
    formatImageFailuresWarning(data, { groupByCode: true }),
    `${HEADER_THREE}\nBM1\nlink inválido\ntempo esgotado <script>\n\nCJ2\nfoto indisponível`,
  )
})
