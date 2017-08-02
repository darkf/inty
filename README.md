```
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
```

See [inty.ts](inty.ts) for the full guide.