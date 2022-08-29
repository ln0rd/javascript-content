import config from 'application/core/config'
import Company from 'application/core/models/company'
import Provider from 'application/core/models/provider'
import { manualExecutePayoutAsync } from 'application/queue/tasks/manual/manual-execute-payout-async'
import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import moment from 'moment-timezone'

const taskName = 'SUBACQUIRER_AUTOMATIC_PAYOUTS_ASYNC'
const Logger = createLogger({ name: taskName })

const BANKING_OPERATION_START_HOUR = 7
const BANKING_OPERATION_END_HOUR = 17

const MAX_CONCURRENT_PAYOUTS = parseInt(process.env.MAX_CONCURRENT_PAYOUTS) || 2

const isValidBankingOperationHour = hour =>
  hour >= BANKING_OPERATION_START_HOUR && hour <= BANKING_OPERATION_END_HOUR

const findEnabledProviders = async () => {
  Logger.info({}, 'finding-enabled-providers')

  const enabledProviders = await Provider.find({
    provider_type: 'subacquirer',
    enabled: true
  }).select('_id')

  if (enabledProviders.length === 0) throw Error('No enabled providers found.')

  return enabledProviders
}

const findCompaniesWithDailyAutomaticPayout = () => {
  Logger.info({}, 'finding-daily-automatic-payout-companies')

  return Company.find({
    'transfer_configurations.automatic_transfer_enabled': true,
    'transfer_configurations.transfer_frequency': 'daily'
  }).select('_id')
}

const findCompaniesWithWeeklyAutomaticPayout = weekDay => {
  Logger.info({ weekDay }, 'finding-weekly-automatic-payout-companies')

  return Company.find({
    'transfer_configurations.automatic_transfer_enabled': true,
    'transfer_configurations.transfer_frequency': 'weekly',
    'transfer_configurations.transfer_date': weekDay
  }).select('_id')
}

const findCompaniesWithMonthlyAutomaticPayout = monthDay => {
  Logger.info({ monthDay }, 'finding-monthly-automatic-payout-companies')

  return Company.find({
    'transfer_configurations.automatic_transfer_enabled': true,
    'transfer_configurations.transfer_frequency': 'monthly',
    'transfer_configurations.transfer_date': monthDay
  }).select('_id')
}

const findCompaniesWithAutomaticPayout = async date => {
  const dailyCompanies = await findCompaniesWithDailyAutomaticPayout()
  Logger.info(
    { companiesFound: dailyCompanies.length },
    'daily-automatic-payout-companies-found'
  )

  const weekDay = date.day()
  const weeklyCompanies = await findCompaniesWithWeeklyAutomaticPayout(weekDay)
  Logger.info(
    { companiesFound: weeklyCompanies.length, weekDay },
    'weekly-automatic-payout-companies-found'
  )

  const monthDay = date.date()
  const monthlyCompanies = await findCompaniesWithMonthlyAutomaticPayout(
    monthDay
  )
  Logger.info(
    { companiesFound: monthlyCompanies.length, monthDay },
    'monthly-automatic-payout-companies-found'
  )

  return [...dailyCompanies, ...weeklyCompanies, ...monthlyCompanies]
}

const executePayout = async (companyId, providerId) => {
  // Only log in debug mode
  // More details in https://hashlab.slack.com/archives/C01LLLXU7QA/p1616705685033000
  Logger.debug({ companyId, providerId }, 'executing-company-payout')
  try {
    await manualExecutePayoutAsync(companyId, providerId, true)

    // Only log in debug mode
    // More details in https://hashlab.slack.com/archives/C01LLLXU7QA/p1616705685033000
    Logger.debug({ companyId, providerId }, 'executing-company-payout-success')

    return { companyId, providerId }
  } catch (err) {
    err.context = {
      companyId,
      providerId
    }

    Logger.error({ err }, 'executing-company-payout-err')

    return err
  }
}

const processCompaniesPayout = (companies, providerId) => {
  return Promise.map(
    companies,
    ({ _id: companyId }) => executePayout(companyId, providerId),
    { concurrency: MAX_CONCURRENT_PAYOUTS }
  )
}

export default class SubacquirerAutomaticPayoutsAsync {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info(
      { args, maxConcurrentPayouts: MAX_CONCURRENT_PAYOUTS },
      'automatic-payouts-start'
    )

    const argDate = args[0]
    const date = argDate ? moment(argDate) : moment().tz(config.timezone)
    const dateHour = date.hour()

    if (!isValidBankingOperationHour(dateHour)) {
      Logger.error({ dateHour }, 'invalid-banking-operation-hour')
      return
    }
    Logger.debug({ dateHour }, 'valid-banking-operation-date')

    const providers = await findEnabledProviders()
    const companies = await findCompaniesWithAutomaticPayout(date)

    /* eslint-disable no-await-in-loop */
    for (const { _id: providerId } of providers) {
      try {
        const payoutsExecuted = await processCompaniesPayout(
          companies,
          providerId
        )

        const companiesPayout = payoutsExecuted.filter(
          result => result.companyId && result.providerId
        )
        const errors = payoutsExecuted.filter(result => result instanceof Error)

        Logger.info(
          {
            providerId: providerId,
            companiesPayoutCount: companiesPayout.length,
            errorsCount: errors.length
          },
          'automatic-payouts-provider-success'
        )
      } catch (err) {
        err.context = {
          providerId: providerId
        }

        Logger.err({ err }, 'automatic-payout-provider-err')
        throw err
      }
    }
    /* eslint-enable no-await-in-loop */

    Logger.info({}, 'automatic-payouts-success')
  }
}
