import { providers } from '@hashlab/payout-client'
import { createId } from 'application/core/domain/breadcrumbs'
import { formatAccountNumber } from 'application/core/domain/payout'
import { reasons as PayoutReason } from 'application/core/models/payout'
import cuid from 'cuid'
import BankService from 'application/core/services/bank'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'

function getDocumentTypeByDocumentNumber(documentNumber) {
  if (documentNumber.length === 11) return 'CPF'
  if (documentNumber.length === 14) return 'CNPJ'

  return ''
}

export default async function generatePayoutAsyncPayload(
  {
    _id: companyId,
    full_name: companyFullName,
    bank_account: companyBankAccount,
    transfer_configurations: transferConfigurations
  },
  destination,
  amount,
  walletId,
  providerName,
  automatic,
  reason,
  taskName
) {
  const removeWhiteSpaces = str => str.replace(/\s+/g, '')

  const bankAccount = destination || companyBankAccount
  bankAccount.bank_code = bankAccount.bank_code.padStart(3, '0')
  bankAccount.agencia = bankAccount.agencia.substring(0, 4)

  const requestId = createId({
    uid: cuid(),
    source: taskName
  })

  // FIXME: Use enum?
  const AccountType =
    bankAccount.type === 'conta_corrente'
      ? 'CHECKING_ACCOUNT'
      : 'SAVINGS_ACCOUNT'

  let bankCode = bankAccount.bank_code
  let providerID = providers.BANCO_VOTORANTIM

  if (transferConfigurations.rail === 'pix') {
    const banks = await BankService.getBanks()

    const bank = banks.find(bank => bank.code === bankCode)
    if (!bank) {
      const locale = frameworkConfig.core.i18n.defaultLocale

      throw new ModelNotFoundError(locale, translate('models.bank', locale))
    }

    const branchCode = bank.ispbBranchCode.find(
      i => i.branch === bankAccount.agencia
    )

    bankCode = branchCode ? branchCode.code : bank.ispbCode
    providerID = providers.PIX_MERCHANT
  }

  return {
    walletId: walletId,
    requestId: requestId,
    amountInCents: amount,
    description: `TED - ${companyFullName}`,
    destinationBankAccount: {
      bankCode: bankCode,
      branchCode: bankAccount.agencia,
      accountNumber: formatAccountNumber(
        removeWhiteSpaces(bankAccount.conta),
        removeWhiteSpaces(bankAccount.conta_dv)
      ),
      accountType: AccountType,
      accountHolder: {
        name: companyFullName,
        document: {
          value: bankAccount.document_number,
          type: bankAccount.document_type
            ? bankAccount.document_type.toUpperCase()
            : getDocumentTypeByDocumentNumber(bankAccount.document_number)
        }
      }
    },
    payoutProviderId: providerID,
    paymentProvider: providerName,
    companyId: companyId.toString(),
    automatic: automatic,
    reason: reason
      ? reason.toUpperCase()
      : PayoutReason.normalPayment.toUpperCase()
  }
}
