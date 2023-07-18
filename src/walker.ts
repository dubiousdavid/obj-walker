import { set, unset } from 'lodash'
import _ from 'lodash/fp'
import {
  Compact,
  WalkFn,
  Map,
  Options,
  Node,
  MapOptions,
  WalkOptions,
  MapInternal,
  FindNode,
  Flatten,
  NextNode,
  CompactOptions,
  Truncate,
  WalkieAsync,
} from './types'
import {
  isObjectOrArray,
  defShouldSkip,
  defTraverse,
  getRoot,
  parentIsArray,
} from './util'

const nextNode: NextNode = (currentNode, entry, isLeaf) => {
  const [key, val] = entry
  const { val: currentVal, parents, path } = currentNode
  const nodeParents = [currentVal, ...parents]
  const nodePath = [...path, key]
  return {
    key,
    val,
    parents: nodeParents,
    path: nodePath,
    isLeaf: isLeaf(val, currentNode),
    isRoot: false,
  }
}

/**
 * Walk an object depth-first in a preorder (default) or postorder manner.
 * Call walkFn for each node visited. Supports traversing the object in
 * arbitrary ways by passing a traverse fn in options.
 */
export const walker = (obj: object, walkFn: WalkFn, options: Options = {}) => {
  const { postOrder, jsonCompat, traverse = defTraverse } = options
  // A leaf is a node that can't be traversed
  const isLeaf: Options['traverse'] = (...args) => !traverse(...args)
  // Recursively walk object
  const _walk = (node: Node): void => {
    // Preorder
    if (!postOrder) {
      walkFn(node)
    }
    const { val } = node
    const next = traverse(val, node) || []
    for (const entry of Object.entries(next)) {
      _walk(nextNode(node, entry, isLeaf))
    }
    // Postorder
    if (postOrder) {
      walkFn(node)
    }
  }

  _walk(getRoot(obj, jsonCompat))
}

const FOUND = Symbol('FOUND')

/**
 * Search for a node and short-circuit the tree traversal if it's found.
 */
export const findNode: FindNode = (obj, findFn, options = {}) => {
  let node: Node | undefined
  try {
    walker(
      obj,
      (n: Node) => {
        if (findFn(n)) {
          node = n
          throw FOUND
        }
      },
      options
    )
  } catch (e) {
    if (e === FOUND) {
      return node
    }
    throw e
  }
}

const mapPre: MapInternal = (obj, mapper, options) => {
  let result = _.cloneDeep(obj)
  const traverse = defTraverse
  const { jsonCompat, shouldSkip } = options
  // A leaf is a node that can't be traversed
  const isLeaf = _.negate(traverse)
  // Recursively walk object
  const _walk = (node: Node): void => {
    const { isRoot, path } = node
    const newVal = mapper(node)
    // Should skip value
    if (shouldSkip(newVal, node)) {
      unset(result, path)
      return
    }
    if (isRoot) {
      result = newVal
    } else {
      set(result, path, newVal)
    }
    const next = traverse(newVal) || []
    for (const entry of Object.entries(next)) {
      _walk(nextNode(node, entry, isLeaf))
    }
  }
  _walk(getRoot(result, jsonCompat))
  return result
}

const mapPost: MapInternal = (obj, mapper, options) => {
  let result = _.cloneDeep(obj)
  walker(
    result,
    (node) => {
      const { isRoot, path } = node
      const newVal = mapper(node)
      // Should skip value
      if (options.shouldSkip(newVal, node)) {
        unset(result, path)
        return
      }
      if (isRoot) {
        result = newVal
      } else {
        set(result, path, newVal)
      }
    },
    { ...options, postOrder: true }
  )
  return result
}

const setMapDefaults = (options: MapOptions) => ({
  postOrder: options.postOrder ?? false,
  jsonCompat: options.jsonCompat ?? false,
  shouldSkip: options.shouldSkip ?? defShouldSkip,
})

/**
 * Map over an object modifying values with a fn depth-first in a
 * preorder or postorder manner. The output of the mapper fn
 * will be traversed if possible when traversing preorder.
 *
 * By default, nodes will be excluded by returning `undefined`.
 * Undefined array values will not be excluded. To customize
 * pass a fn for `options.shouldSkip`.
 */
export const map: Map = (obj, mapper, options = {}) => {
  if (!isObjectOrArray(obj)) {
    return obj
  }
  const opts = setMapDefaults(options)
  if (options.postOrder) {
    return mapPost(obj, mapper, opts)
  }
  return mapPre(obj, mapper, opts)
}

