# Node.js JavaScript — Functional Coding Style Guide

> **Scope:** Coding conventions for Node.js projects using modern JavaScript and functional programming practices. This document does not prescribe software architecture.
>
> **Status:** Team convention. Mandatory rules use **MUST**; preferences use **SHOULD**.

## 1. Principles

1. **English only in source code:** names, identifiers, errors, test descriptions, log messages, filenames, folders, and API fields MUST be in English. Public contracts may follow an external API's existing naming requirements.
2. **No source-code comments:** no `//`, `/* ... */`, or JSDoc in application code or tests. Express intent through names, decomposition, tests, and external documentation. Legal headers or third-party code required by license are exceptions only when mandatory.
3. **Functional-first:** favor pure functions, immutable transformations, explicit arguments, composable small functions, and functions as values.
4. **Make side effects explicit:** keep pure calculations distinct from operations involving network, filesystem, environment, clocks, randomness, and logging. Do not hide effects behind misleading function names.
5. **Optimize for reading:** descriptive names, early returns, shallow nesting, clear data flow, and predictable errors are more important than clever syntax.
6. **Consistency over novelty:** do not introduce competing patterns for the same concept.
7. **Don't over-engineer:** add abstractions when repeated domain meaning justifies them, not merely to reduce line count.

## 2. Standard language and formatting

| Element | Convention | Example |
| --- | --- | --- |
| Variables and functions | `camelCase` | `customerId`, `calculateTotalCents` |
| Predicate functions and booleans | `is/has/can/should` + description | `isActive`, `hasPermission` |
| Named constants | `UPPER_SNAKE_CASE` for truly global fixed values | `MAX_RETRY_COUNT` |
| Other `const` bindings | `camelCase` | `timeoutMs`, `orderItems` |
| Object keys | `camelCase` unless an external contract mandates otherwise | `createdAt`, `totalCents` |
| Filenames and directories | `kebab-case` | `customer-profile.js`, `payment-gateway/` |
| Environment variables | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `PORT` |
| Module exports | Named exports by default | `export const calculateTotal = ...` |
| Imports | ESM, with `.js` on local relative imports | `import { x } from './x.js';` |
| Indentation | Two spaces, no tabs | Prettier setting |
| Strings | Single quotes in JavaScript | `'active'` |
| Statement terminators | Semicolons | `const limit = 10;` |
| Line width | Aim for 100 characters | Prettier `printWidth` |
| Binding declaration | `const` by default; `let` only when reassignment is necessary | Never use `var` |
| Equality | Strict equality | `===`, `!==` |
| Parameters | Parentheses around arrow parameters | `(order) => ...` |

Use one acronym style consistently: `userId`, `apiUrl`, `httpClient`, `parseJsonResponse`.

Prefer explicit domain units: `timeoutMs`, `priceCents`, `sizeBytes`, `retryCount`.

## 3. Function naming: semantic prefixes

**Names MUST communicate intention and observable behavior, not implementation details.** Use the following meanings consistently:

