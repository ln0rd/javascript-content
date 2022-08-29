import { createPayoutClient } from '@hashlab/payout-client'
import { createWalletClient } from '@hashlab/wallet-client'
import config from 'application/core/config'
import InvalidWalletAmountError from 'application/core/errors/invalid-wallet-amount-error'
import Affiliation from 'application/core/models/affiliation'
import Company from 'application/core/models/company'
import { reasons as PayoutReason } from 'application/core/models/payout'
import Provider from 'application/core/models/provider'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import generatePayoutAsyncPayload from 'modules/payout/infrastructure/grpc/payload-builder'
import AccountService from 'application/core/services/account'

const taskName = 'MANUAL_EXECUTE_PAYOUT_ASYNC'
const Logger = createLogger({ name: taskName })

const findCompany = async companyId => {
  const company = await Company.findById(companyId).select(
    'full_name document_number document_type bank_account transfer_configurations'
  )

  if (!company) {
    Logger.error({ companyId }, 'company-not-found')

    throw new ModelNotFoundError(
      frameworkConfig.core.i18n.defaultLocale,
      translate('models.company', frameworkConfig.core.i18n.defaultLocale)
    )
  }

  Logger.debug({ companyId }, 'company-found')

  return company
}

const findProvider = async providerId => {
  const provider = await Provider.findById(providerId).select(
    'name bank_provider'
  )

  if (!provider) {
    Logger.error({ providerId }, 'provider-not-found')

    throw new ModelNotFoundError(
      frameworkConfig.core.i18n.defaultLocale,
      translate('models.provider', frameworkConfig.core.i18n.defaultLocale)
    )
  }

  Logger.debug({ providerId }, 'provider-found')

  return provider
}

const findAffiliation = async (providerName, companyId) => {
  const affiliation = await Affiliation.findOne({
    provider: providerName,
    company_id: companyId,
    enabled: true
  }).select('wallet_id')

  if (!affiliation) {
    Logger.error({ companyId, providerName }, 'affiliation-not-found')

    throw new ModelNotFoundError(
      frameworkConfig.core.i18n.defaultLocale,
      translate('models.affiliation', frameworkConfig.core.i18n.defaultLocale)
    )
  }

  Logger.debug({ affiliationId: affiliation._id }, 'affiliation-found')

  return affiliation
}

const findPayoutRelatedData = async (companyId, providerId) => {
  const company = await findCompany(companyId)
  const provider = await findProvider(providerId)
  const affiliation = await findAffiliation(provider.name, company._id)

  Logger.debug({ companyId, providerId }, 'find-payout-related-data-success')

  return {
    company: company,
    provider: provider,
    affiliation: affiliation
  }
}

const validateAmount = (amount, walletAmount) => {
  if (amount < 0 || amount > walletAmount) {
    Logger.error({ amount }, 'invalid-amount')

    throw new InvalidWalletAmountError(frameworkConfig.core.i18n.defaultLocale)
  }

  Logger.debug({ amount }, 'valid-amount')
}

const executePayoutAsync = async (
  company,
  destination,
  amount,
  walletId,
  providerId,
  automatic,
  reason
) => {
  const payoutClient = await createPayoutClient(config.services.payout_endpoint)
  const payoutPayload = await generatePayoutAsyncPayload(
    company,
    destination,
    amount,
    walletId,
    providerId,
    automatic,
    reason,
    taskName
  )

  Logger.debug(
    { payoutPayload: JSON.stringify(payoutPayload) },
    'executing-payout-client'
  )

  return payoutClient.transferFromWalletToExternalBankAccountAsync(
    payoutPayload
  )
}

export const manualExecutePayoutAsync = async (
  companyId,
  providerId,
  automatic,
  amount,
  reason,
  destination
) => {
  // Only log payout start for manual execution
  // More details in https://hashlab.slack.com/archives/C01LLLXU7QA/p1616705685033000
  if (!automatic)
    Logger.info({ companyId, providerId }, 'manual-execute-payout-start')

  Logger.debug({}, 'initializing-wallet-client')
  const walletClient = await createWalletClient(config.services.wallet_endpoint)

  Logger.debug({ companyId, providerId }, 'finding-data')
  const { company, provider } = await findPayoutRelatedData(
    companyId,
    providerId
  )

  const account = await AccountService.getAccountByCompanyId(companyId)

  const {
    walletId,
    amount: walletAmount
  } = await walletClient.getWalletMaximumAmountThatCanBeTaken(
    account.balance_id
  )

  const amountToBePaid = amount || walletAmount
  validateAmount(amountToBePaid, walletAmount)

  // If amount is 0 this task will die silenciosly
  // More details in https://hashlab.slack.com/archives/C01LLLXU7QA/p1616705685033000
  if (amountToBePaid === 0) return

  if (!company.bank_account && destination === undefined) {
    Logger.warn(
      {
        companyId,
        destination
      },
      'company-has-no-bank-account'
    )

    return
  }

  Logger.info(
    {
      companyId,
      providerId,
      walletId,
      amount: amountToBePaid,
      reason
    },
    'executing-payout'
  )
  try {
    const clientResponse = await executePayoutAsync(
      company,
      destination,
      amountToBePaid,
      walletId,
      provider.name,
      automatic,
      reason
    )

    Logger.info(
      {
        companyId,
        providerId,
        clientResponse
      },
      'manual-execute-payout-success'
    )
  } catch (err) {
    err.context = {
      company: company._id,
      provider: provider._id,
      payoutClientResponse: err.message
    }
    Logger.error({ err }, 'execute-payout-failed')

    throw err
  }
}

export default class ManualExecutePayoutAsync {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    const companyId = args[0]
    const providerId = args[1]
    const amount = args[2]

    await manualExecutePayoutAsync(
      companyId,
      providerId,
      false,
      amount,
      PayoutReason.normalPayment
    )
  }
}
