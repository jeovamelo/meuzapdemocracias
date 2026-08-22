/**
 * Serviço de Integração com a API Oficial DivulgaCandContas do TSE
 */

interface CandidateResult {
  id?: number;
  nome: string;
  nomeUrna: string;
  cargo: string;
  partido: string;
  numero: string;
  fotoUrl?: string;
  uf: string;
  municipio?: string;
}

export async function searchTseCandidate(uf: string, numero: string, ano = '2024'): Promise<CandidateResult | null> {
  const cleanUf = uf.toUpperCase().trim();
  const cleanNumero = numero.trim();

  // Mapeamento de eleições oficiais do TSE
  // 2024: Municipais (Eleição Ordinária: 2045202024)
  // 2022: Gerais (Eleição Ordinária: 2040602022)
  const eleicaoId = ano === '2022' ? '2040602022' : '2045202024';

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    };

    // Para eleições gerais (Presidente, Gov, Senador, Deputados)
    if (ano === '2022') {
      const cargosGerais = [1, 3, 5, 6, 7]; // 1: Presidente (BR), 3: Gov, 5: Sen, 6: Dep Fed, 7: Dep Est
      for (const cargoId of cargosGerais) {
        const targetUf = cargoId === 1 ? 'BR' : cleanUf;
        const url = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/2022/${targetUf}/${eleicaoId}/${cargoId}/candidatos`;
        
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data: any = await res.json();
          const cand = data.candidatos?.find((c: any) => String(c.numero) === cleanNumero);
          if (cand) {
            // Buscar detalhes completos
            const detailUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2022/${targetUf}/${eleicaoId}/candidato/${cand.id}`;
            const detailRes = await fetch(detailUrl, { headers });
            const detailData: any = detailRes.ok ? await detailRes.json() : cand;

            return {
              id: cand.id,
              nome: detailData.nomeCompleto || cand.nomeCompleto || '',
              nomeUrna: detailData.nomeUrna || cand.nomeUrna || '',
              cargo: detailData.cargo?.nome || cand.cargo?.nome || 'Candidato(a)',
              partido: detailData.partido?.sigla || cand.partido?.sigla || '',
              numero: cleanNumero,
              uf: cleanUf,
              fotoUrl: detailData.fotoUrl || `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/2022/${cand.id}`
            };
          }
        }
      }
    }

    // Para eleições municipais (2024): primeiro buscar municípios da UF ou tentar por código de capital/município
    // Se for 2024, tentamos listar os municípios do estado
    const munUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/buscar/2024/${eleicaoId}/municipios`;
    const munRes = await fetch(munUrl, { headers });
    
    if (munRes.ok) {
      const munData: any = await munRes.json();
      const municipiosDoEstado = munData.municipios?.filter((m: any) => m.uf === cleanUf) || [];

      // Buscar nos primeiros municípios mais populosos/relevantes ou pelo código
      // Para otimizar a velocidade da busca:
      for (const mun of municipiosDoEstado.slice(0, 15)) {
        for (const cargoId of [11, 13]) { // 11: Prefeito, 13: Vereador
          const listUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/2024/${mun.codigo}/${eleicaoId}/${cargoId}/candidatos`;
          const listRes = await fetch(listUrl, { headers });
          if (listRes.ok) {
            const listData: any = await listRes.json();
            const cand = listData.candidatos?.find((c: any) => String(c.numero) === cleanNumero);
            if (cand) {
              const detailUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2024/${mun.codigo}/${eleicaoId}/candidato/${cand.id}`;
              const detailRes = await fetch(detailUrl, { headers });
              const detailData: any = detailRes.ok ? await detailRes.json() : cand;

              return {
                id: cand.id,
                nome: detailData.nomeCompleto || cand.nomeCompleto || '',
                nomeUrna: detailData.nomeUrna || cand.nomeUrna || '',
                cargo: detailData.cargo?.nome || cand.cargo?.nome || 'Candidato(a)',
                partido: detailData.partido?.sigla || cand.partido?.sigla || '',
                numero: cleanNumero,
                uf: cleanUf,
                municipio: mun.nome,
                fotoUrl: detailData.fotoUrl || `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/2024/${cand.id}`
              };
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Erro na consulta ao TSE:', error);
    return null;
  }
}
