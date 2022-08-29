import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import config from 'application/core/config'
import Company from 'application/core/models/company'
import WalletTransferHistory, {
  operations,
  errorReasons,
  FAILED,
  SUCCESSFUL,
  SCHEDULED,
  CANCELED
} from 'application/core/models/wallet-transfer-history'
import Payout, {
  destinationTypes as payoutDestinationTypes,
  sourceTypes as payoutSourceTypes,
  methods as payoutMethods,
  reasons as payoutReasons,
  status as payoutStatus
} from 'application/core/models/payout'
import Payin, {
  destinationTypes as payinDestinationTypes,
  methods as payinMethods,
  reasons as payinReasons,
  status as payinStatus,
  sourceTypes as payinSourceTypes
} from 'application/core/models/payin'
import { translate } from 'framework/core/adapters/i18n'
import { createWalletClient } from '@hashlab/wallet-client'
import Affiliation from 'application/core/models/affiliation'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { walletBalanceResponder } from 'application/core/responders/wallet-balance'
import { walletFreezeAmountResponder } from 'application/core/responders/wallet-freeze-amount'
import { walletUnfreezeAmountIdResponder } from 'application/core/responders/wallet-unfreeze-amount-id'
import { walletTransferResponder } from 'application/core/responders/wallet-transfer'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'
import {
  WalletTransferError,
  WalletTransferNotAuthorizedError,
  WalletTransferNotEnoughFundsError,
  WalletScheduledTransferInvalidDateError
} from 'application/core/errors/wallet-transfer-errors'
import { validate } from 'framework/core/adapters/validator'
import ValidationError from 'framework/core/errors/validation-error'
import createLogger from 'framework/core/adapters/logger'
import { createId } from 'application/core/domain/breadcrumbs'
import cuid from 'cuid'
import { errorSerializer } from 'application/core/helpers/error'
import WalletRevertTransfer from 'application/queue/tasks/triggered/wallet-revert-transfer'
import AccountService from 'application/core/services/account'

export default class WalletService {
  static getBalance(locale, companyId) {
    return Promise.resolve()
      .then(getCompanyId)
      .then(getWalletBalance)
      .then(respond)

    function getCompanyId() {
      return companyId
    }

    async function getWalletBalance(companyId) {
      const account = await AccountService.getAccountByCompanyId(companyId)

      AccountService.checkAccount(locale, account)

      return Promise.resolve()
        .then(instantiateWallet)
        .then(getTotalAmount)
        .spread(getFrozenAmount)
        .spread(getAvailableAmount)
        .spread(buildResponse)

      function instantiateWallet() {
        return createWalletClient(config.services.wallet_endpoint)
      }

      function getTotalAmount(walletClient) {
        return [
          walletClient,
          walletClient.getWalletHeldAmount(account.balance_id)
        ]
      }

      function getFrozenAmount(walletClient, heldAmount) {
        return [
          walletClient,
          heldAmount,
          walletClient.getWalletTotalFrozenAmount(account.balance_id)
        ]
      }

      function getAvailableAmount(walletClient, heldAmount, frozenAmount) {
        return [
          heldAmount,
          frozenAmount,
          walletClient.getWalletMaximumAmountThatCanBeTaken(account.balance_id)
        ]
      }

      function buildResponse(heldAmount, frozenAmount, availableAmount) {
        return {
          wallet_id: account.balance_id,
          company_id: companyId,
          total_amount: heldAmount.amount,
          frozen_amount: frozenAmount.amount,
          available_amount: availableAmount.amount
        }
      }
    }

    function respond(walletBalance) {
      return walletBalanceResponder(walletBalance)
    }
  }

  static async freezeAmountWallet(locale, companyId, amount) {
    const account = await AccountService.getAccountByCompanyId(companyId)

    AccountService.checkAccount(locale, account)

    const result = await freezeAmountWallet(account)

    return respond(result)

    async function freezeAmountWallet(account) {
      const walletClient = instantiateWallet()

      const result = await freezeAmount(walletClient)

      return buildResponse(result)

      function instantiateWallet() {
        return createWalletClient(config.services.wallet_endpoint)
      }

      async function freezeAmount(walletClient) {
        return walletClient.freezeWalletAmount(account.balance_id, {
          amount: amount,
          reason: 'freeze_amount_request'
        })
      }

      function buildResponse(freezeWalletAmountResponse) {
        return {
          wallet_id: account.balance_id,
          frozen_amount_id: freezeWalletAmountResponse.frozenAmountId,
          frozen_amount: amount
        }
      }
    }

    function respond(walletBalance) {
      return walletFreezeAmountResponder(walletBalance)
    }
  }

