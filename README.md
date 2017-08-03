```
// In this file I'll outline and implement a pattern for small-step programming language interpreters that
// allows for incremental evaluation, state (de)serialization (e.g. to disk), pausing/resuming,
// and is not tied to the actual call stack (in effect by creating a trampoline, as a side effect
// of the incremental step function.)
//
// It follows that it is easy to implement other non-trivial control flow, such as continuations (e.g. call/cc, exceptions, ...).
// It's also a fair bit nicer/easier than specifying a bytecode language / virtual machine and code generator / interpreter.
//
// At a high level, the idea is that we have a stack of states (which consist of an AST node, the currently evaluated value,
// and some contextual bookkeeping state), and an iterative step function for each AST node type.
// At each evaluation step, we run the step function on the state at the top of the state stack.
// The step function uses the state to determine where it is in evaluation; e.g. for a binary operator expression,
// it would check if the left hand side has been evaluated yet (if not, push it onto the stack and evaluate it),
// if the right hand side has been evaluated, or if both are evaluated and we can return a result.
//
// In this way, all of our interpreter state (the state stack and if we've halted) is plain serializable data,
// and the state itself keeps track of where we are in the computation -- so we're free to leave off anywhere,
// even across interpreter runs.
//
// The idea here outlines a "small-step operational interpreter".
// See < http://matt.might.net/articles/writing-an-interpreter-substitution-denotational-big-step-small-step >
// for more information.
//
// Unfortunately I don't see this style of interpreter used very often, and I was only recently made aware of it.
// It's high time we spread it!
```

See [inty.ts](inty.ts) for the full guide.

See [Architectures for interpreters: Substitutional, denotational, big-step and small-step](http://matt.might.net/articles/writing-an-interpreter-substitution-denotational-big-step-small-step) for more information on this style of interpreter, and more information.
