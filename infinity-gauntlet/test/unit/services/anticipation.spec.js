import sinon from 'sinon'
import chai, { expect, should } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as deliverer from 'application/webhook/helpers/deliverer'
import { sendAnticipationWebhook } from '../../../src/application/core/services/anticipation'
import generateAnticipation from '../../fixtures/generateAnticipation'
import generatePayable from '../../fixtures/generatePayable'
import {
  CONFIRMED,
  PROCESSING,
  ANTICIPATED
} from 'application/core/models/anticipation'

should()
chai.use(chaiAsPromised)

describe('Unit => Services: Anticipation', () => {
  context('sendAnticipationWebhook', () => {
    let sendWebHookStub
    beforeEach(() => {
      sendWebHookStub = sinon.stub(deliverer, 'default')
    })
    afterEach(() => {
      sinon.restore()
    })
    it('should send anticipation_created webhook', async () => {
      const parameters = { eventName: 'anticipation_created', oldStatus: null }
      const anticipation = generateAnticipation({ status: CONFIRMED })
      await sendAnticipationWebhook(anticipation, parameters)
      ;[
        anticipation.parent_company.toString(),
        'anticipation_created',
        'anticipation',
        anticipation._id.toString(),
        null,
        CONFIRMED
      ].map((arg, key) => {
        // eslint-disable-next-line security/detect-object-injection
        expect(sendWebHookStub.getCall(0).args[key]).to.be.eq(arg)
      })
      expect(sendWebHookStub.getCall(0).args[6].object).to.be.eq(
        'anticipation_request'
      )
    })

    it('should send anticipation_anticipated webhook', async () => {
      const parameters = {
        eventName: 'anticipation_anticipated',
        oldStatus: PROCESSING,
        payables: [generatePayable({}), generatePayable({})]
      }
      const anticipation = generateAnticipation({ status: ANTICIPATED })
      await sendAnticipationWebhook(anticipation, parameters)
      ;[
        anticipation.parent_company.toString(),
        'anticipation_anticipated',
        'anticipation',
        anticipation._id.toString(),
        PROCESSING,
        ANTICIPATED
      ].map((arg, key) => {
        // eslint-disable-next-line security/detect-object-injection
        expect(sendWebHookStub.getCall(0).args[key]).to.be.eq(arg)
      })

      const reponderArg = sendWebHookStub.getCall(0).args[6]
      expect(reponderArg.object).to.be.eq('anticipation_payables')
      expect('anticipation' in reponderArg).to.be.true
      expect('payables' in reponderArg).to.be.true
      expect(reponderArg.payables.length).to.be.eq(2)
    })
  })
})
