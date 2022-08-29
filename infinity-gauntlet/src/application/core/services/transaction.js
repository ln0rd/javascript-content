import R from 'ramda'
import moment from 'moment'
import { ObjectID } from 'mongodb'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import Payable from 'application/core/models/payable'
import FeeRule from 'application/core/models/fee-rule'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import { validate } from 'framework/core/adapters/validator'
import Connector from 'application/core/providers/connector'
import Transaction from 'application/core/models/transaction'
import Affiliation from 'application/core/models/affiliation'
import { paginate } from 'application/core/helpers/pagination'
import { publishMessage } from 'framework/core/adapters/queue'
import sendWebHook from 'application/webhook/helpers/deliverer'
import ValidationError from 'framework/core/errors/validation-error'
import { isProviderAllowed } from 'application/core/helpers/provider'
import * as TransactionHelper from 'application/core/helpers/transaction'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { transactionResponder } from 'application/core/responders/transaction'
import ProviderNotAllowedError from 'application/core/errors/provider-not-allowed-error'
import TransactionAlreadyExistsError from 'application/core/errors/transaction-already-exists-error'
import RefundTransactionNotPaidError from 'application/core/errors/refund-transaction-not-paid-error'
import TransactionProviderRefundError from 'application/core/errors/transaction-provider-refund-error'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'
import TransactionNotRefundedOnProviderError from 'application/core/errors/transaction-not-refunded-on-provider-error'
import CompanyService from 'application/core/services/company'
import PortfolioService from 'application/core/services/portfolio'
import EventService from 'application/core/services/event'
import {
  getNextBusinessDay,
  normalizeDateWithTimezone
} from 'application/core/helpers/date'
import { transactionSimulationResponder } from 'application/core/responders/transaction-simulation'
import { transactionCalculationResponder } from 'application/core/responders/transaction-calculation'
import { refundPayablesResponder } from 'application/core/responders/webhook/refund-payables'

import InvalidSplitRuleAmountError from 'application/core/errors/invalid-split-rule-amount-error'
import InvalidSplitRulePercentageError from 'application/core/errors/invalid-split-rule-percentage-error'
import InvalidChargeProcessingCostError from 'application/core/errors/invalid-charge-processing-cost-error'
import { createRefundPayable } from 'application/core/domain/refund-payable'
import { BOLETO } from 'application/core/domain/methods'
import { redisClient } from 'framework/core/adapters/redis'
import { RedlockMutex } from 'redis-semaphore'
import { createMatchFilters } from '../helpers/filter'
import { pick } from '../helpers/utils'

const Logger = createLogger({
  name: 'TRANSACTION_SERVICE'
})

const Big = require('big.js')

export default class TransactionService {
  static getTransactions(locale, params, companyId) {
    const operation = 'getTransactions'

    let query = {
      company_id: companyId
    }

    if (params.start_date || params.end_date) {
      query.acquirer_created_at = {}

      if (params.start_date) {
        query.acquirer_created_at.$gte = normalizeDateWithTimezone(
          params.start_date,
          'start'
        )
      }

      if (params.end_date) {
        query.acquirer_created_at.$lt = normalizeDateWithTimezone(
          params.end_date,
          'end'
        )
      }
    }

    if (params.q) {
      query.$text = {
        $search: params.q
      }
    }

    const filterAttributes = [
      'status',
      'payment_method',
      'card.brand',
      'provider',
      'provider_transaction_id'
    ]
    const filterParams = pick(filterAttributes, params)
    const filters = createMatchFilters(filterParams)
    query = Object.assign(query, filters)

    const select = params.fields
      ? params.fields.split(',').join(' ')
      : undefined

    let sort = {
      acquirer_created_at: 'desc'
    }

    if (params.sort) {
      try {
        sort = JSON.parse(params.sort)
      } catch (err) {
        Logger.warn(
          { err, operation, params },
          `${operation}: JSON.parse sort param failed`
        )
      }
    }

    return withAggregation(
      paginate(
        locale,
        Transaction,
        query,
        sort,
        params.page,
        params.count,
        transactionResponder,
        select
      ),
      query,
      params
    )
  }

