/**
 * Gera /env.js a partir de process.env (Vercel build).
 * Sem deps. Se as vars faltarem, usa fallbacks de produção (mesmo do utils.js).
 *
 * Uso: node scripts/generate-env.js
 */
const fs = require("fs")
const path = require("path")

const FALLBACK_URL = "https://epuvfjdyyzccsuafwopr.supabase.co"
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXZmamR5eXpjY3N1YWZ3b3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTgwMzUsImV4cCI6MjA4OTIzNDAzNX0.DOpM6CRRH54_oLMTghCnGMLq_1aH_5YRGSXNKn_LdB4"

const url = process.env.SUPABASE_URL || FALLBACK_URL
const anonKey = process.env.SUPABASE_ANON_KEY || FALLBACK_ANON_KEY
const appEnv = process.env.APP_ENV || "production"

if (!["production", "staging"].includes(appEnv)) {
  console.warn(`[generate-env] APP_ENV="${appEnv}" — esperado production|staging`)
}

const outPath = path.join(__dirname, "..", "env.js")
const contents = `// Gerado por scripts/generate-env.js — sobrescrito no build Vercel.
// Local: valores de produção por padrão (anon key é pública por design).
window.__MARIS_ENV__ = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(anonKey)},
  APP_ENV: ${JSON.stringify(appEnv)}
};
`

fs.writeFileSync(outPath, contents, "utf8")
console.log(`[generate-env] wrote ${outPath} (APP_ENV=${appEnv})`)
