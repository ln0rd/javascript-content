import R from 'ramda'
import AuthModeRequiredError from 'application/core/errors/auth-mode-required-error'

export function checkAuthMode(requiredModes) {
  return function(req, res, next) {
    if (!R.contains(req.get('authenticationMethod'), requiredModes)) {
      return next(
        new AuthModeRequiredError(req.get('locale'), R.head(requiredModes))
      )
    }

    return next()
  }
}
