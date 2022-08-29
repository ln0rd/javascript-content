import User from 'application/core/models/user'

export function getRequestAccessLevel(ISORoles, requestRole) {
  if (!requestRole) {
    return null
  }

  const { accessLevel: requestAccessLevel } = ISORoles[
    requestRole.toUpperCase()
  ]

  return requestAccessLevel
}

export async function getUserAccessLevel(ISORoles, userID) {
  const user = await User.findById(userID)

  const { type: userRole = null } = user.user_metadata
  if (!userRole) {
    return null
  }

  const { accessLevel: userAccessLevel } = ISORoles[userRole.toUpperCase()]

  return userAccessLevel
}

export function getRootAccessLevel(ISORoles) {
  return Math.min.apply(
    Math,
    Object.keys(ISORoles).map(key => ISORoles[`${key}`].accessLevel)
  )
}
