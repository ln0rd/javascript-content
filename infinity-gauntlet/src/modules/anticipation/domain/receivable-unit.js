/**
 *
 * Banco Central do Brasil - CIRCULAR Nº 3.952, DE 27 DE JUNHO DE 2019
 *
 * Art. 2º Para fins do disposto nesta Circular, consideram-se:
 * [...]
 * III - unidade de recebíveis: ativo financeiro composto por recebíveis de arranjo de pagamento,
 * inclusive os recebíveis oriundos de operações de antecipação pré-contratadas, caracterizados pelo(a) mesmo(a):
 * a) número de inscrição no Cadastro Nacional da Pessoa Jurídica (CNPJ) ou no Cadastro de Pessoas Físicas (CPF) do usuário final recebedor;
 * b) identificação do arranjo de pagamento;
 * c) identificação da instituição credenciadora ou subcredenciadora;e
 * d) data de liquidação
 */
export class ReceivableUnit {
  constructor({
    cardBrand,
    paymentMethod,
    originalPaymentDate,
    documentNumber,
    netAmountCents,
    notRegisteredCents,
    payables
  }) {
    this.cardBrand = cardBrand
    this.paymentMethod = paymentMethod
    this.originalPaymentDate = originalPaymentDate
    this.documentNumber = documentNumber
    this.netAmountCents = netAmountCents || 0
    this.notRegisteredCents = notRegisteredCents || 0
    this.payables = payables || []
  }

  toJSON() {
    return {
      card_brand: this.cardBrand,
      payment_method: this.paymentMethod,
      original_payment_date: this.originalPaymentDate,
      document_number: this.documentNumber,
      not_registered_cents: this.notRegisteredCents,
      net_amount_cents: this.netAmountCents,
      payables: this.payables
    }
  }
}
