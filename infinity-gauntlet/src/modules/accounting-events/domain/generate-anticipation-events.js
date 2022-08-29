import moment from 'moment'
import { generateUuidV4 } from 'application/core/helpers/uuid'
import AccountingEvent from 'application/core/models/accounting-event'

const MODEL_NAME = 'anticipation'
const ORIGINATING_SYSTEM = 'LEGACY_ANTICIPATION'
const INITIAL_STATUS = 'unprocessed'

export function generateAnticipationEvents({
  isoId,
  anticipatingCompany,
  anticipationId,
  anticipationUpdateAt,
  anticipatedPayables
}) {
  return generateEvents(
    isoId,
    anticipatingCompany,
    anticipationId,
    anticipationUpdateAt,
    getAnticipationAmounts(anticipatedPayables, isoId, anticipatingCompany)
  )
}

export function getAnticipationAmounts(
  anticipatedPayables,
  isoId,
  anticipatingCompany
) {
  let merchantGrossAmount = 0
  let merchantAnticipationFee = 0
  let isoNetAmount = 0
  let isoGrossAmount = 0
  let isoAnticipationCost = 0
  for (const payable of anticipatedPayables) {
    const {
      anticipation_amount,
      anticipation_cost,
      company_id,
      amount,
      anticipation_fee,
      fee,
      mdr_fee
    } = payable
    if (anticipatingCompany === isoId) {
      isoGrossAmount += amount
      isoAnticipationCost += anticipation_cost
      continue
    }
    if (company_id === isoId) {
      isoNetAmount += anticipation_amount - anticipation_cost
      continue
    }
    merchantGrossAmount += amount - (fee - mdr_fee - anticipation_fee)
    merchantAnticipationFee += anticipation_fee
  }
  return {
    merchantGrossAmount,
    merchantAnticipationFee,
    isoNetAmount,
    isoGrossAmount,
    isoAnticipationCost
  }
}

export function generateEvents(
  isoId,
  merchantId,
  anticipationId,
  anticipationCreatedDate,
  anticipationAmounts
) {
  const {
    merchantGrossAmount,
    merchantAnticipationFee,
    isoNetAmount,
    isoGrossAmount,
    isoAnticipationCost
  } = anticipationAmounts
  const events = [
    { eventName: 'ANTECIPACAO_MERCHANT', amountCents: merchantGrossAmount },
    {
      eventName: 'REMUNERACAO_ANTECIPACAO_MERCHANT',
      amountCents: merchantAnticipationFee
    },
    { eventName: 'REPASSE_ISO_ANTECIPACAO', amountCents: isoNetAmount },
    { eventName: 'ANTECIPACAO_ISO', amountCents: isoGrossAmount },
    {
      eventName: 'REMUNERACAO_ANTECIPACAO_ISO',
      amountCents: isoAnticipationCost
    }
  ]
  const positiveAmount = ({ amountCents }) => amountCents > 0
  return events.filter(positiveAmount).map(({ eventName, amountCents }) =>
    newAnticipationEvent({
      eventName,
      isoId,
      merchantId,
      anticipationId,
      anticipationCreatedDate,
      amountCents
    })
  )
}

function newAnticipationEvent({
  eventName,
  isoId,
  merchantId,
  anticipationId,
  anticipationCreatedDate,
  amountCents
}) {
  return new AccountingEvent({
    event_name: eventName,
    event_id: generateUuidV4(),
    status: INITIAL_STATUS,
    originating_system: ORIGINATING_SYSTEM,
    originating_model: MODEL_NAME,
    originating_model_id: anticipationId,
    iso_id: isoId,
    merchant_id: merchantId,
    amount_cents: Math.abs(amountCents),
    date: moment(anticipationCreatedDate)
  })
}
