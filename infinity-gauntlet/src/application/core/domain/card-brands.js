import R from 'ramda'

/**
 * Visa Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const visa = {
  name: 'visa',
  needsPayables: true
}

/**
 * Mastercard Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const mastercard = {
  name: 'mastercard',
  needsPayables: true
}

/**
 * Elo Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const elo = {
  name: 'elo',
  needsPayables: true
}

/**
 * Amex Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const amex = {
  name: 'amex',
  needsPayables: true
}

/**
 * Hiper Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const hiper = {
  name: 'hiper',
  needsPayables: true
}

/**
 * Diners Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const diners = {
  name: 'diners',
  needsPayables: false,
  prefixes: ['301', '305', '36', '38']
}

/**
 * Discover Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const discover = {
  name: 'discover',
  needsPayables: false
}

/**
 * Aura Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const aura = {
  name: 'aura',
  needsPayables: false
}

/**
 * Alelo Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const alelo = { name: 'alelo', needsPayables: false }

/**
 * Ticket Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const ticket = { name: 'ticket', needsPayables: false }

/**
 * Sodexo Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const sodexo = { name: 'sodexo', needsPayables: false }

/**
 * Sorocred Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const sorocred = { name: 'sorocred', needsPayables: true }

/**
 * Cabal Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const cabal = { name: 'cabal', needsPayables: true }

/**
 * Volus Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const volus = { name: 'volus', needsPayables: true }

/**
 * Upbrasil Card Brand Representation
 * @type {{name: string, needsPayables: boolean}}
 */
const upbrasil = { name: 'upbrasil', needsPayables: true }

/**
 * List of all accepted card brands
 * @returns {*[]}
 */
export const list = () => [
  visa,
  mastercard,
  elo,
  amex,
  diners,
  hiper,
  discover,
  aura,
  alelo,
  ticket,
  sodexo,
  sorocred,
  cabal,
  volus,
  upbrasil
]

/**
 * Name of all accepted card brands
 * @returns {string[]}
 */
export const names = () => list().map(({ name }) => name)

/**
 * Name of all card brands that need payables
 * @returns {string[]}
 */
const listOfBrandsThatNeedPayables = () =>
  list()
    .filter(({ needsPayables }) => needsPayables)
    .map(({ name }) => name)

/**
 * Receives the brand name and returns if we need to create payables
 * @returns boolean
 */
export const needsPayables = brand =>
  R.contains(brand, listOfBrandsThatNeedPayables())
