import { getTrocasDevolucoesSections } from "./trocas-e-devolucoes.logic.js"
import { bindInstitucionalPage } from "./institucional-page.js"

function boot() {
  bindInstitucionalPage({ sections: getTrocasDevolucoesSections() })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot)
} else {
  boot()
}
