import Script from "next/script";

/**
 * Pixel da Meta (Facebook/Instagram) reutilizável em todas as páginas de venda.
 * Recebe o ID (vem do /admin, via app_kv). Dispara:
 *  - PageView sempre;
 *  - InitiateCheckout no clique em qualquer link de checkout (Cakto/Kiwify/Stripe);
 *  - Purchase quando `purchase` é passado (página de obrigado, pós-pagamento).
 */
export default function MetaPixel({
  pixelId,
  purchase,
}: {
  pixelId: string;
  purchase?: { value: number; currency?: string } | null;
}) {
  const purchaseJs = purchase
    ? `fbq('track','Purchase',{value:${purchase.value},currency:'${purchase.currency || "BRL"}'});`
    : "";
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,
        'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${pixelId}');fbq('track','PageView');${purchaseJs}
        document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('a[href*="pay.cakto.com.br"],a[href*="pay.kiwify.com.br"],a[href*="buy.stripe.com"],a[data-checkout]');if(t&&window.fbq)fbq('track','InitiateCheckout');});
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
