/**
 * Vercel Web Analytics — carrega só em homolog (APP_ENV=staging).
 * Requer Web Analytics ativo no projeto Vercel.
 */
(function () {
  var env = window.__MARIS_ENV__ || {}
  if (env.APP_ENV !== "staging" && !env.VERCEL_ANALYTICS) return
  if (document.documentElement.dataset.marisAnalytics) return
  document.documentElement.dataset.marisAnalytics = "1"

  window.va =
    window.va ||
    function () {
      ;(window.vaq = window.vaq || []).push(arguments)
    }

  var script = document.createElement("script")
  script.defer = true
  script.src = "/_vercel/insights/script.js"
  document.head.appendChild(script)

  window.MarisAnalytics = {
    track: function (name, data) {
      if (typeof window.va !== "function" || !name) return
      if (data && typeof data === "object") {
        window.va("event", { name: String(name), data: data })
        return
      }
      window.va("event", { name: String(name) })
    },
  }
})()
