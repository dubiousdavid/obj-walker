export interface Options {
  postOrder?: boolean
  jsonCompat?: boolean
  traverse?(val: any, node?: Node): any
}

export interface WalkOptions extends Options {
  leavesOnly?: boolean
}

export type MapOptions = Omit<Options, 'traverse'> & {
  shouldSkip?(val: any, node: Node): boolean
}

export type RefOptions = Pick<Options, 'traverse'>

export interface Node {
  key: string | undefined
  val: any
  parents: any[]
  path: string[]
  isLeaf: boolean
  // Useful for postorder traversals to know when you're at the root
  isRoot: boolean
}

export type WalkFn = (node: Node) => void
export type AsyncWalkFn = (node: Node) => void | Promise<void>
export type FindFn = (node: Node) => boolean
export type Mapper = (node: Node) => any

export type WalkieAsync = (
  obj: object,
  walkFn: AsyncWalkFn,
  options?: WalkOptions
) => Promise<object>

export type Map = (obj: object, mapper: Mapper, options?: MapOptions) => object

export type FindNode = (
  obj: object,
  findFn: FindFn,
  options?: Options
) => Node | undefined

export type MapInternal = (
  obj: object,
  mapper: Mapper,
  options: Required<MapOptions>
) => object

export interface FlattenOptions {
  separator?: string
}

export type Flatten = (
  obj: object,
  options?: WalkOptions & FlattenOptions
) => Record<string, any>

export type NextNode = (
  currentNode: Node,
  entry: [string, any],
  isLeaf: (x: any, node: Node) => boolean
) => Node

export interface CompactOptions {
  removeUndefined?: boolean
  removeNull?: boolean
  removeEmptyString?: boolean
  removeFalse?: boolean
  removeNaN?: boolean
  removeEmptyObject?: boolean
  removeEmptyArray?: boolean
  compactArrays?: boolean
}

export type Compact = (obj: object, options: CompactOptions) => object

export interface TruncateOptions {
  depth: number
  replaceWith?: any
}

export type Truncate = (obj: object, options: TruncateOptions) => object
