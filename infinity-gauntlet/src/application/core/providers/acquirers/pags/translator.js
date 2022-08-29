import { cond, equals, always, T } from 'ramda'

const toHashPaymentMethod = cond([
  [equals('1'), always('credit_card')],
  [equals('8'), always('debit_card')],
  [equals('2'), always('boleto')],
  [T, always('credit_card')]
])

/**
 * PAGS Statuses:
 * 1 - Aguardando Pagamento
 * 2 - Em Análise
 * 3 - Paga
 * 4 - Disponível
 * 5 - Em Disputa
 * 6 - Devolvida
 * 7 - Cancelada
 * 8 - Debitada
 * 9 - Retenção Temporária
 **/
const toHashStatus = cond([
  [equals('1'), always('processing')],
  [equals('2'), always('processing')],
  [equals('3'), always('paid')],
  [equals('4'), always('paid')],
  [equals('5'), always('chargedback')],
  [equals('6'), always('refunded')],
  [equals('7'), always('refused')],
  [equals('8'), always('chargedback')],
  [equals('9'), always('chargedback')],
  [T, always('processing')]
])

/*
https://pagseguro.uol.com.br/v2/guia-de-integracao/consulta-de-transacoes-por-codigo.html?_rnt=dd#!rmcl
<transaction>
  <paymentMethod>
    <code>
*/
const toHashCardBrand = cond([
  [equals('101'), always('visa')],
  [equals('102'), always('mastercard')],
  [equals('103'), always('amex')],
  [equals('104'), always('diners')],
  [equals('105'), always('hiper')],
  [equals('106'), always('aura')],
  [equals('107'), always('elo')],
  [equals('108'), always('plenocard')],
  [equals('109'), always('personalcard')],
  [equals('110'), always('jcb')],
  [equals('111'), always('discover')],
  [equals('112'), always('volus')],
  [equals('113'), always('fortbrasil')],
  [equals('114'), always('cardban')],
  [equals('115'), always('valecard')],
  [equals('116'), always('cabal')],
  [equals('117'), always('mais')],
  [equals('118'), always('avista')],
  [equals('119'), always('grandcard')],
  [equals('120'), always('sorocred')],
  [equals('122'), always('upbrasil')]
])

export { toHashPaymentMethod, toHashStatus, toHashCardBrand }
