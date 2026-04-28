export const VENEZUELAN_BANKS = [
  { code: '0102', name: 'Banco de Venezuela, S.A. Banco Universal' },
  { code: '0104', name: 'Venezolano de Credito, S.A. Banco Universal' },
  { code: '0105', name: 'Banco Mercantil, C.A. Banco Universal' },
  { code: '0108', name: 'Banco Provincial, S.A. Banco Universal' },
  { code: '0114', name: 'Bancaribe, C.A. Banco Universal' },
  { code: '0115', name: 'Banco Exterior, C.A. Banco Universal' },
  { code: '0128', name: 'Banco Caroni, C.A. Banco Universal' },
  { code: '0134', name: 'Banesco Banco Universal, C.A.' },
  { code: '0137', name: 'Banco Sofitasa, C.A. Banco Universal' },
  { code: '0138', name: 'Banco Plaza, C.A. Banco Universal' },
  { code: '0146', name: 'Bangente, Banco de Desarrollo de la Mujer, C.A.' },
  { code: '0151', name: 'BFC Banco Fondo Comun, C.A. Banco Universal' },
  { code: '0156', name: '100% Banco, C.A. Banco Universal' },
  { code: '0157', name: 'DelSur Banco Universal, C.A.' },
  { code: '0163', name: 'Banco del Tesoro, C.A. Banco Universal' },
  { code: '0168', name: 'Bancrecer, S.A. Banco Microfinanciero' },
  { code: '0169', name: 'Mi Banco, Banco Microfinanciero, C.A.' },
  { code: '0171', name: 'Banco Activo, C.A. Banco Universal' },
  { code: '0172', name: 'Bancamiga Banco Universal, C.A.' },
  { code: '0174', name: 'Banplus Banco Universal, C.A.' },
  { code: '0175', name: 'Banco Nacional de Credito, C.A. Banco Universal' },
  { code: '0177', name: 'Banco de la Fuerza Armada Nacional Bolivariana, B.U.' },
] as const

function compactBankName(name: string) {
  return name
    .replace(/^Banco\s+de\s+/i, '')
    .replace(/^Banco\s+/i, '')
    .replace(/,\s*S\.A\..*$/i, '')
    .replace(/\s*C\.A\..*$/i, '')
    .replace(/\s*Banco Universal.*$/i, '')
    .replace(/\s*B\.U\..*$/i, '')
    .trim()
}

export const VENEZUELAN_BANK_OPTIONS = VENEZUELAN_BANKS.map((bank) => ({
  ...bank,
  label: `${bank.code} - ${bank.name}`,
  displayLabel: `${bank.code}-${compactBankName(bank.name)}`,
}))
