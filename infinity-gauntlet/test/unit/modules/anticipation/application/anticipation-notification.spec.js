import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import sms from '@hashlab/sms-client'

import generateAnticipation from 'test/fixtures/generateAnticipation'
import generateCompany from 'test/fixtures/generateCompany'
import * as Mailer from 'framework/core/helpers/mailer'
import { AnticipationNotificationService } from 'modules/anticipation/application/anticipation-notification'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Anticipation => AnticipatioNotificationService', () => {
  describe('#notify', () => {
    let mailerMock
    let smsClientMock
    let sendSmsSpy
    let service

    beforeEach(() => {
      service = new AnticipationNotificationService()
      mailerMock = sinon.stub(Mailer, 'scheduleToDeliver').resolves()

      sendSmsSpy = sinon.stub().resolves()

      smsClientMock = sinon
        .stub(sms, 'createSmsClient')
        .returns({ sendSms: sendSmsSpy })
    })

    afterEach(() => {
      sinon.restore()
    })

    context('when the company has email and phone number', () => {
      const company = generateCompany()
      ;['anticipated', 'failed', 'confirmed'].forEach(status => {
        context(`and the Anticipation status is ${status}`, () => {
          const anticipation = generateAnticipation({ status })

          it('should try to send both email and SMS', async () => {
            await service.notify({
              anticipation,
              company
            })

            sinon.assert.calledOnce(mailerMock)
            sinon.assert.calledOnce(smsClientMock)
            sinon.assert.calledOnce(sendSmsSpy)
          })
        })
      })
    })

    context('when the company has email but no phone number', () => {
      const company = generateCompany()
      delete company.contact.phone
      ;['anticipated', 'failed', 'confirmed'].forEach(status => {
        context(`and the Anticipation status is ${status}`, () => {
          const anticipation = generateAnticipation({ status })

          it('should try to send both email but not SMS', async () => {
            await service.notify({
              anticipation,
              company
            })

            sinon.assert.calledOnce(mailerMock)
            sinon.assert.notCalled(smsClientMock)
            sinon.assert.notCalled(sendSmsSpy)
          })
        })
      })
    })

    context('when the company no email and no phone number', () => {
      const company = generateCompany()
      delete company.contact.phone
      delete company.contact.email
      ;['anticipated', 'failed', 'confirmed'].forEach(status => {
        context(`and the Anticipation status is ${status}`, () => {
          const anticipation = generateAnticipation({ status })

          it('should not send email nor SMS and fail', async () => {
            const result = service.notify({
              anticipation,
              company
            })

            sinon.assert.notCalled(mailerMock)
            sinon.assert.notCalled(sendSmsSpy)

            expect(result).to.eventually.be.rejected
          })
        })
      })
    })
  })
})
