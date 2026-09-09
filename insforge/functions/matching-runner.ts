// bundled from insforge/functions/matching-runner-src.ts

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
};

// insforge/functions/matching-runner-src.ts
import { createAdminClient } from "npm:@insforge/sdk";

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType,
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function (util2) {
  util2.assertEqual = (_) => {};
  function assertIs(_arg) {}
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function (e) {
      return obj[e];
    });
  };
  util2.objectKeys =
    typeof Object.keys === "function"
      ? (obj) => Object.keys(obj)
      : (object) => {
          const keys = [];
          for (const key in object) {
            if (Object.prototype.hasOwnProperty.call(object, key)) {
              keys.push(key);
            }
          }
          return keys;
        };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item)) return item;
    }
    return void 0;
  };
  util2.isInteger =
    typeof Number.isInteger === "function"
      ? (val) => Number.isInteger(val)
      : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => (typeof val === "string" ? `'${val}'` : val)).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function (objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second,
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set",
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (
        data.then &&
        typeof data.then === "function" &&
        data.catch &&
        typeof data.catch === "function"
      ) {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite",
]);
var quotelessJson = (obj) => {
  const json2 = JSON.stringify(obj, null, 2);
  return json2.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper =
      _mapper ||
      function (issue) {
        return issue.message;
      };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...(issueData.path || [])];
  const fullIssue = {
    ...issueData,
    path: fullPath,
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message,
    };
  }
  let errorMessage = "";
  const maps = errorMaps
    .filter((m) => !!m)
    .slice()
    .reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage,
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default,
      // then global default map
    ].filter((x) => !!x),
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid") this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted") this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted") return INVALID;
      if (s.status === "dirty") status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value,
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted") return INVALID;
      if (value.status === "aborted") return INVALID;
      if (key.status === "dirty") status.dirty();
      if (value.status === "dirty") status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted",
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function (errorUtil2) {
  errorUtil2.errToObj = (message) => (typeof message === "string" ? { message } : message || {});
  errorUtil2.toString = (message) => (typeof message === "string" ? message : message?.message);
})(errorUtil || (errorUtil = {}));

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error) return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      },
    };
  }
};
function processCreateParams(params) {
  if (!params) return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(
      `Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`,
    );
  }
  if (errorMap2) return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type") return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return (
      ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent,
      }
    );
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent,
      },
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success) return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap,
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data),
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async,
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data),
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result)
          ? {
              value: result.value,
            }
          : {
              issues: ctx.common.issues,
            };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true,
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) =>
      isValid(result)
        ? {
            value: result.value,
          }
        : {
            issues: ctx.common.issues,
          },
    );
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success) return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true,
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data),
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult)
      ? maybeAsyncResult
      : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () =>
        ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val),
        });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(
          typeof refinementData === "function" ? refinementData(val, ctx) : refinementData,
        );
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement },
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data),
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform },
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def),
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description,
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex =
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex =
  /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex =
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex =
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset) opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt)) return false;
  try {
    const [header] = jwt.split(".");
    if (!header) return false;
    const base64 = header
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(header.length + ((4 - (header.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null) return false;
    if ("typ" in decoded && decoded?.typ !== "JWT") return false;
    if (!decoded.alg) return false;
    if (alg && decoded.alg !== alg) return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType,
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message,
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message,
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message,
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message),
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check],
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message),
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options,
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message),
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options,
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message),
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message),
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message),
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message),
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message),
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message),
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message),
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message),
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }],
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }],
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }],
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min) min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max) max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params),
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return (valInt % stepInt) / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType,
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message,
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message),
        },
      ],
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check],
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message),
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message),
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message),
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message),
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message),
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message),
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message),
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message),
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message),
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min) min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max) max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find(
      (ch) => ch.kind === "int" || (ch.kind === "multipleOf" && util.isInteger(ch.value)),
    );
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min) min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max) max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params),
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message,
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message,
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType,
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message),
        },
      ],
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check],
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message),
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message),
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message),
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message),
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message),
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min) min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max) max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params),
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params),
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType,
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date,
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date",
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date",
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime()),
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check],
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message),
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message),
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min) min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max) max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params),
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params),
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params),
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params),
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params),
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params),
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType,
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params),
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params),
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message,
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message,
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message,
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all(
        [...ctx.data].map((item, i) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        }),
      ).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) },
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) },
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) },
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params),
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape,
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element),
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null) return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType,
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data,
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] },
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys,
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key),
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data,
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve()
        .then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet,
            });
          }
          return syncPairs;
        })
        .then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...(message !== void 0
        ? {
            errorMap: (issue, ctx) => {
              const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
              if (issue.code === "unrecognized_keys")
                return {
                  message: errorUtil.errToObj(message).message ?? defaultError,
                };
              return {
                message: defaultError,
              };
            },
          }
        : {}),
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip",
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough",
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation,
      }),
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape(),
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject,
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index,
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape,
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape,
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape,
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape,
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params),
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params),
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params),
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors,
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(
        options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: [],
            },
            parent: null,
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx,
            }),
            ctx: childCtx,
          };
        }),
      ).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: [],
          },
          parent: null,
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx,
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors,
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params),
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator],
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx,
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx,
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(
          `A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`,
        );
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(
            `Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`,
          );
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params),
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types,
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        }),
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(
        this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        }),
        this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        }),
      );
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params),
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array",
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array",
      });
      status.dirty();
    }
    const items = [...ctx.data]
      .map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema) return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      })
      .filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest,
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params),
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data,
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third),
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second),
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"])),
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params),
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message,
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message,
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted") return INVALID;
        if (element.status === "dirty") status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) =>
      valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)),
    );
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) },
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) },
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params),
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          en_default,
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error,
        },
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          en_default,
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error,
        },
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function (...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type
          .parseAsync(result, params)
          .catch((e) => {
            error.addIssue(makeReturnsIssue(result, e));
            throw error;
          });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function (...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create()),
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType,
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params),
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params),
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value,
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params),
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params),
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type,
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues,
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef,
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(
      this.options.filter((opt) => !values.includes(opt)),
      {
        ...this._def,
        ...newDef,
      },
    );
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type,
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues,
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params),
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    const promisified =
      ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(
      promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap,
        });
      }),
    );
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params),
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects
      ? this._def.schema.sourceType()
      : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      },
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted") return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx,
          });
          if (result.status === "aborted") return INVALID;
          if (result.status === "dirty") return DIRTY(result.value);
          if (status.value === "dirty") return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted") return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx,
        });
        if (result.status === "aborted") return INVALID;
        if (result.status === "dirty") return DIRTY(result.value);
        if (status.value === "dirty") return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error(
            "Async refinement encountered during synchronous parse operation. Use .parseAsync instead.",
          );
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        });
        if (inner.status === "aborted") return INVALID;
        if (inner.status === "dirty") status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema
          ._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx })
          .then((inner) => {
            if (inner.status === "aborted") return INVALID;
            if (inner.status === "dirty") status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        });
        if (!isValid(base)) return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(
            `Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`,
          );
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema
          ._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx })
          .then((base) => {
            if (!isValid(base)) return INVALID;
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result,
            }));
          });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params),
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params),
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params),
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params),
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx,
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params),
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: [],
      },
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx,
      },
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value:
            result2.status === "valid"
              ? result2.value
              : this._def.catchValue({
                  get error() {
                    return new ZodError(newCtx.common.issues);
                  },
                  input: newCtx.data,
                }),
        };
      });
    } else {
      return {
        status: "valid",
        value:
          result.status === "valid"
            ? result.value
            : this._def.catchValue({
                get error() {
                  return new ZodError(newCtx.common.issues);
                },
                input: newCtx.data,
              }),
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params),
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType,
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params),
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx,
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx,
        });
        if (inResult.status === "aborted") return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx,
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx,
      });
      if (inResult.status === "aborted") return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value,
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx,
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline,
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params),
  });
};
function cleanParams(params, data) {
  const p =
    typeof params === "function"
      ? params(data)
      : typeof params === "string"
        ? { message: params }
        : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate,
};
var ZodFirstPartyTypeKind;
(function (ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (
  cls,
  params = {
    message: `Input not instance of ${cls.name}`,
  },
) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) =>
    ZodBoolean.create({
      ...arg,
      coerce: true,
    }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true }),
};
var NEVER = INVALID;

