import { buildPrivacySections } from "./privacidade.logic.js"
import { bindInstitucionalPage } from "./institucional-page.js"

function boot() {
  const loja = window.MarisLojaInfo?.LOJA
  bindInstitucionalPage({
    sections: buildPrivacySections(loja),
    mode: "privacy",
  })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot)
} else {
  boot()
}
