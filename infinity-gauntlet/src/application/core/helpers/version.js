import semver from 'semver'

/* All versions passed are expected to be strings
 * For more information, refer here: https://github.com/npm/node-semver
 */

export default class VersionHelper {
  static isEqual(version1, version2) {
    return semver.eq(semver.clean(version1), semver.clean(version2))
  }

  static notEqual(version1, version2) {
    return semver.neq(semver.clean(version1), semver.clean(version2))
  }

  static greaterThan(version1, version2) {
    return semver.gt(semver.clean(version1), semver.clean(version2))
  }

  static lessThan(version1, version2) {
    return semver.lt(semver.clean(version1), semver.clean(version2))
  }

  static greaterThanOrEqual(version1, version2) {
    return semver.gte(semver.clean(version1), semver.clean(version2))
  }

  static lessThanOrEqual(version1, version2) {
    return semver.lt(semver.clean(version1), semver.clean(version2))
  }

  static isValid(version) {
    return semver.valid(version)
  }
}
