import R from 'ramda'
import {
  findChildren,
  createNodeList,
  createNode,
  superUserRoles
} from 'application/core/domain/hierarchy'

export function hierarchyResponder(hierarchy, user) {
  if (!hierarchy || !user || !user.user_metadata || !user.user_metadata.type) {
    return { data: [], editing: false, edit_time: null, user: null }
  }

  if (superUserRoles(user).includes(user.user_metadata.type)) {
    return hierarchy
  }

  return R.assoc(
    'data',
    createNodeList(
      createNode(user._id, ...findChildren(hierarchy.data, user._id))
    ),
    hierarchy
  )
}
