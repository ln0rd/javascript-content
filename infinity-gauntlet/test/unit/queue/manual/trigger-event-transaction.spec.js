import sinon from 'sinon'
import 'sinon-mongoose'

import EventService from 'application/core/services/event'
import Transaction from 'application/core/models/transaction'
import TriggerEventTransaction, {
  Logger
} from 'application/queue/tasks/manual/trigger-event-transaction'

describe('Unit => Queue => Manual Task: TriggerEvent', () => {
  // mute Logger
  Logger.error = () => {}
  Logger.info = () => {}

  let spyLogError
  let spyLogInfo
  let transactionMock

  beforeEach(function() {
    spyLogError = sinon.spy(Logger, 'error')
    spyLogInfo = sinon.spy(Logger, 'info')
    transactionMock = sinon
      .mock(Transaction)
      .expects('findOne')
      .chain('exec')
  })

  afterEach(() => {
    sinon.restore()
  })

  const companyId = 'companyId'
  const transactionParam = '49839393'
  const transactionId = parseInt(transactionParam)
  const eventSourceName = 'transaction-registered'
  const invalidArgs = [[], [transactionParam, 'trx']]

  invalidArgs.forEach(args =>
    it(`with args ${args ? args.join(',') : 'undefined'}`, async () => {
      await TriggerEventTransaction.handler(args)

      sinon.assert.calledWith(
        spyLogError,
        sinon.match({
          transactionId: args[0] || undefined,
          eventSourceName: args[1] || undefined
        }),
        'trigger-event-trx-args-error'
      )
    })
  )

  it('transaction not found', async () => {
    const message = 'transaction not found'
    transactionMock.rejects(new Error(message))

    await TriggerEventTransaction.handler([transactionParam, eventSourceName])

    sinon.assert.calledWith(
      spyLogError,
      sinon.match(
        {
          err: message,
          transactionId
        },
        'trigger-event-trx-not-found'
      )
    )
  })

  it('EventService throw error', async () => {
    transactionMock.resolves({ company_id: companyId })
    const message = 'triggerEvent error'
    EventService.triggerEvent = () => Promise.reject(new Error(message))

    await TriggerEventTransaction.handler([transactionParam, eventSourceName])

    sinon.assert.calledWith(
      spyLogError,
      sinon.match(
        {
          err: message
        },
        'trigger-event-trx-error'
      )
    )
  })

  it('works successfully', async () => {
    transactionMock.resolves({ company_id: companyId })
    EventService.triggerEvent = () => Promise.resolve()
    const spyEventService = sinon.spy(EventService, 'triggerEvent')

    await TriggerEventTransaction.handler([transactionParam, eventSourceName])

    sinon.assert.calledWith(spyEventService, companyId, eventSourceName, {
      transactionId
    })
    sinon.assert.calledWith(
      spyLogInfo,
      {
        transactionId,
        eventSourceName,
        companyId
      },
      'trigger-event-trx-success'
    )
    sinon.restore()
  })
})