| Prefix | Meaning | Examples |
| --- | --- | --- |
| `is`, `has`, `can`, `should` | Boolean predicate, no side effect | `isExpired`, `hasAccess`, `canRetry`, `shouldNotify` |
| `get` | Read a known value from an in-memory object/context; do not imply network I/O | `getOrderId`, `getDefaultOptions` |
| `find` | Search for an optional match; return an explicit absence (`null` or `undefined`) | `findItemBySku`, `findUserByEmail` |
| `list` | Return a collection, including an empty one | `listActiveOrders`, `listOrderItems` |
| `fetch` | Retrieve from a remote HTTP/network service | `fetchExchangeRates`, `fetchCustomerProfile` |
| `read` | Read a file or stream | `readConfigFile`, `readReportFile` |
| `load` | Load persisted application state/resources | `loadSavedPreferences`, `loadSnapshot` |
| `calculate`, `compute` | Pure derived or numeric result | `calculateTotalCents`, `computeScore` |
| `build` | Assemble a new value/object without persistence | `buildOrderSummary`, `buildRequestPayload` |
| `make` | Construct a function or closure-based factory | `makePercentageCalculator`, `makeComparator` |
| `create` | Create a domain/resource record, normally persisting it | `createOrder`, `createInvoice` |
| `save` | Persist state; create or replace according to the contract | `saveOrder`, `savePreferences` |
| `update` | Change an existing stored resource | `updateStoredOrderStatus`, `updateCustomerProfile` |
| `with` | Return an immutable copy with one property or aspect modified | `withOrderStatus`, `withDefaultOptions` |
| `remove`, `delete` | Remove a resource or item | `removeItemFromCart`, `deleteOrder` |
| `map`, `transform` | Convert data between structures | `mapOrderToResponse`, `transformCsvRows` |
| `format` | Convert to display-oriented representation | `formatCurrency`, `formatOrderDate` |
| `normalize` | Convert into canonical representation | `normalizeEmail`, `normalizePhoneNumber` |
| `parse` | Parse a string or external representation; may throw for invalid syntax | `parseJsonBody`, `parseIsoDate` |
| `safeParse`, `tryParse` | Parse while reporting failure as data, without throwing | `safeParsePayload` |
| `validate` | Return structured validation outcome, rather than silently modifying data | `validateOrderInput` |
| `assert` | Throw if a contract/invariant is violated | `assertValidOrder`, `assertAuthenticated` |
| `ensure` | Establish an invariant, possibly creating or changing state | `ensureDirectoryExists` |
| `handle` | Respond to a specific event or callback | `handlePaymentEvent`, `handleConnectionClose` |
| `register` | Register a listener, hook, or callback | `registerSignalHandler`, `registerEventListener` |
| `serialize`, `deserialize` | Convert to/from a transport or storage representation | `serializeOrder`, `deserializeSession` |

**Verb precedence:** distinguish `buildOrder()` (constructs data), `createOrder()` (causes a creation effect), `findOrderById()` (optional result), and `fetchOrderById()` (network request). Choose a verb that describes the observable behavior and return contract; a function may be asynchronous without including `Async` in its name.

## 4. Function suffixes and qualifiers

Use qualifiers only when they add information that a caller needs:

| Suffix/pattern | Meaning | Example |
| --- | --- | --- |
| `ById`, `ByEmail`, `BySku` | Lookup criterion | `findOrderById`, `findUserByEmail` |
| `ForUser`, `ForOrder` | Target context | `calculateDiscountForUser` |
| `FromJson`, `FromRecord` | Input representation | `buildOrderFromRecord` |
| `ToJson`, `ToResponse` | Output representation | `mapOrderToResponse` |
| `WithDetails`, `WithItems` | Meaningful inclusion/variant | `fetchOrderWithItems` |
| `OrThrow` | Throw instead of returning an absent value | `findOrderByIdOrThrow` |
| `IfExists`, `IfPresent` | Conditional action | `deleteFileIfExists` |
| `Batch`, `InBatch` | Explicit bulk operation | `updateOrdersInBatch` |
| `Cents`, `Ms`, `Bytes` | Measurement unit | `calculateFeeCents`, `getTimeoutMs` |

Avoid suffixes that merely restate implementation: `Async`, `Function`, `Method`, `Helper`, `Util`, `Manager`, `Processor`, `Data`, `Info`, `New`, `V2`.

Avoid mixing signals: a `safeParse*` function must not throw on ordinary malformed input; `*OrThrow` must be explicit about the throwing behavior. Do not append `Async` just because a function returns a `Promise`.

## 5. Variables, data structures, and parameter naming

- Name data for its domain meaning: `order`, `customer`, `lineItems`, `subtotalCents`, not `data`, `obj`, `payload2`, `tmp`, `res1`.
- Use plural for collections: `orders`, `activeUsers`, `paymentMethods`.
- Use descriptive singular names in iteration: `orders.map((order) => ...)`, not `orders.map((o) => ...)`.
- Name IDs, dates, flags, and quantities explicitly: `orderId`, `createdAt`, `isEnabled`, `maxAttempts`.
- Name callback parameters and functions by purpose: `getCurrentTime`, `sendRequest`, `writeLog`, `compareItems`.
- Use objects for options when several optional or same-type arguments would otherwise be ambiguous.
- Destructure parameters when it increases readability; keep the original object when its domain identity matters.
- Prefer `null` for deliberate “not found” results from a function contract and `undefined` for omitted optional properties. Define the contract consistently.
- Do not use magic numbers or mysterious strings; name domain constants near their usage.