// packages/schemas/src/primitives.ts
var uuidSchema = external_exports.string().uuid();
var timestamptzSchema = external_exports.string().min(1);
var numericSchema = external_exports.coerce.number();

// packages/schemas/src/entities.ts
var experienceLevelSchema = external_exports.enum(["novice", "intermediate", "advanced"]);
var suitabilityTierSchema = external_exports.enum(["conservative", "standard", "full"]);
var profileSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  display_name: external_exports.string().nullable(),
  persona: external_exports.string().nullable(),
  experience_level: experienceLevelSchema.nullable(),
  suitability_tier: suitabilityTierSchema.nullable(),
  objectives: external_exports.string().nullable(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});
var profileInsertSchema = external_exports
  .object({
    user_id: uuidSchema,
    display_name: external_exports.string().nullable().optional(),
    experience_level: experienceLevelSchema.nullable().optional(),
    suitability_tier: suitabilityTierSchema.nullable().optional(),
    objectives: external_exports.string().nullable().optional(),
  })
  .strict();
var profileAdminInsertSchema = profileInsertSchema.extend({
  persona: external_exports.string().nullable().optional(),
});
var profilePatchSchema = profileInsertSchema.omit({ user_id: true }).partial().strict();
var profileAdminPatchSchema = profileAdminInsertSchema.omit({ user_id: true }).partial().strict();
var accountSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  cash_balance: numericSchema,
  reserved_cash: numericSchema.optional(),
  currency: external_exports.string().min(1),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});
var accountInsertSchema = external_exports.object({
  user_id: uuidSchema,
  cash_balance: numericSchema.optional(),
  reserved_cash: numericSchema.optional(),
  currency: external_exports.string().min(1).optional(),
});
var accountPatchSchema = external_exports
  .object({
    currency: external_exports.string().min(1).optional(),
  })
  .strict();
