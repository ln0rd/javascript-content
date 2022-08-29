import { expect } from 'chai'
import {
  addChildren,
  createNode,
  createNodeList,
  findChildren,
  moveNode,
  removeParent
} from 'application/core/domain/hierarchy'

describe('Unit => Domain: Hierarchy', () => {
  context('findChildren', () => {
    it('should find no children if searching for the end leaf', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode('10', createNode('20', createNode('30'), createNode('40')))
      )

      const children = findChildren(tree, '3')

      expect(children.length).to.equal(0)
    })

    it('should find 1 child if searching for the parent with id 1', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode('10', createNode('20', createNode('30'), createNode('40')))
      )

      const children = findChildren(tree, '1')

      expect(children.length).to.equal(1)
    })

    it('should find 2 children if searching for the parent with id 2', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode('10', createNode('20', createNode('30'), createNode('40')))
      )

      const children = findChildren(tree, '2', true)

      expect(children.length).to.equal(2)
    })

    it('should find 2 children if searching for the parent with id 20, in a tree with multiple root nodes', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode('10', createNode('20', createNode('30'), createNode('40')))
      )

      const children = findChildren(tree, '20', true)

      expect(children.length).to.equal(2)
    })
  })

  context('addChildren', () => {
    it('should add 2 children to the node with id 1', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4')))
      )

      const toBeAdded = createNodeList(createNode('5'), createNode('6'))

      const result = createNodeList(
        createNode(
          '1',
          createNode('2', createNode('3'), createNode('4')),
          createNode('5'),
          createNode('6')
        )
      )
      const newTree = addChildren(tree, '1', toBeAdded)

      expect(newTree).to.deep.equal(result)
    })

    it('should add 2 children to the node with id 2', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4')))
      )

      const toBeAdded = createNodeList(createNode('5'), createNode('6'))

      const result = createNodeList(
        createNode(
          '1',
          createNode(
            '2',
            createNode('3'),
            createNode('4'),
            createNode('5'),
            createNode('6')
          )
        )
      )

      const newTree = addChildren(tree, '2', toBeAdded)

      expect(newTree).to.deep.equal(result)
    })

    it('should add 2 children to the node with id 3', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4')))
      )

      const toBeAdded = createNodeList(createNode('5'), createNode('6'))

      const result = createNodeList(
        createNode(
          '1',
          createNode(
            '2',
            createNode('3', createNode('5'), createNode('6')),
            createNode('4')
          )
        )
      )

      const newTree = addChildren(tree, '3', toBeAdded)

      expect(newTree).to.deep.equal(result)
    })

    it('should add 2 children to the node with id 1 in a multi root tree', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode('10', createNode('20', createNode('30'), createNode('40')))
      )

      const toBeAdded = createNodeList(createNode('5'), createNode('6'))

      const result = createNodeList(
        createNode(
          '1',
          createNode('2', createNode('3'), createNode('4')),
          createNode('5'),
          createNode('6')
        ),
        createNode('10', createNode('20', createNode('30'), createNode('40')))
      )

      const newTree = addChildren(tree, '1', toBeAdded)

      expect(newTree).to.deep.equal(result)
    })

    it('should add 2 children to the node with id 10', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode('10', createNode('20', createNode('30'), createNode('40')))
      )

      const toBeAdded = createNodeList(createNode('5'), createNode('6'))

      const result = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode(
          '10',
          createNode('20', createNode('30'), createNode('40')),
          createNode('5'),
          createNode('6')
        )
      )

      const newTree = addChildren(tree, '10', toBeAdded)

      expect(newTree).to.deep.equal(result)
    })

    it('should add 2 children to the node with id 40', () => {
      const tree = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode('10', createNode('20', createNode('30'), createNode('40')))
      )

      const toBeAdded = createNodeList(createNode('5'), createNode('6'))

      const result = createNodeList(
        createNode('1', createNode('2', createNode('3'), createNode('4'))),
        createNode(
          '10',
          createNode(
            '20',
            createNode('30'),
            createNode('40', createNode('5'), createNode('6'))
          )
        )
      )

      const newTree = addChildren(tree, '40', toBeAdded)

      expect(newTree).to.deep.equal(result)
    })

    context('removeParent', () => {
      it('should remove all nodes', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4')))
        )

        const result = createNodeList()

        const newTree = removeParent(tree, '1')

        expect(newTree).to.deep.equal(result)
      })

      it('should remove all nodes below node with id 2', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4')))
        )

        const result = createNodeList(createNode('1'))

        const newTree = removeParent(tree, '2')

        expect(newTree).to.deep.equal(result)
      })

      it('should remove all nodes below node with id 3', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4')))
        )

        const result = createNodeList(
          createNode('1', createNode('2', createNode('4')))
        )

        const newTree = removeParent(tree, '3')

        expect(newTree).to.deep.equal(result)
      })

      it('should remove all nodes below node with id 10', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4'))),
          createNode('10', createNode('20', createNode('30'), createNode('40')))
        )

        const result = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4')))
        )

        const newTree = removeParent(tree, '10')

        expect(newTree).to.deep.equal(result)
      })

      it('should remove all nodes below node with id 1 in a multi root tree', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4'))),
          createNode('10', createNode('20', createNode('30'), createNode('40')))
        )

        const result = createNodeList(
          createNode('10', createNode('20', createNode('30'), createNode('40')))
        )

        const newTree = removeParent(tree, '1')

        expect(newTree).to.deep.equal(result)
      })

      it('should remove all nodes below node with id 20', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4'))),
          createNode('10', createNode('20', createNode('30'), createNode('40')))
        )

        const result = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4'))),
          createNode('10')
        )

        const newTree = removeParent(tree, '20')

        expect(newTree).to.deep.equal(result)
      })
    })

    context('moveNode', () => {
      it('should move all nodes below node with id 2 to the node with id 10', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4'))),
          createNode('10', createNode('20', createNode('30'), createNode('40')))
        )

        const result = createNodeList(
          createNode('1'),
          createNode(
            '10',
            createNode('20', createNode('30'), createNode('40')),
            createNode('2', createNode('3'), createNode('4'))
          )
        )

        const newTree = moveNode(tree, '2', '10')

        expect(newTree).to.deep.equal(result)
      })

      it('should move all nodes below node with id 3 to the node with id 40', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4'))),
          createNode('10', createNode('20', createNode('30'), createNode('40')))
        )

        const result = createNodeList(
          createNode('1', createNode('2', createNode('4'))),
          createNode(
            '10',
            createNode(
              '20',
              createNode('30'),
              createNode('40', createNode('3'))
            )
          )
        )

        const newTree = moveNode(tree, '3', '40')

        expect(newTree).to.deep.equal(result)
      })

      it('should move all nodes below node with id 1 to the node with id 40', () => {
        const tree = createNodeList(
          createNode('1', createNode('2', createNode('3'), createNode('4'))),
          createNode('10', createNode('20', createNode('30'), createNode('40')))
        )

        const result = createNodeList(
          createNode(
            '10',
            createNode(
              '20',
              createNode('30'),
              createNode(
                '40',
                createNode(
                  '1',
                  createNode('2', createNode('3'), createNode('4'))
                )
              )
            )
          )
        )

        const newTree = moveNode(tree, '1', '40')

        expect(newTree).to.deep.equal(result)
      })

      it('should move node with id 2 to the root', () => {
        const tree = createNodeList(
          createNode(
            '1',
            createNode('2', createNode('3'), createNode('4')),
            createNode('5', createNode('6'), createNode('7'))
          ),
          createNode('10', createNode('20', createNode('30'), createNode('40')))
        )

        const result = createNodeList(
          createNode('1', createNode('5', createNode('6'), createNode('7'))),
          createNode(
            '10',
            createNode('20', createNode('30'), createNode('40'))
          ),
          createNode('2', createNode('3'), createNode('4'))
        )

        const newTree = moveNode(tree, '2')

        expect(newTree).to.deep.equal(result)
      })
    })
  })
})