  static async unfreezeAmountWallet(
    locale,
    companyId,
    frozenAmountId,
    takeAmountAutomatically,
    requestId
  ) {
    const account = await AccountService.getAccountByCompanyId(companyId)

    AccountService.checkAccount(locale, account)

    const result = await unfreezeAmountWallet(account)

    return respond(result)

    async function unfreezeAmountWallet(account) {
      const walletClient = instantiateWallet()

      await unfreezeAmount(walletClient)

      return buildResponse()

      function instantiateWallet() {
        return createWalletClient(config.services.wallet_endpoint)
      }

      async function unfreezeAmount(walletClient) {
        return walletClient.unfreezeWalletAmount(account.balance_id, {
          frozenAmountId: frozenAmountId,
          takeAmountAtomically: takeAmountAutomatically,
          requestId: requestId
        })
      }

      function buildResponse() {
        return {
          wallet_id: account.balance_id,
          frozen_amount_id: frozenAmountId
        }
      }
    }

    function respond(walletBalance) {
      return walletUnfreezeAmountIdResponder(walletBalance)
    }
  }

  static getChildrenBalance(locale, childId, companyId) {
    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(getBalance)

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
        throw new CompanyNotBelongToParentError(locale)
      }
    }

    function getBalance(childCompany) {
      return this.getBalance(locale, childCompany._id)
    }
  }

  static async freezeChildrenAmount(locale, childId, companyId, amount) {
    const company = await getChildCompany()

    checkChildCompany(company)

    return await this.freezeAmountWallet(locale, company._id, amount)

    async function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new CompanyNotBelongToParentError(locale)
      }
    }
  }

  static async unfreezeChildrenAmount(
    locale,
    childId,
    companyId,
    frozenAmountId,
    takeAmountAutomatically,
    requestId
  ) {
    const company = await getChildCompany()

    checkChildCompany(company)

    return await this.unfreezeAmountWallet(
      locale,
      company._id,
      frozenAmountId,
      takeAmountAutomatically,
      requestId
    )

    async function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new CompanyNotBelongToParentError(locale)
      }
    }
  }

  static transferAmount(locale, params, requesterCompanyId, schedule) {
    const Logger = createLogger({ name: 'WALLET_TRANSFER' })
    let walletTransferHistory = {
      success_at: [],
      requester_company: requesterCompanyId,
      error_at: [],
      captured_errors: [],
      error_reasons: []
    }
    const companiesData = {
      ids: {},
      models: {}
    }
    const today = moment()

    return Promise.bind(this)
      .tap(validateParams)
      .tap(validateScheduleDate)
      .tap(getCompanies)
      .tap(authorize)
      .then(transferOrSchedule)
      .then(respond)

    function validateParams() {
      if (schedule) {
        params.scheduled = true
      }

      const Errors = validate('wallet_transfer', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }

      if (!R.has('request_id', params)) {
        params.request_id = createId({
          uid: cuid(),
          source: `wallet-${schedule ? 'scheduled-' : ''}transfer`
        })
      }

      walletTransferHistory.request_id = params.request_id
    }

    function validateScheduleDate() {
      if (schedule && !today.isBefore(params.schedule_to, 'day')) {
        throw new WalletScheduledTransferInvalidDateError(locale)
      }
    }

    function getCompanies() {
      return Promise.resolve()
        .then(getAccounts)
        .then(checkAccounts)
        .then(getAffiliations)
        .then(checkAccountsAndAffiliation)
        .then(getAllCompanies)
        .tap(checkCompanies)

      async function getAccounts() {
        return {
          source: {
            account: await AccountService.getAccountByWalletId(
              params.source_wallet_id
            ),
            affiliation: null
          },
          destination: {
            account: await AccountService.getAccountByWalletId(
              params.destination_wallet_id
            ),
            affiliation: null
          }
        }
      }

      function checkAccounts(accounts) {
        AccountService.checkAccount(locale, accounts.source.account)
        AccountService.checkAccount(locale, accounts.destination.account)

        return accounts
      }

      async function getAffiliations(accounts) {
        accounts.source.affiliation = await Affiliation.find({
          company_id: accounts.source.account.registration_id
        })

        accounts.destination.affiliation = await Affiliation.find({
          company_id: accounts.destination.account.registration_id
        })

        return accounts
      }

      function checkAccountsAndAffiliation(accounts) {
        const companies = {
          requester: requesterCompanyId
        }

        if (!accounts.source.affiliation || !accounts.destination.affiliation) {
          throw new ModelNotFoundError(
            locale,
            translate('models.wallet', locale)
          )
        }

        companies.source = accounts.source.account.balance_id
        walletTransferHistory.source_provider =
          accounts.source.affiliation.provider

        companies.destination = accounts.destination.account.balance_id
        walletTransferHistory.destination_provider =
          accounts.destination.affiliation.provider

        return companies
      }

      function getAllCompanies(companies) {
        companiesData.ids = companies
        return Company.find({ _id: { $in: R.values(companies) } })
          .lean()
          .exec()
      }

      function checkCompanies(companies) {
        R.forEach(company => {
          if (company._id.toString() === companiesData.ids.source) {
            companiesData.models.source = company
          }
          if (company._id.toString() === companiesData.ids.destination) {
            companiesData.models.destination = company
          }
          if (company._id.toString() === requesterCompanyId) {
            companiesData.models.requester = company
          }
        }, companies)

        if (R.values(companiesData.models).length < 3) {
          throw new ModelNotFoundError(
            locale,
            translate('models.wallet', locale)
          )
        }

        walletTransferHistory.destination_company =
          companiesData.ids.destination
        walletTransferHistory.source_company = companiesData.ids.source
      }
    }

    function authorize() {
      if (walletTransferHistory.source_company !== requesterCompanyId) {
        const isNotSourceUnderIso =
          requesterCompanyId !== companiesData.models.source.parent_id
        const isNotDestinationUnderSameIso =
          companiesData.models.destination.parent_id &&
          requesterCompanyId !== companiesData.models.destination.parent_id
        const isNotDestinationTheISO =
          !companiesData.models.destination.parent_id &&
          requesterCompanyId !== companiesData.models.destination.id_str
        if (
          isNotSourceUnderIso ||
          isNotDestinationUnderSameIso ||
          isNotDestinationTheISO
        ) {
          throw new WalletTransferNotAuthorizedError(locale)
        }
      }
    }

    function transferOrSchedule() {
      walletTransferHistory.source_wallet_id = params.source_wallet_id
      walletTransferHistory.source_company_name =
        companiesData.models.source.name
      walletTransferHistory.destination_company_name =
        companiesData.models.destination.name
      walletTransferHistory.destination_wallet_id = params.destination_wallet_id
      walletTransferHistory.requested_amount = params.requested_amount

      Logger.info(
        `Valid wallet ${
          schedule ? 'scheduled_' : ''
        }transfer request received. ${params.source_wallet_id} -> ${
          params.destination_wallet_id
        }: ${params.requested_amount}${
          schedule ? ` @ ${moment(params.schedule_to).format()}` : ''
        }`
      )

      return Promise.bind(this)
        .then(execute)
        .then(registerOperations)
        .tap(logTransfer)

      function execute() {
        walletTransferHistory.request_id = params.request_id

        if (schedule) {
          walletTransferHistory.scheduled_to = moment(
            params.schedule_to
          ).toISOString()

          walletTransferHistory.status = SCHEDULED
          walletTransferHistory.success_at.push(operations.schedule)

          return WalletTransferHistory.create(walletTransferHistory)
        } else {
          return this.executeWalletTransferOperations(
            locale,
            walletTransferHistory,
            params.description,
            Logger
          )
        }
      }

      function registerOperations(transfer) {
        if (schedule) {
          return Promise.all([
            handlePayin(transfer, {
              description:
                params.description ||
                `Transferência de ${transfer.source_company_name}`,
              reason: payinReasons.scheduledWalletTransfer,
              status: schedule ? payinStatus.pending : payinStatus.paid
            }),
            handlePayout(transfer, {
              reason: payinReasons.scheduledWalletTransfer,
              status: schedule ? payoutStatus.pending : payoutStatus.paid,
              description:
                params.description ||
                `Transferência para ${transfer.destination_company_name}`
            })
          ]).then(moveOn)
        } else {
          return transfer
        }

        function moveOn() {
          return transfer
        }
      }

      function logTransfer(transfer) {
        Logger.info(
          `Wallet transfer ${transfer._id} was ${
            schedule ? 'scheduled' : 'executed'
          } successfully`
        )
      }
    }

    function respond(transfer) {
      transfer.source_company = companiesData.models.source
      transfer.destination_company = companiesData.models.destination

      if (params.get_balances) {
        return Promise.bind(this)
          .then(getBalances)
          .then(returnResponse)
      } else {
        return returnResponse()
      }

      function getBalances() {
        return Promise.bind(this)
          .then(getSourceBalance)
          .then(getDestinationBalance)
          .spread(finishBalances)

        function getSourceBalance() {
          return this.getBalance(locale, transfer.source_company)
        }

        function getDestinationBalance(sourceBalance) {
          if (
            companiesData.models.requester.primary ||
            !companiesData.models.requester.parent_id
          ) {
            return [
              sourceBalance,
              this.getBalance(locale, transfer.destination_company)
            ]
          } else {
            return [sourceBalance, false]
          }
        }

        function finishBalances(sourceBalance, destinationBalance) {
          transfer.balances = {
            source: sourceBalance
          }

          if (destinationBalance) {
            transfer.balances.destination = destinationBalance
          }

          return transfer.balances
        }
      }

      function returnResponse() {
        return walletTransferResponder(transfer)
      }
    }
  }

  static executeWalletTransferOperations(
    locale,
    walletTransferHistory,
    description,
    logger,
    client
  ) {
    let operation
    let walletClient
    const Logger = logger
      ? logger
      : createLogger({ name: 'EXECUTE_WALLET_TRANSFER_OPERATIONS' })

    return Promise.bind(this)
      .then(instantiateWallet)
      .then(freezeAmount)
      .then(putMoney)
      .then(takeMoney)
      .then(finishHim)
      .catch(errorHandler)

    function instantiateWallet() {
      operation = operations.instantiateWallet
      if (!client) {
        return createWalletClient(config.services.wallet_endpoint)
      } else {
        return client
      }
    }

    function freezeAmount(wallet) {
      walletClient = wallet
      walletTransferHistory.success_at.push(operation)
      operation = operations.freezeAmount

      return walletClient.freezeWalletAmount(
        walletTransferHistory.source_wallet_id,
        {
          amount: walletTransferHistory.requested_amount,
          reason: 'wallet_transfer_request'
        }
      )
    }

    function putMoney(freezeRequest) {
      walletTransferHistory.success_at.push(operation)
      walletTransferHistory.freeze_id = freezeRequest.frozenAmountId
      operation = operations.putMoney

      return walletClient.putMoneyIntoWallet(
        walletTransferHistory.destination_wallet_id,
        {
          amount: walletTransferHistory.requested_amount,
          requestId: walletTransferHistory.request_id
        }
      )
    }

    function takeMoney() {
      walletTransferHistory.success_at.push(operation)
      operation = operations.takeMoney

      return walletClient.unfreezeWalletAmount(
        walletTransferHistory.source_wallet_id,
        {
          frozenAmountId: walletTransferHistory.freeze_id,
          takeAmountAtomically: true,
          requestId: walletTransferHistory.request_id
        }
      )
    }

    function finishHim() {
      return Promise.resolve()
        .then(saveHistory)
        .then(registerOperations)

      function saveHistory() {
        walletTransferHistory.success_at.push(operation)
        walletTransferHistory.status = SUCCESSFUL
        walletTransferHistory.transferred_at = moment().format('YYYY-MM-DD')

        if (walletTransferHistory._id) {
          return WalletTransferHistory.findOneAndUpdate(
            { _id: walletTransferHistory._id },
            walletTransferHistory,
            { new: true }
          )
            .lean()
            .exec()
        } else {
          return WalletTransferHistory.create(walletTransferHistory)
        }
      }

      function registerOperations(transfer) {
        return Promise.all([
          handlePayin(transfer, {
            status: payinStatus.paid,
            description:
              description || `Transferência de ${transfer.source_company_name}`
          }),
          handlePayout(transfer, {
            status: payoutStatus.paid,
            description:
              description ||
              `Transferência para ${transfer.destination_company_name}`
          })
        ]).then(moveOn)

        function moveOn() {
          return transfer
        }
      }
    }

    function errorHandler(err) {
      let notEnoughFunds = false
      walletTransferHistory.status = FAILED
      walletTransferHistory.error_at.push(operation)
      walletTransferHistory.captured_errors.push(errorSerializer(err))

      if (err.message.includes('NOT_ENOUGH_MONEY')) {
        notEnoughFunds = true
        walletTransferHistory.error_reasons.push(errorReasons.notEnoughFunds)
      } else {
        walletTransferHistory.error_reasons.push(errorReasons.transactionError)
      }

      /* eslint-disable promise/no-promise-in-callback */
      return Promise.bind(this)
        .then(saveHistory)
        .then(registerOperations)
        .then(throwError)

      function saveHistory() {
        if (walletTransferHistory._id) {
          return WalletTransferHistory.findOneAndUpdate(
            { _id: walletTransferHistory._id },
            walletTransferHistory,
            { new: true }
          )
            .lean()
            .exec()
        }
        if (operation !== operations.finishTransfer) {
          return WalletTransferHistory.create(walletTransferHistory)
        }
      }

      function registerOperations(transfer) {
        return Promise.all([
          handlePayin(transfer, {
            status: payinStatus.failed
          }),
          handlePayout(transfer, {
            status: payoutStatus.failed
          })
        ]).then(moveOn)

        function moveOn() {
          return transfer
        }
      }

      function throwError(transfer) {
        if (notEnoughFunds) {
          Logger.error({
            err,
            operation: `wallet_transfer:${operation}:${
              walletTransferHistory.request_id
            }`,
            reason: 'NOT_ENOUGH_FUNDS'
          })

          return Promise.bind(this)
            .then(getSourceFunds)
            .then(throwNotEnoughFundsError)
        } else {
          Logger.error({
            err,
            operation: `wallet_transfer:${operation}:${
              walletTransferHistory.request_id
            }`,
            reason: 'GENERIC_ERROR'
          })

          if (transfer) {
            WalletRevertTransfer.handler(transfer._id.toString())
          }

          throw new WalletTransferError(locale)
        }
      }

      function getSourceFunds() {
        return this.getBalance(locale, walletTransferHistory.source_company)
      }

      function throwNotEnoughFundsError(sourceBalance) {
        throw new WalletTransferNotEnoughFundsError(
          locale,
          (sourceBalance.available_amount / 100).toFixed(2)
        )
      }
    }
  }

  static cancelScheduled(locale, companyId, transferId) {
    return Promise.resolve()
      .then(cancelTransfer)
      .tap(checkTransfer)
      .then(updatePayoutPayin)
      .then(respond)

    function cancelTransfer() {
      return WalletTransferHistory.findOneAndUpdate(
        {
          _id: transferId,
          source_company: companyId,
          status: SCHEDULED
        },
        {
          $set: {
            status: CANCELED,
            canceled_at: moment().toISOString()
          },
          $push: {
            success_at: operations.cancel
          }
        },
        { new: true }
      )
    }

    function checkTransfer(transfer) {
      if (!transfer) {
        throw new ModelNotFoundError(
          locale,
          translate('models.wallet_transfer', locale)
        )
      }
    }

    function updatePayoutPayin(transfer) {
      return Promise.all([
        transfer,
        handlePayin(transfer, {
          status: payinStatus.canceled
        }),
        handlePayout(transfer, {
          status: payoutStatus.canceled
        })
      ])
    }

    function respond(response) {
      const transfer = response[0]

      return walletTransferResponder(transfer)
    }
  }

  static getTransfers(locale, companyId, params) {
    const query = Object.assign(
      { source_company: companyId },
      R.pick(
        [
          'status',
          'destination_company',
          'reverted',
          'scheduled_to',
          'canceled_at',
          'tried_to_revert',
          'destination_wallet_id',
          'source_wallet_id',
          'source_provider',
          'destination_provider'
        ],
        params
      )
    )

    if (R.has('transfer_id', params)) {
      query._id = params.transfer_id
    }

    if (R.has('start_date', params)) {
      query.created_at = { $gte: moment(params.start_date).startOf('day') }
    }

    if (R.has('end_date', params)) {
      if (R.has('created_at', query)) {
        query.created_at.$lte = moment(params.end_date).endOf('day')
      } else {
        query.created_at = { $lte: moment(params.start_date).endOf('day') }
      }
    }

    return Promise.resolve()
      .then(getTransfers)
      .then(respond)

    function getTransfers() {
      return WalletTransferHistory.find(query)
        .lean()
        .exec()
    }

    function respond(transfers) {
      return walletTransferResponder(transfers)
    }
  }
}

