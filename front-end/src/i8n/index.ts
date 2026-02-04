// src/i18n/index.ts
import pt from './pt.json'
import en from './en.json'
import es from './es.json'

const dictionaries = { pt, en, es }

export function t(key: string): string {
  const lang = localStorage.getItem('lang') || 'pt'
  return key
    .split('.')
    .reduce((obj: any, k) => obj?.[k], dictionaries[lang])
    || key
}
