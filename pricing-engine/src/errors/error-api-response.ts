import * as Boom from 'boom'
import { DatabaseCommunicationError } from 'errors/database-communication-error'
import { TargetIdentificationError } from 'errors/target-identification-error'
import { RuleIntegrityError } from './rule-integrity-error'

const errorApiResponse = (err: Error) => {
  let statusCode = 500

  if (err instanceof DatabaseCommunicationError) {
    statusCode = 503
  }

  if (err instanceof TargetIdentificationError) {
    statusCode = 500
  }

  if (err instanceof RuleIntegrityError) {
    statusCode = 400
  }

  return Boom.boomify(err, { statusCode })
}

export default errorApiResponse
