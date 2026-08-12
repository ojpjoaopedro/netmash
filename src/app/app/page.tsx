import type { Metadata } from "next";
import Script from "next/script";
import VendaClient from "./VendaClient";

const PIXEL_ID = "574774374290188"; // Pixel da Meta (Facebook/Instagram)

export const metadata: Metadata = {
  title: "Minhas Métricas — O painel que mostra o lucro real da sua empresa",
  description:
    "Faturamento, custos, lucro e projeção num painel que se monta sozinho. Pare de decidir no achismo e veja o número real do seu negócio. R$ 49,99/mês, cancele quando quiser.",
};

export default function AppPage() {
  return (
    <>
      {/* Meta Pixel: PageView + InitiateCheckout (clique em Assinar) */}
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,
        'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${PIXEL_ID}');fbq('track','PageView');
        document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('a[href*="checkout.wiven.com.br"],a[href*="pay.kiwify.com.br"],a[href*="buy.stripe.com"],a[data-checkout]');if(t&&window.fbq)fbq('track','InitiateCheckout');});
      `}</Script>
      <noscript><img height="1" width="1" style={{ display: "none" }} alt=""
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} /></noscript>
      <VendaClient />
    </>
  );
}