function handlePayin(transfer, payinIn) {
  const today = moment().format('YYYY-MM-DD')
  const errorReason = R.path(['error_reasons'], transfer)

  return Promise.resolve()
    .then(tryToUpdate)
    .then(tryToCreate)

  function tryToUpdate() {
    return Payin.findOneAndUpdate(
      { operation_id: transfer._id },
      {
        $set: {
          status_code: errorReason ? errorReason[errorReason.length - 1] : '',
          status: payinIn.status
        }
      },
      { new: true }
    )
  }

  function tryToCreate(payin) {
    if (payin) {
      return payin
    } else {
      let payinData = Object.assign(
        {
          provider: transfer.destination_provider,
          amount: transfer.requested_amount,
          fee: 0,
          source_type: payinSourceTypes.wallet,
          source_id: transfer.source_wallet_id,
          destination_type: payinDestinationTypes.wallet,
          destination_id: transfer.destination_wallet_id,
          reason: R.has('scheduled_to', transfer)
            ? payinReasons.scheduledWalletTransfer
            : payinReasons.walletTransfer,
          status_code: errorReason ? errorReason[errorReason.length - 1] : '',
          method: payinMethods.walletTransfer,
          date: today,
          company_id: transfer.destination_company,
          operation_id: transfer._id,
          scheduled_to: transfer.scheduled_to || ''
        },
        payinIn
      )
      return Payin.create(payinData)
    }
  }
}

