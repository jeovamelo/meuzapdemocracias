import type { ColinhaVotos } from '../types';

function extrairPrimeiroNome(nomeCompleto?: string): string {
  if (!nomeCompleto || !nomeCompleto.trim()) return '';
  const partes = nomeCompleto.trim().split(/\s+/);
  return partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
}

/**
 * Motor de IA / Variação Textual Anti-Assinatura (Anti-Signature Spam)
 * Garante que cada mensagem gerada possua estrutura única, saudação humana
 * e tom afetuoso/pessoal, impossibilitando bloqueios por repetição de hash idêntico.
 */
export function gerarMensagemPersonalizadaIA(
  nomeEleitor: string,
  nomeContato: string,
  votos: ColinhaVotos
): string {
  const pEleitor = extrairPrimeiroNome(nomeEleitor) || 'um amigo';
  const pContato = extrairPrimeiroNome(nomeContato);

  // Lista de saudações variadas
  const saudacoes = [
    pContato ? `Olá ${pContato}, tudo bem?` : 'Olá, tudo bem com você?',
    pContato ? `Oi ${pContato}! Tudo joia?` : 'Oi, tudo joia por aí?',
    pContato ? `Fala ${pContato}, como estão as coisas?` : 'Olá! Como você está?',
    pContato ? `E aí, ${pContato}! Tudo em paz?` : 'Oi! Tudo bem?',
    pContato ? `Oi ${pContato}! Passando rapidinho pra te dar um abraço!` : 'Oi! Passando pra deixar um abraço!',
  ];

  // Conexões e justificativas pessoais
  const introducoes = [
    `Aqui é o(a) ${pEleitor}. Andei avaliando com muito cuidado as candidaturas desta eleição e montei a minha colinha oficial de confiança.`,
    `Aqui é o(a) ${pEleitor}! Estive pesquisando os melhores nomes para representar a gente e fechei meus votos para 2026.`,
    `Aqui é o(a) ${pEleitor}. Sei que escolher em quem votar não é simples, por isso queria compartilhar contigo as minhas escolhas de coração deste ano.`,
    `É o(a) ${pEleitor} por aqui. Montei uma colinha com as pessoas que mais confio para transformar o nosso estado e o país.`,
  ];

  // Formatação resumida dos candidatos
  const linhasCandidatos: string[] = [];
  if (votos.deputado_federal && !votos.deputado_federal.isBrancoNulo) {
    linhasCandidatos.push(`• Dep. Federal: ${votos.deputado_federal.nomeUrna} (${votos.deputado_federal.numero})`);
  }
  if (votos.deputado_estadual && !votos.deputado_estadual.isBrancoNulo) {
    linhasCandidatos.push(`• Dep. Estadual: ${votos.deputado_estadual.nomeUrna} (${votos.deputado_estadual.numero})`);
  }
  if (votos.senador_1 && !votos.senador_1.isBrancoNulo) {
    linhasCandidatos.push(`• Senador(a): ${votos.senador_1.nomeUrna} (${votos.senador_1.numero})`);
  }
  if (votos.senador_2 && !votos.senador_2.isBrancoNulo) {
    linhasCandidatos.push(`• Senador(a) 2ª Vaga: ${votos.senador_2.nomeUrna} (${votos.senador_2.numero})`);
  }
  if (votos.governador && !votos.governador.isBrancoNulo) {
    linhasCandidatos.push(`• Governador(a): ${votos.governador.nomeUrna} (${votos.governador.numero})`);
  }
  if (votos.presidente && !votos.presidente.isBrancoNulo) {
    linhasCandidatos.push(`• Presidente: ${votos.presidente.nomeUrna} (${votos.presidente.numero})`);
  }

  const blocoVotos = linhasCandidatos.length > 0 
    ? linhasCandidatos.join('\n')
    : 'Seguem meus votos de confiança na imagem em anexo!';

  // Despedidas calorosas e únicas
  const despedidas = [
    `Dá uma olhada na imagem da colinha que preparei pra você guardar no dia da votação. Um forte abraço do(a) ${pEleitor}!`,
    `Preparei essa imagem com carinho pra facilitar no dia. Se gostar, compartilha também! Grande abraço!`,
    `Segue a imagem da colinha prontinha pra salvar no celular. Conta comigo e um ótimo voto pra gente!`,
    `Segue a colinha visual em anexo pra você levar pra urna. Um abraço bem forte e boas eleições!`,
  ];

  // Seleção pseudo-randômica baseada no nome do contato para estabilidade mas variabilidade entre pessoas
  const hash = (nomeContato + nomeEleitor).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const saudacaoEscolhida = saudacoes[hash % saudacoes.length];
  const introEscolhida = introducoes[(hash + 1) % introducoes.length];
  const despedidaEscolhida = despedidas[(hash + 2) % despedidas.length];

  return `${saudacaoEscolhida}\n\n${introEscolhida}\n\n${blocoVotos}\n\n${despedidaEscolhida}`;
}
