/* Service worker do Métricas (PWA + Web Push).
   Instala o app na tela do celular e recebe as notificações push. */

// Ativa a nova versão imediatamente (sem esperar fechar todas as abas).
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

// Recebe um push do servidor e mostra a notificação no celular.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: "Métricas", body: event.data ? event.data.text() : "" }; }

  const title = data.title || "Métricas";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || undefined,          // avisos com a mesma tag substituem o anterior
    renotify: !!data.tag,
    data: { url: data.url || "/dashboard/home" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Ao tocar na notificação: foca a aba do app se já estiver aberta, senão abre.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
