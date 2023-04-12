export type ToUpperCase<T extends string> = T extends keyof any ? Uppercase<T> : never;