const buildCompactFilter = (options: CompactOptions) => {
  const fns: ((x: any) => boolean)[] = []

  if (options.removeUndefined) {
    fns.push(_.isUndefined)
  }
  if (options.removeNull) {
    fns.push(_.isNull)
  }
  if (options.removeEmptyString) {
    fns.push((x: any) => x === '')
  }
  if (options.removeFalse) {
    fns.push((x: any) => x === false)
  }
  if (options.removeNaN) {
    fns.push(_.isNaN)
  }
  if (options.removeEmptyObject) {
    fns.push(_.overEvery([_.isPlainObject, _.isEmpty]))
  }
  if (options.removeEmptyArray) {
    fns.push(_.overEvery([_.isArray, _.isEmpty]))
  }
  return _.overSome(fns)
}

/**
 * Compact an object, removing fields recursively according to the supplied options.
 * All option flags are `false` by default. If `compactArrays` is set to `true` arrays
 * will be compacted based on the enabled remove option flags.
 */
export const compact: Compact = (obj, options) => {
  const remove = buildCompactFilter(options)
  const mapper = (node: Node) => {
    let { val } = node
    if (options.compactArrays && Array.isArray(val)) {
      val = _.remove(remove, val)
    }
    if (parentIsArray(node) || !remove(val)) {
      return val
    }
  }
  return map(obj, mapper, { postOrder: true })
}

/**
 * Walk an object depth-first in a preorder (default) or
 * postorder manner. Returns an array of nodes.
 */
export const walk = (obj: object, options: WalkOptions = {}) => {
  const nodes: Node[] = []
  const walkFn = (node: Node) => {
    nodes.push(node)
  }
  walker(obj, walkFn, options)
  // Filter the leaves
  if (options.leavesOnly) {
    return _.filter('isLeaf', nodes)
  }
  return nodes
}

/**
 * Walk-each ~ walkie
 *
 * Walk over an object calling walkFn for each node. The original
 * object is deep-cloned making it possible to simply mutate each
 * node as needed in order to transform the object. The cloned object
 * is returned.
 */
export const walkie = (obj: object, walkFn: WalkFn, options?: WalkOptions) => {
  const clonedObj = _.cloneDeep(obj)
  walk(clonedObj, options).forEach(walkFn)
  return clonedObj
}

/**
 * Like `walkie` but awaits the promise returned by `walkFn` before proceeding to
 * the next node.
 */
export const walkieAsync: WalkieAsync = async (obj, walkFn, options?) => {
  const clonedObj = _.cloneDeep(obj)
  const nodes = walk(clonedObj, options)
  for (const node of nodes) {
    await walkFn(node)
  }
  return clonedObj
}

/**
 * Map over the leaves of an object with a fn. By default, nodes will be excluded
 * by returning `undefined`. Undefined array values will not be excluded. To customize
 * pass a fn for `options.shouldSkip`.
 */
export const mapLeaves: Map = (obj, mapper, options = {}) => {
  if (!isObjectOrArray(obj)) {
    return obj
  }
  const opts = setMapDefaults(options)
  const nodes = walk(obj, { ...opts, leavesOnly: true })
  const result = _.isPlainObject(obj) ? {} : []
  for (const node of nodes) {
    const newVal = mapper(node)
    // Should skip value
    if (opts.shouldSkip(newVal, node)) {
      continue
    }
    set(result, node.path, newVal)
  }
  return result
}

/**
 * Flatten an object's keys. Optionally pass `separator` to determine
 * what character to join keys with. Defaults to '.'.
 */
export const flatten: Flatten = (obj, options = {}) => {
  const nodes = walk(obj, { ...options, leavesOnly: true })
  const separator = options?.separator || '.'
  const result: Record<string, any> = {}
  for (const node of nodes) {
    result[node.path.join(separator)] = node.val
  }
  return result
}

/**
 * Truncate an object replacing nested objects at depth greater
 * than the max specified depth with `replaceWith`. Replace text Defaults
 * to `[Truncated]`.
 *
 * Inspiration: https://www.npmjs.com/package/obj-walker
 */
export const truncate: Truncate = (obj, options) => {
  const depth = options.depth
  const replaceWith =
    'replaceWith' in options ? options.replaceWith : '[Truncated]'
  return map(obj, (node) => {
    const { path, val, isLeaf } = node
    if (!isLeaf && path.length === depth) {
      return replaceWith
    }
    return val
  })
}