  static getTransaction(locale, transactionId, companyId) {
    const Operation = 'getTransaction'

    return Promise.resolve()
      .then(get)
      .tap(checkTransaction)
      .then(respond)
      .catch(errorHandler)

    function get() {
      return Transaction.findOne({
        _id: transactionId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkTransaction(transaction) {
      if (!transaction) {
        throw new ModelNotFoundError(
          locale,
          translate('models.transaction', locale)
        )
      }
    }

    function respond(transaction) {
      return transactionResponder(transaction)
    }

    function errorHandler(err) {
      Logger.error(
        {
          err,
          operation: Operation,
          params: { transaction_id: transactionId },
          company_id: companyId
        },
        'getTransaction failed'
      )
      throw err
    }
  }

  static async getChildrenTransactions(locale, params, companyId, userId) {
    const operation = 'getChildrenTransactions'
    let query = {}
    if (params.start_date || params.end_date) {
      query.acquirer_created_at = {}

      if (params.start_date) {
        query.acquirer_created_at.$gte = normalizeDateWithTimezone(
          params.start_date,
          'start'
        )
      }

      if (params.end_date) {
        query.acquirer_created_at.$lt = normalizeDateWithTimezone(
          params.end_date,
          'end'
        )
      }
    }

    const portfolioIds = await PortfolioService.getPortfolioIds(
      companyId,
      userId
    )

    if (portfolioIds) {
      query['portfolio._id'] = { $in: portfolioIds }
    } else {
      query.iso_id = companyId
    }

    if (params.q) {
      query.$text = {
        $search: params.q
      }
    }

    const filterAttributes = [
      'status',
      'payment_method',
      'card.brand',
      'provider',
      'provider_transaction_id',
      'captured_by'
    ]
    const filterParams = pick(filterAttributes, params)
    const filters = createMatchFilters(filterParams)
    query = Object.assign(query, filters)

    if (params.company_id) {
      const companyQuery = {
        _id: ObjectID(params.company_id)
      }

      if (portfolioIds) {
        companyQuery.portfolio = { $in: portfolioIds }
      } else {
        companyQuery.parent_id = companyId
      }

      const company = await Company.findOne(companyQuery)
        .select('_id')
        .lean()
        .exec()

      if (company) {
        query.company_id = params.company_id
      } else {
        throw new CompanyNotBelongToParentError(locale)
      }
    }

    function responder(response) {
      const responsePopulated = response.map(transaction => {
        const currentCompany = transaction._company_partial || {} // will be removed soon (Paulo Reis)
        transaction = Object.assign(transaction, {
          company_name: currentCompany.name,
          company_parent_id: currentCompany.parent_id,
          company_full_name: currentCompany.full_name,
          company_document_number: currentCompany.document_number,
          company_document_type: currentCompany.document_type,
          company_metadata: currentCompany.company_metadata,
          company_created_at: currentCompany.created_at
        })

        if (Array.isArray(transaction.split_rules)) {
          transaction.split_rules.forEach((split, index) => {
            if (currentCompany.company_metadata) {
              transaction.split_rules[index].leo_code =
                currentCompany.company_metadata.sap_code
            }
          })
        }

        return transaction
      })

      return transactionResponder(responsePopulated)
    }

    const select = params.fields
      ? params.fields.split(',').join(' ')
      : undefined

    let sort = {
      acquirer_created_at: 'desc'
    }

    if (params.sort) {
      try {
        sort = JSON.parse(params.sort)
      } catch (err) {
        Logger.warn(
          { err, operation, params },
          `${operation}: JSON.parse sort param failed`
        )
      }
    }

    return withAggregation(
      paginate(
        locale,
        Transaction,
        query,
        sort,
        params.page,
        params.count,
        responder,
        select
      ),
      query,
      params
    )
  }

  static async getChildrenTransaction(locale, transactionId, companyId) {
    const operation = 'getChildrenTransaction'

    let transaction
    try {
      transaction = await Transaction.findOne({
        _id: transactionId,
        iso_id: companyId
      })
        .lean()
        .exec()
    } catch (err) {
      Logger.error(
        {
          err,
          operation: operation,
          params: { transaction_id: transactionId },
          company_id: companyId
        },
        'getChildrenTransaction failed'
      )
      throw err
    }

    if (!transaction) {
      throw new ModelNotFoundError(
        locale,
        translate('models.transaction', locale)
      )
    }

    return transactionResponder(transaction)
  }

  static queueRegister(locale, params, companyId) {
    const Operation = 'queueRegister'

    Logger.info({ operation: Operation, params, companyId }, 'queueRegister')

    return Promise.resolve()
      .tap(checkParams)
      .then(getCompany)
      .tap(checkCompany)
      .tap(applyDefault)
      .then(publishToQueue)
      .then(respond)
      .catch(errorHandler)

    function checkParams() {
      const Errors = validate('register_transaction', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getCompany() {
      return Company.findOne({
        _id: companyId
      })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function applyDefault(company) {
      params.hash_key = company.hash_key

      if (
        !R.has('provider', params) &&
        R.has('default_payment_provider', company)
      ) {
        params.provider = company.default_payment_provider
      } else if (!R.has('provider', params)) {
        params.provider = 'stone'
      }

      if (
        R.has('card_brand', params) &&
        (params.card_brand === 'debito' ||
          params.card_brand === 'credito' ||
          params.card_brand === 'debit' ||
          params.card_brand === 'credit' ||
          params.card_brand === 'unknown')
      ) {
        const bin = params.card_number
          ? params.card_number
          : params.card_first_digits

        if (bin) {
          params.card_brand = TransactionHelper.getCardBrand(bin)
        }
      }

      params.card_brand = TransactionHelper.normatizeCardBrand(
        params.card_brand
      )
    }

    function publishToQueue() {
      return publishMessage(
        'RegisterTransaction',
        Buffer.from(JSON.stringify(params))
      ).catch(errorHandler)

      function errorHandler(err) {
        Logger.error(
          { err, operation: Operation, params, company_id: companyId },
          'publishMessage to RegisterTransaction failed'
        )
        throw err
      }
    }

    function respond() {
      return {
        message: translate('endpoints.queue.message', locale)
      }
    }

    function errorHandler(err) {
      Logger.error(
        { err, operation: Operation, params, company_id: companyId },
        'queueRegister failed'
      )
      throw err
    }
  }

  static queueRegisterChild(locale, params, childId, companyId) {
    const Operation = 'queueRegisterChild'

    Logger.info(
      { operation: Operation, params, childId, companyId },
      'queueRegisterChild'
    )

    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(queueRegister)
      .catch(errorHandler)

    function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function queueRegister(childCompany) {
      return this.queueRegister(locale, params, childCompany._id)
    }

    function errorHandler(err) {
      Logger.error(
        {
          err,
          operation: Operation,
          params,
          child_id: childId,
          company_id: companyId
        },
        'queueRegisterChild failed'
      )
      throw err
    }
  }

  static register(locale, params, companyId) {
    const operation = 'register'
    let operationId = 'undefined'
    try {
      operationId = require('uuid/v4')()
    } catch (err) {
      Logger.error(
        { err, operation, params, companyId },
        'unexpected-error-uuidv4'
      )
    }

    Logger.info(
      { operation, operationId, params, companyId },
      'will-register-trx'
    )

    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)
      .tap(applyDefault)
      .tap(checkParams)
      .then(findTransactionById)
      .tap(checkTransaction)
      .then(getMainAffiliation)
      .tap(checkMainAffiliation)
      .then(getFromProvider)
      .tap(updateFromProvider)
      .then(getSplitRules)
      .then(validateSplitRules)
      .then(getAndValidateAffiliations)
      .then(createTransactionProcessing)
      .then(sendToProvider)
      .spread(updateTransaction)
      .then(createPayables)
      .tap(assignPortfolioToTransaction)
      .then(sendWebhook)
      .then(sendTriggeredEvent)
      .then(respond)
      .catch(errorHandler)

    function getCompany() {
      return Company.findOne({
        _id: companyId
      })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function applyDefault(company) {
      if (
        !R.has('provider', params) &&
        R.has('default_payment_provider', company)
      ) {
        params.provider = company.default_payment_provider
      }

      if (!R.has('capture_method', params)) {
        params.capture_method = 'emv'
      } else {
        params.capture_method = params.capture_method.toLowerCase()
      }

      if (!R.has('payment_method', params)) {
        params.payment_method = 'credit_card'
      }

      if (!R.has('installments', params)) {
        params.installments = 1
      }

      if (R.has('metadata', params) && R.is(Object, params.metadata)) {
        params.metadata = JSON.stringify(params.metadata)
      }

      params.split_origin = 'transaction'
      // This is used to check split_rules, is ignored when registering
      params.company = company
      params.company_id = company._id
      params.iso_id = company.parent_id
      params._company_partial = {
        name: company.name,
        full_name: company.full_name,
        document_number: company.document_number,
        document_type: company.document_type,
        company_metadata: company.company_metadata,
        created_at: company.created_at
      }
      params.mcc = company.mcc

      if (params.provider && params.provider.toLowerCase() === 'redeshop') {
        params.provider = 'rede'
      }

      // 08/10/2019 Fix for https://github.com/hashlab/infinity-gauntlet/issues/589
      if (
        params.capture_method &&
        params.capture_method.toLowerCase() === 'swiped'
      ) {
        params.capture_method = 'magstripe'
      }
    }

    function checkParams() {
      const Errors = validate('register_transaction', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }

      if (!isProviderAllowed(locale, params.provider)) {
        throw new ProviderNotAllowedError(locale, params.provider)
      }
    }

    function findTransactionById() {
      return Transaction.findOne({
        // company_id: companyId,
        provider_transaction_id: params.transaction_id,
        provider: params.provider
      })
        .lean()
        .exec()
    }

    function checkTransaction(transaction) {
      if (transaction) {
        Logger.debug(
          {
            context: {
              transaction_id: params.transaction_id,
              provider: params.provider
            }
          },
          'transaction_already_exists'
        )
        throw new TransactionAlreadyExistsError(locale)
      }
    }

    function getMainAffiliation() {
      return Affiliation.findOne({
        company_id: companyId,
        enabled: true,
        status: 'active',
        provider: params.provider
      })
    }

    function checkMainAffiliation(affiliation) {
      if (!affiliation) {
        throw new ModelNotFoundError(
          locale,
          translate('models.affiliation', locale)
        )
      }
    }

    function getFromProvider(affiliation) {
      const Provider = Connector(locale, params.provider)

      params.main_affiliation = affiliation
      params.affiliation_id = affiliation._id

      return Provider.getTransaction(affiliation, params.transaction_id, params)
    }

    function updateFromProvider(providerTransaction) {
      if (R.has('status', providerTransaction)) {
        params.status = providerTransaction.status
      }

      if (R.has('amount', providerTransaction)) {
        params.amount = providerTransaction.amount
      }

      if (R.has('installments', providerTransaction)) {
        params.installments = providerTransaction.installments
      }

      if (R.has('captured_at', providerTransaction)) {
        params.captured_at = providerTransaction.captured_at
      }

      if (R.has('acquirer_created_at', providerTransaction)) {
        params.acquirer_created_at = providerTransaction.acquirer_created_at
      }

      if (R.has('paid_amount', providerTransaction)) {
        params.paid_amount = providerTransaction.paid_amount
      }

      if (R.has('acquirer_response_code', providerTransaction)) {
        params.acquirer_response_code =
          providerTransaction.acquirer_response_code
      }

      if (R.has('acquirer_name', providerTransaction)) {
        params.acquirer_name = providerTransaction.acquirer_name
      } else {
        params.acquirer_name = params.provider
      }

      if (R.has('nsu', providerTransaction)) {
        params.nsu = providerTransaction.nsu
      }

      if (R.has('tid', providerTransaction)) {
        params.tid = providerTransaction.tid
      }

      if (R.has('hardware_id', providerTransaction)) {
        params.hardware_id = providerTransaction.hardware_id
      }

      if (R.has('status_reason', providerTransaction)) {
        params.status_reason = providerTransaction.status_reason
      }

      if (R.has('provider_transaction_id', providerTransaction)) {
        params.provider_transaction_id =
          providerTransaction.provider_transaction_id
      }

      params.provider_transaction_id = params.transaction_id

      const bin = params.card_number
        ? params.card_number
        : params.card_first_digits

      if (bin && !R.has('card_brand', params)) {
        params.card_brand = TransactionHelper.getCardBrand(bin)
      }

      if (!R.has('card_brand', params)) {
        params.card_brand = 'mastercard'
      }

      params.card_brand = TransactionHelper.normatizeCardBrand(
        params.card_brand
      )

      if (
        R.has('card_brand', params) &&
        params.card_brand === 'hiper' &&
        params.payment_method === 'debit_card'
      ) {
        params.card_brand = 'mastercard'
      }
    }

    function getSplitRules() {
      return Promise.resolve()
        .then(getFeeRule)
        .then(createSplitRule)

      function getFeeRule() {
        return FeeRule.findOne({
          company_id: companyId,
          enabled: true
        })
          .lean()
          .exec()
      }

      function createSplitRule(feeRule) {
        if (R.has('split_rules', params) && params.split_rules.length > 1) {
          const hasPercentagesInSplitRules = params.split_rules.some(
            splitRule => 'percentage' in splitRule && !('amount' in splitRule)
          )
          if (hasPercentagesInSplitRules) {
            params.split_rules = TransactionHelper.applyAmountForPercentageSplitRule(
              params,
              params.split_rules
            )
          }
          params.has_split_rules = true
        } else if (
          R.has('default_split_rules', params.company) &&
          params.company.default_split_rules.length > 0
        ) {
          params.split_rules = TransactionHelper.applyAmountForPercentageSplitRule(
            params,
            params.company.default_split_rules
          )
          params.has_split_rules = true
        }

        if (!feeRule) {
          return
        }

        if (params.status !== 'paid' && params.status !== 'refunded') {
          return
        }

        params.fee_rule = feeRule

        return Promise.resolve()
          .then(buildSplitRule)
          .tap(applyToTransaction)

        function buildSplitRule() {
          return TransactionHelper.createSplitWithFeeRule(
            feeRule,
            params,
            params.company
          )
        }

        function applyToTransaction(splitRules) {
          if (params.has_split_rules) {
            params.split_origin = 'hybrid'
          } else {
            params.split_rules = splitRules
            params.split_origin = 'fee_rule'
          }
        }
      }
    }

    function validateSplitRules() {
      return TransactionHelper.validateSplitRule(
        locale,
        params,
        params.split_rules
      )
    }

    function getAndValidateAffiliations() {
      Logger.info('Validating affiliations for split rules')

      if (!R.has('split_rules', params)) {
        return
      }

      const UpdatedSplitRules = []

      return Promise.resolve()
        .then(getSplitRules)
        .each(getAndValidateAffiliation)
        .then(updateParams)

      function getSplitRules() {
        return params.split_rules
      }

      function getAndValidateAffiliation(splitRule) {
        return Promise.resolve()
          .then(getAffiliation)
          .tap(checkAffiliation)
          .tap(updateSplitRule)

        function getAffiliation() {
          return Affiliation.findOne({
            company_id: splitRule.company_id,
            enabled: true,
            status: 'active',
            provider: params.provider
          })
            .lean()
            .exec()
        }

        function checkAffiliation(affiliation) {
          if (!affiliation) {
            throw new ModelNotFoundError(
              locale,
              translate('models.affiliation', locale)
            )
          }
        }

        function updateSplitRule(affiliation) {
          splitRule.affiliation = affiliation
          splitRule.affiliation_id = affiliation._id

          UpdatedSplitRules.push(splitRule)
        }
      }

      function updateParams() {
        params.split_rules = UpdatedSplitRules
      }
    }

    async function createTransactionProcessing() {
      const Errors = validate('transaction', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }

      Logger.info(
        { operation, operationId, params, companyId },
        'will-create-trx'
      )

      const desiredStatus = params.status

      params.status = 'processing'

      const Card = {
        first_digits: params.card_first_digits,
        last_digits: params.card_last_digits,
        holder_name: params.card_holder_name,
        brand: params.card_brand,
        valid: true
      }

      if (params.payment_method !== 'boleto') {
        params.card = Card
      }

      const transaction = await Transaction.create(params)

      Logger.info({ operation, operationId, params, companyId }, 'trx-created')
      return [desiredStatus, transaction]
    }

    function sendToProvider([desiredStatus, transaction]) {
      const Provider = Connector(locale, transaction.provider)

      transaction.status = desiredStatus
      if (transaction.status === 'paid') {
        transaction.paid_amount = transaction.amount
      }

      return [
        transaction,
        Provider.registerTransaction(
          params.affiliation,
          transaction,
          transaction
        )
      ]
    }

    function updateTransaction(transaction, providerTransaction) {
      transaction.is_split_rule_processed =
        providerTransaction.is_split_rule_processed

      return transaction.save()
    }

    function createPayables(transaction) {
      if (transaction.status !== 'paid') {
        Logger.info(
          {
            transactionId: transaction._id,
            providerTransactionId: transaction.provider_transaction_id,
            status: transaction.status,
            reason: 'status-not-paid'
          },
          'skipping-payables-enqueue'
        )

        return transaction
      }

      // 2020-07-14: Skipping boleto from onlyGateway checks since it has no brand.
      // TODO: Is `onlyGateway` feature necessary?
      if (
        TransactionHelper.isOnlyGateway(transaction) &&
        transaction.payment_method !== BOLETO
      ) {
        Logger.info(
          { transactionId: transaction._id, reason: 'only-gateway' },
          'skipping-payables-enqueue'
        )

        return transaction
      }

      Logger.info(`Creating payables for transaction ${transaction._id}`)

      return Promise.resolve()
        .then(createPayables)
        .then(respond)

      function createPayables() {
        const PayablesPayload = {
          transaction_id: transaction._id,
          company: params.company,
          affiliation: params.main_affiliation,
          origin: params.split_origin,
          rule: params.fee_rule
        }

        return publishMessage(
          'CreatePayables',
          Buffer.from(JSON.stringify(PayablesPayload))
        )
      }

      function respond() {
        return transaction
      }
    }

    function assignPortfolioToTransaction(transaction) {
      const Payload = {
        transaction_id: transaction._id.toString(),
        merchant_id: transaction.company_id,
        created_at: transaction.created_at
      }
      return publishMessage(
        'AssignPortfolioToTransaction',
        Buffer.from(JSON.stringify(Payload))
      )
    }

    function sendWebhook(transaction) {
      return Promise.resolve()
        .then(findParentCompany)
        .then(sendPayload)
        .then(respondWebhook)
        .catch(webhookErrorHandler)

      function findParentCompany() {
        return Promise.resolve()
          .then(findCompany)
          .then(findParent)

        function findCompany() {
          return Company.findOne({
            _id: transaction.company_id
          })
            .lean()
            .exec()
        }

        function findParent(company) {
          if (!R.has('parent_id', company)) {
            return
          }

          return Company.findOne({
            _id: company.parent_id
          })
            .lean()
            .exec()
        }
      }

      function sendPayload(parentCompany) {
        if (!parentCompany) {
          Logger.debug(
            `Parent company for transaction #${transaction._id} not found`
          )

          return
        }

        if (
          !parentCompany.webhook_configs ||
          !parentCompany.webhook_configs.url
        ) {
          return
        }

        Logger.debug(
          `Sending webhook for company #${parentCompany._id} and URL ${
            parentCompany.webhook_configs.url
          }`
        )

        // ['transaction_created', 'transaction_paid'] or ['transaction_created', 'transaction_refused']
        const events = [
          'transaction_created',
          `transaction_${transaction.status}`
        ]

        return Promise.all(
          events.map(event => {
            return sendWebHook(
              parentCompany._id,
              event,
              'transaction',
              transaction._id.toString(),
              'processing',
              transaction.status,
              transactionResponder(transaction)
            )
          })
        )
      }

      function respondWebhook() {
        return transaction
      }

      function webhookErrorHandler(err) {
        Logger.error(
          { operation, operationId, transaction, err },
          'Error sending weebok on transaction created'
        )

        return transaction
      }
    }

    function sendTriggeredEvent(transaction) {
      return TransactionService.triggerEvent(
        locale,
        transaction,
        'transaction-registered'
      )
    }

    function respond(transaction) {
      Logger.info(
        { operation, operationId, params, companyId },
        'register-success'
      )
      return transactionResponder(transaction)
    }

    function errorHandler(err) {
      // This is a stop condition (its expected and frequent)
      // not an error
      // Currently this is overwhelming or daily log quota
      // but if it was not that frequent we could also log that
      if (err instanceof TransactionAlreadyExistsError) {
        return
      }
      if (
        err instanceof ValidationError ||
        err instanceof InvalidSplitRuleAmountError ||
        err instanceof InvalidSplitRulePercentageError ||
        err instanceof InvalidChargeProcessingCostError
      ) {
        err.__DO_NOT_RETRY__ = true
      }
      Logger.error(
        { err, operation, operationId, params, companyId },
        'register-failed'
      )
      throw err
    }
  }

  static registerChild(locale, params, childId, companyId) {
    const Operation = 'registerChild'

    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(register)
      .catch(errorHandler)

    function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function register(childCompany) {
      return this.register(locale, params, childCompany._id)
    }

    function errorHandler(err) {
      Logger.error(
        {
          err,
          operation: Operation,
          params,
          child_id: childId,
          company_id: companyId
        },
        'registerChild failed'
      )
      throw err
    }
  }

  static async triggerEvent(locale, transaction, eventSourceName) {
    const companyId = transaction.company_id
    const args = { transactionId: transaction._id.toString(), locale: locale }

    try {
      Logger.debug(
        {
          companyId: companyId,
          eventSourceName: eventSourceName,
          args: args
        },
        'send-trigger-event-started'
      )
      await EventService.triggerEvent(companyId, eventSourceName, args)
      Logger.debug(
        {
          companyId: companyId,
          eventSourceName: eventSourceName,
          args: args
        },
        'send-trigger-event-finished'
      )
    } catch (err) {
      Logger.error(
        {
          companyId: companyId,
          eventSourceName: eventSourceName,
          args: args,
          err: err
        },
        'send-trigger-event-error'
      )
    }

    return transaction
  }

  static registerRefund(locale, transactionId, params, companyId) {
    const Operation = 'registerRefund'
    const updateAndCreatePayables = createUpdateAndCreatePayables(
      locale,
      Operation
    )
    const lockKey = `ig:refund:${transactionId}`
    const mutex = new RedlockMutex([redisClient], lockKey)

    return Promise.resolve()
      .then(resourceLock)
      .then(getTransaction)
      .tap(checkTransaction)
      .then(getMainAffiliation)
      .spread(getFromProvider)
      .spread(updateTransaction)
      .then(updateAndCreatePayables)
      .then(sendRefundedTransactionWebHook)
      .then(sendTriggeredEvent)
      .then(respond)
      .catch(errorHandler)
      .finally(resourceUnlock)

    async function resourceLock() {
      await mutex.acquire()
    }

    function getTransaction() {
      return Transaction.findOne({
        _id: transactionId,
        company_id: companyId
      })
    }

    function checkTransaction(transaction) {
      if (!transaction) {
        throw new ModelNotFoundError(
          locale,
          translate('models.transaction', locale)
        )
      }

      if (transaction.status !== 'paid') {
        throw new RefundTransactionNotPaidError(locale, transaction)
      }
    }

    function getMainAffiliation(transaction) {
      return Promise.resolve()
        .then(getAffiliation)
        .tap(checkAffiliation)
        .then(respond)

      function getAffiliation() {
        return Affiliation.findOne({
          company_id: transaction.company_id,
          _id: transaction.affiliation_id,
          provider: transaction.provider
        })
          .lean()
          .exec()
      }

      function checkAffiliation(affiliation) {
        if (!affiliation) {
          throw new ModelNotFoundError(
            locale,
            translate('models.affiliation', locale)
          )
        }
      }

      function respond(affiliation) {
        return [transaction, affiliation]
      }
    }

    function getFromProvider(transaction, affiliation) {
      const Provider = Connector(locale, transaction.provider)

      return [
        transaction,
        Provider.getTransaction(
          affiliation,
          transaction.provider_transaction_id,
          transaction
        )
      ]
    }

    function updateTransaction(transaction, providerTransaction) {
      /*
      Estanislau (2020.06.18)

      Tech-debt: workaround while we don't have the integration with Transaction Service
      */
      if ('captured_by' in transaction) {
        providerTransaction.status = 'refunded'
        providerTransaction.refunded_amount = params.amount
        providerTransaction.refunded_at = params.acquirer_created_at
      }
      /* -- */

      if (providerTransaction.status !== 'refunded') {
        throw new TransactionNotRefundedOnProviderError(locale)
      }

      if (R.has('refunded_amount', providerTransaction)) {
        transaction.refunded_amount = providerTransaction.refunded_amount
      }

      if (R.has('refunded_at', providerTransaction)) {
        transaction.refunded_at = providerTransaction.refunded_at
      }

      if (R.has('hardware_id', providerTransaction)) {
        transaction.hardware_id = providerTransaction.hardware_id
      }

      transaction.status = providerTransaction.status
      transaction.is_split_rule_processed = true

      return transaction.save()
    }

    function sendRefundedTransactionWebHook(transaction) {
      return Promise.resolve()
        .then(findParentCompany)
        .then(sendPayload)
        .then(respondWebhook)
        .catch(webhookErrorHandler)

      function findParentCompany() {
        return Promise.resolve()
          .then(findCompany)
          .then(findParent)

        function findCompany() {
          return Company.findOne({
            _id: transaction.company_id
          })
            .lean()
            .exec()
        }

        function findParent(company) {
          if (!R.has('parent_id', company)) {
            return
          }

          return Company.findOne({
            _id: company.parent_id
          })
            .lean()
            .exec()
        }
      }

      async function sendPayload(parentCompany) {
        if (!parentCompany) {
          Logger.debug(
            `Parent company for transaction #${transaction._id} not found`
          )

          return
        }

        if (
          !parentCompany.webhook_configs ||
          !parentCompany.webhook_configs.url
        ) {
          return
        }

        Logger.debug(
          `Sending webhook for company #${parentCompany._id} and URL ${
            parentCompany.webhook_configs.url
          }`
        )

        await sendWebHook(
          parentCompany._id,
          'transaction_refunded',
          'transaction',
          transaction._id.toString(),
          'paid',
          'refunded',
          transactionResponder(transaction)
        )
      }

      function respondWebhook() {
        return transaction
      }

      function webhookErrorHandler(err) {
        Logger.error(
          { Operation, transaction, err },
          'Error sending weebok on transaction refunded'
        )

        return transaction
      }
    }

    function sendTriggeredEvent(transaction) {
      return TransactionService.triggerEvent(
        locale,
        transaction,
        'transaction-canceled'
      )
    }

    function respond(transaction) {
      return transactionResponder(transaction)
    }

    function errorHandler(err) {
      Logger.error(
        { err, operation: Operation, params, company_id: companyId },
        'registerRefund failed'
      )
      throw err
    }

    async function resourceUnlock() {
      await mutex.release()
    }
  }

  static refund(locale, transactionId, params, companyId) {
    const Operation = 'refund'
    const updateAndCreatePayables = createUpdateAndCreatePayables(
      locale,
      Operation
    )
    const lockKey = `ig:refund:${transactionId}`
    const mutex = new RedlockMutex([redisClient], lockKey)

    return Promise.resolve()
      .then(resourceLock)
      .then(getTransaction)
      .tap(checkTransaction)
      .then(getMainAffiliation)
      .spread(processRefund)
      .spread(getFromProvider)
      .spread(updateTransaction)
      .then(updateAndCreatePayables)
      .then(sendRefundedTransactionWebHook)
      .then(sendTriggeredEvent)
      .then(respond)
      .catch(errorHandler)
      .finally(resourceUnlock)

    async function resourceLock() {
      await mutex.acquire()
    }

    function getTransaction() {
      return Transaction.findOne({
        _id: transactionId,
        company_id: companyId
      })
    }

    function checkTransaction(transaction) {
      if (!transaction) {
        throw new ModelNotFoundError(
          locale,
          translate('models.transaction', locale)
        )
      }

      if (transaction.status !== 'paid') {
        throw new RefundTransactionNotPaidError(locale, transaction)
      }
    }

    function getMainAffiliation(transaction) {
      return Promise.resolve()
        .then(getAffiliation)
        .tap(checkAffiliation)
        .then(respond)

      function getAffiliation() {
        return Affiliation.findOne({
          company_id: transaction.company_id,
          _id: transaction.affiliation_id,
          provider: transaction.provider
        })
          .lean()
          .exec()
      }

      function checkAffiliation(affiliation) {
        if (!affiliation) {
          throw new ModelNotFoundError(
            locale,
            translate('models.affiliation', locale)
          )
        }
      }

      function respond(affiliation) {
        return [transaction, affiliation]
      }
    }

    function processRefund(transaction, affiliation) {
      const Provider = Connector(locale, transaction.provider)

      return Promise.resolve()
        .then(sendToProvider)
        .tap(checkResult)
        .then(respond)

      function sendToProvider() {
        return Provider.refundTransaction(
          transaction.amount,
          transaction,
          affiliation
        )
      }

      function checkResult(refundResult) {
        if (!refundResult.success) {
          throw new TransactionProviderRefundError(locale)
        }
      }

      function respond() {
        return [transaction, affiliation]
      }
    }

    function getFromProvider(transaction, affiliation) {
      const Provider = Connector(locale, transaction.provider)

      return [
        transaction,
        Provider.getTransaction(
          affiliation,
          transaction.provider_transaction_id,
          transaction
        )
      ]
    }

    function updateTransaction(transaction, providerTransaction) {
      /*
      Allisson (2021.02.02)

      Tech-debt: workaround while we don't have the integration with Transaction Service
      */
      if ('captured_by' in transaction) {
        providerTransaction.status = 'refunded'
        providerTransaction.refunded_amount = transaction.amount
        providerTransaction.refunded_at = moment().toISOString()
      }
      /* -- */

      if (providerTransaction.status !== 'refunded') {
        throw new TransactionNotRefundedOnProviderError(locale)
      }

      if (R.has('refunded_amount', providerTransaction)) {
        transaction.refunded_amount = providerTransaction.refunded_amount
      }

      if (R.has('refunded_at', providerTransaction)) {
        transaction.refunded_at = providerTransaction.refunded_at
      }

      transaction.status = providerTransaction.status
      transaction.is_split_rule_processed = true

      return transaction.save()
    }

    function sendRefundedTransactionWebHook(transaction) {
      return Promise.resolve()
        .then(findParentCompany)
        .then(sendPayload)
        .then(respondWebhook)
        .catch(webhookErrorHandler)

      function findParentCompany() {
        return Promise.resolve()
          .then(findCompany)
          .then(findParent)

        function findCompany() {
          return Company.findOne({
            _id: transaction.company_id
          })
            .lean()
            .exec()
        }

        function findParent(company) {
          if (!R.has('parent_id', company)) {
            return
          }

          return Company.findOne({
            _id: company.parent_id
          })
            .lean()
            .exec()
        }
      }

      async function sendPayload(parentCompany) {
        if (!parentCompany) {
          Logger.debug(
            `Parent company for transaction #${transaction._id} not found`
          )

          return
        }

        if (
          !parentCompany.webhook_configs ||
          !parentCompany.webhook_configs.url
        ) {
          return
        }

        Logger.debug(
          `Sending webhook for company #${parentCompany._id} and URL ${
            parentCompany.webhook_configs.url
          }`
        )

        await sendWebHook(
          parentCompany._id,
          'transaction_refunded',
          'transaction',
          transaction._id.toString(),
          'paid',
          'refunded',
          transactionResponder(transaction)
        )
      }

      function respondWebhook() {
        return transaction
      }

      function webhookErrorHandler(err) {
        Logger.error(
          { Operation, transaction, err },
          'Error sending weebok on transaction refunded'
        )

        return transaction
      }
    }

    async function sendTriggeredEvent(transaction) {
      return TransactionService.triggerEvent(
        locale,
        transaction,
        'transaction-canceled'
      )
    }

    function respond(transaction) {
      return transactionResponder(transaction)
    }

    function errorHandler(err) {
      Logger.error(
        { err, operation: Operation, params, company_id: companyId },
        'refund failed'
      )
      throw err
    }

    async function resourceUnlock() {
      await mutex.release()
    }
  }

  static refundChild(locale, transactionId, params, childId, companyId) {
    const Operation = 'refundChild'

    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(register)
      .catch(errorHandler)

    function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function register(childCompany) {
      return this.refund(locale, transactionId, params, childCompany._id)
    }

    function errorHandler(err) {
      Logger.error(
        {
          err,
          operation: Operation,
          params,
          child_id: childId,
          company_id: companyId
        },
        'refundChild failed'
      )
      throw err
    }
  }

  static simulateInstallments(locale, params, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(getCompany)
      .then(checkFeeRule)
      .then(getCosts)
      .spread(checkBrand)
      .spread(simulateAnticipation)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_transaction_simulation', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getCompany() {
      return CompanyService.getCompany(locale, companyId)
    }

    function checkFeeRule(company) {
      if (!company.fee_rule) {
        company = addDefaultFeeRule(company)
      }

      return company
    }

    function addDefaultFeeRule(company) {
      company.fee_rule = {
        anticipation_fee: 3,
        anticipation_type: 'per_month',
        brands: [
          {
            fee: {
              debit: 2.29,
              credit_1: 3.09,
              credit_2: 3.59,
              credit_7: 3.89
            },
            brand: 'default'
          }
        ]
      }

      return company
    }

    function getCosts(company) {
      let costs

      if (R.has('card_brand', params)) {
        costs = R.filter(
          brand => brand.brand === params.card_brand,
          company.fee_rule.brands
        )
      } else {
        costs = company.fee_rule.brands
      }

      return [company, costs]
    }

    function checkBrand(company, costs) {
      if (costs.length === 0) {
        if (
          R.findIndex(R.propEq('brand', 'default'), company.fee_rule.brands) ===
          -1
        ) {
          company = addDefaultFeeRule(company)
        }

        costs = company.fee_rule.brands
      }

      return [company, costs]
    }

    function simulateAnticipation(company, costs) {
      const installmentsCount = generateInstallments(
        params.max_installments || 18
      )
      const durations = []
      let dailyAnticipationFee = null
      let anticipationFee = new Big(0) //default value
      const one = new Big(1)
      const amount = new Big(params.amount)
      const anticipationDaysInterval =
        params.anticipation_days_interval || company.anticipation_days_interval

      if (params.anticipation_fee) {
        anticipationFee = new Big(params.anticipation_fee)
      } else if (company.fee_rule && company.fee_rule.anticipation_fee) {
        anticipationFee = new Big(company.fee_rule.anticipation_fee)
      }

      dailyAnticipationFee = new Big(anticipationFee.div(30 * 100))

      const result = {
        anticipation_fee: anticipationFee,
        requested_amount: params.amount,
        company_id: company.id,
        anticipation_days_interval: anticipationDaysInterval,
        simulations: {}
      }

      return Promise.resolve(costs)
        .tap(calculateDurations)
        .each(prepareSimulation)
        .then(finishSimulation)

      function generateInstallments(installmentsCount) {
        return R.map(i => i + 1, [...Array(installmentsCount).keys()])
      }

      function calculateDurations() {
        return Promise.resolve(installmentsCount).each(getDuration)

        function getDuration(installments) {
          let today = moment()
          const anticipationDaysInterval =
            params.anticipation_days_interval ||
            company.anticipation_days_interval
          const liquidationDate = today.add(anticipationDaysInterval, 'days')

          today = moment()
          const settlementDate = today.add(installments * 30, 'days')

          return Promise.resolve()
            .then(getInitDate)
            .then(getEndDate)
            .spread(calculateDuration)

          function getInitDate() {
            return getNextBusinessDay(liquidationDate)
          }

          function getEndDate(startDate) {
            return [startDate, getNextBusinessDay(settlementDate)]
          }

          function calculateDuration(startDate, endDate) {
            let duration = endDate.diff(startDate, 'days')

            durations.push(duration)
          }
        }
      }

      function prepareSimulation(cost) {
        const feeKeys = R.sort((feeKey1, feeKey2) => {
          feeKey1 = feeKey1.split('_')[1]
          feeKey2 = feeKey2.split('_')[1]
          return feeKey2 - feeKey1
        }, Object.keys(cost.fee))

        if (!R.has(cost.card_brand, result)) {
          result.simulations[cost.brand] = {
            card_brand: cost.brand,
            credit: []
          }
        }

        return Promise.resolve(installmentsCount).each(simulateAnticipation)

        function simulateAnticipation(installments) {
          const installmentsArray = generateInstallments(installments)
          let currentInstallment = null
          const mdr = getMDR()

          let anticipationDurationSum = new Big(0)

          return Promise.resolve(installmentsArray)
            .each(sumInstallments)
            .then(finishSum)
            .tap(storeData)

          function sumInstallments(installment) {
            currentInstallment = installment

            return Promise.resolve().then(calculateSum)

            function calculateSum() {
              anticipationDurationSum = new Big(
                one
                  .minus(dailyAnticipationFee.times(durations[installment - 1]))
                  .add(anticipationDurationSum)
              )
            }
          }

          function getMDR() {
            let fee
            let found = false

            R.forEach(feeData => {
              if (installments >= feeData.split('_')[1] && !found) {
                fee = new Big(cost.fee[feeData]).div(100)
                found = true
              }
            }, feeKeys)

            return fee
          }

          function finishSum() {
            anticipationDurationSum = new Big(
              amount
                .times(installments)
                .div(one.minus(mdr).times(anticipationDurationSum))
            )
          }

          function storeData() {
            let mdr_value = anticipationDurationSum.times(mdr).round(0, 3)
            result.simulations[cost.brand].credit.push({
              installment: currentInstallment,
              total_amount: anticipationDurationSum.round(0, 3),
              installments_amount: anticipationDurationSum
                .div(installments)
                .round(0, 3),
              mdr: mdr.times(100),
              mdr_value: mdr_value,
              fee: anticipationDurationSum
                .minus(params.amount)
                .minus(mdr_value)
                .round(0, 3)
            })
          }
        }
      }

      function finishSimulation() {
        return transactionSimulationResponder(result)
      }
    }

    function respond(response) {
      return response
    }
  }

  static async calculateInstallments(locale, params, companyId) {
    const simulationData = []
    const installments = params.installments || 12

    const anticipationSimulation = (installment, type, fee) => {
      if (type === 'per_month') {
        // Sum of N Terms of an Arithmetic Progression
        return fee * (1 + installment) / 2
      }

      if (type === 'per_additional_installment' && installment === 1) {
        return 0
      }

      return fee * installment
    }

    const fixRounding = (
      params,
      simulation,
      splitAmount,
      mdrAmount,
      anticipationFee
    ) => {
      const netAmount =
        simulation -
        (params.split_as_credit ? 0 : splitAmount) -
        mdrAmount -
        anticipationFee

      return simulation + params.amount - netAmount
    }

    const errors = validate('request_transaction_calculation', params)
    if (errors) {
      throw new ValidationError(locale, errors)
    }

    const company = await Company.findById(companyId)

    if (!company) {
      throw new ModelNotFoundError(locale, translate('models.company', locale))
    }

    const feeRule = await FeeRule.findOne({ company_id: companyId })

    if (!feeRule) {
      throw new ModelNotFoundError(locale, translate('models.fee_rule', locale))
    }

    let brandData

    feeRule.brands.some(brand => {
      if (brand.brand === params.brand) {
        brandData = brand
        return true
      }
    })

    if (!brandData) {
      throw new ModelNotFoundError(locale, translate('models.brand', locale))
    }

    let splitSum = 0

    if (company.default_split_rules) {
      company.default_split_rules.forEach(
        splitRule => (splitSum += splitRule.percentage / 100)
      )
    }

    const split = () => (splitSum >= 1 ? 0 : splitSum)

    let fee = brandData.fee['debit'] / 100
    let simulation = Math.round(
      params.amount /
        ((1 - split()) * (1 - fee) + (params.split_as_credit ? splitSum : 0))
    )

    let splitAmount = Math.round(simulation * splitSum)
    let mdrAmount = Math.round(simulation * fee * (1 - split()))
    let anticipationFee = 0

    simulation = fixRounding(
      params,
      simulation,
      splitAmount,
      mdrAmount,
      anticipationFee
    )

    simulationData.push({
      totalAmount: simulation,
      type: 'debit',
      installment: 1,
      installmentAmount: simulation,
      splitAmount: splitAmount,
      mdrFee: mdrAmount,
      anticipationFee: anticipationFee,
      netAmount: simulation - splitAmount - mdrAmount - anticipationFee
    })

    for (let i = 1; i <= installments; i++) {
      if (i === 1) {
        fee = brandData.fee['credit_1'] / 100
      } else if (i < 7) {
        fee = brandData.fee['credit_2'] / 100
      } else {
        fee = brandData.fee['credit_7'] / 100
      }

      const anticipation =
        splitSum === 1
          ? 0
          : anticipationSimulation(
              i,
              feeRule.anticipation_type,
              feeRule.anticipation_fee / 100
            )

      simulation = Math.round(
        params.amount /
          ((1 - split()) * (1 - fee) * (1 - anticipation) +
            (params.split_as_credit ? splitSum : 0))
      )

      splitAmount = Math.round(simulation * splitSum)
      mdrAmount = Math.round(simulation * fee * (1 - split()))
      anticipationFee = Math.round(
        simulation * anticipation * (1 - split()) * (1 - fee)
      )

      simulation = fixRounding(
        params,
        simulation,
        splitAmount,
        mdrAmount,
        anticipationFee
      )

      simulationData.push({
        totalAmount: simulation,
        type: 'credit',
        installment: i,
        installmentAmount: Math.round(simulation / i),
        splitAmount: splitAmount,
        mdrFee: mdrAmount,
        anticipationFee: anticipationFee,
        netAmount: simulation - splitAmount - mdrAmount - anticipationFee
      })
    }

    return transactionCalculationResponder(simulationData)
  }

  static calculateChildInstallments(locale, params, childId, companyId) {
    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(calculate)

    function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function calculate(childCompany) {
      return this.calculateInstallments(locale, params, childCompany._id)
    }
  }

  static simulateChildInstallments(locale, params, childId, companyId) {
    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(calculate)

    function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function calculate(childCompany) {
      return this.simulateInstallments(locale, params, childCompany._id)
    }
  }

  /*
    2019-09-09 Tech-debt here because we need to show installment information.
    The query was limited to returning only the parcel number and status for
    security reasons
  */
  static async getInstallmentInformation(locale, transactionId, companyId) {
    const payables = await Payable.find(
      {
        company_id: companyId,
        transaction_id: transactionId
      },
      'installment status'
    )
      .lean()
      .exec()

    return payables.map(({ installment, status }) => ({
      installment,
      status
    }))
  }

  static aggregations(query) {
    const $match = Object.assign({}, query)
    delete $match.$text

    const aggregation = [
      { $match },
      {
        $project: {
          amount: 1,
          debit_amount: {
            $cond: [
              {
                $eq: ['$payment_method', 'debit_card']
              },
              '$amount',
              0
            ]
          },
          cash_credit_amount: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$payment_method', 'credit_card']
                  },
                  {
                    $lte: ['$installments', 1]
                  }
                ]
              },
              '$amount',
              0
            ]
          },
          installment_credit_amount: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$payment_method', 'credit_card']
                  },
                  {
                    $gt: ['$installments', 1]
                  }
                ]
              },
              '$amount',
              0
            ]
          },
          split_amount: {
            $reduce: {
              input: {
                $map: {
                  input: {
                    $filter: {
                      input: '$split_rules',
                      as: 'split',
                      cond: {
                        $ne: ['$$split.company_id', '$company_id']
                      }
                    }
                  },
                  as: 'split',
                  in: {
                    amount: '$$split.amount'
                  }
                }
              },
              initialValue: 0,
              in: {
                $sum: {
                  $add: ['$$value', '$$this.amount']
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: 'tpv',
          total: {
            $sum: '$amount'
          },
          debit: {
            $sum: '$debit_amount'
          },
          cashCredit: {
            $sum: '$cash_credit_amount'
          },
          installmentCredit: {
            $sum: '$installment_credit_amount'
          },
          splitTotal: {
            $sum: '$split_amount'
          }
        }
      }
    ]

    return Transaction.aggregate(aggregation)
  }
}

