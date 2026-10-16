import {
  STORE_POLICIES,
  getPoliciesList,
  trocasWhatsappUrl
} from "./trocas.logic.js"

function bindTrocasPage() {
  const ctaBtn = document.getElementById("trocas-whatsapp-btn")
  if (ctaBtn) {
    ctaBtn.href = trocasWhatsappUrl()
  }

  const headerWhatsapp = document.getElementById("header-whatsapp-link")
  if (headerWhatsapp) {
    headerWhatsapp.href = trocasWhatsappUrl()
  }

  const container = document.getElementById("policies-container")
  if (container && !container.children.length) {
    const list = getPoliciesList(STORE_POLICIES)
    container.innerHTML = list.map((policy) => `
      <article class="policy-card" id="secao-${policy.id}">
        <div class="policy-card-header">
          <h2 class="policy-card-title">${policy.title}</h2>
          <span class="policy-card-badge">${policy.badge}</span>
        </div>
        <p class="policy-card-summary">${policy.summary}</p>
        <div class="policy-topics">
          ${policy.topics.map((topic) => `
            <div class="policy-topic">
              <h3 class="policy-topic-title">${topic.title}</h3>
              <p class="policy-topic-text">${topic.text}</p>
            </div>
          `).join("")}
        </div>
      </article>
    `).join("")
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindTrocasPage)
} else {
  bindTrocasPage()
}