var instrumentStatusSchema = external_exports.enum(["active", "halted", "delisted"]);
var marketCapBandSchema = external_exports.enum(["mega", "large", "mid", "small", "micro"]);
var betaClassSchema = external_exports.enum(["low", "medium", "high"]);
var avgVolumeBandSchema = external_exports.enum(["low", "medium", "high"]);
var barTimeframeSchema = external_exports.enum(["1m", "1d"]);
var mockInstrumentSchema = external_exports.object({
  symbol: external_exports.string().min(1),
  name: external_exports.string().min(1),
  exchange: external_exports.string().min(1),
  sector: external_exports.string().min(1),
  industry: external_exports.string().min(1),
  status: instrumentStatusSchema,
  currency: external_exports.string().min(1),
  tick_size: numericSchema,
  lot_size: external_exports.coerce.number().int().positive(),
  base_price: numericSchema,
  market_cap_band: marketCapBandSchema,
  beta_class: betaClassSchema,
  avg_volume: external_exports.coerce.number().positive(),
  avg_volume_band: avgVolumeBandSchema,
});
var instrumentSchema = external_exports.object({
  id: uuidSchema,
  symbol: external_exports.string().min(1),
  name: external_exports.string().min(1),
  exchange: external_exports.string().min(1),
  sector: external_exports.string().nullable(),
  industry: external_exports.string().nullable(),
  status: instrumentStatusSchema,
  currency: external_exports.string().min(1),
  tick_size: numericSchema,
  lot_size: external_exports.coerce.number().int(),
  market_cap_band: marketCapBandSchema.nullable().optional(),
  beta_class: betaClassSchema.nullable().optional(),
  avg_volume: numericSchema.nullable().optional(),
  avg_volume_band: avgVolumeBandSchema.nullable().optional(),
  base_price: numericSchema.nullable().optional(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});
var marketBarSchema = external_exports.object({
  instrument_id: uuidSchema,
  timeframe: barTimeframeSchema,
  ts: timestamptzSchema,
  o: numericSchema,
  h: numericSchema,
  l: numericSchema,
  c: numericSchema,
  v: numericSchema,
});
var quotesLatestSchema = external_exports.object({
  instrument_id: uuidSchema,
  bid: numericSchema,
  ask: numericSchema,
  last: numericSchema,
  prev_close: numericSchema,
  volume: numericSchema,
  ts: timestamptzSchema,
});
var sessionKindSchema = external_exports.enum(["regular", "half"]);
var marketCalendarRowSchema = external_exports.object({
  session_date: external_exports
    .string()
    .min(10)
    .transform((value) => value.slice(0, 10))
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "session_date"),
  venue: external_exports.string().min(1),
  session_kind: sessionKindSchema,
  open_minute: external_exports.coerce.number().int().nonnegative(),
  close_minute: external_exports.coerce.number().int().positive(),
});
var feedForcePriceSchema = external_exports.object({
  symbol: external_exports.string().min(1),
  price: numericSchema,
});
var feedControlsValueSchema = external_exports.object({
  paused: external_exports.boolean().optional(),
  speed: numericSchema.optional(),
});
var quoteTickSchema = external_exports.object({
  instrument_id: uuidSchema,
  symbol: external_exports.string().min(1).optional(),
  bid: numericSchema,
  ask: numericSchema,
  last: numericSchema,
  prev_close: numericSchema,
  volume: numericSchema,
  ts: timestamptzSchema,
});
var quoteTickBatchSchema = external_exports.object({
  ts: timestamptzSchema,
  ticks: external_exports.array(quoteTickSchema),
});
var auditLogSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema.nullable(),
  action: external_exports.string().min(1),
  entity_type: external_exports.string().min(1),
  entity_id: uuidSchema.nullable(),
  payload: external_exports.record(external_exports.unknown()),
  created_at: timestamptzSchema,
});
var auditLogInsertSchema = external_exports.object({
  user_id: uuidSchema,
  action: external_exports.string().min(1),
  entity_type: external_exports.string().min(1),
  entity_id: uuidSchema.nullable().optional(),
  payload: external_exports.record(external_exports.unknown()).optional(),
});
var featureFlagSchema = external_exports.object({
  id: uuidSchema,
  key: external_exports.string().min(1),
  value: external_exports.unknown(),
  user_id: uuidSchema.nullable(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});
var featureFlagInsertSchema = external_exports.object({
  key: external_exports.string().min(1),
  value: external_exports.unknown().optional(),
  user_id: uuidSchema.nullable().optional(),
});
var watchlistSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  name: external_exports.string().min(1),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});
var watchlistInsertSchema = external_exports.object({
  user_id: uuidSchema,
  name: external_exports.string().min(1),
});
var watchlistPatchSchema = external_exports.object({
  name: external_exports.string().min(1).optional(),
});
var watchlistItemSchema = external_exports.object({
  id: uuidSchema,
  watchlist_id: uuidSchema,
  instrument_id: uuidSchema,
  sort_order: external_exports.coerce.number().int(),
  created_at: timestamptzSchema,
});
var watchlistItemInsertSchema = external_exports.object({
  watchlist_id: uuidSchema,
  instrument_id: uuidSchema,
  sort_order: external_exports.coerce.number().int().optional(),
});
var duplicateWatchlistItemErrorSchema = external_exports.object({
  code: external_exports.literal("DUPLICATE_WATCHLIST_ITEM"),
  message: external_exports.string().min(1),
});

// packages/schemas/src/workspace-layout.ts
var workspaceLayoutV1Schema = external_exports.object({
  version: external_exports.literal(1),
  dockview: external_exports.record(external_exports.unknown()),
  selectedWatchlistId: uuidSchema.nullable().optional(),
});

// packages/schemas/src/command-recents.ts
var commandRecentsV1Schema = external_exports.object({
  version: external_exports.literal(1),
  items: external_exports.array(external_exports.string().min(1)).max(20),
});

// packages/schemas/src/chart.ts
var chartRangeSchema = external_exports.enum(["1D", "1W", "1M", "1Y", "5Y"]);
var chartBarsQuerySchema = external_exports.object({
  symbol: external_exports.string().min(1).max(16),
  range: chartRangeSchema,
});
var chartBarsResponseSchema = external_exports.object({
  symbol: external_exports.string().min(1),
  instrument_id: external_exports.string().uuid(),
  range: chartRangeSchema,
  timeframe: external_exports.enum(["1m", "1d"]),
  bars: external_exports.array(marketBarSchema),
});

// packages/schemas/src/auth.ts
var credentialsSchema = external_exports.object({
  email: external_exports.string().email(),
  password: external_exports.string().min(1),
});
var profileWizardSchema = external_exports.object({
  display_name: external_exports.string().trim().min(1).max(120),
  experience_level: experienceLevelSchema,
  objectives: external_exports.string().trim().max(2e3).optional(),
});
var sessionUserSchema = external_exports.object({
  id: uuidSchema,
  email: external_exports.string().email(),
});
var provisionCreatedSchema = external_exports.object({
  profile: external_exports.boolean(),
  account: external_exports.boolean(),
});
var provisionResultSchema = external_exports.object({
  profile: profileSchema,
  account: accountSchema,
  created: provisionCreatedSchema,
});

// packages/schemas/src/decision-table.ts
var conditionOperatorSchema = external_exports.enum([
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "not_in",
  "between",
  "regex",
  "is_null",
  "any",
]);
var hitPolicySchema = external_exports.enum(["FIRST", "ALL", "COLLECT"]);
var decisionConditionSchema = external_exports.object({
  input: external_exports.string().min(1),
  op: conditionOperatorSchema,
  value: external_exports.unknown().optional(),
  /** Encodes doc 05 prose such as “not between” (no dedicated operator). */
  negate: external_exports.boolean().optional(),
});
var decisionOutputsSchema = external_exports.record(external_exports.unknown());
var decisionRowSchema = external_exports.object({
  id: external_exports.string().min(1),
  priority: external_exports.number().int(),
  conditions: external_exports.array(decisionConditionSchema),
  outputs: decisionOutputsSchema,
  effective_from: external_exports.string().nullable().optional(),
  effective_to: external_exports.string().nullable().optional(),
});
var decisionTableSchema = external_exports.object({
  id: external_exports.string().min(1),
  hit_policy: hitPolicySchema,
  default_outputs: decisionOutputsSchema,
  rows: external_exports.array(decisionRowSchema),
});

