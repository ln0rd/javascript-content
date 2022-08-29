import R from 'ramda'
import Promise from 'bluebird'
import Permission from 'application/core/models/permission'
import PermissionResource from 'application/core/models/permission-resource'
import { permissionResponder } from 'application/core/responders/permission'
import { permissionResourceResponder } from 'application/core/responders/permission-resource'
import RequiredParameterError from 'framework/core/errors/required-parameter-error'
import { validate } from 'framework/core/adapters/validator'
import PermissionResourceNotFoundError from 'application/core/errors/permission-resource-not-found-error'
import PermissionNotFoundError from 'application/core/errors/permission-not-found-error'
import PermissionResourceNotAllowedError from 'application/core/errors/permission-resource-not-allowed-error'
import config from 'application/core/config'

export default class PermissionService {
  static createPermission(locale, params, companyId) {
    return Promise.resolve()
      .then(validateRequest)
      .then(checkResources)
      .then(parsePermission)
      .then(createPermission)
      .then(populatePermission)
      .then(respond)

    function validateRequest() {
      const Errors = validate('request_create_permission', params)

      if (Errors) {
        throw new RequiredParameterError(locale, Errors)
      }
    }

    function checkResources() {
      const resources = {}
      let resourcesNames = []

      return Promise.resolve()
        .then(parseResources)
        .then(getResources)
        .then(validateResources)
        .then(returnResources)

      function parseResources() {
        R.map(
          action => {
            R.map(resourceName => {
              resources[resourceName] = ''
            }, params[action])
          },
          ['create', 'read', 'update', 'delete']
        )
      }

      function getResources() {
        resourcesNames = R.keys(resources)

        return PermissionResource.find({ name: { $in: resourcesNames } })
          .lean()
          .exec()
      }

      function validateResources(permissionResources) {
        let resourceIndex

        if (permissionResources.length !== resourcesNames.length) {
          throw new PermissionResourceNotFoundError(locale)
        } else {
          R.forEach(resourceName => {
            resourceIndex = R.findIndex(
              resource => resource.name === resourceName,
              permissionResources
            )

            resources[resourceName] = permissionResources[resourceIndex]._id
          }, resourcesNames)
        }
      }

      function returnResources() {
        return resources
      }
    }

    function parsePermission(resources) {
      const permission = Object.assign(params, {
        company: companyId,
        create: R.map(create => resources[create], params.create),
        read: R.map(read => resources[read], params.read),
        update: R.map(update => resources[update], params.update),
        delete: R.map(_delete => resources[_delete], params.delete)
      })

      return permission
    }

    function createPermission(permission) {
      return Permission.create(permission)
    }

    function populatePermission(permission) {
      return Permission.populate(permission, {
        path: 'create update delete read'
      })
    }

    function respond(response) {
      return permissionResponder(response)
    }
  }

  static deletePermission(locale, companyId, permissionId) {
    return Promise.resolve()
      .then(deletePermission)
      .then(respond)

    function deletePermission() {
      return Permission.deleteOne({ _id: permissionId, company: companyId })
        .lean()
        .exec()
    }

    function respond() {
      return {
        success: true
      }
    }
  }

  static updatePermission(locale, params, permissionId, companyId) {
    return Promise.resolve()
      .then(updatePermission)
      .tap(validateResource)
      .then(respond)

    function updatePermission() {
      const permissionData = R.pick(
        [
          'name',
          'enabled',
          'description',
          'create',
          'read',
          'update',
          'delete'
        ],
        params
      )

      return Permission.findOneAndUpdate(
        { _id: permissionId, company: companyId },
        { $set: permissionData },
        { new: true }
      )
        .populate({
          path: 'create read update delete'
        })
        .lean()
        .exec()
    }

    function validateResource(permission) {
      if (!permission) {
        throw new PermissionNotFoundError(locale)
      }
    }

    function respond(permission) {
      return permissionResponder(permission)
    }
  }

  static getPermissions(locale, companyId, params) {
    return Promise.resolve()
      .then(getPermissions)
      .then(respond)

    function getPermissions() {
      let query = R.pick(['name', 'enabled', 'description'], params)

      if (R.has('permission_id', params)) {
        query._id = params['permission_id']
      }

      query.company = companyId

      return Permission.find(query)
        .populate({
          path: 'create read update delete'
        })
        .lean()
        .exec()
    }

    function respond(response) {
      return permissionResponder(response)
    }
  }

  static getResources(locale, params, companyId) {
    return Promise.bind(this)
      .then(checkPermission)
      .then(getResources)
      .then(respond)

    function checkPermission() {
      return !this.grantResourcePermission(companyId)
    }

    function getResources(getPublicOnly) {
      let query = R.pick(['name', 'enabled', 'public', 'description'], params)

      if (R.has('resource_id', params)) {
        query._id = params['resource_id']
      }

      if (getPublicOnly) {
        query.public = true
      }

      return PermissionResource.find(query)
        .lean()
        .exec()
    }

    function respond(response) {
      return permissionResourceResponder(response)
    }
  }

  static createResource(locale, params, companyId) {
    return Promise.bind(this)
      .tap(checkPermission)
      .then(validateParams)
      .then(createResource)
      .then(respond)

    function checkPermission() {
      if (!this.grantResourcePermission(companyId)) {
        throw new PermissionResourceNotAllowedError(locale)
      }
    }

    function validateParams() {
      const Errors = validate('request_create_permission_resource', params)

      if (Errors) {
        throw new RequiredParameterError(locale, Errors)
      }
    }

    function createResource() {
      return PermissionResource.create(params)
    }

    function respond(resource) {
      return permissionResourceResponder(resource)
    }
  }

  static updateResource(locale, resourceId, params, companyId) {
    return Promise.bind(this)
      .tap(checkPermission)
      .then(updateResource)
      .tap(validateResource)
      .then(respond)

    function checkPermission() {
      if (!this.grantResourcePermission(companyId)) {
        throw new PermissionResourceNotAllowedError(locale)
      }
    }

    function updateResource() {
      return PermissionResource.findOneAndUpdate(
        { _id: resourceId },
        { $set: params },
        { new: true }
      )
        .lean()
        .exec()
    }

    function validateResource(resource) {
      if (!resource) {
        throw new PermissionResourceNotFoundError(locale)
      }
    }

    function respond(resource) {
      return permissionResourceResponder(resource)
    }
  }

  static deleteResource(locale, resourceId, companyId) {
    return Promise.bind(this)
      .tap(checkPermission)
      .then(deleteResource)
      .then(respond)

    function checkPermission() {
      if (!this.grantResourcePermission(companyId)) {
        throw new PermissionResourceNotAllowedError(locale)
      }
    }

    function deleteResource() {
      return PermissionResource.deleteOne({ _id: resourceId })
        .lean()
        .exec()
    }

    function respond() {
      return {
        success: true
      }
    }
  }

  static grantResourcePermission(companyId) {
    return companyId === config.permissions.hash_id
  }
}
