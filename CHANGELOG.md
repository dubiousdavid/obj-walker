# 1.8.0

- Pass `Node` as second argument to `walker`'s `traverse` option. This allows for greater flexibility in the traversal fn.

# 1.7.0

- Changed `truncate` options from `maxDepth` back to `depth` since `console.dir` uses this name. Also,
  you should probably prefer [dtrim](https://www.npmjs.com/package/dtrim).

# 1.6.0

- Added `walkieAsync` for walking async.

# 1.5.0

- Changed `truncate` options from `depth` to `maxDepth` and allow `replaceWith` to be anything.

# 1.4.0

- Added `truncate` for truncating deep objects.

# 1.3.0

- Make `options` required for `compact`.

# 1.2.0

- Added `compact` for cleaning up objects/arrays.

# 1.1.1

- Apply mapping fn to the root node for preorder and postorder `map`.

# 1.1.0

- Factor out common code.

# 1.0.0

- Remove `traverse` option from all mapping fns.
- `findNode` fn.
- `flatten` fn.

# 0.0.9

- Custom `shouldSkip` fn for `map` and `mapLeaves`.

# 0.0.8

- Deep clone object for `map`. Allow `postOrder` option.

# 0.0.7

- `map` iterates over output.
- Added `walkie`.
- Removed `mapKV`.

# 0.0.6

- Generic `walker` fn.

# 0.0.5

- Renamed argument.

# 0.0.4

- Fixed `traverse` type.

# 0.0.3

- Fixed `traverse` logic.

# 0.0.2

- Fixed bug regarding first-level leaves for `addRefs`.

# 0.0.1

- Initial release.