// packages/schemas/src/rules-service.ts
var ruleDomainSchema = external_exports.enum([
  "order_validation",
  "pre_trade_risk",
  "market_hours",
  "execution_sim",
  "fees",
  "suitability",
  "entitlements",
  "ai_action_policy",
  "alerting",
  "portfolio_analysis",
  "market_sim",
]);
var tableStatusSchema = external_exports.enum(["draft", "published", "retired"]);
var tableVersionRefSchema = external_exports.object({
  table_key: external_exports.string().min(1),
  version: external_exports.number().int().positive(),
});
var evaluateDomainRequestSchema = external_exports.object({
  op: external_exports.literal("evaluateDomain").optional(),
  domain: ruleDomainSchema,
  context: external_exports.record(external_exports.unknown()),
  clock: external_exports.string().optional(),
  userId: uuidSchema.optional(),
});
var evaluateDomainResponseSchema = external_exports.object({
  outcome: external_exports.union([
    external_exports.record(external_exports.unknown()),
    external_exports.array(external_exports.record(external_exports.unknown())),
  ]),
  matchedRows: external_exports.array(decisionRowSchema),
  trace: external_exports.array(external_exports.unknown()),
  auditId: external_exports.string().min(1),
  tableVersions: external_exports.array(tableVersionRefSchema),
});
var ruleAuditInsertSchema = external_exports.object({
  user_id: uuidSchema.nullable().optional(),
  domain: ruleDomainSchema,
  table_versions: external_exports.array(tableVersionRefSchema),
  context: external_exports.record(external_exports.unknown()),
  matched_rows: external_exports.unknown(),
  outcome: external_exports.unknown(),
  latency_ms: external_exports.number().int().nonnegative(),
});
var publishRulesRequestSchema = external_exports.object({
  op: external_exports.literal("publish"),
  tableKey: external_exports.string().min(1),
});
var invalidateRulesRequestSchema = external_exports.object({
  op: external_exports.literal("invalidate"),
  event: external_exports.literal("rules:published").optional(),
});

// packages/schemas/src/rules-admin.ts
var rulesAdminRoleSchema = external_exports.enum(["trader", "admin", "compliance"]);
var rulesAdminOpSchema = external_exports.enum([
  "listCatalog",
  "getTable",
  "saveDraft",
  "publish",
  "rollback",
  "simulate",
  "listHistory",
  "listAudits",
]);
var catalogTableItemSchema = external_exports.object({
  tableKey: external_exports.string().min(1),
  domain: external_exports.string().min(1),
  publishedVersion: external_exports.number().int().positive().nullable(),
  draftVersion: external_exports.number().int().positive().nullable().optional(),
});
var tableDiffSchema = external_exports.object({
  tableKey: external_exports.string().min(1),
  publishedVersion: external_exports.number().int().nonnegative().nullable(),
  draftVersion: external_exports.number().int().nonnegative().nullable(),
  addedRowIds: external_exports.array(external_exports.string()),
  removedRowIds: external_exports.array(external_exports.string()),
  changedRowIds: external_exports.array(external_exports.string()),
});
var simulateDeltaSchema = external_exports.object({
  auditId: external_exports.string().min(1),
  publishedOutcome: external_exports.unknown(),
  draftOutcome: external_exports.unknown(),
  publishedRowIds: external_exports.array(external_exports.string()),
  draftRowIds: external_exports.array(external_exports.string()),
});
var simulateResultSchema = external_exports.object({
  sampleSize: external_exports.number().int().nonnegative(),
  agreementPct: external_exports.number().min(0).max(100),
  deltas: external_exports.array(simulateDeltaSchema),
});
var ruleAuditViewSchema = external_exports.object({
  id: external_exports.string().min(1),
  domain: external_exports.string().min(1),
  table_versions: external_exports.unknown().optional(),
  context: external_exports.record(external_exports.unknown()),
  matched_rows: external_exports.unknown().optional(),
  outcome: external_exports.unknown(),
  latency_ms: external_exports.number().int().nonnegative().optional(),
  created_at: external_exports.string().optional(),
  user_id: external_exports.string().nullable().optional(),
});
var tableHistoryItemSchema = external_exports.object({
  version: external_exports.number().int().positive(),
  status: external_exports.enum(["draft", "published", "retired"]),
  table: decisionTableSchema,
});
var rulesAdminGetTableResponseSchema = external_exports.object({
  tableKey: external_exports.string().min(1),
  domain: external_exports.string().min(1),
  published: decisionTableSchema.nullable(),
  publishedVersion: external_exports.number().int().positive().nullable(),
  draft: decisionTableSchema.nullable(),
  draftVersion: external_exports.number().int().positive().nullable(),
  diff: tableDiffSchema,
});
var tableKeyField = external_exports.object({ tableKey: external_exports.string().min(1) });
var rulesAdminRequestSchema = external_exports.discriminatedUnion("op", [
  external_exports.object({ op: external_exports.literal("listCatalog") }),
  external_exports.object({
    op: external_exports.literal("getTable"),
    tableKey: external_exports.string().min(1),
  }),
  external_exports.object({
    op: external_exports.literal("saveDraft"),
    tableKey: external_exports.string().min(1),
    table: decisionTableSchema,
  }),
  external_exports.object({
    op: external_exports.literal("publish"),
    tableKey: external_exports.string().min(1),
  }),
  external_exports.object({
    op: external_exports.literal("rollback"),
    tableKey: external_exports.string().min(1),
    version: external_exports.number().int().positive(),
  }),
  external_exports.object({
    op: external_exports.literal("simulate"),
    tableKey: external_exports.string().min(1),
    limit: external_exports.number().int().positive().max(500).optional(),
  }),
  external_exports.object({
    op: external_exports.literal("listHistory"),
    tableKey: external_exports.string().min(1),
  }),
  external_exports.object({
    op: external_exports.literal("listAudits"),
    query: external_exports.string().optional(),
    domain: external_exports.string().optional(),
    limit: external_exports.number().int().positive().max(200).optional(),
  }),
]);
var rulesAdminListCatalogResponseSchema = external_exports.object({
  tables: external_exports.array(catalogTableItemSchema),
});
var rulesAdminPublishResponseSchema = external_exports.object({
  ok: external_exports.literal(true),
  tableKey: external_exports.string().min(1),
  version: external_exports.number().int().positive(),
  event: external_exports.literal("rules:published"),
});

// packages/schemas/src/orders.ts
var orderSideSchema = external_exports.enum(["buy", "sell"]);
var orderTypeSchema = external_exports.enum(["market", "limit", "stop", "stop_limit"]);
var tifSchema = external_exports.enum(["DAY", "GTC", "IOC"]);
var qtyModeSchema = external_exports.enum(["shares", "notional"]);
var orderStatusSchema = external_exports.enum([
  "draft",
  "validated",
  "accepted",
  "working",
  "partially_filled",
  "filled",
  "cancelled",
  "rejected",
  "expired",
]);
var orderDraftSchema = external_exports
  .object({
    symbol: external_exports.string().min(1),
    side: orderSideSchema,
    qty: external_exports.number().finite(),
    order_type: orderTypeSchema,
    limit_price: external_exports.number().finite().nullable().optional(),
    stop_price: external_exports.number().finite().nullable().optional(),
    tif: tifSchema,
  })
  .strict();
