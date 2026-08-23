export type EnderecoViaCep = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  erro?: boolean;
};

export function formatarCep(cep: string): string {
  const clean = cep.replace(/\D/g, "").slice(0, 8);
  if (clean.length > 5) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  return clean;
}

export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.erro) return null;
    return data as EnderecoViaCep;
  } catch (error) {
    console.error("Erro ao buscar CEP no ViaCEP:", error);
    return null;
  }
}
