# TypeScript Utility Types — Complete Guide

A comprehensive guide to TypeScript utility types, helper operators, advanced type manipulation, and practical examples.

---

# Table of Contents

1. Partial
2. Required
3. Readonly
4. Pick
5. Omit
6. Record
7. Exclude
8. Extract
9. NonNullable
10. ReturnType
11. Parameters
12. ConstructorParameters
13. InstanceType
14. Awaited
15. ThisParameterType
16. OmitThisParameter
17. ThisType
18. Uppercase
19. Lowercase
20. Capitalize
21. Uncapitalize
22. keyof
23. typeof
24. Indexed Access Types
25. Conditional Types
26. infer Keyword
27. Mapped Types
28. Template Literal Types
29. Union Types
30. Intersection Types
31. Generic Constraints
32. Generic Defaults
33. Never
34. Unknown
35. Any
36. As Const
37. Satisfies Operator
38. Const Type Parameters
39. Variadic Tuple Types
40. Recursive Types
41. Discriminated Unions
42. Custom Utility Types
43. Advanced Utility Patterns
44. Best Practices

---

# 1. Partial<T>

Makes all properties optional.

## Syntax

```ts
Partial<T>
```

## Example

```ts
interface User {
  name: string;
  email: string;
  age: number;
}

type PartialUser = Partial<User>;
```

Equivalent to:

```ts
type PartialUser = {
  name?: string;
  email?: string;
  age?: number;
};
```

## Real Use Case

```ts
function updateUser(data: Partial<User>) {
  // update logic
}
```

---

# 2. Required<T>

Makes all properties required.

## Example

```ts
interface User {
  name?: string;
  email?: string;
}

type RequiredUser = Required<User>;
```

Result:

```ts
type RequiredUser = {
  name: string;
  email: string;
};
```

---

# 3. Readonly<T>

Makes properties immutable.

## Example

```ts
interface User {
  id: string;
  name: string;
}

type ReadonlyUser = Readonly<User>;
```

## Usage

```ts
const user: ReadonlyUser = {
  id: "1",
  name: "John",
};

// ❌ Error
user.name = "Doe";
```

---

# 4. Pick<T, K>

Select specific properties.

## Example

```ts
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

type PublicUser = Pick<User, "id" | "name" | "email">;
```

Result:

```ts
type PublicUser = {
  id: string;
  name: string;
  email: string;
};
```

---

# 5. Omit<T, K>

Removes properties.

## Example

```ts
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

type SafeUser = Omit<User, "password">;
```

---

# 6. Record<K, T>

Creates an object type with specified keys and value types.

## Example

```ts
type Roles = "admin" | "user" | "moderator";

type Permissions = Record<Roles, boolean>;
```

Equivalent to:

```ts
type Permissions = {
  admin: boolean;
  user: boolean;
  moderator: boolean;
};
```

---

# 7. Exclude<T, U>

Removes types from a union.

## Example

```ts
type Role = "admin" | "user" | "guest";

type AllowedRole = Exclude<Role, "guest">;
```

Result:

```ts
type AllowedRole = "admin" | "user";
```

---

# 8. Extract<T, U>

Extracts matching union members.

## Example

```ts
type Role = "admin" | "user" | "guest";

type StaffRole = Extract<Role, "admin" | "user">;
```

---

# 9. NonNullable<T>

Removes null and undefined.

## Example

```ts
type MaybeString = string | null | undefined;

type SafeString = NonNullable<MaybeString>;
```

Result:

```ts
type SafeString = string;
```

---

# 10. ReturnType<T>

Extracts a function's return type.

## Example

```ts
function getUser() {
  return {
    id: "1",
    name: "John",
  };
}

type User = ReturnType<typeof getUser>;
```

---

# 11. Parameters<T>

Extracts function parameters.

## Example

```ts
function login(email: string, password: string) {}

type LoginParams = Parameters<typeof login>;
```

Result:

```ts
type LoginParams = [string, string];
```

---

# 12. ConstructorParameters<T>

Extracts constructor parameters.

## Example

```ts
class User {
  constructor(public name: string, public age: number) {}
}

type UserConstructor = ConstructorParameters<typeof User>;
```

---

# 13. InstanceType<T>

