import { generateUuidV4 } from 'application/core/helpers/uuid'

export default function generateAnticipation(
  { status } = {
    status: 'confirmed'
  }
) {
  return {
    _id: generateUuidV4(),
    status,
    type: 'spot',
    requested_by_parent: true,
    status_history: ['confirmed', 'processing', 'anticipated'],
    anticipate_all: false,
    revert_attempts: 0,
    reverted: false,
    cip_operation_registered: true,
    anticipation_fee: 1.99,
    anticipation_type: 'per_month',
    anticipating_company: '604fd87a7250540006082e82',
    parent_company: '5cf141b986642840656717f0',
    requested_amount: 40,
    payables_priority: 'start',
    anticipate_to: '2021-06-09',
    payables_count: 1,
    detailed_summary: [
      {
        _id: '60bfd7dd22219721bae019df',
        date: '2021-11-01',
        duration: 145,
        anticipation_fee_amount: 10,
        anticipatable_amount: 100,
        net_amount: 90,
        payables_count: 1
      }
    ],
    net_amount: 90,
    anticipation_fee_amount: 10,
    anticipatable_amount: 100,
    cip_correlation_id: '4355b3d8-ba2f-41f0-b0c1-7112075c4a90',
    created_at: '2021-06-08T20:49:33.538Z',
    updated_at: '2021-06-08T20:49:33.538Z',
    __v: 0,
    estimated_data: {
      _id: '60bfd870f7579700069ae2c2',
      anticipatable_amount: 100,
      anticipation_fee_amount: 10,
      net_amount: 90
    }
  }
}