```js
const MAX_RETRY_COUNT = 3;

const isEligibleForDiscount = ({ isActive, totalSpentCents }) =>
  isActive && totalSpentCents >= 100_000;

const buildOrderSummary = ({ orderId, items }) => ({
  orderId,
  itemCount: items.length,
  totalCents: calculateOrderTotalCents(items),
});
```

## 6. Functional programming rules

1. Prefer functions and module exports over classes and inheritance for application logic.
2. Keep pure domain functions deterministic: same inputs, same output, with no I/O, ambient state, time, or randomness.
3. Never mutate a function's input arrays or objects. Return updated copies.
4. Keep pure transformations distinguishable from functions that perform I/O. Asynchronous functions may use `async`/`await`.
5. Pass time, randomness, and other changing values as explicit arguments when determinism is important.
6. Prefer clear built-ins such as `map`, `filter`, `reduce`, `some`, and `every` when appropriate; a readable `for...of` loop is preferable to a contorted chain.
7. Do not chain operations solely to appear functional. Keep intermediate values when they clarify intent.
8. Avoid global mutable state and hidden module initialization side effects.
9. Favor composition over single-use utility wrappers and excessive currying.
10. Avoid `Object.freeze()` everywhere as a substitute for actual immutable design.

### Pure computation

```js
export const calculateOrderTotalCents = (items) =>
  items.reduce(
    (totalCents, { unitPriceCents, quantity }) =>
      totalCents + unitPriceCents * quantity,
    0,
  );

export const addOrderItem = (items, newItem) => [...items, newItem];

export const withOrderStatus = (order, status) => ({
  ...order,
  status,
});
```

Here `withOrderStatus` produces a copy and does not write to storage. A function named `updateStoredOrderStatus` would indicate a persistence effect.

### Composing pure functions

```js
export const calculateSubtotalCents = (items) =>
  items.reduce((total, item) => total + item.priceCents * item.quantity, 0);

export const calculateDiscountCents = (subtotalCents, discountRate) =>
  Math.round(subtotalCents * discountRate);

export const calculateTotalAfterDiscountCents = (items, discountRate) => {
  const subtotalCents = calculateSubtotalCents(items);
  const discountCents = calculateDiscountCents(subtotalCents, discountRate);

  return subtotalCents - discountCents;
};
```

These functions depend only on their arguments, making their outputs predictable and testable.

## 7. Functions and control flow

- One function should express one cohesive responsibility, not an arbitrary maximum line count.
- Favor guard clauses and early returns over nested conditionals.
- Prefer named intermediate values over deeply nested ternaries.
- Use arrow functions for values/closures and named function declarations when they communicate recursion or clarify a stack trace.
- Use `async`/`await` for multi-step asynchronous logic; return promises directly for simple forwarding.
- Avoid boolean flags that switch a function's purpose; split into intention-revealing functions.
- Never swallow errors silently or return magic values such as `false` for unrelated failure modes.
- Use optional chaining and nullish coalescing when absence is expected; do not hide invalid input with defaults.

```js
export const calculateShippingCents = ({ subtotalCents, isDomestic }) => {
  if (!isDomestic) return 3_000;
  if (subtotalCents >= 20_000) return 0;
  return 1_200;
};
```

## 8. Errors and asynchronous operations

