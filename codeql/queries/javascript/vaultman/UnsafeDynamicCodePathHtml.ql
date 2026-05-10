/**
 * @name Unsafe dynamic code, path, or HTML sink
 * @description Dynamic code execution, raw HTML writes, and untrusted vault paths should use explicit approved helpers.
 * @kind problem
 * @problem.severity warning
 * @precision high
 * @id vaultman/unsafe-dynamic-code-path-html
 * @tags security
 *       maintainability
 */

import javascript

private predicate isStringLiteral(Expr expr) {
  expr.stripParens() instanceof StringLiteral
}

private predicate hasIdentifierCallee(InvokeExpr invoke, string name) {
  invoke.getCallee().stripParens().(Identifier).getName() = name
}

private predicate isApprovedHtmlExpr(Expr expr) {
  exists(CallExpr call |
    call = expr.stripParens() and
    hasIdentifierCallee(call, "sanitizeHtml")
  ) or
  exists(CallExpr call |
    call = expr.stripParens() and
    hasIdentifierCallee(call, "trustedHtml")
  ) or
  exists(CallExpr call |
    call = expr.stripParens() and
    hasIdentifierCallee(call, "renderTrustedHtml")
  )
}

private predicate isDynamicHtmlExpr(Expr expr) {
  not isStringLiteral(expr) and
  not isApprovedHtmlExpr(expr)
}

private predicate isApprovedVaultPathExpr(Expr expr) {
  exists(CallExpr call |
    call = expr.stripParens() and
    hasIdentifierCallee(call, "safeVaultPath")
  ) or
  exists(CallExpr call |
    call = expr.stripParens() and
    hasIdentifierCallee(call, "resolveVaultPath")
  ) or
  exists(CallExpr call |
    call = expr.stripParens() and
    hasIdentifierCallee(call, "assertVaultPath")
  )
}

private predicate isDynamicVaultPathExpr(Expr expr) {
  not isStringLiteral(expr) and
  not isApprovedVaultPathExpr(expr)
}

private predicate isDynamicImportSourceExpr(Expr expr) {
  not isStringLiteral(expr)
}

private predicate isAdapterReceiver(Expr receiver) {
  receiver.stripParens().(Identifier).getName() = "adapter" or
  receiver.stripParens().(PropAccess).getPropertyName() = "adapter"
}

private predicate isVaultReceiver(Expr receiver) {
  receiver.stripParens().(Identifier).getName() = "vault" or
  receiver.stripParens().(PropAccess).getPropertyName() = "vault"
}

private predicate isUnsafeDynamicCodeSink(Expr sink, string message) {
  exists(CallExpr call |
    sink = call and
    hasIdentifierCallee(call, "eval") and
    message = "Avoid eval; route dynamic expressions through an explicit parser or allowlisted interpreter."
  ) or
  exists(NewExpr newFunction |
    sink = newFunction and
    hasIdentifierCallee(newFunction, "Function") and
    message = "Avoid the Function constructor; route dynamic expressions through an explicit parser or allowlisted interpreter."
  ) or
  exists(CallExpr call |
    sink = call and
    hasIdentifierCallee(call, "Function") and
    message = "Avoid the Function constructor; route dynamic expressions through an explicit parser or allowlisted interpreter."
  ) or
  exists(DynamicImportExpr importExpr |
    sink = importExpr and
    isDynamicImportSourceExpr(importExpr.getSource()) and
    message = "Dynamic import paths should be literal or handled through an approved module resolver."
  )
}

private predicate isUnsafeDynamicHtmlSink(Expr sink, string message) {
  exists(AssignExpr assign, PropAccess prop |
    sink = assign and
    prop = assign.getTarget() and
    prop.getPropertyName() = ["innerHTML", "outerHTML"] and
    isDynamicHtmlExpr(assign.getRhs()) and
    message = "Raw dynamic HTML should not be assigned to innerHTML or outerHTML; use textContent or an approved sanitizer."
  ) or
  exists(MethodCallExpr call |
    sink = call and
    call.getMethodName() = "insertAdjacentHTML" and
    isDynamicHtmlExpr(call.getArgument(1)) and
    message = "Raw dynamic HTML should not flow into insertAdjacentHTML; use textContent or an approved sanitizer."
  )
}

private predicate isAdapterPathCall(MethodCallExpr call) {
  isAdapterReceiver(call.getReceiver()) and
  (
    call.getMethodName() = ["read", "write", "remove", "exists", "mkdir", "rmdir", "list", "stat"] and
    isDynamicVaultPathExpr(call.getArgument(0))
    or
    call.getMethodName() = ["rename", "copy"] and
    (
      isDynamicVaultPathExpr(call.getArgument(0)) or
      isDynamicVaultPathExpr(call.getArgument(1))
    )
  )
}

private predicate isVaultPathCall(MethodCallExpr call) {
  isVaultReceiver(call.getReceiver()) and
  (
    call.getMethodName() = ["getAbstractFileByPath", "getFileByPath", "getFolderByPath", "create", "createFolder", "createBinary"] and
    isDynamicVaultPathExpr(call.getArgument(0))
    or
    call.getMethodName() = ["rename", "copy"] and
    isDynamicVaultPathExpr(call.getArgument(1))
  )
}

private predicate isUnsafeDynamicPathSink(Expr sink, string message) {
  exists(MethodCallExpr call |
    sink = call and
    (
      isAdapterPathCall(call) or
      isVaultPathCall(call)
    ) and
    message = "Dynamic vault paths should pass through an approved path guard before vault or adapter filesystem calls."
  )
}

from Expr sink, string message
where
  isUnsafeDynamicCodeSink(sink, message) or
  isUnsafeDynamicHtmlSink(sink, message) or
  isUnsafeDynamicPathSink(sink, message)
select sink, message
