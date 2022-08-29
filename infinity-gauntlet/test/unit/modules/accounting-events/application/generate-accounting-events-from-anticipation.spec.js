import chai from 'chai'
import sinon from 'sinon'
import 'sinon-mongoose'
import chaiAsPromised from 'chai-as-promised'

import Anticipation from 'application/core/models/anticipation'
import Payable from 'application/core/models/payable'
import AccountingEvent from 'application/core/models/accounting-event'

import { generateAccountingEventsFromAnticipation } from 'modules/accounting-events/application/generate-accounting-events-from-anticipation'
import * as AnticipationEvents from 'modules/accounting-events/domain/generate-anticipation-events'

import generateAnticipation from 'test/fixtures/generateAnticipation'
import generatePayable from 'test/fixtures/generatePayable'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Accounting Events => Generate Accounting Events', () => {
  describe('when a anticipation is not found', () => {
    const anticipationId = '62015bb4d4462252d4266003'
    let anticipationMock
    let payablesMock
    let generateAnticipationEventsSpy
    beforeEach(() => {
      anticipationMock = sinon
        .mock(Anticipation)
        .expects('findOne')
        .chain('select')
        .chain('lean')
      payablesMock = sinon
        .mock(Payable)
        .expects('find')
        .chain('select')
        .chain('lean')
      generateAnticipationEventsSpy = sinon.spy(
        AnticipationEvents,
        'generateAnticipationEvents'
      )
    })

    afterEach(() => {
      generateAnticipationEventsSpy.restore()
      sinon.restore()
    })

    it('should error and not call any of the event generation functions', async () => {
      anticipationMock.resolves(null)
      payablesMock.resolves([])
      await expect(
        generateAccountingEventsFromAnticipation(anticipationId)
      ).to.eventually.be.rejectedWith(
        'Cannot find anticipation #62015bb4d4462252d4266003 to generate Accounting Events from.'
      )

      return expect(generateAnticipationEventsSpy.called).to.be.eq(false)
    })

    it('should error and not call any of the event generation functions when just not exists payables for this anticipation', async () => {
      anticipationMock.resolves(generateAnticipation({ status: 'anticipated' }))
      payablesMock.resolves([])
      await expect(
        generateAccountingEventsFromAnticipation(anticipationId)
      ).to.eventually.be.rejectedWith(
        'Cannot find payables for anticipation #62015bb4d4462252d4266003 to generate Accounting Events from.'
      )

      return expect(generateAnticipationEventsSpy.called).to.be.eq(false)
    })
  })
  describe('when anticipation and payable is found', async () => {
    const anticipationId = '62015bb4d4462252d4266003'
    let generateAnticipationEventsSpy
    let accountingEventStub
    beforeEach(() => {
      sinon
        .mock(Anticipation)
        .expects('findOne')
        .chain('select')
        .chain('lean')
        .resolves(generateAnticipation({ status: 'anticipated' }))
      sinon
        .mock(Payable)
        .expects('find')
        .chain('select')
        .chain('lean')
        .resolves([
          generatePayable({}),
          generatePayable({}),
          generatePayable({})
        ])
      generateAnticipationEventsSpy = sinon.spy(
        AnticipationEvents,
        'generateAnticipationEvents'
      )
      accountingEventStub = sinon
        .stub(AccountingEvent, 'insertMany')
        .resolvesArg(0)
    })
    afterEach(() => {
      generateAnticipationEventsSpy.restore()
      accountingEventStub.restore()
      sinon.restore()
    })
    it('should try to generate anticipation event', async () => {
      await generateAccountingEventsFromAnticipation(anticipationId)
      expect(generateAnticipationEventsSpy.called).to.be.true
    })
    it('should insert Many events', async () => {
      await generateAccountingEventsFromAnticipation(anticipationId)
      expect(accountingEventStub.called).to.be.true
    })
  })
})
