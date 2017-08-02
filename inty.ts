// In this file I'll outline and implement a pattern for programming language interpreters that
// allows for incremental evaluation, state (de)serialization (e.g. to disk), pausing/resuming,
// and is not tied to the actual call stack (in effect by creating a trampoline, as a side effect
// of the incremental step function.)
//
// It follows that it is easy to implement other non-trivial control flow, such as continuations (e.g. call/cc, exceptions, ...).
// It's also a fair bit nicer/easier than specifying a bytecode language / virtual machine and code generator / interpreter.
//
// The idea here is based off of how < https://github.com/NeilFraser/JS-Interpreter > works.
// I have not seen this pattern elsewhere, nor do I know of a name for it, so I will give credit there.

/* This file is licensed under the terms of the ISC license, which follows.

Copyright (c) 2017 darkf

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

*/

// With that out of the way, let's begin...

// Define our AST nodes.

// Literal number value
interface LiteralNode {
    kind: "literal";
    value: number;
}

// Binary operator expression, `a + b` or `a * b`
interface BinOpNode {
    kind: "binop";
    op: string;
    left: ASTNode;
    right: ASTNode;
}

// Print statement, e.g. `print 42`
interface PrintNode {
    kind: "print";
    expr: ASTNode;
}

// Statements of a program
interface ProgramNode {
    kind: "program";
    stmts: ASTNode[];
}

type ASTNode = ProgramNode | PrintNode | LiteralNode | BinOpNode;

// Representation of values for our interpreted language
type Value = number;

// The state of evaluation of a particular AST node (thus: the node, any context keeping track of where evaluation is,
//   and the current expression value, if any.)
interface State<NodeType> {
    node: NodeType;
    ctx: any; // Contextual state object; differs depending on node
    value?: Value;
}

class Interpreter {
    stateStack: State<ASTNode>[] = [];
    halted: boolean = false;

    constructor(ast: ASTNode) {
        // Start top-down by evaluating the whole program
        this.pushState(ast);
        this.halted = false;
    }

    serialize(): string {
        // Serialize the interpreter state so that we can later deserialize and resume where we left off
        return JSON.stringify(this);
    }

    static deserialize(state: string): Interpreter {
        const interpState = JSON.parse(state);
        // Construct a fresh Interpreter instance
        const interp = new Interpreter(null as any);
        interp.stateStack = interpState.stateStack; // Replace its state stack with the serialized one
        interp.halted = interpState.halted; // And if it was halted
        return interp;
    }

    tos() { // Get the state on the top of the stack
        console.assert(this.stateStack.length > 0, "Stack underflow");
        return this.stateStack[this.stateStack.length - 1];
    }

    pushState(node: ASTNode) {
        this.stateStack.push({ node, ctx: {} });
    }

    popState() { return this.stateStack.pop(); }

    step(): boolean {
        // Evaluate a step in the state on top of the stack
         
        const state = this.tos();
        console.log("Evaluating", state.node.kind, "node");

        // Evaluate its step function, observing any value it returns
        const value = (<any>this)["step_" + state.node.kind](state);

        // Pass the value up the stack
        if(value !== undefined)
            this.tos().value = value;

        // Return true if we can continue evaluating
        return !this.halted;
    }

    run() {
        while(this.step()) { }
        return this.tos().value;
    }

    // Evaluation step functions for each AST node

    step_program(state: State<ProgramNode>) {
        // Iteratively evaluate each statement in the program

        // Push the next node onto the state stack for evaluation
        state.ctx.index = state.ctx.index || 0;
        const node = state.node.stmts[state.ctx.index++];

        if(node)
            this.pushState(node);
        else { // Done executing all statements
            this.halted = true;

            // Leave the program node on the stack so that we can observe its value (or run the program again)
        }
    }

    step_literal(state: State<LiteralNode>) {
        // The most elementary example: simply return a literal value unchanged.

        // Pop the literal state off of the stack, as we're done with it.
        this.popState();

        // Return the value to the state directly below us in the stack.
        return state.node.value;
    }

    step_print(state: State<PrintNode>) {
        // Print statement

        if(!state.ctx.exprDone) { // Evaluate expr, if we haven't already
            this.pushState(state.node.expr);
            state.ctx.exprDone = true;
            return;
        }

        // Print
        console.log(">", state.value);

        // Pop the print state off the stack, as we're done.
        this.popState();
    }

    step_binop(state: State<BinOpNode>) {
        // As you can see, each step function is just a finite state machine with states recording
        // what has or has not been evaluated yet.

        state.ctx.state = state.ctx.state || 0;

        if(state.ctx.state === 0) { // Evaluate left
            this.pushState(state.node.left);
            state.ctx.state++;
        }
        else if(state.ctx.state === 1) { // Evaluate right
            // The evaluation of left should leave us with its value in state.value (since we were directly below it on the stack.)
            // Preserve the value here to use later.
            state.ctx.left = state.value;

            this.pushState(state.node.right);
            state.ctx.state++;
        }
        else { // Evaluate and return the result (which in turn gives the value to the state directly below us in the stack.)
            this.popState(); // Pop BinOp state, we're done with it.
            return (<any>{"+": (a: Value, b: Value) => a + b,
                          "*": (a: Value, b: Value) => a * b})[state.node.op](state.ctx.left, state.value);
        }
    }
}

// Quick test
const program: ASTNode = {kind: "program", stmts: [
    // print 40+2
    {kind: "print", expr: {kind: "binop", op: "+", left: {kind: "literal", value: 40}, right: {kind: "literal", value: 2}}},

    // print (1+4) * 5
    {kind: "print", expr: {kind: "binop", op: "*",
        left: {kind: "binop", op: "+", left: {kind: "literal", value: 1}, right: {kind: "literal", value: 4}},
        right: {kind: "literal", value: 5}
    }},
]};

// We could evaluate it right here, right now:
// console.log("Result:", new Interpreter(program).run());

// Instead, we're going to test our (de)serialization. First, let's run it enough to evaluate the first print statement:
const interp = new Interpreter(program);
for(let i = 0; i < 8; i++) interp.step();

// Then let's serialize it into a string
const state = interp.serialize();

console.log("\nPaused!\n");

// Now let's ignore the currently "running" interpreter and construct a new one from the serialized state:
const newInterp = Interpreter.deserialize(state);

// And run! It should evaluate the second print statement now, from where it left off.
newInterp.run();
