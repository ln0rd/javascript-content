import Company from 'application/core/models/company'
import EventSource from 'application/core/models/event-source'
import IntegrationCredential from 'application/core/models/integration-credential'
import IntegrationRequest from 'application/core/models/integration-request'
import Payable from 'application/core/models/payable'
import Transaction from 'application/core/models/transaction'
import bridge from 'application/core/integrations/bridge'
import createLogger from 'framework/core/adapters/logger'
import { DEBIT_CARD, BOLETO } from 'application/core/domain/methods'

const Logger = createLogger({ name: 'LEO_MADEIRAS_SAP_HANDLER' })

export default class LeoMadeirasSapHandler {
  static integrationName() {
    return 'sapleomadeiras'
  }

  static version() {
    return '1.0.0'
  }

  static leoId() {
    return '5cf141b986642840656717f0'
  }

  static async handler({ event_source, args: { transactionId, locale } }) {
    const eventSourceName = await this.getEventSourceName(event_source)
    const isRefund = eventSourceName === 'transaction-canceled'
    const transaction = await this.getTransaction(transactionId)
    const company = await this.getLeoChildrenCompany(transaction.company_id)
    const companyId = company._id.toString()

    if (!['refunded', 'paid'].includes(transaction.status)) {
      Logger.info(
        {
          transactionId,
          status: transaction.status,
          companyId
        },
        'leo-madeiras-sap-handler-status-invalid'
      )
      return
    }

    if (!company) {
      return
    }

    // transactions coming from the transaction-service should be ignored because they will be handled by leo-credit-notes
    if ('captured_by' in transaction) {
      Logger.info(
        {
          transactionId
        },
        'skipped-sap-integration-for-d1950-transactions'
      )
      return
    }

    if (company.default_split_rules.length === 0) {
      Logger.info(
        {
          transactionId,
          companyId
        },
        'leo-madeiras-sap-handler-default-split-rule-missing'
      )
      return
    }

    const integrationCredential = await this.getIntegrationCredential(companyId)

    if (!integrationCredential) {
      Logger.info(
        {
          transactionId,
          companyId
        },
        'leo-madeiras-sap-handler-credential-missing'
      )
      return
    }

    const leo_amount = this.getLeoAmount(transaction)
    const { firstInstallment, taxes } = await this.getFirstInstallmentAndTaxes(
      transaction,
      isRefund
    )

    const transactionPayload = {
      id: transaction._id.toString(),
      created_at: transaction.created_at,
      total_amount: transaction.amount,
      leo_amount,
      installments: transaction.installments,
      provider: transaction.provider,
      provider_transaction_id: transaction.provider_transaction_id,
      brand: 'card' in transaction ? transaction.card.brand : 'mastercard',
      nsu: transaction.nsu,
      paymentMethod: transaction.payment_method,
      firstInstallment,
      taxes
    }

    if (transaction.payment_method === BOLETO) {
      transactionPayload.brand = 'mastercard'
      transactionPayload.paymentMethod = DEBIT_CARD
    } else if ('card' in transaction) {
      transactionPayload.brand = transaction.card.brand
    } else {
      Logger.error(
        { transaction_id: transaction._id },
        `transaction-payment-method-unknown`
      )
      return
    }
    const response = await bridge(
      locale,
      this.integrationName(),
      integrationCredential,
      {
        document_type: company.document_type,
        document_number: company.document_number,
        is_refund: isRefund,
        transaction: transactionPayload
      }
    )

    Logger.info({ response, transactionId, companyId }, 'bridge-ended')

    return this.createIntegrationRequest(response, transactionId, companyId)
  }

  static async getEventSourceName(eventSourceId) {
    const eventSource = await EventSource.findOne(
      {
        _id: eventSourceId
      },
      ['name']
    )
      .lean()
      .exec()

    return eventSource.name
  }

  static async getFirstInstallmentAndTaxes(transaction, isRefund) {
    const payables = await Payable.find({
      transaction_id: transaction._id,
      type: isRefund ? 'refund' : 'credit'
    })
      .lean()
      .exec()

    const taxes = payables.reduce(
      (taxes, { cost }) => taxes + Math.abs(cost),
      0
    )
    const firstInstallment = Math.max.apply(
      null,
      payables.map(({ amount }) => Math.abs(amount))
    )

    return {
      firstInstallment,
      taxes
    }
  }

  static getLeoAmount({ _id, company_id, split_rules = [] }) {
    if (split_rules.length === 0) {
      Logger.error(
        {
          transactionId: _id
        },
        'leo-madeiras-sap-handler-split-rule-missing'
      )
      throw new Error(`Missing split rule for transaction ${_id}`)
    }

    const { amount } = split_rules.find(
      item => ![company_id, this.leoId()].includes(item.company_id)
    )

    return amount
  }

  static getTransaction(transactionId) {
    return Transaction.findOne({ _id: transactionId })
      .lean()
      .exec()
  }

  static getLeoChildrenCompany(companyId) {
    return Company.findOne({
      _id: companyId,
      parent_id: this.leoId()
    })
      .lean()
      .exec()
  }

  static getIntegrationCredential(companyId) {
    return IntegrationCredential.findOne({
      company_id: companyId
    })
      .lean()
      .exec()
  }

  static createIntegrationRequest(response, transactionId, companyId) {
    const integrationRequest = Object.assign({}, response, {
      model: 'transactions',
      model_id: transactionId,
      name: this.integrationName(),
      company_id: companyId,
      request_body: JSON.stringify(response.request_body)
    })

    return IntegrationRequest.create(integrationRequest)
  }
}