var orderPreviewRequestSchema = external_exports
  .object({
    op: external_exports.literal("preview").optional(),
    draft: orderDraftSchema,
    last_price: numericSchema,
  })
  .strict();
var orderPreviewRuleSchema = external_exports.object({
  table_key: external_exports.string().min(1),
  passed: external_exports.boolean(),
  decision: external_exports.string().min(1),
  reason: external_exports.string().min(1),
  reason_code: external_exports.string().min(1).optional(),
});
var orderFeeBreakdownSchema = external_exports.object({
  commission_usd: numericSchema,
  sec_fee: numericSchema,
  taf: numericSchema,
  data_fee_monthly: numericSchema.optional(),
});
var orderPreviewResponseSchema = external_exports.object({
  passed: external_exports.boolean(),
  buying_power: numericSchema,
  last_price: numericSchema,
  qty: numericSchema,
  order_notional: numericSchema,
  estimated_fees: numericSchema,
  est_total: numericSchema,
  fees: orderFeeBreakdownSchema,
  rules: external_exports.array(orderPreviewRuleSchema),
  validation_outcome: external_exports.union([
    external_exports.record(external_exports.unknown()),
    external_exports.array(external_exports.record(external_exports.unknown())),
  ]),
  risk_outcome: external_exports.union([
    external_exports.record(external_exports.unknown()),
    external_exports.array(external_exports.record(external_exports.unknown())),
  ]),
  fee_outcome: external_exports.record(external_exports.unknown()),
  hours_outcome: external_exports
    .union([
      external_exports.record(external_exports.unknown()),
      external_exports.array(external_exports.record(external_exports.unknown())),
    ])
    .default({}),
});
var orderCreateRequestSchema = external_exports
  .object({
    op: external_exports.literal("create").optional(),
    draft: orderDraftSchema,
    last_price: numericSchema,
  })
  .strict();
var orderRecordSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  instrument_id: uuidSchema,
  symbol: external_exports.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  filled_qty: numericSchema,
  order_type: orderTypeSchema,
  limit_price: numericSchema.nullable(),
  stop_price: numericSchema.nullable(),
  tif: tifSchema,
  status: orderStatusSchema,
  reject_reason: external_exports.string().nullable(),
  rule_audit_id: external_exports.string().nullable(),
  parent_order_id: uuidSchema.nullable().optional(),
  reserved_amount: numericSchema.optional(),
  stop_triggered: external_exports.boolean().optional(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});
var orderCreateResponseSchema = external_exports.object({
  order: orderRecordSchema,
  preview: orderPreviewResponseSchema,
});
var orderCancelRequestSchema = external_exports
  .object({
    op: external_exports.literal("cancel").optional(),
    order_id: uuidSchema.optional(),
  })
  .strict();
var orderCancelResponseSchema = external_exports.object({
  order: orderRecordSchema,
});
var executionRecordSchema = external_exports.object({
  id: uuidSchema,
  order_id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  instrument_id: uuidSchema,
  symbol: external_exports.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  price: numericSchema,
  created_at: timestamptzSchema,
});
var positionRecordSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  instrument_id: uuidSchema,
  symbol: external_exports.string().min(1),
  qty: numericSchema,
  avg_cost: numericSchema,
  realized_pnl: numericSchema,
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});
var portfolioSnapshotSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  as_of_date: external_exports.string().min(1),
  equity: numericSchema,
  cash: numericSchema,
  buying_power: numericSchema,
  created_at: timestamptzSchema,
});
var execConfigSchema = external_exports.object({
  slippage_bps: numericSchema,
  liquidity_cap: numericSchema.optional(),
  liquidity_cap_pct_adv: numericSchema.optional(),
  tick_size: numericSchema.optional(),
});
var matchTickSchema = external_exports.object({
  instrument_id: uuidSchema.optional(),
  symbol: external_exports.string().min(1).optional(),
  last: numericSchema,
  bid: numericSchema.optional(),
  ask: numericSchema.optional(),
  ts: timestamptzSchema.optional(),
});
var workingOrderMatchSchema = external_exports.object({
  id: external_exports.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  filled_qty: numericSchema,
  order_type: orderTypeSchema,
  limit_price: numericSchema.nullable().optional(),
  stop_price: numericSchema.nullable().optional(),
  stop_triggered: external_exports.boolean().optional(),
  tif: tifSchema.optional(),
  created_at: timestamptzSchema.optional(),
});
var matchFillSchema = external_exports.object({
  order_id: external_exports.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  price: numericSchema,
});
var matchingRunnerRequestSchema = external_exports
  .object({
    ticks: external_exports.array(quoteTickSchema).optional(),
  })
  .strict();
var matchingRunnerResponseSchema = external_exports.object({
  ticks: external_exports.number().int().nonnegative(),
  promoted: external_exports.number().int().nonnegative(),
  fills: external_exports.number().int().nonnegative(),
  triggered: external_exports.number().int().nonnegative(),
});

// packages/schemas/src/index.ts
var publicInsforgeEnvSchema = external_exports.object({
  NEXT_PUBLIC_INSFORGE_URL: external_exports.string().url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: external_exports.string().min(1),
});
var seedEnvSchema = external_exports.object({
  INSFORGE_URL: external_exports.string().url(),
  INSFORGE_API_KEY: external_exports.string().min(1),
});

// packages/paper-engine/src/fsm.ts
var ORDER_STATUSES = orderStatusSchema.options;
var LEGAL = {
  draft: ["validated", "rejected"],
  validated: ["accepted", "rejected"],
  accepted: ["working", "cancelled", "expired"],
  working: ["partially_filled", "filled", "cancelled", "expired"],
  partially_filled: ["partially_filled", "filled", "cancelled", "expired"],
  filled: [],
  cancelled: [],
  rejected: [],
  expired: [],
};
function canTransition(from, to) {
  return LEGAL[from].includes(to);
}
var OrderFsmError = class extends Error {
  from;
  to;
  constructor(from, to) {
    super(`FSM_ILLEGAL:${from}->${to}`);
    this.name = "OrderFsmError";
    this.from = from;
    this.to = to;
  }
};
function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new OrderFsmError(from, to);
  }
}