Gets class instance type.

## Example

```ts
class User {
  name = "John";
}

type UserInstance = InstanceType<typeof User>;
```

---

# 14. Awaited<T>

Extracts resolved Promise value.

## Example

```ts
type Result = Awaited<Promise<string>>;
```

Result:

```ts
type Result = string;
```

## Async Example

```ts
async function fetchUser() {
  return {
    id: "1",
    name: "John",
  };
}

type User = Awaited<ReturnType<typeof fetchUser>>;
```

---

# 15. ThisParameterType<T>

Extracts the type of `this` from a function.

## Example

```ts
function sayHello(this: { name: string }) {
  console.log(this.name);
}

type ThisTypeValue = ThisParameterType<typeof sayHello>;
```

---

# 16. OmitThisParameter<T>

Removes the `this` parameter.

## Example

```ts
function greet(this: { name: string }, message: string) {
  return `${message} ${this.name}`;
}

type Greet = OmitThisParameter<typeof greet>;
```

---

# 17. ThisType<T>

Defines contextual `this`.

## Example

```ts
type UserMethods = {
  getName(): string;
} & ThisType<{ name: string }>;

const methods: UserMethods = {
  getName() {
    return this.name;
  },
};
```

---

# 18. Uppercase<T>

```ts
type Name = Uppercase<"john">;
```

Result:

```ts
type Name = "JOHN";
```

---

# 19. Lowercase<T>

```ts
type Name = Lowercase<"JOHN">;
```

Result:

```ts
type Name = "john";
```

---

# 20. Capitalize<T>

```ts
type Name = Capitalize<"john">;
```

Result:

```ts
type Name = "John";
```

---

# 21. Uncapitalize<T>

```ts
type Name = Uncapitalize<"John">;
```

Result:

```ts
type Name = "john";
```

---

# 22. keyof

Gets all keys from a type.

## Example

```ts
interface User {
  id: string;
  name: string;
}

type UserKeys = keyof User;
```

Result:

```ts
type UserKeys = "id" | "name";
```

---

# 23. typeof

Extracts the type of a variable.

## Example

```ts
const user = {
  name: "John",
  age: 20,
};

type User = typeof user;
```

---

# 24. Indexed Access Types

Access property types.

## Example

```ts
interface User {
  name: string;
  age: number;
}

type NameType = User["name"];
```

---

# 25. Conditional Types

Conditional logic in types.

## Example

```ts
type IsString<T> = T extends string ? true : false;
```

Usage:

```ts
type A = IsString<string>;
type B = IsString<number>;
```

---

# 26. infer Keyword

Extract types from conditional types.

## Example

```ts
type GetArrayType<T> = T extends (infer U)[] ? U : never;

type Item = GetArrayType<string[]>;
```

---

# 27. Mapped Types

Loop through keys in a type.

## Example

```ts
type Optional<T> = {
  [K in keyof T]?: T[K];
};
```

---

# 28. Template Literal Types

Create string patterns.

## Example

```ts
type EventName = "click" | "scroll";

type EventHandler = `on${Capitalize<EventName>}`;
```

Result:

```ts
type EventHandler = "onClick" | "onScroll";
```

---

# 29. Union Types

A value can be one of several types.

## Example

```ts
type Status = "loading" | "success" | "error";
```

---

# 30. Intersection Types

Combine multiple types.

## Example

```ts
interface User {
  name: string;
}

interface Admin {
  permissions: string[];
}

type AdminUser = User & Admin;
```

---

# 31. Generic Constraints

Restrict generic types.

## Example

```ts
function getLength<T extends { length: number }>(item: T) {
  return item.length;
}
```

---

# 32. Generic Defaults

Provide default generic values.

## Example

```ts
interface ApiResponse<T = string> {
  data: T;
}
```

---

# 33. never

Represents values that never occur.

## Example

```ts
function throwError(message: string): never {
  throw new Error(message);
}
```

---

# 34. unknown

Safer alternative to any.

## Example

```ts
let value: unknown;

if (typeof value === "string") {
  console.log(value.toUpperCase());
}
```

---

# 35. any

Disables type checking.

## Example

```ts
let value: any = "hello";
value = 123;
value = true;
```

---

