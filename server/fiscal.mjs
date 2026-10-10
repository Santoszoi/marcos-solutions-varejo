// Configuração tributária declarativa. Nenhum CRT, CST, CSOSN, CFOP,
// NCM ou alíquota é escolhido ou sugerido neste código.
export function buildTaxFields({regime,uf,profile,catalog,date}) {
  const rule = catalog?.regimes?.[regime];
  if (!rule || rule.crt === undefined || rule.crt === null) throw Error('Cadastre o regime e o CRT no catálogo fiscal');
  if (!profile?.approvedBy || profile.uf !== uf || profile.regime !== regime) throw Error('Produto sem perfil fiscal aprovado para esta operação');
  if (!profile.validFrom || date < profile.validFrom || (profile.validUntil && date > profile.validUntil)) throw Error('Perfil tributário fora da vigência');
  for (const [field,list] of Object.entries(rule.allowedCodes || {})) {
    if (!Array.isArray(list) || !list.includes(profile.fields?.[field])) throw Error(`Código fiscal inválido: ${field}`);
  }
  if (!Array.isArray(rule.requiredFields) || !rule.requiredFields.length) throw Error('Catálogo fiscal sem validações');
  for (const field of rule.requiredFields) if (profile.fields?.[field] === undefined || profile.fields[field] === '') throw Error(`Falta configurar ${field}`);
  return {crt:rule.crt,fields:structuredClone(profile.fields),catalogVersion:catalog.version};
}
