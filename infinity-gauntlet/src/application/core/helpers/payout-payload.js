import { formatAccountNumber } from 'application/core/domain/payout'
import { createId } from 'application/core/domain/breadcrumbs'
import { providers } from '@hashlab/payout-client'

export default function GeneratePayoutPayload(
  company,
  payout,
  walletId,
  provider,
  task,
  requestId
) {
  const removeWhiteSpaces = str => str.replace(/\s+/g, '')

  const NeonCredentials = provider.bank_provider.neon_credentials

  const CredentialsJson = JSON.stringify({
    TokenWs: NeonCredentials.auth_token,
    ChaveCriptografia: NeonCredentials.rsa_public_key.value,
    ChaveDescriptografia: NeonCredentials.rsa_private_key.value,
    Email: NeonCredentials.auth_username,
    Password: NeonCredentials.auth_password
  })

  const credentials = Buffer.from(CredentialsJson).toString('base64')

  const AccountType =
    payout.destination.type === 'conta_corrente'
      ? 'CHECKING_ACCOUNT'
      : 'SAVINGS_ACCOUNT'

  const payoutPayload = {
    walletId: walletId,
    requestId: requestId
      ? requestId
      : createId({
          payout: payout._id.toString(),
          source: task
        }),
    amountInCents: payout.amount,
    description: payout.description,
    destinationBankAccount: {
      bankCode: payout.destination.bank_code,
      branchCode: payout.destination.agencia,
      accountNumber: formatAccountNumber(
        removeWhiteSpaces(payout.destination.conta),
        removeWhiteSpaces(payout.destination.conta_dv)
      ),
      accountType: AccountType,
      accountHolder: {
        name: `(${payout._id.toString()}) ${company.full_name}`,
        document: {
          value: company.document_number,
          type: company.document_type.toUpperCase()
        }
      }
    },
    payoutProvider: {
      id: providers.NEON_PROD,
      credentials
    }
  }

  return payoutPayload
}
