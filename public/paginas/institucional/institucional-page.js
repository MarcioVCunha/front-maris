function renderPolicyArticles(list) {
  return (list || [])
    .map(
      (policy) => `
      <article class="policy-card" id="secao-${policy.id}">
        <div class="policy-card-header">
          <h2 class="policy-card-title">${policy.title}</h2>
          ${policy.badge ? `<span class="policy-card-badge">${policy.badge}</span>` : ""}
        </div>
        ${policy.summary ? `<p class="policy-card-summary">${policy.summary}</p>` : ""}
        <div class="policy-topics">
          ${(policy.topics || [])
            .map(
              (topic) => `
            <div class="policy-topic">
              <h3 class="policy-topic-title">${topic.title}</h3>
              <p class="policy-topic-text">${topic.text}</p>
            </div>`
            )
            .join("")}
        </div>
      </article>`
    )
    .join("")
}

function renderPrivacyArticles(sections) {
  return (sections || [])
    .map(
      (section) => `
      <article class="policy-card" id="secao-${section.id}">
        <div class="policy-card-header">
          <h2 class="policy-card-title">${section.title}</h2>
        </div>
        <div class="policy-topics">
          ${(section.paragraphs || [])
            .map((p) => `<p class="policy-topic-text legal-paragraph">${p}</p>`)
            .join("")}
        </div>
      </article>`
    )
    .join("")
}

export function bindInstitucionalPage({
  containerId = "policies-container",
  sections = [],
  mode = "policies",
} = {}) {
  const info = window.MarisLojaInfo
  if (info?.fillContactLinks) info.fillContactLinks(document)

  const ctaBtn = document.getElementById("institucional-whatsapp-btn")
  if (ctaBtn && info?.whatsappUrl) {
    ctaBtn.href = info.whatsappUrl("Oi, gostaria de tirar uma dúvida sobre a Maris")
  }

  const container = document.getElementById(containerId)
  if (!container || container.children.length) return

  container.innerHTML =
    mode === "privacy" ? renderPrivacyArticles(sections) : renderPolicyArticles(sections)
}
