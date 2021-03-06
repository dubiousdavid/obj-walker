# obj-walker

Walk objects like this guy.

<img src="./chuck-norris.jpg" alt="Walker, Texas Ranger" width="200"/>

Map over an object in a preorder or postoder depth-first manner.
Also, provides functions for serializing and deserializng
self-referential objects using JSON pointer.

This library is designed to work well with functions that traverse
an object in the same way `JSON.stringify` and `JSON.parse` do. Namely,
preorder and postorder. To mimic that behavior entirely set the `jsonCompat`
option to `true`.

Custom traversal functions are supported. This allows you to walk tree-like
structures, such as JSON schema, in a more efficient and logical way. `map`
does not work particularly well for this use case since the path to set values
may be incomplete. Prefer `walkie` in these scenarios instead.

## walker

```typescript
walker(obj: object, walkFn: WalkFn, options: Options = {}) => void
```

Generic walking fn that traverse an object in preorder (default) or postorder,
calling `walkFn` for each node. Can be used directly, but probably shouldn't.

```typescript
export interface Node {
  key: string | undefined
  val: any
  parents: any[]
  path: string[]
  isLeaf: boolean
  isRoot: boolean
}

export interface Options {
  postOrder?: boolean
  jsonCompat?: boolean
  traverse?(x: any): any
}
```

```typescript
import { walker } from 'obj-walker'

const obj = {
  a: {
    b: 23,
    c: 24,
  },
  d: {
    e: 'Bob',
    f: [10, 20, 30],
  },
}

const nodes: Node[] = []
const walkFn = (node: Node) => {
  nodes.push(node)
}
walker(obj, walkFn, options)
nodes
```

Returns an array of nodes. Note this is how `walk` works, so prefer
that fn.

```typescript
[
  {
    key: undefined,
    parents: [],
    val: { a: { b: 23, c: 24 }, d: { e: 'Bob', f: [10, 20, 30] } },
    path: [],
    isRoot: true,
    isLeaf: false,
  },
  {
    key: 'a',
    val: { b: 23, c: 24 },
    parents: [{ a: { b: 23, c: 24 }, d: { e: 'Bob', f: [10, 20, 30] } }],
    path: ['a'],
    isLeaf: false,
    isRoot: false,
  },
  {
    key: 'b',
    val: 23,
    parents: [
      { b: 23, c: 24 },
      { a: { b: 23, c: 24 }, d: { e: 'Bob', f: [10, 20, 30] } },
    ],
    path: ['a', 'b'],
    isLeaf: true,
    isRoot: false,
  },
  ...
]
```

## walk

```typescript
walk(obj: object, options: WalkOptions = {}) => Node[]
```

Walk an object. Returns an array of all nodes in the object in either
preorder or postorder.

```typescript
export interface WalkOptions extends Options {
  leavesOnly?: boolean
}
```

```typescript
import { walk } from 'obj-walker'

const obj = {
  a: {
    b: 23,
    c: 24,
  },
  d: {
    e: 'Bob',
    f: [10, 20, 30],
  },
}
walk(obj).map((x) => x.path)
```

Produces:

```typescript
;[
  [],
  ['a'],
  ['a', 'b'],
  ['a', 'c'],
  ['d'],
  ['d', 'e'],
  ['d', 'f'],
  ['d', 'f', '0'],
  ['d', 'f', '1'],
  ['d', 'f', '2'],
]
```

## walkie

```typescript
walkie(obj: object, walkFn: WalkFn, options: WalkOptions = {}) => object
```

```typescript
export type WalkFn = (node: Node) => void
```

Walk-each ~ walkie

Walk over an object calling `walkFn` for each node. The original
object is deep-cloned making it possible to simply mutate each
node as needed in order to transform the object. The cloned object
is returned.

Below I want to walk a MongoDB JSON schema and set `additionalProperties` to `true`
wherever it exists. I traverse this tree using a custom `traverse` fn.
The original object is not modified.

```typescript
import { walkie } from 'obj-walker'

const obj = {
  bsonType: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    _id: {
      bsonType: 'objectId',
    },
    name: { bsonType: 'string' },
    addresses: {
      bsonType: 'array',
      items: {
        bsonType: 'object',
        additionalProperties: false,
        properties: {
          address: {
            bsonType: 'object',
            additionalProperties: false,
            properties: {
              zip: { bsonType: 'string' },
              country: { bsonType: 'string' },
            },
          },
        },
      },
    },
  },
}

const traverse = (x: any) => x.properties || (x.items && { items: x.items })
const walkFn = ({ val }: Node) => {
  if (val.hasOwnProperty('additionalProperties')) {
    val.additionalProperties = true
  }
}
walkie(obj, walkFn, { traverse })
```

Produces:

```typescript
{
  bsonType: 'object',
  additionalProperties: true,
  required: ['name'],
  properties: {
    _id: { bsonType: 'objectId' },
    name: { bsonType: 'string' },
    addresses: {
      bsonType: 'array',
      items: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          address: {
            bsonType: 'object',
            additionalProperties: true,
            properties: {
              zip: { bsonType: 'string' },
              country: { bsonType: 'string' },
            },
          },
        },
      },
    },
  },
}
```

## map

