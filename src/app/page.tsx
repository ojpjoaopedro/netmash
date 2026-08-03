import { redirect } from "next/navigation";

// Quem acessa a raiz (minhasmetricas.com) é levado para /site.
export default function Home() {
  redirect("/site");
}
