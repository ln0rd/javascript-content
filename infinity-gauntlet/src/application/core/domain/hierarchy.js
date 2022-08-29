export function createNodeList(...nodes) {
  return [...nodes]
}

export function createNode(parent, ...leaves) {
  return [parent, [...leaves]]
}

export function findChildren(tree, node) {
  return tree.reduce((acc, [parent, leaves]) => {
    if (node.toString() === parent.toString()) {
      return leaves
    }

    return acc.concat(findChildren(leaves, node))
  }, [])
}

export function addChildren(tree, node, children) {
  return tree.reduce((acc, [parent, leaves]) => {
    if (parent.toString() === node.toString()) {
      return acc.concat(
        createNodeList(createNode(parent, ...[...leaves, ...children]))
      )
    }

    return acc.concat(
      createNodeList(createNode(parent, ...addChildren(leaves, node, children)))
    )
  }, [])
}

export function removeParent(tree, node) {
  return tree.reduce((acc, [parent, leaves]) => {
    if (parent.toString() === node.toString()) {
      return acc
    }

    return acc.concat(
      createNodeList(createNode(parent, ...removeParent(leaves, node)))
    )
  }, [])
}

export function moveNode(tree, child, parent = null) {
  const children = findChildren(tree, child)
  const updated = removeParent(tree, child)

  if (!parent) {
    return updated.concat(createNodeList(createNode(child, ...children)))
  }

  return addChildren(
    updated,
    parent,
    createNodeList(createNode(child, ...children))
  )
}

export function superUserRoles(user) {
  const isLeoMadeirasUser = user.permissions.some(
    permission => permission.company_id === '5cf141b986642840656717f0'
  )

  if (isLeoMadeirasUser) {
    return ['master', 'admin', 'assistant', 'logistics']
  } else {
    return ['operacional', 'admin', 'financeiro']
  }
}

export function flattenTree(tree) {
  return tree.reduce(
    (flatTree, node) =>
      Array.isArray(node)
        ? flatTree.concat(flattenTree(node))
        : flatTree.concat(node),
    []
  )
}

export default {
  add: addChildren,
  remove: removeParent,
  move: moveNode
}
