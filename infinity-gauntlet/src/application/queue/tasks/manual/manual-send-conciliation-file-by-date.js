/* eslint-disable no-await-in-loop */
import moment from 'moment'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import { scheduleToDeliver } from 'framework/core/helpers/mailer'
import { getNextBusinessDay } from 'application/core/helpers/date'
import {
  buildDebtTransferConciliation,
  buildSaleConciliation,
  buildSettlementConciliation,
  generateConciliationCSVFileByDate
} from 'conciliation'

const Logger = createLogger({ name: 'MANUAL_SEND_CONCILIATION_FILE_BY_DATE' })

const LEO_ISO_ID = '5cf141b986642840656717f0'
const locale = frameworkConfig.core.i18n.defaultLocale

export default class ManualSendConciliationFileByDate {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'manual-send-conciliation-file-by-date')

    if (args.length <= 1 || args[0] === '') {
      throw new Error(
        'Invalid arguments. must be 4 arguments(companyId, type, startDate, endDate)'
      )
    }
    const { companyId, type, startDate, endDate } = parseTaskParams(args)

    if (startDate.diff(endDate) >= 0) {
      Logger.warn({ args }, 'endDate Should be great then startDate')
      return
    }

    const rangeDateArray = await getRangeDateArray(startDate, endDate)
    Logger.info(
      {
        daysCount: rangeDateArray.length,
        companyId,
        type,
        startDate,
        endDate
      },
      'days-to-conciliated'
    )
    try {
      await rebuildConciliationFilesByDate(companyId, type, rangeDateArray)
    } catch (err) {
      Logger.error({ args }, 'error-building-conciliation-files')
    }
    const {
      companyEmail,
      companyName,
      file
    } = await generateConciliationCSVFileByDate(
      companyId,
      type,
      startDate,
      endDate
    )

    const startDateFormatted = startDate.format('YYYY-MM-DD')
    const endDateFormatted = endDate.format('YYYY-MM-DD')
    const rangeDate = `${startDateFormatted}-${endDateFormatted}`

    try {
      await sendEmail(rangeDate, type, companyEmail, file)
    } catch (err) {
      Logger.error(
        {
          err,
          rangeDate,
          type,
          companyEmail,
          companyName,
          file
        },
        'error-sending-email'
      )
    }
  }
}

/**
 * @param {string} companyId
 * @param {string} type
 * @param {Array} rangeDateArray
 * @returns {Promise<void>}
 */
async function rebuildConciliationFilesByDate(companyId, type, rangeDateArray) {
  for (const date of rangeDateArray) {
    if (type === 'settlements') {
      try {
        await buildSettlementConciliation(date, LEO_ISO_ID, companyId)
        await buildDebtTransferConciliation(date, LEO_ISO_ID, companyId)
      } catch (err) {
        Logger.error({ err }, 'build-settlement-conciliation-task-error')
      }
    } else {
      await buildSaleConciliation(date, LEO_ISO_ID, companyId)
    }
  }
}

/**
 * @param {moment.Moment} startDate
 * @param {moment.Moment} endDate
 * @returns {Promise<*[]>}
 */
async function getRangeDateArray(startDate, endDate) {
  const rangeDateArray = []
  let date = await getNextBusinessDay(startDate)
  while (date.diff(endDate) <= 0) {
    // eslint-disable-next-line no-await-in-loop
    date = await getNextBusinessDay(date)
    rangeDateArray.push(date.format('YYYY-MM-DD'))
    date = date.add(1, 'day')
  }
  return rangeDateArray
}

async function sendEmail(date, conciliationType, companyEmail, file) {
  try {
    const { type, subject } = translateType(conciliationType, date)
    await scheduleToDeliver(
      'base',
      'conciliation-file',
      'noreply@hashlab.com.br',
      [companyEmail, 'support_conciliation@hash.com.br'],
      subject,
      locale,
      { type, date },
      [
        {
          filename: `conciliation-${date}.csv`,
          content: file
        }
      ]
    )
    Logger.info({ date, conciliationType, companyEmail }, 'email-sent')
  } catch (err) {
    Logger.error(
      { err, date, conciliationType, companyEmail },
      'error-to-send-email'
    )
  }
}

function translateType(type, date) {
  return {
    type: translate(`mailer.conciliation_file.${type}.name`, locale),
    subject: translate(`mailer.conciliation_file.${type}.subject`, locale, date)
  }
}

/**
 * @param args
 * @returns {{companyId: string, endDate: moment.Moment, type: string, startDate: (moment.Moment|moment.Moment)}}
 */
function parseTaskParams(args) {
  let [companyId, type, startDate, endDate] = args

  endDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(endDate)
    ? moment(endDate)
    : moment()

  startDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDate)
    ? moment(startDate)
    : endDate.subtract(1, 'year')

  type = type || 'settlements'

  return { companyId, type, startDate, endDate }
}