Map over an object modifying values with a fn depth-first in a
preorder or postorder manner. The output of the mapper fn
will be traversed if possible when traversing preorder.

By default, nodes will be excluded by returning undefined.
Undefined array values will not be excluded. To customize
pass a fn for options.shouldSkip.

```typescript
map(obj: object, mapper: Mapper, options: MapOptions = {}) => object
```

```typescript
export type Mapper = (node: Node) => any

export interface MapOptions extends Options {
  shouldSkip?(val: any, node: Node): boolean
}
```

```typescript
import { map } from 'obj-walker'

const obj = {
  a: {
    b: 23,
    c: 24,
  },
  d: {
    e: 'Bob',
    f: [10, null, 30, [31, undefined, 32], 40],
  },
  g: [25, '', { h: [null, 26, 27] }],
  i: 'Frank',
}
map(obj, ({ val }) => (Array.isArray(val) ? _.compact(val) : val))
```

Produces:

```typescript
{
  a: { b: 23, c: 24 },
  d: { e: 'Bob', f: [10, 30, [31, 32], 40] },
  g: [25, { h: [26, 27] }],
  i: 'Frank',
}
```

Postorder

```typescript
const obj = {
  bob: {
    scores: ['87', 'x97', 95, false],
  },
  joe: {
    scores: [92, 92.5, '73.2', ''],
  },
  frank: {
    scores: ['abc', ''],
  },
}
const result = map(
  obj,
  ({ val, isLeaf }) => {
    if (isLeaf) {
      return parseFloat(val)
    }
    return Array.isArray(val) ? _.compact(val) : val
  },
  { postOrder: true }
)
```

Produces:

```typescript
{
  bob: { scores: [87, 95] },
  joe: { scores: [92, 92.5, 73.2] },
  frank: { scores: [] },
}
```

Custom `shouldSkip` fn

```typescript
const obj = {
  bob: {
    scores: ['87', 'x97', 95, false],
  },
  joe: {
    scores: [92, 92.5, '73.2', ''],
  },
  frank: {
    scores: ['abc', ''],
  },
}

const shouldSkip = (val: any, node: Node) =>
  _.isEmpty(val) && !parentIsArray(node)
const result = map(
  obj,
  ({ val, isLeaf }) => {
    if (isLeaf) {
      return parseFloat(val)
    }
    return Array.isArray(val) ? _.compact(val) : val
  },
  { postOrder: true, shouldSkip }
)
```

Produces:

```typescript
{
  bob: { scores: [87, 95] },
  joe: { scores: [92, 92.5, 73.2] },
}
```

## mapLeaves

```typescript
mapLeaves(obj: object, mapper: Mapper, options?: MapOptions) => object
```

Map over the leaves of an object with a fn. By default, nodes will be excluded
by returning undefined. Undefined array values will not be excluded. To customize
pass a fn for options.shouldSkip.

```typescript
import { mapLeaves } from 'obj-walker'

const obj = {
  a: {
    b: 23,
    c: 24,
  },
  d: {
    e: 100,
    f: [10, 20, 30],
  },
}
mapLeaves(obj, ({ val }) => val + 1)
```

Produces:

```typescript
{
  a: { b: 24, c: 25 },
  d: { e: 101, f: [11, 21, 31] },
}
```

## addRefs

```typescript
addRefs(obj: object, options?: RefOptions): object
```

Replace duplicate objects refs with pointers to the first
object seen.

```typescript
import { addRefs } from 'obj-walker'

const apiOutput = {
  1: 'foo',
  2: 'bar',
  3: 'baz',
}

const detailsOutput = {
  1: 'bla',
  2: 'bla',
  3: 'bla',
}

const obj = {
  api: {
    input: [1, 2, 3],
    output: apiOutput,
  },
  details: {
    input: apiOutput,
    output: detailsOutput,
  },
  writeToDB: {
    input: detailsOutput,
  },
}
addRefs(obj)
```

Produces:

```typescript
{
  api: {
    input: [1, 2, 3],
    output: { '1': 'foo', '2': 'bar', '3': 'baz' },
  },
  details: {
    input: { $ref: '#/api/output' },
    output: { '1': 'bla', '2': 'bla', '3': 'bla' },
  },
  writeToDB: { input: { $ref: '#/details/output' } },
}
```

## deref

```typescript
deref(obj: object, options?: RefOptions): object
```

Rehydrate objects by replacing refs with actual objects.

```typescript
import { deref } from 'obj-walker'

const obj = {
  api: {
    input: [1, 2, 3],
    output: { '1': 'foo', '2': 'bar', '3': 'baz' },
  },
  details: {
    input: { $ref: '#/api/output' },
    output: { '1': 'bla', '2': 'bla', '3': 'bla' },
  },
  writeToDB: { input: { $ref: '#/details/output' } },
}
deref(obj)
```

Produces:

```typescript
{
  api: {
    input: [1, 2, 3],
    output: { '1': 'foo', '2': 'bar', '3': 'baz' },
  },
  details: {
    input: { '1': 'foo', '2': 'bar', '3': 'baz' },
    output: { '1': 'bla', '2': 'bla', '3': 'bla' },
  },
  writeToDB: { input: { '1': 'bla', '2': 'bla', '3': 'bla' } },
}
```