# 36. as const

Creates readonly literal types.

## Example

```ts
const roles = ["admin", "user"] as const;
```

Result:

```ts
readonly ["admin", "user"]
```

---

# 37. satisfies Operator

Validates types without changing inference.

## Example

```ts
const user = {
  name: "John",
  age: 20,
} satisfies {
  name: string;
  age: number;
};
```

---

# 38. Const Type Parameters

Preserve literal types in generics.

## Example

```ts
function createTuple<const T extends string[]>(items: T) {
  return items;
}
```

---

# 39. Variadic Tuple Types

Work with flexible tuple lengths.

## Example

```ts
type Push<T extends unknown[], U> = [...T, U];

type Result = Push<[1, 2], 3>;
```

---

# 40. Recursive Types

Types that reference themselves.

## Example

```ts
type TreeNode = {
  value: string;
  children: TreeNode[];
};
```

---

# 41. Discriminated Unions

Model multiple related states.

## Example

```ts
type LoadingState = {
  status: "loading";
};

type SuccessState = {
  status: "success";
  data: string;
};

type ErrorState = {
  status: "error";
  error: Error;
};

type State = LoadingState | SuccessState | ErrorState;
```

## Usage

```ts
function handleState(state: State) {
  switch (state.status) {
    case "loading":
      return "Loading...";

    case "success":
      return state.data;

    case "error":
      return state.error.message;
  }
}
```

---

# 42. Custom Utility Types

## Nullable<T>

```ts
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};
```

---

## DeepPartial<T>

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? DeepPartial<T[K]>
    : T[K];
};
```

---

## Mutable<T>

```ts
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
```

---

## DeepReadonly<T>

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly<T[K]>
    : T[K];
};
```

---

## ValueOf<T>

```ts
type ValueOf<T> = T[keyof T];
```

---

## RequireAtLeastOne<T>

```ts
type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Omit<T, K>>;
}[keyof T];
```

---

## DeepNonNullable<T>

```ts
type DeepNonNullable<T> = {
  [K in keyof T]: NonNullable<T[K]> extends object
    ? DeepNonNullable<NonNullable<T[K]>>
    : NonNullable<T[K]>;
};
```

---

# 43. Advanced Utility Patterns

# API Response Wrapper

```ts
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
```

Usage:

```ts
interface User {
  id: string;
  name: string;
}

type UserResponse = ApiResponse<User>;
```

---

# Dynamic Form Errors

```ts
type FormErrors<T> = {
  [K in keyof T]?: string;
};
```

Usage:

```ts
interface LoginForm {
  email: string;
  password: string;
}

type LoginErrors = FormErrors<LoginForm>;
```

---

# Database Entity IDs

```ts
type Entity<T> = T & {
  id: string;
};
```

---

# Extract Async Return Type

```ts
type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  Awaited<ReturnType<T>>;
```

---

# 44. Best Practices

## Prefer Utility Types Over Rewriting

❌ Bad

```ts
type UserUpdate = {
  name?: string;
  email?: string;
};
```

✅ Good

```ts
type UserUpdate = Partial<User>;
```

---

## Avoid any When Possible

❌ Bad

```ts
function parse(data: any) {
  return data;
}
```

✅ Better

```ts
function parse(data: unknown) {
  return data;
}
```

---

## Use Omit for Sensitive Fields

```ts
type SafeUser = Omit<User, "password" | "token">;
```

---

## Use ReturnType for API Consistency

```ts
type UserResponse = ReturnType<typeof getUser>;
```

---

## Combine Utility Types

```ts
type PublicUserUpdate = Partial<
  Omit<User, "password" | "token">
>;
```

---

## Prefer Literal Types for Constants

❌ Bad

```ts
const role = "admin";
```

✅ Better

```ts
const role = "admin" as const;
```

---

# Final Notes

Mastering TypeScript utility types helps you:

- Write scalable applications
- Improve maintainability
- Reduce duplicated types
- Create safer APIs
- Build reusable domain models
- Improve autocomplete and DX
- Prevent runtime bugs earlier

These utility types are heavily used in:

- React
- Next.js
- tRPC
- Node.js
- Mongoose
- Prisma
- Redux
- Enterprise TypeScript architectures

