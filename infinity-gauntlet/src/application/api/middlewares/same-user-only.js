import ForbiddenError from 'framework/core/errors/forbidden-error'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'SAME_USER_ONLY' })

async function authorize(req, res, next) {
  // Checks if the authenticated user is the same as the target user
  try {
    if (req.get('user').id === req.params.id) {
      return next()
    }

    return next(new ForbiddenError(req.get('locale')))
  } catch (err) {
    Logger.error('Error on middleware sameUserOnly', err)
  }
}

export function sameUserOnly(req, res, next) {
  // ignore if authentication using hash key
  if (!req.get('user')) {
    return next()
  }

  return authorize(req, res, next)
}
