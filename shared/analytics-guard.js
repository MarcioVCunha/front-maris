/**
 * Carrega Vercel Web Analytics e avisa quando um bloqueador impede o script.
 */
;(function () {
  var INSIGHTS_SRC = "/_vercel/insights/script.js"
  var DISMISS_KEY = "maris_analytics_notice_dismissed"
  var OK_KEY = "maris_analytics_ok"
  var CHECK_MS = 2800

  if (shouldSkip()) return

  injectStyles()
  loadAnalytics()

  function shouldSkip() {
    return location.hostname === "localhost" || location.hostname === "127.0.0.1"
  }

  function injectStyles() {
    if (document.querySelector('link[data-maris-analytics-guard="1"]')) return
    var link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "/shared/analytics-guard.css"
    link.dataset.marisAnalyticsGuard = "1"
    document.head.appendChild(link)
  }

  function loadAnalytics() {
    window.va =
      window.va ||
      function () {
        ;(window.vaq = window.vaq || []).push(arguments)
      }

    var settled = false
    var script = document.createElement("script")
    script.defer = true
    script.src = INSIGHTS_SRC

    function markOk() {
      if (settled) return
      settled = true
      try {
        sessionStorage.setItem(OK_KEY, "1")
      } catch (_err) {
        /* ignore */
      }
    }

    function markBlocked() {
      if (settled) return
      settled = true
      showBanner()
    }

    script.addEventListener("load", function () {
      script.dataset.marisLoaded = "1"
      markOk()
    })
    script.addEventListener("error", markBlocked)
    document.head.appendChild(script)

    window.setTimeout(function () {
      if (settled) return
      if (script.dataset.marisLoaded === "1") return
      probeInsights(markBlocked)
    }, CHECK_MS)
  }

  function probeInsights(onBlocked) {
    fetch(INSIGHTS_SRC, { method: "HEAD", cache: "no-store", credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) onBlocked()
      })
      .catch(function () {
        onBlocked()
      })
  }

  function showBanner() {
    if (document.getElementById("maris-analytics-notice")) return
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return
    } catch (_err) {
      /* ignore */
    }

    var host = location.hostname
    var banner = document.createElement("aside")
    banner.id = "maris-analytics-notice"
    banner.className = "maris-consent-banner"
    banner.setAttribute("role", "dialog")
    banner.setAttribute("aria-labelledby", "maris-analytics-notice-title")
    banner.setAttribute("aria-live", "polite")
    banner.innerHTML =
      '<p id="maris-analytics-notice-title" class="maris-consent-banner__title">Pode nos ajudar com um favor?</p>' +
      '<p class="maris-consent-banner__text">Contamos visitas de forma anônima para melhorar o catálogo — sem anúncios e sem coletar seus dados pessoais. Parece que uma extensão do navegador bloqueou isso por engano.</p>' +
      '<p class="maris-consent-banner__reassurance">Você pode continuar usando o site normalmente. Se puder liberar, ajuda muito a equipe Maris.</p>' +
      '<details class="maris-consent-banner__help">' +
      "<summary>Como liberar este site (passo a passo)</summary>" +
      "<ol>" +
      "<li>Procure o ícone de um <strong>escudo</strong> ou <strong>bloqueador</strong> na barra de endereço do navegador (canto superior).</li>" +
      "<li>Clique nele e escolha <strong>desativar neste site</strong> ou <strong>permitir</strong> para <em>" +
      host +
      "</em>.</li>" +
      "<li>Volte para esta página e toque em <strong>Pronto, já liberei</strong> para atualizar.</li>" +
      "</ol>" +
      '<p class="maris-consent-banner__help-tip">Não encontrou? Pode ser uBlock, AdBlock ou similar — o nome varia, mas a opção costuma ser “desativar neste site”.</p>' +
      "</details>" +
      '<div class="maris-consent-banner__actions">' +
      '<button type="button" class="maris-consent-banner__btn maris-consent-banner__btn--primary" data-action="retry">Pronto, já liberei</button>' +
      '<button type="button" class="maris-consent-banner__btn maris-consent-banner__btn--ghost" data-action="dismiss">Continuar assim mesmo</button>' +
      "</div>"

    banner.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-action]")
      if (!btn) return
      var action = btn.getAttribute("data-action")
      if (action === "dismiss") {
        try {
          sessionStorage.setItem(DISMISS_KEY, "1")
        } catch (_err) {
          /* ignore */
        }
        banner.remove()
        return
      }
      if (action === "retry") {
        try {
          sessionStorage.removeItem(DISMISS_KEY)
          sessionStorage.removeItem(OK_KEY)
        } catch (_err) {
          /* ignore */
        }
        location.reload()
      }
    })

    document.body.appendChild(banner)
  }
})()
