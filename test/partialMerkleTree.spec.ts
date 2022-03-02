import { Element, MerkleTree, MerkleTreeOptions, PartialMerkleTree } from '../src'
import { it } from 'mocha'
import { should } from 'chai'
import * as assert from 'assert'
import { createHash } from 'crypto'

const sha256Hash = (left, right) => createHash('sha256').update(`${left}${right}`).digest('hex')

describe('PartialMerkleTree', () => {
  const getTestTrees = (levels: number, elements: Element[], edgeElement: Element, treeOptions: MerkleTreeOptions = {}) => {
    const fullTree = new MerkleTree(levels, elements, treeOptions)
    const edge = fullTree.getTreeEdge(edgeElement)
    const leavesAfterEdge = elements.slice(edge.edgeIndex)
    const partialTree = new PartialMerkleTree(levels, edge, leavesAfterEdge, fullTree.root, treeOptions)
    return { fullTree, partialTree }
  }
  describe('#constructor', () => {
    const { fullTree, partialTree } = getTestTrees(20, ['0', '1', '2', '3', '4', '5'], '2')
    it('should initialize merkle tree with same root', () => {
      should().equal(fullTree.root, partialTree.root)
    })

    it('should initialize merkle tree with same leaves count', () => {
      should().equal(fullTree.elements.length, partialTree.elements.length)
    })

    it('should work with optional hash function and zero element', () => {
      const { partialTree, fullTree } = getTestTrees(10, [1, 2, 3, 4, 5, 6], 4, {
        hashFunction: sha256Hash,
        zeroElement: 'zero',
      })
      should().equal(partialTree.root, fullTree.root)
    })
  })

  describe('#insert', () => {

    it('should have equal root to full tree after insertion ', () => {
      const { fullTree, partialTree } = getTestTrees(10, ['0', '1', '2', '3', '4', '5', '6', '7'], '5')
      fullTree.insert('9')
      partialTree.insert('9')
      should().equal(fullTree.root, partialTree.root)
    })

    it('should fail to insert when tree is full', () => {
      const { partialTree } = getTestTrees(3, ['0', '1', '2', '3', '4', '5', '6', '7', '8'], '5')
      const call = () => partialTree.insert('9')
      should().throw(call, 'Tree is full')
    })
  })

  describe('#bulkInsert', () => {

    it('should work like full tree', () => {
      const { fullTree, partialTree } = getTestTrees(20, [1, 2, 3, 4, 5], 3)
      partialTree.bulkInsert([6, 7, 8])
      fullTree.bulkInsert([6, 7, 8])
      should().equal(fullTree.root, partialTree.root)
    })

    it('should give the same result as sequential inserts', () => {
      const initialArray = [
        [1],
        [1, 2],
        [1, 2, 3],
        [1, 2, 3, 4],
      ]
      const insertedArray = [
        [11],
        [11, 12],
        [11, 12, 13],
        [11, 12, 13, 14],
      ]
      for (const initial of initialArray) {
        for (const inserted of insertedArray) {
          const { partialTree: tree1 } = getTestTrees(10, initial, initial.length > 1 ? initial.length - 1 : initial.length)
          const { partialTree: tree2 } = getTestTrees(10, initial, initial.length > 1 ? initial.length - 1 : initial.length)
          tree1.bulkInsert(inserted)
          for (const item of inserted) {
            tree2.insert(item)
          }
          should().equal(tree1.root, tree2.root)
        }
      }
    }).timeout(10000)

    it('should fail to insert too many elements', () => {
      const { partialTree } = getTestTrees(2, [1, 2, 3, 4], 3)
      const call = () => partialTree.bulkInsert([5, 6, 7])
      should().throw(call, 'Tree is full')
    })
    it('should bypass empty elements', () => {
      const elements = [1, 2, 3, 4]
      const { partialTree } = getTestTrees(2, elements, 3)
      partialTree.bulkInsert([])
      should().equal(partialTree.elements.length, elements.length, 'No elements inserted')
    })
  })
  describe('#update', () => {
    it('should update last element', () => {
      const { fullTree, partialTree } = getTestTrees(10, [1, 2, 3, 4, 5], 3)
      partialTree.update(4, 42)
      fullTree.update(4, 42)
      should().equal(partialTree.root, fullTree.root)
    })


    it('should update odd element', () => {
      const { fullTree, partialTree } = getTestTrees(10, [1, 2, 3, 4, 5, 6, 7, 8], 3)
      partialTree.update(4, 42)
      fullTree.update(4, 42)
      should().equal(partialTree.root, fullTree.root)
    })

    it('should update even element', () => {
      const { fullTree, partialTree } = getTestTrees(10, [1, 2, 3, 4, 5, 6, 7, 8], 3)
      partialTree.update(3, 42)
      fullTree.update(3, 42)
      should().equal(partialTree.root, fullTree.root)
    })

    it('should update extra element', () => {
      const { fullTree, partialTree } = getTestTrees(10, [1, 2, 3, 4, 5], 3)
      partialTree.update(5, 6)
      fullTree.update(5, 6)
      should().equal(fullTree.root, partialTree.root)
    })

    it('should fail to update incorrect index', () => {
      const { partialTree } = getTestTrees(10, [1, 2, 3, 4, 5], 4)
      should().throw((() => partialTree.update(-1, 42)), 'Insert index out of bounds: -1')
      should().throw((() => partialTree.update(6, 42)), 'Insert index out of bounds: 6')
      should().throw((() => partialTree.update(2, 42)), 'Index 2 is below the edge: 3')
      // @ts-ignore
      should().throw((() => partialTree.update('qwe', 42)), 'Insert index out of bounds: qwe')
    })

    it('should fail to update over capacity', () => {
      const { partialTree } = getTestTrees(2, [1, 2, 3, 4], 2)
      const call = () => partialTree.update(4, 42)
      should().throw(call, 'Insert index out of bounds: 4')
    })
  })
  describe('#indexOf', () => {
    it('should return same result as full tree', () => {
      const { fullTree, partialTree } = getTestTrees(10, [1, 2, 3, 4, 5, 6, 7, 8], 4)
      should().equal(partialTree.indexOf(5), fullTree.indexOf(5))
    })

    it('should find index', () => {
      const { partialTree } = getTestTrees(10, [1, 2, 3, 4, 5], 3)
      should().equal(partialTree.indexOf(3), 2)
    })

    it('should work with comparator', () => {
      const { partialTree } = getTestTrees(10, [1, 2, 3, 4, 5], 3)
      should().equal(partialTree.indexOf(4, (arg0, arg1) => arg0 === arg1), 3)
    })

    it('should return -1 for non existent element', () => {
      const { partialTree } = getTestTrees(10, [1, 2, 3, 4, 5], 3)
      should().equal(partialTree.indexOf(42), -1)
    })
  })

  describe('#getters', () => {
    it('should return capacity', () => {
      const levels = 10
      const capacity = levels ** 2
      const { fullTree, partialTree } = getTestTrees(levels, [1, 2, 3, 4, 5], 3)
      should().equal(fullTree.capacity, capacity)
      should().equal(partialTree.capacity, capacity)
    })

    it('should return same elements count as full tree', () => {
      const levels = 20
      const capacity = levels ** 2
      const elements = Array.from({ length: capacity }, (_, i) => i)
      const { fullTree, partialTree } = getTestTrees(levels, elements, 200)
      should().equal(partialTree.elements.length, fullTree.elements.length)
    })

    it('should return copy of layers', () => {
      const { partialTree } = getTestTrees(10, [1, 2, 3, 4, 5], 3)
      const layers = partialTree.layers
      should().not.equal(layers, partialTree.layers)
    })

    it('should return copy of zeros', () => {
      const { partialTree } = getTestTrees(10, [1, 2, 3, 4, 5], 3)
      const zeros = partialTree.zeros
      should().not.equal(zeros, partialTree.zeros)
    })
  })

  describe('#path', () => {

    it('should return path for known nodes', () => {
      const levels = 20
      const capacity = levels ** 2
      const elements = Array.from({ length: capacity }, (_, i) => i)
      const { fullTree, partialTree } = getTestTrees(levels, elements, 250)
      assert.deepEqual(fullTree.path(250), partialTree.path(250))
    })

    it('should fail on incorrect index', () => {
      const { partialTree } = getTestTrees(10, [1, 2, 3, 4, 5, 6, 7, 8, 9], 5)
      should().throw((() => partialTree.path(-1)), 'Index out of bounds: -1')
      should().throw((() => partialTree.path(10)), 'Index out of bounds: 10')
      should().throw((() => partialTree.path('qwe')), 'Index out of bounds: qwe')
    })

    it('should fail if index is below edge', () => {
      const { partialTree } = getTestTrees(10, [1, 2, 3, 4, 5, 6, 7, 8, 9], 5)
      const call = () => partialTree.path(2)
      should().throw(call, 'Index 2 is below the edge: 4')
    })
  })

  describe('#serialize', () => {
    it('should work', () => {
      const { partialTree } = getTestTrees(5, [1, 2, 3, 4, 5, 6, 7, 8, 9], 6)
      const data = partialTree.serialize()
      const dst = PartialMerkleTree.deserialize(data)
      should().equal(partialTree.root, dst.root)

      partialTree.insert(10)
      dst.insert(10)

      should().equal(partialTree.root, dst.root)
    })
  })
  describe('#toString', () => {
    it('should return correct stringified representation', () => {
      const { partialTree } = getTestTrees(5, [1, 2, 3, 4, 5, 6, 7, 8, 9], 6)
      const str = partialTree.toString()
      const dst = PartialMerkleTree.deserialize(JSON.parse(str))
      should().equal(partialTree.root, dst.root)

      partialTree.insert(10)
      dst.insert(10)

      should().equal(partialTree.root, dst.root)
    })
  })
})