- Throw `Error` objects or meaningful error subclasses/structured domain errors, never raw strings.
- Validate untrusted input before using it in calculations, requests, or file operations.
- Define an error contract per function: throw/reject for exceptional failures; use an explicit result shape for expected validation failures when appropriate.
- Preserve causes when translating errors: `new Error(message, { cause: error })`.
- Catch errors where they can be handled, translated, retried, or logged meaningfully. Avoid redundant catch-and-rethrow.
- Never expose credentials, tokens, passwords, sensitive payloads, or stack traces in public responses.
- Use `Promise.all` for independent concurrent operations; use sequential `await` when order matters. Consider `Promise.allSettled` when partial completion is expected.
- Avoid unbounded concurrency and synchronous expensive filesystem/CPU work in request handling.
- Propagate cancellation/timeouts when supported (e.g. `AbortSignal` for network calls).
- Prefer consistent structured logging instead of scattered `console.log`.

```js
export const fetchCustomerProfile = async ({ customerId, signal, baseUrl }) => {
  const response = await fetch(`${baseUrl}/customers/${customerId}`, { signal });

  if (!response.ok) {
    throw new Error(`Failed to fetch customer: ${response.status}`);
  }

  return response.json();
};
```

Treat `customerId` and `baseUrl` as validated inputs before calling this function; encode URL path segments when interpolating arbitrary external values.

## 9. File naming and import conventions

- Use `kebab-case` for JavaScript files and directories: `calculate-order-total-cents.js`, `normalize-email.js`.
- Prefer descriptive names that match the purpose of the file; avoid `utils.js`, `helpers.js`, `common.js`, and `misc.js` when the content can be named precisely.
- Prefer `*.test.js` for tests, `*.integration.test.js` for integration tests, and `*.config.js` for configuration files when useful.
- Keep file suffixes semantically meaningful rather than creating a suffix for every implementation detail.
- Avoid circular imports.
- Use `.js` on relative ESM imports: `import { normalizeEmail } from './normalize-email.js';`.
- Use `node:` for Node.js built-in modules: `node:fs/promises`, `node:path`, `node:test`.
- Do not infer or mandate folder hierarchies, layers, or file-per-function rules from these conventions.

## 10. Node.js and ESM conventions

- Use a maintained Node.js LTS release in production and declare the supported major version in `engines` or tooling.
- Prefer explicit `"type": "module"` and ESM `import`/`export` for new projects. Do not rewrite mature CommonJS projects without a separate migration decision.
- Keep named exports the default and avoid mixed default/named conventions.
- Avoid scattered reads of `process.env`; validate and normalize configuration values once when practical.
- Use `node:fs/promises` for asynchronous filesystem work in application runtime.
- Avoid blocking the event loop with heavy synchronous work or CPU-heavy transformations in request handlers.
- Pure functions must not read `process.env`; pass any needed configuration as function arguments.
- Use `node:test` and `node:assert/strict` when the built-in test runner satisfies requirements.
- Explicitly await or return every relevant promise; do not launch accidental fire-and-forget work.
- Use established security practices: parameterized database queries, context-appropriate escaping, input validation, dependency auditing, and non-sensitive structured logs.

## 11. Tests

- Name tests by behavior in English, e.g. `calculateOrderTotalCents sums line totals`.
- Prefer deterministic unit tests for pure functions and focused integration tests for side effects.
- Keep test data explicit and realistic without giant fixtures.
- Test boundary cases: empty lists, absent records, invalid input, rejection, retries, and cancellation where relevant.
- Pass clocks, randomness, or known values explicitly when testing time-sensitive or nondeterministic behavior.
- A code change is complete only after relevant tests and lint/format checks pass.

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateOrderTotalCents } from './calculate-order-total-cents.js';

test('calculateOrderTotalCents sums line totals', () => {
  const items = [
    { unitPriceCents: 1_500, quantity: 2 },
    { unitPriceCents: 750, quantity: 1 },
  ];

  assert.equal(calculateOrderTotalCents(items), 3_750);
});

