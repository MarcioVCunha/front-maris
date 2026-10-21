import { getGarantiaSections } from "./garantia.logic.js"
import { bindInstitucionalPage } from "./institucional-page.js"

function boot() {
  bindInstitucionalPage({ sections: getGarantiaSections() })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot)
} else {
  boot()
}