// packages/paper-engine/src/buying-power.ts
function releaseBuyingPower(ledger, amount) {
  const next = Math.max(0, ledger.reservedCash - Math.max(0, amount));
  return { cashBalance: ledger.cashBalance, reservedCash: next };
}

// packages/paper-engine/src/exec-config.ts
function parseExecConfig(outcome) {
  const record = outcomeRecord(outcome);
  if (!record) {
    return null;
  }
  const parsed = execConfigSchema.safeParse(record);
  if (!parsed.success) {
    return null;
  }
  if (!Number.isFinite(parsed.data.slippage_bps)) {
    return null;
  }
  return parsed.data;
}
function resolveExecConfig(resolver, orderId) {
  return typeof resolver === "function" ? resolver(orderId) : resolver;
}
function liquidityCapShares(avgVolume, liquidityCapPctAdv) {
  if (!Number.isFinite(avgVolume) || avgVolume <= 0) {
    return 0;
  }
  if (!Number.isFinite(liquidityCapPctAdv) || liquidityCapPctAdv < 0) {
    return 0;
  }
  return Math.floor((avgVolume * liquidityCapPctAdv) / 100);
}
function outcomeRecord(outcome) {
  if (Array.isArray(outcome)) {
    return Object.assign({}, ...outcome);
  }
  if (outcome && typeof outcome === "object") {
    return outcome;
  }
  return null;
}

