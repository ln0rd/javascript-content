const test = require('ava')
const sinon = require('sinon')
const moment = require('moment')
const TrailerSchema = require('../../domain/schema/TrailerSchema')
const ConciliationEntry = require('../../domain/ConciliationEntry')

const generatePayableWithTransaction = require('../fixtures/generatePayableWithTransaction')

test.before(() => {
  sinon.useFakeTimers(
    moment('2019-08-01')
      .toDate()
      .getTime()
  )
})

test('conciliate payables', t => {
  const header = {
    id: 1,
    name: 'name',
    document_number: '99999999999',
    type: 'sales'
  }
  const conciliation = new ConciliationEntry()
  const payables = [
    generatePayableWithTransaction({}),
    generatePayableWithTransaction({})
  ]
  const conciliatedData = conciliation.conciliate(header, payables)

  const trailerExpected = new TrailerSchema(2)

  t.is(conciliatedData.turnover.length, 2)
  t.deepEqual(conciliatedData.trailer, trailerExpected.toObject())
  t.true(typeof conciliatedData.sequential_file === 'string')
})
