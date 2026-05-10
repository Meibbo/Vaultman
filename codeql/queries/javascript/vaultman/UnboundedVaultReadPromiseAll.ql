/**
 * @name Unbounded vault reads in Promise.all
 * @description Full-vault reads should use a chunker or bounded pool instead of Promise.all over every file.
 * @kind problem
 * @problem.severity warning
 * @precision high
 * @id vaultman/unbounded-vault-read-promise-all
 * @tags performance
 *       maintainability
 */

import javascript

private predicate isFullVaultFileCollectionName(string name) {
  name = ["files", "allFiles", "markdownFiles", "vaultFiles"]
}

private predicate isVaultReceiver(Expr receiver) {
  receiver.getUnderlyingValue().(PropAccess).getPropertyName() = "vault"
}

private predicate isVaultFileListCall(MethodCallExpr call) {
  call.getMethodName() = ["getFiles", "getMarkdownFiles"] and
  isVaultReceiver(call.getReceiver())
}

private predicate isFullVaultFileCollection(Expr receiver) {
  exists(string name |
    name = receiver.getUnderlyingValue().(Identifier).getName() and
    isFullVaultFileCollectionName(name)
  ) or
  exists(MethodCallExpr call |
    call = receiver.stripParens() and
    isVaultFileListCall(call)
  )
}

private predicate isVaultReadCall(MethodCallExpr call) {
  call.getMethodName() = ["read", "cachedRead"] and
  isVaultReceiver(call.getReceiver())
}

private predicate callbackContainsVaultRead(Expr callback) {
  exists(Function fn, MethodCallExpr read |
    (
      fn = callback.stripParens().(FunctionExpr) or
      fn = callback.stripParens().(ArrowFunctionExpr)
    ) and
    read = fn.getBody().getAChild*() and
    isVaultReadCall(read)
  )
}

private predicate isPromiseAll(CallExpr call) {
  call.getCalleeName() = "all" and
  call.getReceiver().getUnderlyingValue().(Identifier).getName() = "Promise"
}

from CallExpr promiseAll, MethodCallExpr mapCall, Expr callback
where
  isPromiseAll(promiseAll) and
  mapCall = promiseAll.getArgument(0).stripParens() and
  mapCall.getMethodName() = "map" and
  isFullVaultFileCollection(mapCall.getReceiver()) and
  callback = mapCall.getArgument(0).stripParens() and
  callbackContainsVaultRead(callback)
select promiseAll,
  "Full-vault reads should use an approved chunker or bounded pool instead of Promise.all over every file."