// packages/paper-engine/src/match.ts
function marketPrice(last, side, slippageBps) {
  const slip = last * (slippageBps / 1e4);
  return side === "buy" ? last + slip : last - slip;
}
function applyTickSize(price, tickSize) {
  if (!tickSize || !Number.isFinite(tickSize) || tickSize <= 0) {
    return price;
  }
  return Math.round(price / tickSize) * tickSize;
}
function isStopTriggered(order, last) {
  const stop = order.stop_price;
  if (stop == null || !Number.isFinite(stop)) {
    return false;
  }
  if (order.side === "buy") {
    return last >= stop;
  }
  return last <= stop;
}
function isLimitMarketable(order, last) {
  const limit = order.limit_price;
  if (limit == null || !Number.isFinite(limit)) {
    return false;
  }
  if (order.side === "buy") {
    return last <= limit;
  }
  return last >= limit;
}
function limitFillPrice(order, last) {
  const limit = order.limit_price;
  if (limit == null || !Number.isFinite(limit)) {
    return last;
  }
  return order.side === "buy" ? Math.min(last, limit) : Math.max(last, limit);
}
function remainingQty(order) {
  return Math.max(0, order.qty - order.filled_qty);
}
function compareOrders(a, b) {
  const at = a.created_at ?? "";
  const bt = b.created_at ?? "";
  if (at !== bt) {
    return at < bt ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
function capFor(config) {
  if (config.liquidity_cap == null) {
    return Number.POSITIVE_INFINITY;
  }
  if (!Number.isFinite(config.liquidity_cap) || config.liquidity_cap <= 0) {
    return 0;
  }
  return config.liquidity_cap;
}
function matchOrders(tick, workingOrders, execConfig) {
  const parsedTick = matchTickSchema.parse(tick);
  const last = parsedTick.last;
  const fills = [];
  const triggeredOrderIds = [];
  const orders = workingOrders.map((row) => workingOrderMatchSchema.parse(row)).sort(compareOrders);
  for (const order of orders) {
    const leftover = remainingQty(order);
    if (leftover <= 0) {
      continue;
    }
    const config = resolveExecConfig(execConfig, order.id);
    let triggered = Boolean(order.stop_triggered);
    let effectiveType = order.order_type;
    if (order.order_type === "stop" || order.order_type === "stop_limit") {
      if (!triggered && isStopTriggered(order, last)) {
        triggered = true;
        triggeredOrderIds.push(order.id);
      }
      if (!triggered) {
        continue;
      }
      effectiveType = order.order_type === "stop" ? "market" : "limit";
    }
    let price = null;
    if (effectiveType === "market") {
      price = marketPrice(last, order.side, config.slippage_bps);
    } else if (effectiveType === "limit") {
      if (!isLimitMarketable(order, last)) {
        continue;
      }
      price = limitFillPrice(order, last);
    } else {
      continue;
    }
    const qty = Math.min(leftover, capFor(config));
    if (qty <= 0 || price <= 0 || !Number.isFinite(price) || !Number.isFinite(qty)) {
      continue;
    }
    fills.push(
      matchFillSchema.parse({
        order_id: order.id,
        side: order.side,
        qty,
        price: applyTickSize(price, config.tick_size),
      }),
    );
  }
  return { fills, triggeredOrderIds };
}

// packages/paper-engine/src/positions.ts
function emptyPosition() {
  return { qty: 0, avgCost: 0, realizedPnl: 0 };
}
function weightedAvg(qtyA, costA, qtyB, costB) {
  const total = qtyA + qtyB;
  if (total === 0) {
    return 0;
  }
  return (qtyA * costA + qtyB * costB) / total;
}
function applyFillToPosition(position, fill) {
  if (fill.side === "buy") {
    if (position.qty < 0) {
      const cover = Math.min(fill.qty, -position.qty);
      const realized = position.realizedPnl + (position.avgCost - fill.price) * cover;
      const leftover = fill.qty - cover;
      const openQty = position.qty + cover;
      if (leftover === 0) {
        return {
          qty: openQty,
          avgCost: openQty === 0 ? 0 : position.avgCost,
          realizedPnl: realized,
        };
      }
      return { qty: leftover, avgCost: fill.price, realizedPnl: realized };
    }
    const qty2 = position.qty + fill.qty;
    return {
      qty: qty2,
      avgCost: weightedAvg(position.qty, position.avgCost, fill.qty, fill.price),
      realizedPnl: position.realizedPnl,
    };
  }
  if (position.qty > 0) {
    const close = Math.min(fill.qty, position.qty);
    const realized = position.realizedPnl + (fill.price - position.avgCost) * close;
    const leftover = fill.qty - close;
    const openQty = position.qty - close;
    if (leftover === 0) {
      return {
        qty: openQty,
        avgCost: openQty === 0 ? 0 : position.avgCost,
        realizedPnl: realized,
      };
    }
    return { qty: -leftover, avgCost: fill.price, realizedPnl: realized };
  }
  const qty = position.qty - fill.qty;
  const shortQty = Math.abs(position.qty);
  return {
    qty,
    avgCost:
      shortQty === 0 ? fill.price : weightedAvg(shortQty, position.avgCost, fill.qty, fill.price),
    realizedPnl: position.realizedPnl,
  };
}

// packages/paper-engine/src/settle.ts
function reservedReleaseForFill(order, fillQty) {
  if (order.side !== "buy") {
    return 0;
  }
  const remaining = Math.max(0, order.qty - order.filled_qty);
  if (remaining <= 0 || fillQty <= 0) {
    return 0;
  }
  if (fillQty >= remaining) {
    return order.reserved_amount;
  }
  return (order.reserved_amount * fillQty) / remaining;
}
function cashDeltaForFill(side, qty, price) {
  const notional = qty * price;
  return side === "buy" ? -notional : notional;
}
function applyFillToLedger(ledger, order, fill) {
  const reservedReleased = reservedReleaseForFill(order, fill.qty);
  const released = releaseBuyingPower(ledger, reservedReleased);
  return {
    ledger: {
      cashBalance: released.cashBalance + cashDeltaForFill(fill.side, fill.qty, fill.price),
      reservedCash: released.reservedCash,
    },
    reservedReleased,
    reservedRemaining: Math.max(0, order.reserved_amount - reservedReleased),
  };
}

// insforge/functions/matching-runner-src.ts
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function asRows(data) {
  return Array.isArray(data) ? data : [];
}
function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function mapOrder(row) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    account_id: String(row.account_id),
    instrument_id: String(row.instrument_id),
    symbol: String(row.symbol),
    side: row.side === "sell" ? "sell" : "buy",
    qty: num(row.qty),
    filled_qty: num(row.filled_qty),
    order_type: row.order_type,
    limit_price: row.limit_price == null ? null : num(row.limit_price),
    stop_price: row.stop_price == null ? null : num(row.stop_price),
    tif: row.tif ?? "DAY",
    status: row.status,
    reserved_amount: num(row.reserved_amount),
    stop_triggered: Boolean(row.stop_triggered),
    created_at: String(row.created_at),
  };
}
async function evaluateExecution(input) {
  const response = await fetch(`${input.baseUrl.replace(/\/+$/, "")}/functions/rules-service`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "execution_sim",
      context: input.context,
      userId: input.userId,
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`RULES_SERVICE_${response.status}`);
  }
  return evaluateDomainResponseSchema.parse(body);
}
async function loadOpenOrders(admin, instrumentIds) {
  if (instrumentIds.length === 0) {
    return [];
  }
  const { data, error } = await admin.database
    .from("orders")
    .select("*")
    .in("instrument_id", instrumentIds)
    .in("status", ["accepted", "working", "partially_filled"]);
  if (error) {
    throw new Error(error.message);
  }
  return asRows(data).map(mapOrder);
}
async function publishOrder(admin, order) {
  const { error } = await admin.database.rpc("publish_order_event", {
    p_user_id: order.user_id,
    payload: {
      id: order.id,
      status: order.status,
      symbol: order.symbol,
      filled_qty: order.filled_qty,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}
async function publishPosition(admin, userId, position) {
  const { error } = await admin.database.rpc("publish_position_event", {
    p_user_id: userId,
    payload: {
      account_id: position.account_id,
      instrument_id: position.instrument_id,
      symbol: position.symbol,
      qty: position.qty,
      avg_cost: position.avg_cost,
      realized_pnl: position.realized_pnl,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}
async function matching_runner_src_default(req) {
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }
  const expected = Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY");
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!expected || token !== expected) {
    return json(401, { error: "UNAUTHENTICATED" });
  }
  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL") ?? "";
  const admin = createAdminClient({
    baseUrl,
    apiKey: expected,
  });
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = matchingRunnerRequestSchema.parse(body);
  let ticks = parsed.ticks ?? [];
  if (ticks.length === 0) {
    const open = await admin.database
      .from("orders")
      .select("instrument_id")
      .in("status", ["accepted", "working", "partially_filled"]);
    if (open.error) {
      return json(500, { error: open.error.message });
    }
    const ids = [...new Set(asRows(open.data).map((row) => row.instrument_id))];
    if (ids.length > 0) {
      const quotes = await admin.database
        .from("quotes_latest")
        .select("*")
        .in("instrument_id", ids);
      if (quotes.error) {
        return json(500, { error: quotes.error.message });
      }
      const inst = await admin.database.from("instruments").select("id,symbol").in("id", ids);
      const symbols = new Map(asRows(inst.data).map((row) => [row.id, row.symbol]));
      ticks = asRows(quotes.data).map((row) =>
        quoteTickSchema.parse({
          instrument_id: row.instrument_id,
          symbol: symbols.get(String(row.instrument_id)),
          bid: row.bid,
          ask: row.ask,
          last: row.last,
          prev_close: row.prev_close,
          volume: row.volume,
          ts: row.ts,
        }),
      );
    }
  }
  if (ticks.length === 0) {
    return json(
      200,
      matchingRunnerResponseSchema.parse({ ticks: 0, promoted: 0, fills: 0, triggered: 0 }),
    );
  }
  const instrumentIds = [...new Set(ticks.map((tick) => tick.instrument_id))];
  const instRes = await admin.database
    .from("instruments")
    .select("id,symbol,tick_size,avg_volume,avg_volume_band")
    .in("id", instrumentIds);
  if (instRes.error) {
    return json(500, { error: instRes.error.message });
  }
  const instruments = new Map(
    asRows(instRes.data).map((row) => [
      String(row.id),
      {
        id: String(row.id),
        symbol: String(row.symbol),
        tick_size: num(row.tick_size, 0.01),
        avg_volume: num(row.avg_volume),
        avg_volume_band: typeof row.avg_volume_band === "string" ? row.avg_volume_band : null,
      },
    ]),
  );
  let orders = await loadOpenOrders(admin, instrumentIds);
  let promoted = 0;
  const now = /* @__PURE__ */ new Date().toISOString();
  for (const order of orders) {
    if (order.status !== "accepted") {
      continue;
    }
    if (!canTransition(order.status, "working")) {
      continue;
    }
    assertTransition(order.status, "working");
    const update = await admin.database
      .from("orders")
      .update({ status: "working" })
      .eq("id", order.id)
      .eq("user_id", order.user_id);
    if (update.error) {
      return json(500, { error: update.error.message });
    }
    order.status = "working";
    promoted += 1;
    await admin.database.from("audit_log").insert([
      {
        user_id: order.user_id,
        action: "trade:promote",
        entity_type: "orders",
        entity_id: order.id,
        payload: { from: "accepted", to: "working", ts: now },
      },
    ]);
    await publishOrder(admin, order);
  }
  const posRes = await admin.database
    .from("positions")
    .select("account_id,instrument_id,symbol,qty,avg_cost,realized_pnl")
    .in("instrument_id", instrumentIds);
  if (posRes.error) {
    return json(500, { error: posRes.error.message });
  }
  const positions = /* @__PURE__ */ new Map();
  for (const row of asRows(posRes.data)) {
    const mapped = {
      account_id: String(row.account_id),
      instrument_id: String(row.instrument_id),
      symbol: String(row.symbol),
      qty: num(row.qty),
      avg_cost: num(row.avg_cost),
      realized_pnl: num(row.realized_pnl),
    };
    positions.set(`${mapped.account_id}:${mapped.instrument_id}`, mapped);
  }
  const execCache = /* @__PURE__ */ new Map();
  let fillsApplied = 0;
  let triggered = 0;
  for (const tick of ticks) {
    const instrument = instruments.get(tick.instrument_id);
    const matchTick = {
      instrument_id: tick.instrument_id,
      symbol: tick.symbol ?? instrument?.symbol,
      last: tick.last,
      bid: tick.bid,
      ask: tick.ask,
      ts: tick.ts,
    };
    const working = orders.filter(
      (order) =>
        order.instrument_id === tick.instrument_id &&
        (order.status === "working" || order.status === "partially_filled"),
    );
    if (working.length === 0) {
      continue;
    }
    const resolver = async (order) => {
      const remaining = Math.max(0, order.qty - order.filled_qty);
      const notional = remaining * tick.last;
      const band = instrument?.avg_volume_band ?? "medium";
      const key = `${band}:${notional}:${instrument?.tick_size ?? ""}`;
      if (execCache.has(key)) {
        return execCache.get(key) ?? null;
      }
      try {
        const evaluated = await evaluateExecution({
          baseUrl,
          apiKey: expected,
          userId: order.user_id,
          context: {
            avg_volume_band: band,
            order_notional: notional,
          },
        });
        const parsedCfg = parseExecConfig(evaluated.outcome);
        if (!parsedCfg) {
          execCache.set(key, null);
          return null;
        }
        const pct = parsedCfg.liquidity_cap_pct_adv;
        const cap =
          parsedCfg.liquidity_cap ??
          (pct == null || instrument == null
            ? void 0
            : liquidityCapShares(instrument.avg_volume, pct));
        const cfg = {
          slippage_bps: parsedCfg.slippage_bps,
          liquidity_cap: cap,
          tick_size: instrument?.tick_size,
        };
        execCache.set(key, cfg);
        return cfg;
      } catch {
        execCache.set(key, null);
        return null;
      }
    };
    const configs = /* @__PURE__ */ new Map();
    for (const order of working) {
      const cfg = await resolver(order);
      if (cfg) {
        configs.set(order.id, cfg);
      }
    }
    if (configs.size === 0) {
      continue;
    }
    const result = matchOrders(
      matchTick,
      working.filter((order) => configs.has(order.id)),
      (orderId) => configs.get(orderId),
    );
    for (const orderId of result.triggeredOrderIds) {
      const order = orders.find((row) => row.id === orderId);
      if (!order || order.stop_triggered) {
        continue;
      }
      order.stop_triggered = true;
      triggered += 1;
      await admin.database.from("orders").update({ stop_triggered: true }).eq("id", order.id);
    }
    for (const fill of result.fills) {
      const order = orders.find((row) => row.id === fill.order_id);
      if (!order) {
        continue;
      }
      const filledQty = order.filled_qty + fill.qty;
      const nextStatus = filledQty >= order.qty ? "filled" : "partially_filled";
      if (!canTransition(order.status, nextStatus)) {
        continue;
      }
      assertTransition(order.status, nextStatus);
      const settled = applyFillToLedger(
        { cashBalance: 0, reservedCash: order.reserved_amount },
        order,
        fill,
      );
      const posKey = `${order.account_id}:${order.instrument_id}`;
      const currentPos = positions.get(posKey) ?? {
        account_id: order.account_id,
        instrument_id: order.instrument_id,
        symbol: order.symbol,
        ...emptyPosition(),
        avg_cost: 0,
        realized_pnl: 0,
      };
      const nextPos = applyFillToPosition(
        { qty: currentPos.qty, avgCost: currentPos.avg_cost, realizedPnl: currentPos.realized_pnl },
        fill,
      );
      const executionId = crypto.randomUUID();
      const applied = await admin.database.rpc("apply_paper_fill", {
        p_user_id: order.user_id,
        p_execution_id: executionId,
        p_order_id: order.id,
        p_qty: fill.qty,
        p_price: fill.price,
        p_order_status: nextStatus,
        p_filled_qty: filledQty,
        p_reserved_amount: settled.reservedRemaining,
        p_stop_triggered: order.stop_triggered,
        p_cash_delta: cashDeltaForFill(fill.side, fill.qty, fill.price),
        p_reserved_release: settled.reservedReleased,
        p_position_qty: nextPos.qty,
        p_position_avg_cost: nextPos.avgCost,
        p_position_realized_pnl: nextPos.realizedPnl,
      });
      if (applied.error) {
        return json(500, { error: applied.error.message });
      }
      const payload = applied.data;
      if (payload && typeof payload === "object" && "ok" in payload && payload.ok !== true) {
        continue;
      }
      order.filled_qty = filledQty;
      order.status = nextStatus;
      order.reserved_amount = settled.reservedRemaining;
      const storedPos = {
        account_id: order.account_id,
        instrument_id: order.instrument_id,
        symbol: order.symbol,
        qty: nextPos.qty,
        avg_cost: nextPos.avgCost,
        realized_pnl: nextPos.realizedPnl,
      };
      positions.set(posKey, storedPos);
      fillsApplied += 1;
      await admin.database.from("audit_log").insert([
        {
          user_id: order.user_id,
          action: "trade:fill",
          entity_type: "executions",
          entity_id: executionId,
          payload: {
            order_id: order.id,
            qty: fill.qty,
            price: fill.price,
            status: nextStatus,
          },
        },
      ]);
      await publishOrder(admin, order);
      await publishPosition(admin, order.user_id, storedPos);
    }
  }
  return json(
    200,
    matchingRunnerResponseSchema.parse({
      ticks: ticks.length,
      promoted,
      fills: fillsApplied,
      triggered,
    }),
  );
}
export { matching_runner_src_default as default };
