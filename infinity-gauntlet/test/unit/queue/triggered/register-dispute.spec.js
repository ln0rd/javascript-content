import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

import sinon from 'sinon'
import RegisterDisputeTask from 'application/queue/tasks/triggered/register-dispute'

import DisputeHandlingService from 'modules/financial-calendar/application/services/dispute-handling'
import DisputeRepository from 'modules/financial-calendar/infrastructure/repositories/dispute'
import TransactionRepository from 'modules/financial-calendar/infrastructure/repositories/transaction'

import InvalidParameterError from 'framework/core/errors/invalid-parameter-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Unit => Queue => Triggered Task: Register Dispute', () => {
  context('#handler', () => {
    context('when transaction_id is passed on the payload', () => {
      let disputeHandlingServiceMock
      beforeEach(() => {
        disputeHandlingServiceMock = sinon.mock(
          DisputeHandlingService.prototype
        )
      })

      afterEach(() => {
        sinon.restore()
      })

      it('should not call DisputeHandlingService if dispute exists', () => {
        disputeHandlingServiceMock.expects('handle').never()
        sinon
          .stub(DisputeRepository.prototype, 'findOne')
          .resolves({ _id: 3333, transaction_id: 1234 })

        return RegisterDisputeTask.handler(
          JSON.stringify({ transaction_id: 1234 })
        ).then(() => disputeHandlingServiceMock.verify())
      })

      it('should call DisputeHandlingService if no dispute exists', () => {
        disputeHandlingServiceMock.expects('handle').once()
        sinon.stub(DisputeRepository.prototype, 'findOne').resolves(undefined)
        sinon
          .stub(DisputeRepository.prototype, 'create')
          .resolves({ _id: 3333 })

        return RegisterDisputeTask.handler(
          JSON.stringify({ transaction_id: 1234 })
        ).then(() => disputeHandlingServiceMock.verify())
      })
    })

    context('when provider_transaction_id is passed on the payload', () => {
      context('when a transaction for this ID exists', () => {
        let disputeHandlingServiceMock
        beforeEach(() => {
          disputeHandlingServiceMock = sinon.mock(
            DisputeHandlingService.prototype
          )
        })

        afterEach(() => {
          sinon.restore()
        })

        it('should search for transaction ID and not call DisputeHandlingService if dispute exists', () => {
          disputeHandlingServiceMock.expects('handle').never()

          sinon
            .stub(DisputeRepository.prototype, 'findOne')
            .resolves({ _id: 3333, transaction_id: 1234 })

          sinon
            .stub(TransactionRepository.prototype, 'findOne')
            .resolves({ _id: 1234, amount: 100 })

          return RegisterDisputeTask.handler(
            JSON.stringify({ provider_transaction_id: 'ACD-123' })
          ).then(() => disputeHandlingServiceMock.verify())
        })

        it('should search for transaction ID and call DisputeHandlingService if dispute doesnt exist', async () => {
          disputeHandlingServiceMock.expects('handle').once()

          sinon.stub(DisputeRepository.prototype, 'findOne').resolves(undefined)
          sinon
            .stub(DisputeRepository.prototype, 'create')
            .resolves({ _id: 3333 })

          sinon
            .stub(TransactionRepository.prototype, 'findOne')
            .resolves({ _id: 1234, amount: 100 })

          return RegisterDisputeTask.handler(
            JSON.stringify({ provider_transaction_id: 1234 })
          ).then(() => disputeHandlingServiceMock.verify())
        })
      })

      context('when the id was NOT registered as a transaction', () => {
        it('should throw an error when trying to find a transaction', () => {
          sinon
            .stub(TransactionRepository.prototype, 'findOne')
            .resolves(undefined)

          return expect(
            RegisterDisputeTask.handler(
              JSON.stringify({ provider_transaction_id: 'ACD-123' })
            )
          ).to.eventually.rejectedWith(ModelNotFoundError)
        })
      })
    })

    context(
      'when neither transaction_id nor provider_transaction_id are provided',
      () => {
        it('should throw an exception and not proceed', () => {
          return expect(
            RegisterDisputeTask.handler(JSON.stringify({}))
          ).to.eventually.rejectedWith(InvalidParameterError)
        })
      }
    )
  })
})
