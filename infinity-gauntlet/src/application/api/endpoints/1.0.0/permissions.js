import Promise from 'bluebird'
import PermissionService from 'application/core/services/permission'

export default class PermissionsEndpoint {
  static getPermissions(req, res) {
    return Promise.resolve()
      .then(getPermissions)
      .then(respond)

    function getPermissions() {
      return PermissionService.getPermissions(
        req.get('locale'),
        req.get('company').id,
        req.query
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static deletePermission(req, res) {
    return Promise.resolve()
      .then(deletePermission)
      .then(respond)

    function deletePermission() {
      return PermissionService.deletePermission(
        req.get('locale'),
        req.get('company').id,
        req.params.permissionId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static createPermission(req, res) {
    return Promise.resolve()
      .then(createPermission)
      .then(respond)

    function createPermission() {
      return PermissionService.createPermission(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static updatePermission(req, res) {
    return Promise.resolve()
      .then(updatePermission)
      .then(respond)

    function updatePermission() {
      return PermissionService.updatePermission(
        req.get('locale'),
        req.body,
        req.params.permissionId,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static getResources(req, res) {
    return Promise.resolve()
      .then(getResources)
      .then(respond)

    function getResources() {
      return PermissionService.getResources(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static createResource(req, res) {
    return Promise.resolve()
      .then(createResource)
      .then(respond)

    function createResource() {
      return PermissionService.createResource(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static updateResource(req, res) {
    return Promise.resolve()
      .then(updateResource)
      .then(respond)

    function updateResource() {
      return PermissionService.updateResource(
        req.get('locale'),
        req.params.resourceId,
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static deleteResource(req, res) {
    return Promise.resolve()
      .then(deleteResource)
      .then(respond)

    function deleteResource() {
      return PermissionService.deleteResource(
        req.get('locale'),
        req.params.resourceId,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
