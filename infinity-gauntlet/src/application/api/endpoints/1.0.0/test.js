import Promise from 'bluebird'
import { validate } from 'framework/core/adapters/validator'
import ForbiddenError from 'framework/core/errors/forbidden-error'
import ValidationError from 'framework/core/errors/validation-error'
import BadRequestError from 'framework/core/errors/bad-request-error'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'
import InternalServerError from 'framework/core/errors/internal-server-error'
import UnauthenticatedError from 'framework/core/errors/unauthenticated-error'

export default class TestEndpoint {
  static badRequest(req) {
    return Promise.resolve().then(respond)

    function respond() {
      throw new BadRequestError(req.get('locale'))
    }
  }

  static unauthorized(req) {
    return Promise.resolve().then(respond)

    function respond() {
      throw new UnauthorizedError(req.get('locale'), 'hash_key')
    }
  }

  static unauthenticated(req) {
    return Promise.resolve().then(respond)

    function respond() {
      throw new UnauthenticatedError(req.get('locale'), 'hash_key')
    }
  }

  static forbidden(req) {
    return Promise.resolve().then(respond)

    function respond() {
      throw new ForbiddenError(req.get('locale'))
    }
  }

  static internalServer(req) {
    return Promise.resolve().then(respond)

    function respond() {
      throw new InternalServerError(req.get('locale'))
    }
  }

  static validation(req) {
    return Promise.resolve().then(respond)

    function respond() {
      throw new ValidationError(req.get('locale'), validate('test', {}))
    }
  }

  static methodNotAllowed(req, res) {
    return Promise.resolve().then(respond)

    function respond() {
      return res.json({})
    }
  }

  static versionNotAllowed(req, res) {
    return Promise.resolve().then(respond)

    function respond() {
      return res.json({})
    }
  }

  static unsupportedMediaType(req, res) {
    return Promise.resolve().then(respond)

    function respond() {
      return res.json({})
    }
  }

  static genericError() {
    return Promise.resolve().then(respond)

    function respond() {
      throw new Error('Testing generic error.')
    }
  }
}
