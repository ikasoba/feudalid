export type Req =
  | { type: "exact"; size: number; }
  | { type: "range"; min: number; max: number; }
  ;

export type Res =
  | [size: number, write: (dst: DataView) => void]
  ;

export interface Schema<T> {
  decode: () => Parser<Maybe<T>>;
  encode: Encoder<T>;
}

export type Encoder<T> = (value: T) => IterableIterator<Res>;
export type Parser<T> = Generator<Req, T, DataView | null>;

export type Maybe<T> =
  | T
  | None
  ;

export type None = typeof None;
export const None: unique symbol = Symbol("None");

export function* readBytes(size: number): Parser<Maybe<DataView>> {
  const bytes = yield { type: "exact", size };
  if (bytes === null) return None;

  return bytes;
}

export function* readBytesWithRange(min: number, max: number): Parser<Maybe<DataView>> {
  const bytes = yield { type: "range", min, max };
  if (bytes === null) return None;

  return bytes;
}

export function mapIfNonNull<T, R>(x: Maybe<T>, fn: (x: T) => R): Maybe<R> {
  if (x === None) return None;

  return fn(x);
}

export const createSchema = <P, T>(schema: (params: P) => Schema<T>, params: P): Schema<T> => schema(params);

export const decodeFixed = <T>(n: number, fn: (src: DataView) => T): () => Parser<Maybe<T>> => function*() {
  return mapIfNonNull(yield* readBytes(n), fn);
}

export const encodeFixed = <T>(n: number, fn: (value: T, dst: DataView) => void): Encoder<T> => function*(value) {
  yield [n, dst => fn(value, dst)];
}

export const uint8le: Schema<number> = {
  decode: decodeFixed(1, src => src.getUint8(0)),
  encode: encodeFixed(1, (value, dst) => dst.setUint8(0, value))
}

export const uint16le: Schema<number> = {
  decode: decodeFixed(2, src => src.getUint16(0, true)),
  encode: encodeFixed(2, (value, dst) => dst.setUint16(0, value, true))
}

export const uint32le: Schema<number> = {
  decode: decodeFixed(4, src => src.getUint32(0, true)),
  encode: encodeFixed(4, (value, dst) => dst.setUint32(0, value, true))
}

export const uint64le: Schema<bigint> = {
  decode: decodeFixed(8, src => src.getBigUint64(0, true)),
  encode: encodeFixed(8, (value, dst) => dst.setBigUint64(0, value, true))
}

export const float32le: Schema<number> = {
  decode: decodeFixed(4, src => src.getFloat32(0, true)),
  encode: encodeFixed(4, (value, dst) => dst.setFloat32(0, value, true))
}

export const float64le: Schema<number> = {
  decode: decodeFixed(8, src => src.getFloat64(0, true)),
  encode: encodeFixed(8, (value, dst) => dst.setFloat64(0, value, true))
}

export type ParsedTuple<T extends Schema<any>[]> = {
  [K in keyof T]: T[K] extends Schema<infer R> ? R : T[K];
};

export type Parsed<T> = T extends Schema<infer T> ? T : never;

export const seq = <const T extends Schema<any>[], R>(parsers: T, decode: (parsed: ParsedTuple<T>) => R, encode: (value: R) => ParsedTuple<T>): Schema<R> => {
  return {
    *decode() {
      const parsed = [];
      for (const p of parsers) {
        const value = yield* p.decode();
        if (value === None) return None;

        parsed.push(value);
      }

      return decode(parsed as ParsedTuple<T>);
    },
    *encode(value) {
      const encoded = encode(value);
      for (let i = 0; i < parsers.length; i++) {
        yield* parsers[i]!.encode(encoded[i]);
      }
    }
  }
}

export const match = <T extends unknown, U extends Schema<any>>(keySchema: Schema<T>, map: (key: T) => U, encode: (value: Parsed<U>) => T): Schema<Parsed<U>> => {
  return {
    *decode() {
      const key = yield* keySchema.decode();
      if (key === None) return None;

      return yield* map(key).decode();
    },
    *encode(value) {
      const key = encode(value);

      yield* keySchema.encode(key);
      yield* map(key).encode(value);
    }
  }
}

export const fixedArray = <T extends unknown>(n: number, schema: Schema<T>, defaultValue: T): Schema<T[]> => {
  return {
    *decode() {
      const parsed: T[] = [];
      for (let i = 0; i < n; i++) {
        const item = yield* schema.decode();
        if (item === None) return None;

        parsed.push(item);
      }

      return parsed;
    },
    *encode(value) {
      for (let i = 0; i < n; i++) {
        yield* schema.encode(value[i] ?? defaultValue)
      }
    }
  }
}
export const fixedBytes = <T extends unknown>(n: number): Schema<DataView> => {
  return {
    *decode() {
      return yield* readBytes(n);
    },
    *encode(value) {
      return yield [n, dst => {
        new Uint8Array(dst.buffer, dst.byteOffset, dst.byteLength).fill(0).set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
      }];
    }
  }
}
