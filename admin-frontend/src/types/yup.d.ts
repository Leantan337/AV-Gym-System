// Type definitions for yup
declare module 'yup' {
  export interface StringSchema {
    required(message?: string): StringSchema;
    email(message?: string): StringSchema;
    min(limit: number, message?: string): StringSchema;
    max(limit: number, message?: string): StringSchema;
    matches(regex: RegExp, message?: string): StringSchema;
    oneOf(values: any[], message?: string): StringSchema;
    notOneOf(values: any[], message?: string): StringSchema;
    trim(message?: string): StringSchema;
    nullable(): StringSchema;
    test(name: string, message: string, test: Function): StringSchema;
  }

  export interface NumberSchema {
    required(message?: string): NumberSchema;
    min(limit: number, message?: string): NumberSchema;
    max(limit: number, message?: string): NumberSchema;
    positive(message?: string): NumberSchema;
    negative(message?: string): NumberSchema;
    integer(message?: string): NumberSchema;
    nullable(): NumberSchema;
    test(name: string, message: string, test: Function): NumberSchema;
  }

  export interface BooleanSchema {
    required(message?: string): BooleanSchema;
    nullable(): BooleanSchema;
    test(name: string, message: string, test: Function): BooleanSchema;
  }

  export interface DateSchema {
    required(message?: string): DateSchema;
    min(limit: Date | string, message?: string): DateSchema;
    max(limit: Date | string, message?: string): DateSchema;
    nullable(): DateSchema;
    test(name: string, message: string, test: Function): DateSchema;
  }

  export interface ArraySchema {
    of(schema: Schema): ArraySchema;
    required(message?: string): ArraySchema;
    min(limit: number, message?: string): ArraySchema;
    max(limit: number, message?: string): ArraySchema;
    nullable(): ArraySchema;
    test(name: string, message: string, test: Function): ArraySchema;
  }

  export interface ObjectSchema {
    shape(shape: Record<string, Schema>): ObjectSchema;
    required(message?: string): ObjectSchema;
    nullable(): ObjectSchema;
    test(name: string, message: string, test: Function): ObjectSchema;
  }

  export interface Schema {
    validate(value: any, options?: object): Promise<any>;
    validateSync(value: any, options?: object): any;
    cast(value: any): any;
    isValid(value: any): boolean;
  }

  export function string(): StringSchema;
  export function number(): NumberSchema;
  export function boolean(): BooleanSchema;
  export function date(): DateSchema;
  export function array(): ArraySchema;
  export function object(): ObjectSchema;
  export function ref(path: string): any;
  export function lazy(fn: Function): any;
  export function reach(schema: Schema, path: string): Schema;

  export function setLocale(locale: object): void;
  export function mixed(): any;
}
