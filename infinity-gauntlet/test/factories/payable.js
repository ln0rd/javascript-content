import Payable from 'application/core/models/payable'
import generatePayable from 'test/fixtures/generatePayable'

export default function PayableFactory(payable) {
  return Payable.create(generatePayable(payable))
}
