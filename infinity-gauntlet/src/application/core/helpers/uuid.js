import uuid4 from 'uuid/v4'
import uuid1 from 'uuid/v1'
import validate from 'uuid-validate'

export function generateUuidV4(options) {
  return uuid4(options || {})
}

export function generateUuidV1(options) {
  return uuid1(options || {})
}

export function validateUuid(uuid, version) {
  return validate(uuid, version)
}

export function checkUuidVersion(uuid) {
  return validate.version(uuid)
}
