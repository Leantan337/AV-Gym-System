// Type definitions for yup
declare module 'yup' {
  export interface StringSchema {
    required(message?: string): StringSchema;
    email(message?: string): StringSchema;
    min(limit: number, message?: string): StringSchema;
    max(limit: number, message?: string): StringSchema;
    matches(regex: RegExp, message?: string): StringSchema;
    oneOf(values: unknown[], message?: string): StringSchema;
    notOneOf(values: unknown[], message?: string): StringSchema;
    trim(message?: string): StringSchema;
    nullable(): StringSchema;
    test(name: string, message: string, test: (value: unknown, context: unknown) => boolean | Promise<boolean>): StringSchema;
  }

  export interface NumberSchema {
    required(message?: string): NumberSchema;
    min(limit: number, message?: string): NumberSchema;
    max(limit: number, message?: string): NumberSchema;
    positive(message?: string): NumberSchema;
    negative(message?: string): NumberSchema;
    integer(message?: string): NumberSchema;
    nullable(): NumberSchema;
    test(name: string, message: string, test: (value: unknown, context: unknown) => boolean | Promise<boolean>): NumberSchema;
  }

  export interface BooleanSchema {
    required(message?: string): BooleanSchema;
    nullable(): BooleanSchema;
    test(name: string, message: string, test: (value: unknown, context: unknown) => boolean | Promise<boolean>): BooleanSchema;
  }

  export interface DateSchema {
    required(message?: string): DateSchema;
    min(limit: Date | string, message?: string): DateSchema;
    max(limit: Date | string, message?: string): DateSchema;
    nullable(): DateSchema;
    test(name: string, message: string, test: (value: unknown, context: unknown) => boolean | Promise<boolean>): DateSchema;
  }

  export interface ArraySchema {
    of(schema: Schema): ArraySchema;
    required(message?: string): ArraySchema;
    min(limit: number, message?: string): ArraySchema;
    max(limit: number, message?: string): ArraySchema;
    nullable(): ArraySchema;
    test(name: string, message: string, test: (value: unknown, context: unknown) => boolean | Promise<boolean>): ArraySchema;
  }

  export interface ObjectSchema {
    shape(shape: Record<string, Schema>): ObjectSchema;
    required(message?: string): ObjectSchema;
    nullable(): ObjectSchema;
    test(name: string, message: string, test: (value: unknown, context: unknown) => boolean | Promise<boolean>): ObjectSchema;
  }

  export interface Schema {
    validate(value: unknown, options?: Record<string, unknown>): Promise<unknown>;
    validateSync(value: unknown, options?: Record<string, unknown>): unknown;
    cast(value: unknown): unknown;
    isValid(value: unknown): boolean;
  }

  export function string(): StringSchema;
  export function number(): NumberSchema;
  export function boolean(): BooleanSchema;
  export function date(): DateSchema;
  export function array(): ArraySchema;
  export function object(): ObjectSchema;
  export function ref(path: string): unknown;
  export function lazy(fn: (value: unknown) => Schema): Schema;
  export function reach(schema: Schema, path: string): Schema;

  export function setLocale(locale: Record<string, unknown>): void;
  export function mixed(): Schema;
}
