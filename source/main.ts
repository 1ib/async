import * as ts from "typescript"
import { $$raw, RawContext } from "ts-macros"

function $asyncify(fn: Function) {
    return $$raw!(
        (ctx: RawContext, fnAst: ts.FunctionExpression | ts.ArrowFunction) => {
            const ts = ctx.ts
            const factory = ctx.factory
            function isInsideAsyncFunctionOrMethod(node: ts.Node): boolean {
              while (node) {
                if (ts.isSourceFile(node)) return false;
                if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
                  return Boolean(node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.AsyncKeyword));
                }
                node = node.parent;
              }
              return false;
            }
            function transformCallExpressionsToAwait(node: ts.Node): ts.Node {
                const visit = (node: ts.Node): ts.Node => {
                    if (ts.isCallExpression(node) && isInsideAsyncFunctionOrMethod(node)) {
                        return ts.factory.createAwaitExpression(node)
                    }
                    return ts.visitEachChild(
                        node,
                        (child) => visit(child),
                        undefined,
                    )
                }
                return ts.visitNode(node, visit)
            }
            if (ts.isArrowFunction(fnAst)) {
                let asyncFnAst = factory.updateArrowFunction(
                    fnAst,
                    [
                        factory.createModifier(
                            ts.SyntaxKind.AsyncKeyword,
                        ),
                    ],
                    fnAst.typeParameters,
                    fnAst.parameters,
                    fnAst.type,
                    fnAst.equalsGreaterThanToken,
                    fnAst.body || ts.factory.createBlock([]),
                ) as unknown as ts.Expression

                return transformCallExpressionsToAwait(
                    factory.createExpressionStatement(asyncFnAst),
                )
            }

            if (ts.isFunctionExpression(fnAst)) {
                let asyncFnAst = factory.updateFunctionExpression(
                    fnAst,
                    [
                        factory.createModifier(
                            ts.SyntaxKind.AsyncKeyword,
                        ),
                    ],
                    fnAst.asteriskToken,
                    fnAst.name,
                    fnAst.typeParameters,
                    fnAst.parameters,
                    fnAst.type,
                    fnAst.body || ts.factory.createBlock([]),
                ) as unknown as ts.Expression

                return transformCallExpressionsToAwait(
                    factory.createExpressionStatement(asyncFnAst),
                )
            }
        },
    )
}

$asyncify!(function foo() {
  function foo1() {    return console.log(1)
  }
    return console.log(1)
})

const foo2 = $asyncify!(() => {
    return console.log(2)
})

const foo3 = $asyncify!(function () {
    return console.log(3)
})
