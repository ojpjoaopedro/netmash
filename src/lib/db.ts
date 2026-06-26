import { supabase, supabaseReady } from "./supabase";
import { uid, hoje } from "./format";

// ============================================================
// TIPOS
// ============================================================
export type Tipo = "receita" | "despesa";

export type Lancamento = {
  id: string;
  empresa_id: string;
  tipo: Tipo;
  descricao: string;
  categoria: string | null;
  valor: number;
  data_competencia: string;
  vencimento: string | null;
  pago: boolean;
  data_pagamento: string | null;
  forma: string | null;
  contato: string | null;
  origem: string;
  cliente_id?: string | null;
};

export type Cliente = {
  id: string;
  empresa_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  obs: string | null;
  criado_em: string;
};

export type Funcionario = {
  id: string;
  empresa_id: string;
  nome: string;
  cargo: string | null;
  departamento: string | null;
  salario: number;
  beneficios: number;
  admissao: string | null;
  ativo: boolean;
  contato: string | null;
};

export type Empresa = {
  id: string;
  nome: string;
  cnpj: string | null;
  segmento: string | null;
  saldo_inicial: number;
};

export type Perfil = {
  id: string;
  empresa_id: string;
  nome: string | null;
  email: string | null;
  papel: string;
  areas: string[] | null;
};

// Categorias sugeridas (free-text, mas com atalhos)
export const CATEGORIAS_RECEITA = ["Vendas", "Serviços", "Juros/Rendimentos", "Outras receitas"];
export const CATEGORIAS_DESPESA = [
  "Fornecedores", "Folha de pagamento", "Aluguel", "Impostos", "Marketing",
  "Energia/Água/Internet", "Pró-labore", "Software/Assinaturas", "Logística", "Outras despesas",
];
export const FORMAS = ["pix", "dinheiro", "cartão", "boleto", "transferência"];

// ============================================================
// MODO DEMO (localStorage) — funciona sem Supabase configurado
// ============================================================
const DEMO_EMP = "demo-empresa";
const K = {
  emp: "fin_demo_empresa",
  lanc: "fin_demo_lancamentos",
  func: "fin_demo_funcionarios",
  cli: "fin_demo_clientes",
  seed: "fin_demo_seeded",
};

function ls<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, val: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(val));
}

