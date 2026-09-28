## Code documentation baseline

This section defines how we write JSDoc and code comments. It applies to all maintained source and configuration files. Dependencies, generated files, lockfiles and static assets are out of scope.

The goal is to help contributors understand **responsibilities, behavior and the reasons behind implementation decisions**. Comments explain what the code and its types cannot say on their own. They never restate it.

### 1. Language and style

- All code, JSDoc and comments are written in **English**.
- Write full sentences in the present tense. Start descriptions with a verb in the third person ("Returns...", "Fetches...", "Renders...").
- Keep lines within the project's formatter limit (100 columns unless the formatter says otherwise).
- Do not add author tags, dates, change logs or commented-out code. Git history holds that information.
- Do not add filler comments. A file that needs no comments has none.

### 2. When to use JSDoc

Use JSDoc on **exported** functions, components, services, classes and types where the purpose or contract is not obvious from the name and signature alone.

| Situation | JSDoc |
| --- | --- |
| Exported function, service method or hook with non-trivial behavior | Required |
| Exported component with props or behavior that need explanation | Required |
| Exported type or interface whose fields have rules or units | Required |
| Trivial getter, thin wrapper or self-explanatory helper | Not needed |
| Non-exported helper | Only if the logic is not obvious |

### 3. What JSDoc should describe

Include only the parts that are relevant:

- **Purpose:** what it is responsible for, in one or two sentences.
- **Parameters** (`@param`): meaning, units, allowed ranges and defaults. Do not repeat the TypeScript type, so write `@param name Description`, not `@param {string} name`.
- **Return value** (`@returns`): what it represents and when it is empty, `null` or `undefined`.
- **Side effects:** network calls, storage writes, mutation of arguments, events, navigation.
- **Error behavior** (`@throws`): which errors are thrown or which rejected promises to expect, and under what conditions. Also state if errors are swallowed or converted.
- **Extra context** (`@remarks`, `@deprecated`, `@see`): only when it helps.
- **Example** (`@example`): only for non-obvious usage. Keep it short.

**Good**

```ts
/**
 * Fetches the order history for a customer and merges it with pending orders.
 *
 * Results are sorted by creation date, newest first. Sends one request per call;
 * callers are expected to cache the result.
 *
 * @param customerId ID of the customer whose orders to load.
 * @param options.includeCancelled Also returns cancelled orders. Defaults to false.
 * @returns The merged order list, or an empty array if the customer has no orders.
 * @throws {ApiError} If the request fails with a non-404 status.
 */
export async function loadOrders(customerId: string, options: LoadOptions = {}): Promise<Order[]> {
  // ...
}
```

**Bad** (repeats types and the obvious)

```ts
/**
 * Loads orders.
 * @param {string} customerId The customer id.
 * @returns {Promise<Order[]>} A promise of orders.
 */
```

### 4. Inline comments

Use inline comments (`//`) to explain the **why**, not the what. Good reasons to comment:

- Logic that is not self-evident, such as a non-obvious algorithm or order of operations.
- Constraints and assumptions (API limits, required ordering, invariants).
- Workarounds for bugs or platform quirks. Describe the workaround and, if possible, when it can be removed.
- The reason a simpler or more obvious approach was **not** used.
- Comments, including TODOs, must not include ticket references, issue links or ticket IDs. Git history and the issue tracker hold that information.

**Good**

```ts
// The API returns timestamps in UTC without a suffix, so we parse them as UTC explicitly.
const createdAt = new Date(`${raw}Z`);

// Workaround: the list flickers if we sort before the second render.
// Remove once the upstream fix is released.
```

**Bad**

```ts
// Increment counter
counter++;

// Loop over users
for (const user of users) {
```

### 5. Configuration files

- Add a comment only where a setting's reason is not obvious, for example why a rule is disabled or a compiler option is set.
- Only use comments in formats that support them (JS/TS configs, `tsconfig.json`, YAML and similar). Do not put comments in strict JSON such as `package.json`. Explain such choices in the README or this guide instead.

### 6. Accuracy and review

- Documentation must describe the **current** behavior. Update or remove a comment in the same change that alters the code it describes.
- Adding or changing documentation must never change runtime behavior.
- Reviewers check the checklist below on every pull request.

**Review checklist**

- [ ] Exported functions, components, services and types with non-obvious contracts have JSDoc.
- [ ] JSDoc does not repeat TypeScript types.
- [ ] Inline comments explain why, not what.
- [ ] No filler, commented-out code.
- [ ] Comments match the current code.
- [ ] Everything is written in English.
- [ ] No git commands executed by AI.


### 7. Requirement for future changes

**All future changes must follow this baseline.** Pull requests that add or change code must include documentation according to this section, and reviewers may request changes if they do not.