function handlePayout(transfer, payoutIn) {
  const today = moment().format('YYYY-MM-DD')
  const errorReason = R.path(['error_reasons'], transfer)

  return Promise.resolve()
    .then(tryToUpdate)
    .then(tryToCreate)

  function tryToUpdate() {
    return Payout.findOneAndUpdate(
      { operation_id: transfer._id },
      {
        $set: {
          status_code: errorReason ? errorReason[errorReason.length - 1] : '',
          status: payoutIn.status
        }
      },
      { new: true }
    )
  }

  function tryToCreate(payout) {
    if (payout) {
      return payout
    } else {
      let payoutData = Object.assign(
        {
          provider: transfer.source_provider,
          automatic: false,
          amount: transfer.requested_amount,
          fee: 0,
          source_type: payoutSourceTypes.wallet,
          source_id: transfer.source_wallet_id,
          destination_type: payoutDestinationTypes.wallet,
          destination_id: transfer.destination_wallet_id,
          reason: R.has('scheduled_to', transfer)
            ? payoutReasons.scheduledWalletTransfer
            : payoutReasons.walletTransfer,
          status_code: errorReason ? errorReason[errorReason.length - 1] : '',
          method: payoutMethods.walletTransfer,
          date: today,
          company_id: transfer.source_company,
          operation_id: transfer._id,
          scheduled_to: transfer.scheduled_to || ''
        },
        payoutIn
      )

      return Payout.create(payoutData)
    }
  }
}
