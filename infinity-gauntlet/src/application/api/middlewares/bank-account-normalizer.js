import createLogger from 'framework/core/adapters/logger'
import { completeWithZeros } from 'application/core/helpers/complete-with-zeros'

const Logger = createLogger({ name: 'BANK_ACCOUNT_NORMALIZER_MIDDLEWARE' })

export function bankAccountNormalizer(req, res, next) {
  Logger.info('Check if bank_account is normalized.')
  const { bank_account } = req.body

  if (bank_account && bank_account.agencia && bank_account.agencia.length < 4) {
    req.body.bank_account.agencia = completeWithZeros(bank_account.agencia, 4)
  }

  return next()
}