/** Cria dados de exemplo realistas na 1ª vez (só no modo demo). */
function seedDemo() {
  if (typeof window === "undefined" || localStorage.getItem(K.seed)) return;
  const emp: Empresa = {
    id: DEMO_EMP, nome: "Minha Empresa (demonstração)", cnpj: null,
    segmento: "Comércio", saldo_inicial: 15000,
  };
  const now = new Date();
  const lanc: Lancamento[] = [];
  const cats = ["Vendas", "Serviços"];
  const desp = [
    ["Fornecedores", 0.32], ["Folha de pagamento", 0.22], ["Aluguel", 0.08],
    ["Impostos", 0.10], ["Marketing", 0.06], ["Energia/Água/Internet", 0.04],
  ] as const;
  // 6 meses de histórico
  for (let m = 5; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const ym = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
    const fat = 38000 + Math.round((5 - m) * 2600) + (m % 2 ? 3000 : -1500);
    // receitas (algumas parcelas)
    const nRec = 6 + (m % 3);
    for (let i = 0; i < nRec; i++) {
      const dia = String(2 + Math.floor((i / nRec) * 26)).padStart(2, "0");
      lanc.push({
        id: uid(), empresa_id: DEMO_EMP, tipo: "receita",
        descricao: `Venda #${1000 + m * 10 + i}`, categoria: cats[i % 2],
        valor: Math.round((fat / nRec) * (0.8 + (i % 3) * 0.2)),
        data_competencia: `${ym}-${dia}`,
        vencimento: `${ym}-${dia}`, pago: true, data_pagamento: `${ym}-${dia}`,
        forma: "pix", contato: ["Cliente A", "Cliente B", "Cliente C"][i % 3], origem: "manual",
      });
    }
    // despesas por categoria
    for (const [cat, frac] of desp) {
      lanc.push({
        id: uid(), empresa_id: DEMO_EMP, tipo: "despesa",
        descricao: cat, categoria: cat,
        valor: Math.round(fat * frac),
        data_competencia: `${ym}-10`,
        vencimento: `${ym}-10`, pago: true, data_pagamento: `${ym}-10`,
        forma: "boleto", contato: null, origem: "manual",
      });
    }
  }
  // algumas contas em aberto (a receber e a pagar) no mês atual e próximo
  const ymA = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prox = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const ymP = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}`;
  lanc.push(
    { id: uid(), empresa_id: DEMO_EMP, tipo: "receita", descricao: "Pedido grande — Cliente B", categoria: "Vendas", valor: 8800, data_competencia: `${ymA}-20`, vencimento: `${ymA}-28`, pago: false, data_pagamento: null, forma: "boleto", contato: "Cliente B", origem: "manual" },
    { id: uid(), empresa_id: DEMO_EMP, tipo: "receita", descricao: "Contrato mensal — Cliente C", categoria: "Serviços", valor: 4200, data_competencia: `${ymP}-05`, vencimento: `${ymP}-05`, pago: false, data_pagamento: null, forma: "pix", contato: "Cliente C", origem: "manual" },
    { id: uid(), empresa_id: DEMO_EMP, tipo: "despesa", descricao: "Fornecedor — matéria-prima", categoria: "Fornecedores", valor: 6300, data_competencia: `${ymA}-22`, vencimento: `${ymA}-25`, pago: false, data_pagamento: null, forma: "boleto", contato: "Fornecedor X", origem: "manual" },
    { id: uid(), empresa_id: DEMO_EMP, tipo: "despesa", descricao: "Imposto (DAS/Simples)", categoria: "Impostos", valor: 2750, data_competencia: `${ymA}-20`, vencimento: `${ymP}-20`, pago: false, data_pagamento: null, forma: "boleto", contato: null, origem: "manual" },
  );
  const func: Funcionario[] = [
    { id: uid(), empresa_id: DEMO_EMP, nome: "Ana Souza", cargo: "Gerente", departamento: "Administrativo", salario: 4500, beneficios: 600, admissao: "2023-02-01", ativo: true, contato: null },
    { id: uid(), empresa_id: DEMO_EMP, nome: "Carlos Lima", cargo: "Vendedor", departamento: "Comercial", salario: 2400, beneficios: 400, admissao: "2024-06-15", ativo: true, contato: null },
    { id: uid(), empresa_id: DEMO_EMP, nome: "Bruna Reis", cargo: "Atendente", departamento: "Operação", salario: 1800, beneficios: 350, admissao: "2025-01-10", ativo: true, contato: null },
  ];
  lsSet(K.emp, emp);
  lsSet(K.lanc, lanc);
  lsSet(K.func, func);
  lsSet(K.seed, "1");
}

// ============================================================
// EMPRESA / PERFIL
// ============================================================
export async function getPerfil(): Promise<Perfil | null> {
  if (!supabaseReady || !supabase) {
    return { id: "demo-user", empresa_id: DEMO_EMP, nome: "Você", email: null, papel: "dono", areas: null };
  }
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data } = await supabase.from("perfis").select("*").eq("id", auth.user.id).single();
  return data as Perfil | null;
}

export async function getEmpresa(): Promise<Empresa | null> {
  if (!supabaseReady || !supabase) {
    seedDemo();
    return ls<Empresa | null>(K.emp, null);
  }
  const { data } = await supabase.from("empresas").select("*").limit(1).single();
  return data as Empresa | null;
}

export async function updateEmpresa(patch: Partial<Empresa>): Promise<void> {
  if (!supabaseReady || !supabase) {
    const cur = ls<Empresa | null>(K.emp, null);
    if (cur) lsSet(K.emp, { ...cur, ...patch });
    return;
  }
  const emp = await getEmpresa();
  if (emp) await supabase.from("empresas").update(patch).eq("id", emp.id);
}

// ============================================================
// LANÇAMENTOS
// ============================================================
export async function getLancamentos(): Promise<Lancamento[]> {
  if (!supabaseReady || !supabase) {
    seedDemo();
    return ls<Lancamento[]>(K.lanc, []);
  }
  const { data } = await supabase
    .from("lancamentos").select("*").order("data_competencia", { ascending: false });
  return (data ?? []) as Lancamento[];
}

export async function addLancamento(l: Omit<Lancamento, "id" | "empresa_id">): Promise<void> {
  if (!supabaseReady || !supabase) {
    const arr = ls<Lancamento[]>(K.lanc, []);
    arr.unshift({ ...l, id: uid(), empresa_id: DEMO_EMP });
    lsSet(K.lanc, arr);
    return;
  }
  const emp = await getEmpresa();
  await supabase.from("lancamentos").insert({ ...l, empresa_id: emp?.id });
}

export async function addLancamentosLote(ls_: Omit<Lancamento, "id" | "empresa_id">[]): Promise<void> {
  if (!ls_.length) return;
  if (!supabaseReady || !supabase) {
    const arr = ls<Lancamento[]>(K.lanc, []);
    for (const l of ls_) arr.unshift({ ...l, id: uid(), empresa_id: DEMO_EMP });
    lsSet(K.lanc, arr);
    return;
  }
  const emp = await getEmpresa();
  await supabase.from("lancamentos").insert(ls_.map((l) => ({ ...l, empresa_id: emp?.id })));
}

export async function updateLancamento(id: string, patch: Partial<Lancamento>): Promise<void> {
  if (!supabaseReady || !supabase) {
    const arr = ls<Lancamento[]>(K.lanc, []).map((l) => (l.id === id ? { ...l, ...patch } : l));
    lsSet(K.lanc, arr);
    return;
  }
  await supabase.from("lancamentos").update(patch).eq("id", id);
}

export async function marcarPago(id: string, pago: boolean): Promise<void> {
  await updateLancamento(id, { pago, data_pagamento: pago ? hoje() : null });
}

export async function delLancamento(id: string): Promise<void> {
  if (!supabaseReady || !supabase) {
    lsSet(K.lanc, ls<Lancamento[]>(K.lanc, []).filter((l) => l.id !== id));
    return;
  }
  await supabase.from("lancamentos").delete().eq("id", id);
}

// ============================================================
// FUNCIONÁRIOS
// ============================================================
export async function getFuncionarios(): Promise<Funcionario[]> {
  if (!supabaseReady || !supabase) {
    seedDemo();
    return ls<Funcionario[]>(K.func, []);
  }
  const { data } = await supabase.from("funcionarios").select("*").order("nome");
  return (data ?? []) as Funcionario[];
}

export async function addFuncionario(f: Omit<Funcionario, "id" | "empresa_id">): Promise<void> {
  if (!supabaseReady || !supabase) {
    const arr = ls<Funcionario[]>(K.func, []);
    arr.push({ ...f, id: uid(), empresa_id: DEMO_EMP });
    lsSet(K.func, arr);
    return;
  }
  const emp = await getEmpresa();
  await supabase.from("funcionarios").insert({ ...f, empresa_id: emp?.id });
}

export async function updateFuncionario(id: string, patch: Partial<Funcionario>): Promise<void> {
  if (!supabaseReady || !supabase) {
    lsSet(K.func, ls<Funcionario[]>(K.func, []).map((f) => (f.id === id ? { ...f, ...patch } : f)));
    return;
  }
  await supabase.from("funcionarios").update(patch).eq("id", id);
}

export async function delFuncionario(id: string): Promise<void> {
  if (!supabaseReady || !supabase) {
    lsSet(K.func, ls<Funcionario[]>(K.func, []).filter((f) => f.id !== id));
    return;
  }
  await supabase.from("funcionarios").delete().eq("id", id);
}

// ============================================================
// CLIENTES
// ============================================================
export async function getClientes(): Promise<Cliente[]> {
  if (!supabaseReady || !supabase) {
    seedDemo();
    return ls<Cliente[]>(K.cli, []);
  }
  const { data } = await supabase.from("clientes").select("*").order("nome");
  return (data ?? []) as Cliente[];
}

export async function addCliente(c: { nome: string; email?: string | null; telefone?: string | null; obs?: string | null }): Promise<Cliente | null> {
  if (!supabaseReady || !supabase) {
    const arr = ls<Cliente[]>(K.cli, []);
    const novo: Cliente = { id: uid(), empresa_id: DEMO_EMP, nome: c.nome, email: c.email ?? null, telefone: c.telefone ?? null, obs: c.obs ?? null, criado_em: new Date().toISOString() };
    arr.push(novo); lsSet(K.cli, arr);
    return novo;
  }
  const emp = await getEmpresa();
  const { data } = await supabase.from("clientes").insert({ ...c, empresa_id: emp?.id }).select().single();
  return (data as Cliente) ?? null;
}

export async function updateCliente(id: string, patch: Partial<Cliente>): Promise<void> {
  if (!supabaseReady || !supabase) {
    lsSet(K.cli, ls<Cliente[]>(K.cli, []).map((c) => (c.id === id ? { ...c, ...patch } : c)));
    return;
  }
  await supabase.from("clientes").update(patch).eq("id", id);
}

export async function delCliente(id: string): Promise<void> {
  if (!supabaseReady || !supabase) {
    lsSet(K.cli, ls<Cliente[]>(K.cli, []).filter((c) => c.id !== id));
    return;
  }
  await supabase.from("clientes").delete().eq("id", id);
}

// ============================================================
// AUTH
// ============================================================
export async function login(email: string, senha: string) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
}

export async function cadastrar(email: string, senha: string, nome: string, empresa: string) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.auth.signUp({
    email, password: senha,
    options: { data: { nome, empresa } },
  });
  if (error) throw error;
}

export async function logout() {
  if (supabase) await supabase.auth.signOut();
}

// ============================================================
// COLABORADORES (acesso à empresa) — via rota /api/colaboradores
// ============================================================
export type ColabPerfil = { id: string; nome: string | null; email: string | null; papel: string; areas: string[] | null };

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function getColaboradores(): Promise<ColabPerfil[]> {
  if (!supabaseReady) return [];
  const res = await fetch("/api/colaboradores", { headers: await authHeader() });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.colaboradores ?? []) as ColabPerfil[];
}

export async function convidarColaborador(nome: string, email: string, senha: string, areas: string[]): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/colaboradores", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ nome, email, senha, areas }),
  });
  const j = await res.json().catch(() => ({}));
  return res.ok ? { ok: true } : { ok: false, error: (j as { error?: string }).error || "Não consegui criar o acesso." };
}

export async function removerColaborador(id: string): Promise<void> {
  await fetch(`/api/colaboradores?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: await authHeader() });
}