async function withAggregation(paginateFn, query, params) {
  if (params.with_aggregations) {
    const [result, [aggregation]] = await Promise.all([
      paginateFn,
      TransactionService.aggregations(query)
    ])

    return Object.assign({}, result, {
      results: {
        data: result.results,
        aggregation
      }
    })
  }

  return paginateFn
}

function createUpdateAndCreatePayables(locale, operation) {
  const processProviderRefund = async (transaction, payable) => {
    if (payable.status === 'paid') {
      return
    }

    const affiliation = await Affiliation.findOne({
      _id: payable.origin_affiliation_id
    })
      .lean()
      .exec()

    if (!affiliation) {
      Logger.error(
        { operation, payable_id: payable._id },
        'affiliation-process-payable-refund-not-found'
      )

      return
    }

    const Provider = Connector(locale, transaction.provider)

    return Provider.processPayableRefund(payable, affiliation)
  }
  const updateAndCreatePayable = async (transaction, payable) => {
    if (payable.status !== 'paid') {
      payable.payment_date = moment().format('YYYY-MM-DD')
    }

    // Payable status update only during task routine
    // payable.status = 'paid'
    payable.anticipatable = false

    const payableToCreate = await createRefundPayable(payable)

    const createdPayable = await payableToCreate.save()

    await processProviderRefund(transaction, payable)

    await payable.save()

    return createdPayable
  }

  return async transaction => {
    const payables = await Payable.find({
      transaction_id: transaction._id,
      type: 'credit'
    })

    const refundPayablesCreated = await Promise.map(payables, payable =>
      updateAndCreatePayable(transaction, payable).catch(err =>
        Logger.error(
          { err, operation, payable },
          'error-occurred-on-creating-refund-payable'
        )
      )
    )

    // Re-fetching the original Payables to make sure we have the most up to date version
    //
    // Note: maybe we could use the `payables` array defined previously,
    // but since this is an expedite and this query is not expensive,
    // I'll try to avoid variable mutation problems. - Luke
    const updatedOriginalPayables = await Payable.find({
      transaction_id: transaction._id,
      type: 'credit'
    })

    try {
      await sendRefundPayablesWebhook(
        refundPayablesCreated,
        updatedOriginalPayables,
        transaction
      )
    } catch (err) {
      Logger.warn(
        { transaction_id: transaction._id, err },
        'refund-payables-webhook-failed'
      )
    }

    return transaction
  }
}

async function sendRefundPayablesWebhook(
  payables,
  originalPayables,
  transaction
) {
  return sendWebHook(
    transaction.iso_id,
    'transaction_refund_payables_created',
    'transaction',
    transaction._id.toString(),
    null,
    'waiting_funds',
    refundPayablesResponder(payables, originalPayables, transaction)
  )
}