test('calculateOrderTotalCents returns zero for empty items', () => {
  assert.equal(calculateOrderTotalCents([]), 0);
});
```

## 12. Abstraction and readability

- Prefer the Node.js standard library and plain JavaScript before adding packages.
- Add a dependency when it removes meaningful complexity or provides important correctness/security guarantees.
- Extract reusable functions for repeated behavior or a meaningful, clearly named concept; avoid abstractions introduced for a single trivial expression.
- Prefer explicit arguments and return values over hidden mutable state.
- Measure performance before trading readability for micro-optimizations.
- Do not introduce design patterns or architectural structures as part of a coding-style rule.

## 13. Enforceable tooling baseline

Install:

```bash
npm install --save-dev eslint @eslint/js globals prettier
```

Recommended `package.json` excerpt (merge into an existing file rather than replacing it):

```json
{
  "type": "module",
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "node --test",
    "check": "npm run lint && npm run format:check && npm test"
  }
}
```

`eslint.config.js`:

```js
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['coverage/**', 'dist/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    linterOptions: {
      noInlineConfig: true,
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-unused-vars': 'error',
      'no-shadow': 'error',
      'no-implicit-coercion': 'error',
      'object-shorthand': ['error', 'always'],
    },
  },
];
```

`.prettierrc.json`:

```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "all",
  "arrowParens": "always"
}
```

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
```

The baseline lint configuration does **not** automatically prohibit every comment or enforce every naming convention; enforce those during review or with additional custom tooling if truly necessary. The guide is a policy, not a claim that the default tools check all rules.

## 14. Naming decision table

| Intent | Good | Avoid |
| --- | --- | --- |
| Fetch a customer over HTTP | `fetchCustomerProfile` | `getData`, `customerRequestAsync` |
| Find an optional matching record | `findCustomerById` | `getCustomerData` |
| Require a record or fail | `findCustomerByIdOrThrow` | `getCustomerSafe` |
| Create a transient object | `buildInvoicePayload` | `createInvoice` if nothing is persisted |
| Persist a new invoice | `createInvoice` | `makeInvoiceFunction` |
| Format for output | `formatOrderDate` | `dateHelper` |
| Boolean permission check | `canEditOrder` | `checkEditOrder` |
| Numeric monetary calculation | `calculateSubtotalCents` | `doCalc` |
| Convert data to response shape | `mapOrderToResponse` | `processOrderData` |
| Register an event listener | `registerEventListener` | `initializeEventStuff` |

## 15. Pull request checklist

- [ ] Every identifier, test name, log message, and code-facing error is in English.
- [ ] No comments or JSDoc were added to application code or tests.
- [ ] Function names indicate intent, I/O behavior, and result guarantees.
- [ ] New files use `kebab-case` and established role suffixes only where useful.
- [ ] Functions intended to be pure do not perform I/O or read implicit mutable state.
- [ ] Input objects are not mutated; state updates return new values.
- [ ] Expected absence and exceptional failures have an explicit consistent contract.
- [ ] No unhandled promises, swallowed errors, unbounded concurrency, or unnecessary event-loop blocking.
- [ ] Tests cover success, empty/boundary inputs, and important failure cases.
- [ ] `npm run check` passes.
- [ ] New complexity is justified; avoid premature abstraction.

## 16. Instructions for AI coding assistants

When generating, reviewing, or changing code in this repository, follow this document. Use modern JavaScript with Node.js ESM and functional programming practices. Write all code-facing identifiers, filenames, tests, and errors in English. Do not add comments or JSDoc. Prefer pure functions, immutable values, explicit arguments, named exports, `kebab-case` filenames, semantic function prefixes/suffixes, and cohesive functions. Make side effects clear from function behavior and naming, and add relevant tests. Preserve existing behavior and public contracts unless changes are requested. Do not prescribe or implement folder hierarchies, services, repositories, adapters, layers, dependency injection patterns, or other architectural decisions. Before considering work complete, run lint, formatting checks, and tests when available.

## References

- Node.js — ECMAScript modules: https://nodejs.org/api/esm.html
- Node.js — Packages and module resolution: https://nodejs.org/api/packages.html
- Node.js — Test runner: https://nodejs.org/api/test.html
- Node.js — Don't block the event loop: https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
- ESLint — Configuration files: https://eslint.org/docs/latest/use/configure/configuration-files
- Prettier — Options: https://prettier.io/docs/options
