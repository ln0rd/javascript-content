import { mapModel } from 'application/core/helpers/responder'
import R from 'ramda'
import moment from 'moment'

export function anticipationResponder(model, simulation) {
  return mapModel(model, anticipation => {
    let response = {
      object: `anticipation_${simulation ? 'simulation' : 'request'}`,
      type: anticipation.type,
      requested_amount: anticipation.anticipate_all
        ? anticipation.net_amount
        : anticipation.requested_amount,
      anticipatable_amount: Number(anticipation.anticipatable_amount),
      anticipation_fee_amount: Number(anticipation.anticipation_fee_amount),
      net_amount: Number(anticipation.net_amount),
      anticipation_fee: anticipation.anticipation_fee,
      anticipation_type: anticipation.anticipation_type,
      anticipate_to: anticipation.anticipate_to,
      anticipate_all: anticipation.anticipate_all,
      payables_priority: anticipation.payables_priority,
      payables_count: anticipation.payables_count,
      detailed_summary: parseDetailedSummary(anticipation.detailed_summary)
    }

    if (anticipation.status) {
      response.status = anticipation.status
    }
    if (anticipation._id) {
      response.id = anticipation._id
    }

    if (anticipation.reason) {
      response.reason = anticipation.reason
    }

    return response
  })
}

function parseDetailedSummary(detailedSummary) {
  let summaryToParse = detailedSummary

  if (Array.isArray(detailedSummary)) {
    summaryToParse = R.indexBy(R.prop('date'), detailedSummary)
  }

  return R.mapObjIndexed(summary => {
    let response = {
      date: moment(summary.date).format('YYYY-MM-DD'),
      payables_count: summary.payables_count,
      net_amount: Number(summary.net_amount),
      anticipatable_amount: Number(summary.anticipatable_amount),
      anticipation_fee_amount: Number(summary.anticipation_fee_amount)
    }

    if (R.has('duration', summary)) {
      response.duration = summary.duration
    }
    return response
  }, summaryToParse)
}
