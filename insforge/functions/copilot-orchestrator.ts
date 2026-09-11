// rewritten for InsForge worker (new Function — no import/export)
function createAdminClient(config) {
  const raw = config ?? {};
  const apiKey = typeof raw.apiKey === "string" ? raw.apiKey.trim() : "";
  if (!apiKey) {
    throw new Error("Missing apiKey. Pass apiKey to createAdminClient().");
  }
  const clientConfig = { ...raw };
  delete clientConfig.apiKey;
  return createClient({ ...clientConfig, accessToken: apiKey, isServerMode: true });
}
// bundled from insforge/functions/copilot-orchestrator-src.ts

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// insforge/functions/copilot-orchestrator-src.ts
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
  void: () => voidType
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
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
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
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
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
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
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
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
  "set"
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
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
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
  "not_finite"
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
    const mapper = _mapper || function(issue) {
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
      else
        message = "Invalid input";
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
      else
        message = "Invalid input";
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
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
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
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
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
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
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
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
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
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
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
        parent: input.parent
      }
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
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
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
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
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
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
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
      effect: { type: "refinement", refinement }
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
      validate: (data) => this["~validate"](data)
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
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
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
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
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
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
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
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
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
        received: ctx2.parsedType
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
            message: check.message
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
            message: check.message
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
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
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
            message: check.message
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
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
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
            message: check.message
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
            message: check.message
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
            message: check.message
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
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
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
            message: check.message
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
            message: check.message
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
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
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
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
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
      ...errorUtil.errToObj(message)
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
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
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
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
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
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
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
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
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
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
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
        received: ctx2.parsedType
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
            message: check.message
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
            message: check.message
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
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
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
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
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
    ...processCreateParams(params)
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
            message: check.message
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
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
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
      received: ctx.parsedType
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
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
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
    ...processCreateParams(params)
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
        received: ctx.parsedType
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
    ...processCreateParams(params)
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
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
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
            type: "date"
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
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
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
    ...processCreateParams(params)
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
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
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
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
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
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
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
    ...processCreateParams(params)
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
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
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
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
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
        received: ctx.parsedType
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
          message: def.exactLength.message
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
          message: def.minLength.message
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
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
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
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
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
    ...processCreateParams(params)
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
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
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
    if (this._cached !== null)
      return this._cached;
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
        received: ctx2.parsedType
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
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
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
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
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
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
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
        ...augmentation
      })
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
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
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
      catchall: index
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
      shape: () => shape
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
      shape: () => shape
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
      shape: () => newShape
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
      shape: () => newShape
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
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
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
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
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
        unionErrors
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
    ...processCreateParams(params)
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
        received: ctx.parsedType
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
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
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
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
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
          code: ZodIssueCode.invalid_intersection_types
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
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
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
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
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
      rest
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
    ...processCreateParams(params)
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
        received: ctx.parsedType
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
        alwaysSet: key in ctx.data
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
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
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
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
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
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
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
          message: def.minSize.message
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
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
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
    ...processCreateParams(params)
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
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
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
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
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
      ...processCreateParams(params)
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
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
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
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
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
        code: ZodIssueCode.invalid_type
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
        options: expectedValues
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
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
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
        code: ZodIssueCode.invalid_type
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
        options: expectedValues
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
    ...processCreateParams(params)
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
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
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
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
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
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
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
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
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
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
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
    ...processCreateParams(params)
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
    ...processCreateParams(params)
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
      parent: ctx
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
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
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
    ...processCreateParams(params)
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
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
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
      parent: ctx
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
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
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
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
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
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
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
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
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
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
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
  updated_at: timestamptzSchema
});
var profileInsertSchema = external_exports.object({
  user_id: uuidSchema,
  display_name: external_exports.string().nullable().optional(),
  experience_level: experienceLevelSchema.nullable().optional(),
  suitability_tier: suitabilityTierSchema.nullable().optional(),
  objectives: external_exports.string().nullable().optional()
}).strict();
var profileAdminInsertSchema = profileInsertSchema.extend({
  persona: external_exports.string().nullable().optional()
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
  updated_at: timestamptzSchema
});
var accountInsertSchema = external_exports.object({
  user_id: uuidSchema,
  cash_balance: numericSchema.optional(),
  reserved_cash: numericSchema.optional(),
  currency: external_exports.string().min(1).optional()
});
var accountPatchSchema = external_exports.object({
  currency: external_exports.string().min(1).optional()
}).strict();
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
  avg_volume_band: avgVolumeBandSchema
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
  updated_at: timestamptzSchema
});
var marketBarSchema = external_exports.object({
  instrument_id: uuidSchema,
  timeframe: barTimeframeSchema,
  ts: timestamptzSchema,
  o: numericSchema,
  h: numericSchema,
  l: numericSchema,
  c: numericSchema,
  v: numericSchema
});
var quotesLatestSchema = external_exports.object({
  instrument_id: uuidSchema,
  bid: numericSchema,
  ask: numericSchema,
  last: numericSchema,
  prev_close: numericSchema,
  volume: numericSchema,
  ts: timestamptzSchema
});
var sessionKindSchema = external_exports.enum(["regular", "half"]);
var marketCalendarRowSchema = external_exports.object({
  session_date: external_exports.string().min(10).transform((value) => value.slice(0, 10)).refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "session_date"),
  venue: external_exports.string().min(1),
  session_kind: sessionKindSchema,
  open_minute: external_exports.coerce.number().int().nonnegative(),
  close_minute: external_exports.coerce.number().int().positive()
});
var feedForcePriceSchema = external_exports.object({
  symbol: external_exports.string().min(1),
  price: numericSchema
});
var feedControlsValueSchema = external_exports.object({
  paused: external_exports.boolean().optional(),
  speed: numericSchema.optional()
});
var quoteTickSchema = external_exports.object({
  instrument_id: uuidSchema,
  symbol: external_exports.string().min(1).optional(),
  bid: numericSchema,
  ask: numericSchema,
  last: numericSchema,
  prev_close: numericSchema,
  volume: numericSchema,
  ts: timestamptzSchema
});
var quoteTickBatchSchema = external_exports.object({
  ts: timestamptzSchema,
  ticks: external_exports.array(quoteTickSchema)
});
var auditLogSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema.nullable(),
  action: external_exports.string().min(1),
  entity_type: external_exports.string().min(1),
  entity_id: uuidSchema.nullable(),
  payload: external_exports.record(external_exports.unknown()),
  created_at: timestamptzSchema
});
var auditLogInsertSchema = external_exports.object({
  user_id: uuidSchema,
  action: external_exports.string().min(1),
  entity_type: external_exports.string().min(1),
  entity_id: uuidSchema.nullable().optional(),
  payload: external_exports.record(external_exports.unknown()).optional()
});
var featureFlagSchema = external_exports.object({
  id: uuidSchema,
  key: external_exports.string().min(1),
  value: external_exports.unknown(),
  user_id: uuidSchema.nullable(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema
});
var featureFlagInsertSchema = external_exports.object({
  key: external_exports.string().min(1),
  value: external_exports.unknown().optional(),
  user_id: uuidSchema.nullable().optional()
});
var watchlistSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  name: external_exports.string().min(1),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema
});
var watchlistInsertSchema = external_exports.object({
  user_id: uuidSchema,
  name: external_exports.string().min(1)
});
var watchlistPatchSchema = external_exports.object({
  name: external_exports.string().min(1).optional()
});
var watchlistItemSchema = external_exports.object({
  id: uuidSchema,
  watchlist_id: uuidSchema,
  instrument_id: uuidSchema,
  sort_order: external_exports.coerce.number().int(),
  created_at: timestamptzSchema
});
var watchlistItemInsertSchema = external_exports.object({
  watchlist_id: uuidSchema,
  instrument_id: uuidSchema,
  sort_order: external_exports.coerce.number().int().optional()
});
var duplicateWatchlistItemErrorSchema = external_exports.object({
  code: external_exports.literal("DUPLICATE_WATCHLIST_ITEM"),
  message: external_exports.string().min(1)
});

// packages/schemas/src/workspace-layout.ts
var workspaceLayoutV1Schema = external_exports.object({
  version: external_exports.literal(1),
  dockview: external_exports.record(external_exports.unknown()),
  selectedWatchlistId: uuidSchema.nullable().optional()
});

// packages/schemas/src/command-recents.ts
var commandRecentsV1Schema = external_exports.object({
  version: external_exports.literal(1),
  items: external_exports.array(external_exports.string().min(1)).max(20)
});

// packages/schemas/src/chart.ts
var chartRangeSchema = external_exports.enum(["1D", "1W", "1M", "1Y", "5Y"]);
var chartBarsQuerySchema = external_exports.object({
  symbol: external_exports.string().min(1).max(16),
  range: chartRangeSchema
});
var chartBarsResponseSchema = external_exports.object({
  symbol: external_exports.string().min(1),
  instrument_id: external_exports.string().uuid(),
  range: chartRangeSchema,
  timeframe: external_exports.enum(["1m", "1d"]),
  bars: external_exports.array(marketBarSchema)
});

// packages/schemas/src/auth.ts
var credentialsSchema = external_exports.object({
  email: external_exports.string().email(),
  password: external_exports.string().min(1)
});
var profileWizardSchema = external_exports.object({
  display_name: external_exports.string().trim().min(1).max(120),
  experience_level: experienceLevelSchema,
  objectives: external_exports.string().trim().max(2e3).optional()
});
var sessionUserSchema = external_exports.object({
  id: uuidSchema,
  email: external_exports.string().email()
});
var provisionCreatedSchema = external_exports.object({
  profile: external_exports.boolean(),
  account: external_exports.boolean()
});
var provisionResultSchema = external_exports.object({
  profile: profileSchema,
  account: accountSchema,
  created: provisionCreatedSchema
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
  "any"
]);
var hitPolicySchema = external_exports.enum(["FIRST", "ALL", "COLLECT"]);
var decisionConditionSchema = external_exports.object({
  input: external_exports.string().min(1),
  op: conditionOperatorSchema,
  value: external_exports.unknown().optional(),
  /** Encodes doc 05 prose such as “not between” (no dedicated operator). */
  negate: external_exports.boolean().optional()
});
var decisionOutputsSchema = external_exports.record(external_exports.unknown());
var decisionRowSchema = external_exports.object({
  id: external_exports.string().min(1),
  priority: external_exports.number().int(),
  conditions: external_exports.array(decisionConditionSchema),
  outputs: decisionOutputsSchema,
  effective_from: external_exports.string().nullable().optional(),
  effective_to: external_exports.string().nullable().optional()
});
var decisionTableSchema = external_exports.object({
  id: external_exports.string().min(1),
  hit_policy: hitPolicySchema,
  default_outputs: decisionOutputsSchema,
  rows: external_exports.array(decisionRowSchema)
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
  "market_sim"
]);
var tableStatusSchema = external_exports.enum(["draft", "published", "retired"]);
var tableVersionRefSchema = external_exports.object({
  table_key: external_exports.string().min(1),
  version: external_exports.number().int().positive()
});
var evaluateDomainRequestSchema = external_exports.object({
  op: external_exports.literal("evaluateDomain").optional(),
  domain: ruleDomainSchema,
  context: external_exports.record(external_exports.unknown()),
  clock: external_exports.string().optional(),
  userId: uuidSchema.optional()
});
var evaluateDomainResponseSchema = external_exports.object({
  outcome: external_exports.union([external_exports.record(external_exports.unknown()), external_exports.array(external_exports.record(external_exports.unknown()))]),
  matchedRows: external_exports.array(decisionRowSchema),
  trace: external_exports.array(external_exports.unknown()),
  auditId: external_exports.string().min(1),
  tableVersions: external_exports.array(tableVersionRefSchema)
});
var ruleAuditInsertSchema = external_exports.object({
  user_id: uuidSchema.nullable().optional(),
  domain: ruleDomainSchema,
  table_versions: external_exports.array(tableVersionRefSchema),
  context: external_exports.record(external_exports.unknown()),
  matched_rows: external_exports.unknown(),
  outcome: external_exports.unknown(),
  latency_ms: external_exports.number().int().nonnegative()
});
var publishRulesRequestSchema = external_exports.object({
  op: external_exports.literal("publish"),
  tableKey: external_exports.string().min(1)
});
var invalidateRulesRequestSchema = external_exports.object({
  op: external_exports.literal("invalidate"),
  event: external_exports.literal("rules:published").optional()
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
  "listAudits"
]);
var catalogTableItemSchema = external_exports.object({
  tableKey: external_exports.string().min(1),
  domain: external_exports.string().min(1),
  publishedVersion: external_exports.number().int().positive().nullable(),
  draftVersion: external_exports.number().int().positive().nullable().optional()
});
var tableDiffSchema = external_exports.object({
  tableKey: external_exports.string().min(1),
  publishedVersion: external_exports.number().int().nonnegative().nullable(),
  draftVersion: external_exports.number().int().nonnegative().nullable(),
  addedRowIds: external_exports.array(external_exports.string()),
  removedRowIds: external_exports.array(external_exports.string()),
  changedRowIds: external_exports.array(external_exports.string())
});
var simulateDeltaSchema = external_exports.object({
  auditId: external_exports.string().min(1),
  publishedOutcome: external_exports.unknown(),
  draftOutcome: external_exports.unknown(),
  publishedRowIds: external_exports.array(external_exports.string()),
  draftRowIds: external_exports.array(external_exports.string())
});
var simulateResultSchema = external_exports.object({
  sampleSize: external_exports.number().int().nonnegative(),
  agreementPct: external_exports.number().min(0).max(100),
  deltas: external_exports.array(simulateDeltaSchema)
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
  user_id: external_exports.string().nullable().optional()
});
var tableHistoryItemSchema = external_exports.object({
  version: external_exports.number().int().positive(),
  status: external_exports.enum(["draft", "published", "retired"]),
  table: decisionTableSchema
});
var rulesAdminGetTableResponseSchema = external_exports.object({
  tableKey: external_exports.string().min(1),
  domain: external_exports.string().min(1),
  published: decisionTableSchema.nullable(),
  publishedVersion: external_exports.number().int().positive().nullable(),
  draft: decisionTableSchema.nullable(),
  draftVersion: external_exports.number().int().positive().nullable(),
  diff: tableDiffSchema
});
var tableKeyField = external_exports.object({ tableKey: external_exports.string().min(1) });
var rulesAdminRequestSchema = external_exports.discriminatedUnion("op", [
  external_exports.object({ op: external_exports.literal("listCatalog") }),
  external_exports.object({ op: external_exports.literal("getTable"), tableKey: external_exports.string().min(1) }),
  external_exports.object({
    op: external_exports.literal("saveDraft"),
    tableKey: external_exports.string().min(1),
    table: decisionTableSchema
  }),
  external_exports.object({ op: external_exports.literal("publish"), tableKey: external_exports.string().min(1) }),
  external_exports.object({
    op: external_exports.literal("rollback"),
    tableKey: external_exports.string().min(1),
    version: external_exports.number().int().positive()
  }),
  external_exports.object({
    op: external_exports.literal("simulate"),
    tableKey: external_exports.string().min(1),
    limit: external_exports.number().int().positive().max(500).optional()
  }),
  external_exports.object({ op: external_exports.literal("listHistory"), tableKey: external_exports.string().min(1) }),
  external_exports.object({
    op: external_exports.literal("listAudits"),
    query: external_exports.string().optional(),
    domain: external_exports.string().optional(),
    limit: external_exports.number().int().positive().max(200).optional()
  })
]);
var rulesAdminListCatalogResponseSchema = external_exports.object({
  tables: external_exports.array(catalogTableItemSchema)
});
var rulesAdminPublishResponseSchema = external_exports.object({
  ok: external_exports.literal(true),
  tableKey: external_exports.string().min(1),
  version: external_exports.number().int().positive(),
  event: external_exports.literal("rules:published")
});

// packages/schemas/src/orders.ts
var orderSideSchema = external_exports.enum(["buy", "sell"]);
var orderTypeSchema = external_exports.enum(["market", "limit", "stop", "stop_limit"]);
var tifSchema = external_exports.enum(["DAY", "GTC", "IOC"]);
var qtyModeSchema = external_exports.enum(["shares", "notional"]);
var orderGroupTypeSchema = external_exports.enum(["bracket", "oco"]);
var orderLegRoleSchema = external_exports.enum(["entry", "take_profit", "stop_loss", "oco_a", "oco_b"]);
var trailTypeSchema = external_exports.enum(["percent", "amount"]);
var orderStatusSchema = external_exports.enum([
  "draft",
  "validated",
  "accepted",
  "working",
  "partially_filled",
  "filled",
  "cancelled",
  "rejected",
  "expired"
]);
var orderDraftSchema = external_exports.object({
  symbol: external_exports.string().min(1),
  side: orderSideSchema,
  qty: external_exports.number().finite(),
  order_type: orderTypeSchema,
  limit_price: external_exports.number().finite().nullable().optional(),
  stop_price: external_exports.number().finite().nullable().optional(),
  tif: tifSchema,
  group_type: orderGroupTypeSchema.nullable().optional(),
  tp_price: external_exports.number().finite().nullable().optional(),
  sl_price: external_exports.number().finite().nullable().optional(),
  trail_type: trailTypeSchema.nullable().optional(),
  trail_value: external_exports.number().finite().nullable().optional()
}).strict();
var orderPreviewRequestSchema = external_exports.object({
  op: external_exports.literal("preview").optional(),
  draft: orderDraftSchema,
  last_price: numericSchema
}).strict();
var orderPreviewRuleSchema = external_exports.object({
  table_key: external_exports.string().min(1),
  passed: external_exports.boolean(),
  decision: external_exports.string().min(1),
  reason: external_exports.string().min(1),
  reason_code: external_exports.string().min(1).optional()
});
var orderFeeBreakdownSchema = external_exports.object({
  commission_usd: numericSchema,
  sec_fee: numericSchema,
  taf: numericSchema,
  data_fee_monthly: numericSchema.optional()
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
  validation_outcome: external_exports.union([external_exports.record(external_exports.unknown()), external_exports.array(external_exports.record(external_exports.unknown()))]),
  risk_outcome: external_exports.union([external_exports.record(external_exports.unknown()), external_exports.array(external_exports.record(external_exports.unknown()))]),
  fee_outcome: external_exports.record(external_exports.unknown()),
  hours_outcome: external_exports.union([external_exports.record(external_exports.unknown()), external_exports.array(external_exports.record(external_exports.unknown()))]).default({})
});
var orderCreateRequestSchema = external_exports.object({
  op: external_exports.literal("create").optional(),
  draft: orderDraftSchema,
  last_price: numericSchema
}).strict();
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
  group_id: uuidSchema.nullable().optional(),
  group_type: orderGroupTypeSchema.nullable().optional(),
  leg_role: orderLegRoleSchema.nullable().optional(),
  group_activated: external_exports.boolean().optional(),
  trail_type: trailTypeSchema.nullable().optional(),
  trail_value: numericSchema.nullable().optional(),
  high_water_mark: numericSchema.nullable().optional(),
  reserved_amount: numericSchema.optional(),
  stop_triggered: external_exports.boolean().optional(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema
});
var orderCreateResponseSchema = external_exports.object({
  order: orderRecordSchema,
  preview: orderPreviewResponseSchema
});
var orderCancelRequestSchema = external_exports.object({
  op: external_exports.literal("cancel").optional(),
  order_id: uuidSchema.optional()
}).strict();
var orderCancelResponseSchema = external_exports.object({
  order: orderRecordSchema
});
var orderRealtimeEventSchema = external_exports.object({
  id: uuidSchema,
  status: orderStatusSchema.optional(),
  symbol: external_exports.string().min(1).optional(),
  reject_reason: external_exports.string().nullable().optional(),
  rule_audit_id: external_exports.string().nullable().optional()
});
var blotterTabSchema = external_exports.enum(["working", "filled", "rejected", "all"]);
var blotterSideFilterSchema = external_exports.enum(["all", "buy", "sell"]);
var blotterFiltersSchema = external_exports.object({
  symbol: external_exports.string(),
  side: blotterSideFilterSchema,
  status: external_exports.union([external_exports.literal("all"), orderStatusSchema]),
  dateFrom: external_exports.string(),
  dateTo: external_exports.string()
}).strict();
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
  created_at: timestamptzSchema
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
  updated_at: timestamptzSchema
});
var portfolioSnapshotSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  as_of_date: external_exports.string().min(1),
  equity: numericSchema,
  cash: numericSchema,
  buying_power: numericSchema,
  created_at: timestamptzSchema
});
var execConfigSchema = external_exports.object({
  slippage_bps: numericSchema,
  liquidity_cap: numericSchema.optional(),
  liquidity_cap_pct_adv: numericSchema.optional(),
  tick_size: numericSchema.optional()
});
var matchTickSchema = external_exports.object({
  instrument_id: uuidSchema.optional(),
  symbol: external_exports.string().min(1).optional(),
  last: numericSchema,
  bid: numericSchema.optional(),
  ask: numericSchema.optional(),
  ts: timestamptzSchema.optional()
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
  group_id: external_exports.string().min(1).nullable().optional(),
  group_type: orderGroupTypeSchema.nullable().optional(),
  leg_role: orderLegRoleSchema.nullable().optional(),
  group_activated: external_exports.boolean().optional(),
  trail_type: trailTypeSchema.nullable().optional(),
  trail_value: numericSchema.nullable().optional(),
  high_water_mark: numericSchema.nullable().optional()
});
var matchFillSchema = external_exports.object({
  order_id: external_exports.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  price: numericSchema
});
var matchingRunnerRequestSchema = external_exports.object({
  ticks: external_exports.array(quoteTickSchema).optional()
}).strict();
var matchingRunnerResponseSchema = external_exports.object({
  ticks: external_exports.number().int().nonnegative(),
  promoted: external_exports.number().int().nonnegative(),
  fills: external_exports.number().int().nonnegative(),
  triggered: external_exports.number().int().nonnegative()
});

// packages/schemas/src/analytics.ts
var equityCurveRangeSchema = external_exports.enum(["1M", "3M", "1Y"]);
var portfolioPositionViewSchema = external_exports.object({
  id: uuidSchema,
  instrument_id: uuidSchema,
  symbol: external_exports.string().min(1),
  sector: external_exports.string().nullable(),
  qty: numericSchema,
  avg_cost: numericSchema,
  last: numericSchema,
  prev_close: numericSchema,
  market_value: numericSchema,
  unrealized_pnl: numericSchema,
  realized_pnl: numericSchema,
  day_pnl: numericSchema,
  weight_pct: numericSchema,
  unrealized_pnl_pct: numericSchema
});
var portfolioAccountViewSchema = external_exports.object({
  account_id: uuidSchema,
  cash: numericSchema,
  reserved_cash: numericSchema,
  buying_power: numericSchema,
  equity: numericSchema,
  day_pnl: numericSchema,
  currency: external_exports.string().min(1)
});
var allocationSliceSchema = external_exports.object({
  key: external_exports.string().min(1),
  market_value: numericSchema,
  weight_pct: numericSchema
});
var portfolioResponseSchema = external_exports.object({
  account: portfolioAccountViewSchema,
  positions: external_exports.array(portfolioPositionViewSchema),
  allocations: external_exports.object({
    by_position: external_exports.array(allocationSliceSchema),
    by_sector: external_exports.array(allocationSliceSchema)
  }),
  snapshots: external_exports.array(portfolioSnapshotSchema)
});
var analyticsPortfolioRequestSchema = external_exports.object({
  op: external_exports.literal("portfolio").optional(),
  range: equityCurveRangeSchema.optional()
}).strict();
var analyticsSnapshotRequestSchema = external_exports.object({
  op: external_exports.literal("snapshot").optional(),
  force: external_exports.boolean().optional(),
  as_of_date: external_exports.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).strict();
var analyticsSnapshotResponseSchema = external_exports.object({
  written: external_exports.number().int().nonnegative(),
  skipped: external_exports.boolean(),
  as_of_date: external_exports.string().nullable()
});
var analyticsRsiRequestSchema = external_exports.object({
  op: external_exports.literal("rsi").optional()
}).strict();
var analyticsRsiResponseSchema = external_exports.object({
  written: external_exports.number().int().nonnegative()
});

// packages/schemas/src/news.ts
var newsEventTypeSchema = external_exports.enum([
  "earnings",
  "analyst",
  "macro",
  "product",
  "regulatory",
  "mna"
]);
var newsHeadlineTemplateSchema = external_exports.object({
  headline: external_exports.string().min(1),
  sentiment: external_exports.tuple([external_exports.number(), external_exports.number()])
});
var newsTemplatesFileSchema = external_exports.object({
  earnings: external_exports.array(newsHeadlineTemplateSchema).min(1),
  analyst: external_exports.array(newsHeadlineTemplateSchema).min(1),
  macro: external_exports.array(newsHeadlineTemplateSchema).min(1),
  product: external_exports.array(newsHeadlineTemplateSchema).min(1),
  regulatory: external_exports.array(newsHeadlineTemplateSchema).min(1),
  mna: external_exports.array(newsHeadlineTemplateSchema).min(1),
  fills: external_exports.record(external_exports.array(external_exports.string().min(1)))
}).strict();
var newsItemSchema = external_exports.object({
  id: uuidSchema,
  ts: timestamptzSchema,
  headline: external_exports.string().min(1),
  body: external_exports.string().min(1),
  source: external_exports.string().min(1),
  symbols: external_exports.array(external_exports.string().min(1)),
  sector: external_exports.string().nullable(),
  sentiment: numericSchema.refine((value) => value >= -1 && value <= 1, "sentiment"),
  event_type: newsEventTypeSchema
});
var newsItemInsertSchema = newsItemSchema.omit({ id: true }).extend({
  id: uuidSchema.optional()
});
var newsRealtimeBatchSchema = external_exports.object({
  ts: timestamptzSchema,
  items: external_exports.array(newsItemSchema).min(1)
});

// packages/schemas/src/news-search.ts
var NEWS_SEARCH_LIMIT = 50;
var newsSearchRequestSchema = external_exports.object({
  query: external_exports.string().trim().min(1).max(500),
  symbols: external_exports.array(external_exports.string().min(1)).max(32).optional(),
  since: timestamptzSchema.optional(),
  limit: external_exports.number().int().min(1).max(NEWS_SEARCH_LIMIT).optional()
});
var newsSearchHitSchema = newsItemSchema.extend({
  score: numericSchema
});
var newsSearchResponseSchema = external_exports.object({
  items: external_exports.array(newsSearchHitSchema)
});
var embedWorkerRequestSchema = external_exports.object({
  op: external_exports.enum(["cycle", "backfill"]).default("cycle"),
  news_ids: external_exports.array(uuidSchema).max(200).optional()
});
var embedWorkerResponseSchema = external_exports.object({
  scanned: external_exports.number().int().nonnegative(),
  embedded: external_exports.number().int().nonnegative(),
  retried: external_exports.number().int().nonnegative(),
  dead_lettered: external_exports.number().int().nonnegative()
});
var newsEmbedDeadLetterSchema = external_exports.object({
  news_id: uuidSchema,
  attempts: external_exports.number().int().nonnegative(),
  last_error: external_exports.string().min(1),
  last_http_status: external_exports.number().int().nullable(),
  dead: external_exports.boolean(),
  updated_at: timestamptzSchema
});

// packages/schemas/src/fundamentals.ts
var analystRatingsSchema = external_exports.object({
  buy: external_exports.coerce.number().int().nonnegative(),
  hold: external_exports.coerce.number().int().nonnegative(),
  sell: external_exports.coerce.number().int().nonnegative()
});
var fourPeriodSeriesSchema = external_exports.object({
  labels: external_exports.tuple([external_exports.string(), external_exports.string(), external_exports.string(), external_exports.string()]),
  values: external_exports.tuple([numericSchema, numericSchema, numericSchema, numericSchema])
});
var fundamentalsValuationSchema = external_exports.object({
  pe: numericSchema.optional(),
  market_cap_b: numericSchema.optional(),
  shares_out_m: numericSchema.optional(),
  expense_ratio: numericSchema.optional(),
  aum_b: numericSchema.optional()
});
var fundamentalsIncomeSchema = external_exports.object({
  eps_ttm: numericSchema.optional(),
  revenue_b: numericSchema.optional(),
  revenue_growth_pct: numericSchema.optional(),
  next_earnings: external_exports.string().min(1).optional(),
  revenue_periods: fourPeriodSeriesSchema,
  eps_periods: fourPeriodSeriesSchema
});
var fundamentalsMarginsSchema = external_exports.object({
  gross_margin_pct: numericSchema.optional(),
  net_margin_pct: numericSchema.optional()
});
var fundamentalsDividendsSchema = external_exports.object({
  dividend_yield: numericSchema
});
var fundamentalsRangesSchema = external_exports.object({
  week52_low: numericSchema,
  week52_high: numericSchema
});
var fundamentalsMetricsSchema = external_exports.object({
  valuation: fundamentalsValuationSchema,
  income: fundamentalsIncomeSchema,
  margins: fundamentalsMarginsSchema,
  dividends: fundamentalsDividendsSchema,
  ranges: fundamentalsRangesSchema,
  analyst: analystRatingsSchema
}).strict();
var fundamentalsRecordSchema = external_exports.object({
  instrument_id: uuidSchema,
  metrics: fundamentalsMetricsSchema,
  updated_at: timestamptzSchema
});
var fundamentalsRecordInsertSchema = external_exports.object({
  instrument_id: uuidSchema,
  metrics: fundamentalsMetricsSchema,
  updated_at: timestamptzSchema.optional()
});
var fundamentalsFileMetricsSchema = external_exports.object({
  pe: numericSchema.optional(),
  eps_ttm: numericSchema.optional(),
  revenue_b: numericSchema.optional(),
  revenue_growth_pct: numericSchema.optional(),
  gross_margin_pct: numericSchema.optional(),
  net_margin_pct: numericSchema.optional(),
  dividend_yield: numericSchema.optional(),
  shares_out_m: numericSchema.optional(),
  week52_low: numericSchema.optional(),
  week52_high: numericSchema.optional(),
  analyst: analystRatingsSchema.optional(),
  next_earnings: external_exports.string().min(1).optional(),
  expense_ratio: numericSchema.optional(),
  aum_b: numericSchema.optional(),
  valuation: fundamentalsValuationSchema.optional(),
  income: fundamentalsIncomeSchema.partial().optional(),
  margins: fundamentalsMarginsSchema.optional(),
  dividends: fundamentalsDividendsSchema.optional(),
  ranges: fundamentalsRangesSchema.optional()
}).passthrough();
var fundamentalsFileRowSchema = external_exports.object({
  symbol: external_exports.string().min(1),
  metrics: fundamentalsFileMetricsSchema
});
var fundamentalsFileSchema = external_exports.array(fundamentalsFileRowSchema);
var desPeerSchema = external_exports.object({
  symbol: external_exports.string().min(1),
  name: external_exports.string().min(1),
  instrument_id: uuidSchema,
  last: numericSchema.nullable(),
  market_cap_b: numericSchema.nullable()
});
var desProfileSchema = external_exports.object({
  instrument: instrumentSchema,
  quote: quotesLatestSchema.nullable(),
  fundamentals: fundamentalsRecordSchema,
  peers: external_exports.array(desPeerSchema)
});

// packages/schemas/src/screener.ts
var screenerCombinatorSchema = external_exports.enum(["and", "or"]);
var screenerFieldIdSchema = external_exports.enum([
  "sector",
  "market_cap_band",
  "pe",
  "dividend_yield",
  "pct_chg",
  "volume",
  "rsi_14",
  "week52_proximity"
]);
var screenerSortColumnSchema = external_exports.enum([
  "symbol",
  "name",
  "sector",
  "market_cap_band",
  "pe",
  "dividend_yield",
  "pct_chg",
  "volume",
  "rsi_14",
  "week52_proximity",
  "last"
]);
var screenerSortDirSchema = external_exports.enum(["asc", "desc"]);
var STRING_OPS = ["eq", "neq", "in", "not_in", "regex", "is_null", "any"];
var NUMBER_OPS = ["eq", "neq", "lt", "lte", "gt", "gte", "between", "is_null", "any"];
var ENUM_OPS = ["eq", "neq", "in", "not_in", "is_null", "any"];
var SCREENER_FIELD_REGISTRY = {
  sector: {
    id: "sector",
    label: "Sector",
    type: "string",
    operators: STRING_OPS,
    sqlExpr: "i.sector"
  },
  market_cap_band: {
    id: "market_cap_band",
    label: "Market cap band",
    type: "enum",
    operators: ENUM_OPS,
    sqlExpr: "i.market_cap_band"
  },
  pe: {
    id: "pe",
    label: "P/E",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "(f.metrics->'valuation'->>'pe')::numeric"
  },
  dividend_yield: {
    id: "dividend_yield",
    label: "Div yield",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "(f.metrics->'dividends'->>'dividend_yield')::numeric"
  },
  pct_chg: {
    id: "pct_chg",
    label: "% chg today",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "CASE WHEN q.prev_close IS NULL OR q.prev_close = 0 THEN NULL ELSE (q.last - q.prev_close) / q.prev_close * 100 END"
  },
  volume: {
    id: "volume",
    label: "Volume",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "q.volume"
  },
  rsi_14: {
    id: "rsi_14",
    label: "RSI(14)",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "r.rsi_14"
  },
  week52_proximity: {
    id: "week52_proximity",
    label: "52w proximity",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "CASE WHEN NULLIF((f.metrics->'ranges'->>'week52_high')::numeric - (f.metrics->'ranges'->>'week52_low')::numeric, 0) IS NULL THEN NULL ELSE (q.last - (f.metrics->'ranges'->>'week52_low')::numeric) / ((f.metrics->'ranges'->>'week52_high')::numeric - (f.metrics->'ranges'->>'week52_low')::numeric) END"
  }
};
var screenerValueSchema = external_exports.union([
  external_exports.string(),
  external_exports.number(),
  external_exports.boolean(),
  external_exports.array(external_exports.union([external_exports.string(), external_exports.number()])),
  external_exports.null()
]);
var screenerConditionSchema = external_exports.object({
  field: screenerFieldIdSchema,
  op: conditionOperatorSchema,
  value: screenerValueSchema.optional()
}).superRefine((condition, ctx) => {
  const def = SCREENER_FIELD_REGISTRY[condition.field];
  if (!def.operators.includes(condition.op)) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "OPERATOR_NOT_ALLOWED",
      path: ["op"]
    });
  }
  if (condition.op === "is_null" || condition.op === "any") {
    return;
  }
  if (condition.value === void 0) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "VALUE_REQUIRED",
      path: ["value"]
    });
    return;
  }
  if (condition.op === "in" || condition.op === "not_in") {
    if (!Array.isArray(condition.value) || condition.value.length === 0) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "VALUE_LIST_REQUIRED",
        path: ["value"]
      });
    }
    return;
  }
  if (condition.op === "between") {
    if (!Array.isArray(condition.value) || condition.value.length !== 2) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "BETWEEN_PAIR_REQUIRED",
        path: ["value"]
      });
    }
    return;
  }
  if (condition.field === "market_cap_band" && typeof condition.value === "string") {
    if (!marketCapBandSchema.safeParse(condition.value).success) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "MARKET_CAP_BAND_INVALID",
        path: ["value"]
      });
    }
  }
});
var screenerGroupSchema = external_exports.object({
  combinator: screenerCombinatorSchema,
  conditions: external_exports.array(screenerConditionSchema).min(1).max(16)
});
var screenerCriteriaSchema = external_exports.object({
  combinator: screenerCombinatorSchema,
  groups: external_exports.array(screenerGroupSchema).min(1).max(16)
});
var screenerSortSchema = external_exports.object({
  column: screenerSortColumnSchema,
  dir: screenerSortDirSchema
});
var screenerRunRequestSchema = external_exports.object({
  op: external_exports.enum(["run", "count"]).optional(),
  criteria: screenerCriteriaSchema,
  sort: screenerSortSchema.optional()
}).strict();
var screenerRowSchema = external_exports.object({
  instrument_id: uuidSchema,
  symbol: external_exports.string().min(1),
  name: external_exports.string().min(1),
  sector: external_exports.string().nullable(),
  market_cap_band: external_exports.string().nullable(),
  pe: numericSchema.nullable(),
  dividend_yield: numericSchema.nullable(),
  pct_chg: numericSchema.nullable(),
  volume: numericSchema.nullable(),
  last: numericSchema.nullable(),
  rsi_14: numericSchema.nullable(),
  week52_proximity: numericSchema.nullable()
});
var screenerRunResponseSchema = external_exports.object({
  rows: external_exports.array(screenerRowSchema),
  count: external_exports.number().int().nonnegative(),
  truncated: external_exports.boolean()
});
var screenerCountResponseSchema = external_exports.object({
  count: external_exports.number().int().nonnegative(),
  truncated: external_exports.boolean()
});
var screenRecordSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  name: external_exports.string().min(1),
  criteria: screenerCriteriaSchema,
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema
});
var screenInsertSchema = external_exports.object({
  user_id: uuidSchema,
  name: external_exports.string().min(1).max(80),
  criteria: screenerCriteriaSchema
});
var screenPatchSchema = external_exports.object({
  name: external_exports.string().min(1).max(80).optional(),
  criteria: screenerCriteriaSchema.optional()
}).strict();
var instrumentDailyRsiSchema = external_exports.object({
  instrument_id: uuidSchema,
  rsi_14: numericSchema.nullable(),
  as_of_date: external_exports.string().min(10),
  updated_at: timestamptzSchema
});

// packages/schemas/src/alerts.ts
var alertKindSchema = external_exports.enum([
  "price_cross_above",
  "price_cross_below",
  "pct_chg",
  "volume",
  "rsi",
  "news_sentiment"
]);
var alertThrottleStateSchema = external_exports.object({
  last_fired_at: timestamptzSchema.nullable().optional(),
  fires_today: external_exports.coerce.number().int().nonnegative().optional(),
  fires_on_date: external_exports.string().nullable().optional(),
  last_eval_last: numericSchema.nullable().optional(),
  paused: external_exports.boolean().optional()
}).strict();
var alertRuleConditionSchema = decisionRowSchema;
var alertRuleSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  instrument_id: uuidSchema.nullable(),
  name: external_exports.string().min(1),
  kind: alertKindSchema,
  condition: alertRuleConditionSchema,
  active: external_exports.boolean(),
  throttle_state: alertThrottleStateSchema,
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema
});
var alertRuleInsertSchema = external_exports.object({
  user_id: uuidSchema,
  instrument_id: uuidSchema.nullable().optional(),
  name: external_exports.string().min(1),
  kind: alertKindSchema,
  condition: alertRuleConditionSchema,
  active: external_exports.boolean().optional(),
  throttle_state: alertThrottleStateSchema.optional()
}).strict();
var alertRulePatchSchema = external_exports.object({
  name: external_exports.string().min(1).optional(),
  active: external_exports.boolean().optional(),
  throttle_state: alertThrottleStateSchema.optional(),
  condition: alertRuleConditionSchema.optional()
}).strict();
var alertCreateRequestSchema = external_exports.object({
  instrument_id: uuidSchema.nullable().optional(),
  symbol: external_exports.string().min(1).optional(),
  kind: alertKindSchema,
  threshold: numericSchema.optional(),
  name: external_exports.string().min(1).optional()
}).strict();
var alertInstanceSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  alert_rule_id: uuidSchema,
  instrument_id: uuidSchema.nullable(),
  fired_at: timestamptzSchema,
  message: external_exports.string().min(1),
  payload: external_exports.record(external_exports.unknown()),
  read: external_exports.boolean(),
  created_at: timestamptzSchema
});
var alertInstanceInsertSchema = external_exports.object({
  user_id: uuidSchema,
  alert_rule_id: uuidSchema,
  instrument_id: uuidSchema.nullable().optional(),
  fired_at: timestamptzSchema.optional(),
  message: external_exports.string().min(1),
  payload: external_exports.record(external_exports.unknown()).optional(),
  read: external_exports.boolean().optional()
}).strict();
var alertRealtimeEventSchema = external_exports.object({
  kind: external_exports.literal("alert"),
  alert: alertInstanceSchema
});
var alertRunnerRequestSchema = external_exports.object({
  ticks: external_exports.array(quoteTickSchema).optional(),
  news: external_exports.array(newsItemSchema).optional(),
  clock: timestamptzSchema.optional()
}).strict();
var alertRunnerResponseSchema = external_exports.object({
  evaluated: external_exports.number().int().nonnegative(),
  fired: external_exports.number().int().nonnegative(),
  suppressed: external_exports.number().int().nonnegative()
});
var evaluateAlertsRequestSchema = external_exports.object({
  ticks: external_exports.array(quoteTickSchema).optional(),
  news: external_exports.array(newsItemSchema).optional()
}).strict();
var alertConditionListSchema = external_exports.array(decisionConditionSchema).min(1);

// packages/schemas/src/admin-users.ts
var userRoleSchema = rulesAdminRoleSchema;
var adminUsersOpSchema = external_exports.enum(["list", "assign"]);
var adminUserRowSchema = external_exports.object({
  user_id: uuidSchema,
  email: external_exports.string().email().nullable().optional(),
  display_name: external_exports.string().nullable().optional(),
  role: userRoleSchema
});
var adminUsersListRequestSchema = external_exports.object({
  op: external_exports.literal("list")
});
var adminUsersAssignRequestSchema = external_exports.object({
  op: external_exports.literal("assign"),
  user_id: uuidSchema,
  role: userRoleSchema
});
var adminUsersRequestSchema = external_exports.discriminatedUnion("op", [
  adminUsersListRequestSchema,
  adminUsersAssignRequestSchema
]);
var adminUsersListResponseSchema = external_exports.object({
  users: external_exports.array(adminUserRowSchema)
});
var adminUsersAssignResponseSchema = external_exports.object({
  ok: external_exports.literal(true),
  user_id: uuidSchema,
  role: userRoleSchema
});

// packages/schemas/src/copilot.ts
var COPILOT_MAX_TOOL_CALLS = 8;
var COPILOT_SYSTEM_PROMPT = `You are Meridian Copilot, a market analyst inside a trading terminal. Rules:
- Never state a price, P&L, or metric you did not just retrieve via a tool. No memory prices.
- Cite sources: attach news ids / data refs for every factual claim.
- You may propose actions via tools; orders always require user approval \u2014 say so.
- You are not a licensed financial advisor: frame outputs as information/analysis, not advice;
  note material risks when discussing positions.
- Be terse and terminal-like: dense, factual, no filler.
- If a rule (e.g. risk limit) blocked something, explain it using explain_rule_decision, never
  speculate about why.`;
var copilotReadToolNameSchema = external_exports.enum([
  "get_quote",
  "get_bars",
  "search_news",
  "get_fundamentals",
  "screen_instruments",
  "get_portfolio",
  "explain_rule_decision"
]);
var getQuoteToolInputSchema = external_exports.object({
  symbol: external_exports.string().trim().min(1).max(16)
});
var getBarsToolInputSchema = external_exports.object({
  symbol: external_exports.string().trim().min(1).max(16),
  range: chartRangeSchema.default("1M")
});
var searchNewsToolInputSchema = newsSearchRequestSchema;
var getFundamentalsToolInputSchema = external_exports.object({
  symbol: external_exports.string().trim().min(1).max(16)
});
var screenInstrumentsToolInputSchema = external_exports.object({
  sector: external_exports.string().trim().min(1).optional(),
  criteria: screenerCriteriaSchema.optional(),
  sort: screenerSortSchema.optional()
});
var getPortfolioToolInputSchema = external_exports.object({
  range: equityCurveRangeSchema.optional()
});
var explainRuleDecisionToolInputSchema = external_exports.object({
  audit_id: external_exports.string().min(1)
});
var copilotMessageRoleSchema = external_exports.enum(["system", "user", "assistant", "tool"]);
var copilotToolCallRecordSchema = external_exports.object({
  id: external_exports.string().min(1),
  name: external_exports.string().min(1),
  arguments: external_exports.unknown(),
  result: external_exports.unknown().optional(),
  error: external_exports.string().optional()
});
var copilotSessionSchema = external_exports.object({
  id: uuidSchema,
  user_id: uuidSchema,
  title: external_exports.string().min(1),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema
});
var copilotMessageSchema = external_exports.object({
  id: uuidSchema,
  session_id: uuidSchema,
  user_id: uuidSchema,
  role: copilotMessageRoleSchema,
  content: external_exports.string(),
  tool_calls: external_exports.array(copilotToolCallRecordSchema),
  created_at: timestamptzSchema
});
var copilotCitationSchema = external_exports.object({
  kind: external_exports.enum(["news", "des"]),
  id: external_exports.string().min(1),
  label: external_exports.string().min(1),
  headline: external_exports.string().optional(),
  symbol: external_exports.string().optional()
});
var copilotChatRequestSchema = external_exports.object({
  session_id: uuidSchema.optional(),
  message: external_exports.string().trim().min(1).max(4e3),
  active_symbol: external_exports.string().trim().min(1).max(16).optional()
});
var copilotChatEventSchema = external_exports.discriminatedUnion("type", [
  external_exports.object({ type: external_exports.literal("session"), session_id: uuidSchema }),
  external_exports.object({
    type: external_exports.literal("tool_start"),
    name: external_exports.string().min(1),
    label: external_exports.string().min(1),
    call_id: external_exports.string().min(1)
  }),
  external_exports.object({
    type: external_exports.literal("tool_end"),
    name: external_exports.string().min(1),
    call_id: external_exports.string().min(1),
    ok: external_exports.boolean()
  }),
  external_exports.object({ type: external_exports.literal("token"), text: external_exports.string() }),
  external_exports.object({
    type: external_exports.literal("message"),
    role: external_exports.literal("assistant"),
    content: external_exports.string(),
    citations: external_exports.array(copilotCitationSchema)
  }),
  external_exports.object({ type: external_exports.literal("rate_limited"), message: external_exports.string().min(1) }),
  external_exports.object({ type: external_exports.literal("error"), message: external_exports.string().min(1) })
]);
var copilotSessionsResponseSchema = external_exports.object({
  sessions: external_exports.array(copilotSessionSchema)
});
var copilotSessionDetailSchema = external_exports.object({
  session: copilotSessionSchema,
  messages: external_exports.array(copilotMessageSchema)
});

// packages/schemas/src/index.ts
var publicInsforgeEnvSchema = external_exports.object({
  NEXT_PUBLIC_INSFORGE_URL: external_exports.string().url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: external_exports.string().min(1)
});
var seedEnvSchema = external_exports.object({
  INSFORGE_URL: external_exports.string().url(),
  INSFORGE_API_KEY: external_exports.string().min(1)
});

// packages/rules-engine/src/evaluate.ts
function evaluate(table, context, clock) {
  const parsed = decisionTableSchema.parse(table);
  return evaluateParsed(parsed, context, clock);
}
function evaluateParsed(table, context, clock) {
  const trace = [];
  const matched = [];
  for (const row of table.rows) {
    const effective = isEffective(row, clock);
    const cells = row.conditions.map((condition) => ({
      input: condition.input,
      op: condition.op,
      passed: evaluateCondition(condition, context)
    }));
    const conditionsPass = cells.every((cell) => cell.passed);
    const rowMatched = effective && conditionsPass;
    const outputs = interpolateOutputs(row.outputs, context);
    trace.push({
      rowId: row.id,
      priority: row.priority,
      effective,
      cells,
      matched: rowMatched,
      outputs
    });
    if (rowMatched) {
      matched.push({ row, outputs });
    }
  }
  matched.sort((a, b) => a.row.priority - b.row.priority || a.row.id.localeCompare(b.row.id));
  const matchedRows = matched.map((item) => item.row);
  const defaultOutputs = interpolateOutputs(table.default_outputs, context);
  const outcome = applyHitPolicy(
    table.hit_policy,
    matched.map((item) => item.outputs),
    defaultOutputs
  );
  return { outcome, matchedRows, trace };
}
function applyHitPolicy(policy, matchedOutputs, defaultOutputs) {
  if (matchedOutputs.length === 0) {
    return policy === "COLLECT" ? [defaultOutputs] : defaultOutputs;
  }
  if (policy === "FIRST") {
    return matchedOutputs[0] ?? defaultOutputs;
  }
  if (policy === "ALL") {
    return Object.assign({}, ...matchedOutputs);
  }
  return matchedOutputs;
}
function isEffective(row, clock) {
  const clockMs = clock.getTime();
  if (row.effective_from != null && row.effective_from !== "") {
    if (clockMs < Date.parse(row.effective_from)) {
      return false;
    }
  }
  if (row.effective_to != null && row.effective_to !== "") {
    if (clockMs >= Date.parse(row.effective_to)) {
      return false;
    }
  }
  return true;
}
function evaluateCondition(condition, context) {
  const left = context[condition.input];
  const passed = matchOperator(condition.op, left, condition.value);
  return condition.negate === true ? !passed : passed;
}
function matchOperator(op, left, right) {
  switch (op) {
    case "any":
      return true;
    case "is_null":
      return left === null || left === void 0;
    case "eq":
      return Object.is(left, right);
    case "neq":
      return !Object.is(left, right);
    case "lt":
      return relational(left, right, (ord) => ord < 0);
    case "lte":
      return relational(left, right, (ord) => ord <= 0);
    case "gt":
      return relational(left, right, (ord) => ord > 0);
    case "gte":
      return relational(left, right, (ord) => ord >= 0);
    case "in":
      return Array.isArray(right) && right.some((item) => Object.is(left, item));
    case "not_in":
      return Array.isArray(right) && !right.some((item) => Object.is(left, item));
    case "between":
      return inBetween(left, right);
    case "regex":
      return matchRegex(left, right);
  }
}
function relational(left, right, pred) {
  const ord = compareOrd(left, right);
  if (ord === null) {
    return false;
  }
  return pred(ord);
}
function compareOrd(left, right) {
  if (typeof left === "number" && typeof right === "number") {
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return null;
    }
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  }
  if (typeof left === "string" && typeof right === "string") {
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  }
  return null;
}
function inBetween(left, right) {
  if (!Array.isArray(right) || right.length !== 2) {
    return false;
  }
  const lo = right[0];
  const hi = right[1];
  const geLo = relational(left, lo, (ord) => ord >= 0);
  const leHi = relational(left, hi, (ord) => ord <= 0);
  return geLo && leHi;
}
function matchRegex(left, right) {
  if (typeof right !== "string") {
    return false;
  }
  try {
    return new RegExp(right).test(String(left));
  } catch {
    return false;
  }
}
function interpolateOutputs(outputs, context) {
  const next = {};
  for (const [key, value] of Object.entries(outputs)) {
    next[key] = typeof value === "string" ? interpolateMessage(value, context) : value;
  }
  return next;
}
function interpolateMessage(message, context) {
  return message.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_full, field) => {
    const value = context[field];
    if (value === void 0 || value === null) {
      return "";
    }
    return String(value);
  });
}

// packages/rules-engine/src/authorize.ts
function decisionFromOutcome(outcome) {
  if (!outcome || typeof outcome !== "object" || !("decision" in outcome)) {
    return "deny";
  }
  const decision = outcome.decision;
  if (decision === "allow" || decision === "deny" || decision === "require_approval") {
    return decision;
  }
  return "deny";
}
function authorizeResultFromOutcome(outcome) {
  const decision = decisionFromOutcome(outcome);
  return {
    allowed: decision === "allow",
    decision,
    reason: decision === "allow" ? void 0 : "FORBIDDEN"
  };
}
function authorizeFromTable(input) {
  if (!input.userId) {
    return { allowed: false, decision: "deny", reason: "UNAUTHENTICATED" };
  }
  if (input.action.length === 0) {
    return { allowed: false, decision: "deny", reason: "ACTION_REQUIRED" };
  }
  const role = input.role && input.role.length > 0 ? input.role : "unknown";
  const result = evaluate(input.table, { role, action: input.action }, input.clock ?? /* @__PURE__ */ new Date());
  return authorizeResultFromOutcome(result.outcome);
}
async function authorize(input) {
  if (!input.userId) {
    return { allowed: false, decision: "deny", reason: "UNAUTHENTICATED" };
  }
  if (input.action.length === 0) {
    return { allowed: false, decision: "deny", reason: "ACTION_REQUIRED" };
  }
  if (input.ports) {
    const role = await input.ports.loadRole(input.userId) ?? "unknown";
    const evaluated = await input.ports.evaluateEntitlements({ role, action: input.action });
    return authorizeResultFromOutcome(evaluated.outcome);
  }
  if (input.table) {
    return authorizeFromTable({
      userId: input.userId,
      action: input.action,
      role: input.role,
      table: input.table,
      clock: input.clock
    });
  }
  return { allowed: false, decision: "deny", reason: "FORBIDDEN" };
}

// packages/rules-engine/src/doc05-fixtures.ts
var dtRisk01 = {
  id: "DT-RISK-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "allow" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "exceeds_buying_power", op: "eq", value: true }],
      outputs: { decision: "reject", reason_code: "RISK_BUYING_POWER" }
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "order_notional", op: "gt", value: 5e4 }],
      outputs: { decision: "reject", reason_code: "RISK_MAX_NOTIONAL" }
    },
    {
      id: "3",
      priority: 3,
      conditions: [
        { input: "position_pct_post", op: "gt", value: 25 },
        { input: "experience_level", op: "eq", value: "novice" }
      ],
      outputs: { decision: "reject", reason_code: "RISK_CONCENTRATION_NOVICE" }
    },
    {
      id: "4",
      priority: 4,
      conditions: [{ input: "position_pct_post", op: "gt", value: 40 }],
      outputs: { decision: "reject", reason_code: "RISK_CONCENTRATION" }
    },
    {
      id: "5",
      priority: 5,
      conditions: [{ input: "orders_today", op: "gte", value: 100 }],
      outputs: { decision: "reject", reason_code: "RISK_DAILY_ORDER_CAP" }
    },
    {
      id: "6",
      priority: 6,
      conditions: [
        { input: "instrument_beta_class", op: "eq", value: "high" },
        { input: "experience_level", op: "eq", value: "novice" },
        { input: "order_notional", op: "gt", value: 5e3 }
      ],
      outputs: { decision: "require_ack", reason_code: "RISK_HIGH_BETA_ACK" }
    },
    {
      id: "7",
      priority: 7,
      conditions: [
        { input: "side", op: "eq", value: "sell" },
        { input: "exceeds_position_qty", op: "eq", value: true }
      ],
      outputs: { decision: "reject", reason_code: "RISK_NO_SHORTING" }
    }
  ]
};
var dtVal01 = {
  id: "DT-VAL-01",
  hit_policy: "COLLECT",
  default_outputs: { decision: "valid" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "qty", op: "lte", value: 0 }],
      outputs: {
        decision: "reject",
        reason_code: "VAL_QTY_POSITIVE",
        message: "Quantity must be positive."
      }
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "qty", op: "gt", value: 1e4 }],
      outputs: { decision: "reject", reason_code: "VAL_QTY_MAX" }
    },
    {
      id: "3",
      priority: 3,
      conditions: [
        { input: "order_type", op: "in", value: ["limit", "stop_limit"] },
        { input: "limit_price", op: "is_null" }
      ],
      outputs: { decision: "reject", reason_code: "VAL_LIMIT_REQUIRED" }
    },
    {
      id: "4",
      priority: 4,
      conditions: [
        { input: "order_type", op: "in", value: ["stop", "stop_limit"] },
        { input: "stop_price", op: "is_null" }
      ],
      outputs: { decision: "reject", reason_code: "VAL_STOP_REQUIRED" }
    },
    {
      id: "5",
      priority: 5,
      conditions: [
        { input: "order_type", op: "eq", value: "limit" },
        { input: "side", op: "eq", value: "buy" },
        { input: "limit_far_above_last", op: "eq", value: true }
      ],
      outputs: { decision: "warn", reason_code: "VAL_LIMIT_FAR" }
    },
    {
      id: "6",
      priority: 6,
      conditions: [{ input: "instrument_status", op: "neq", value: "active" }],
      outputs: { decision: "reject", reason_code: "VAL_HALTED" }
    },
    {
      id: "7",
      priority: 7,
      conditions: [
        { input: "tif", op: "eq", value: "IOC" },
        { input: "order_type", op: "neq", value: "limit" }
      ],
      outputs: { decision: "reject", reason_code: "VAL_IOC_LIMIT_ONLY" }
    },
    {
      id: "8",
      priority: 8,
      conditions: [{ input: "price_not_on_tick", op: "eq", value: true }],
      outputs: { decision: "reject", reason_code: "VAL_TICK_SIZE" }
    }
  ]
};
var dtFee01 = {
  id: "DT-FEE-01",
  hit_policy: "ALL",
  default_outputs: { commission_usd: 0 },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "side", op: "any" }],
      outputs: { commission_usd: 0 }
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "side", op: "eq", value: "sell" }],
      outputs: {
        sec_fee: "notional_x_sec_rate",
        taf: "qty_x_taf_capped",
        sec_rate: 278e-7,
        taf_per_share: 166e-6,
        taf_cap: 8.3
      }
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "account_tier", op: "eq", value: "pro" }],
      outputs: { data_fee_monthly: 0 }
    }
  ]
};

// packages/rules-engine/src/baseline-tables.ts
var dtVal02 = {
  id: "DT-VAL-02",
  hit_policy: "COLLECT",
  default_outputs: { decision: "valid" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [
        { input: "group_type", op: "eq", value: "bracket" },
        { input: "side", op: "eq", value: "buy" },
        { input: "tp_not_above_entry", op: "eq", value: true }
      ],
      outputs: { decision: "reject", reason_code: "VAL_TP_ABOVE_ENTRY" }
    },
    {
      id: "2",
      priority: 2,
      conditions: [
        { input: "group_type", op: "eq", value: "bracket" },
        { input: "side", op: "eq", value: "buy" },
        { input: "sl_not_below_entry", op: "eq", value: true }
      ],
      outputs: { decision: "reject", reason_code: "VAL_SL_BELOW_ENTRY" }
    },
    {
      id: "3",
      priority: 3,
      conditions: [
        { input: "group_type", op: "eq", value: "bracket" },
        { input: "legs_count", op: "neq", value: 3 }
      ],
      outputs: { decision: "reject", reason_code: "VAL_BRACKET_LEGS" }
    },
    {
      id: "4",
      priority: 4,
      conditions: [
        { input: "trail_type", op: "eq", value: "percent" },
        { input: "trail_value", op: "between", value: [0.1, 50], negate: true }
      ],
      outputs: { decision: "reject", reason_code: "VAL_TRAIL_RANGE" }
    },
    {
      id: "5",
      priority: 5,
      conditions: [
        { input: "group_type", op: "eq", value: "oco" },
        { input: "legs_count", op: "neq", value: 2 }
      ],
      outputs: { decision: "reject", reason_code: "VAL_OCO_LEGS" }
    }
  ]
};
var dtHrs01 = {
  id: "DT-HRS-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "allow" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [
        { input: "session", op: "eq", value: "closed" },
        { input: "order_type", op: "eq", value: "market" }
      ],
      outputs: { decision: "reject", reason_code: "HRS_MARKET_CLOSED" }
    },
    {
      id: "2",
      priority: 2,
      conditions: [
        { input: "session", op: "eq", value: "closed" },
        { input: "order_type", op: "in", value: ["limit", "stop", "stop_limit"] }
      ],
      outputs: { decision: "queue_for_open" }
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "session", op: "eq", value: "open" }],
      outputs: { decision: "allow" }
    }
  ]
};
var dtExec01 = {
  id: "DT-EXEC-01",
  hit_policy: "FIRST",
  default_outputs: { slippage_bps: 5, liquidity_cap_pct_adv: 5 },
  rows: [
    {
      id: "4a",
      priority: 1,
      conditions: [
        { input: "avg_volume_band", op: "eq", value: "high" },
        { input: "large_notional", op: "eq", value: true }
      ],
      outputs: { slippage_bps: 7, liquidity_cap_pct_adv: 10 }
    },
    {
      id: "4b",
      priority: 2,
      conditions: [
        { input: "avg_volume_band", op: "eq", value: "medium" },
        { input: "large_notional", op: "eq", value: true }
      ],
      outputs: { slippage_bps: 10, liquidity_cap_pct_adv: 5 }
    },
    {
      id: "4c",
      priority: 3,
      conditions: [
        { input: "avg_volume_band", op: "eq", value: "low" },
        { input: "large_notional", op: "eq", value: true }
      ],
      outputs: { slippage_bps: 20, liquidity_cap_pct_adv: 2 }
    },
    {
      id: "1",
      priority: 4,
      conditions: [{ input: "avg_volume_band", op: "eq", value: "high" }],
      outputs: { slippage_bps: 2, liquidity_cap_pct_adv: 10 }
    },
    {
      id: "2",
      priority: 5,
      conditions: [{ input: "avg_volume_band", op: "eq", value: "medium" }],
      outputs: { slippage_bps: 5, liquidity_cap_pct_adv: 5 }
    },
    {
      id: "3",
      priority: 6,
      conditions: [{ input: "avg_volume_band", op: "eq", value: "low" }],
      outputs: { slippage_bps: 15, liquidity_cap_pct_adv: 2 }
    }
  ]
};
var dtAi01 = {
  id: "DT-AI-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "require_approval" },
  rows: [
    {
      id: "4",
      priority: 1,
      conditions: [
        { input: "tool", op: "eq", value: "propose_order" },
        { input: "order_notional", op: "gt", value: 5e4 }
      ],
      outputs: { decision: "block" }
    },
    {
      id: "5",
      priority: 2,
      conditions: [{ input: "messages_today", op: "gt", value: 200 }],
      outputs: { decision: "rate_limit", message: "Daily copilot quota reached." }
    },
    {
      id: "1",
      priority: 3,
      conditions: [{ input: "tool", op: "eq", value: "propose_order" }],
      outputs: { decision: "require_approval" }
    },
    {
      id: "2",
      priority: 4,
      conditions: [
        { input: "tool", op: "in", value: ["create_watchlist_item", "create_alert"] },
        { input: "actions_today", op: "lt", value: 50 }
      ],
      outputs: { decision: "auto_approve" }
    },
    {
      id: "3",
      priority: 5,
      conditions: [
        { input: "tool", op: "eq", value: "create_monitor" },
        { input: "monitors_count", op: "lt", value: 20 }
      ],
      outputs: { decision: "auto_approve" }
    }
  ]
};
var dtEnt01 = {
  id: "DT-ENT-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "deny" },
  rows: [
    {
      id: "2",
      priority: 1,
      conditions: [{ input: "role", op: "eq", value: "admin" }],
      outputs: { decision: "allow" }
    },
    {
      id: "1",
      priority: 2,
      conditions: [
        { input: "role", op: "eq", value: "trader" },
        {
          input: "action",
          op: "regex",
          value: "^(trade|watchlist|alerts|copilot|screener):|^portfolio:read$"
        }
      ],
      outputs: { decision: "allow" }
    },
    {
      id: "3",
      priority: 3,
      conditions: [
        { input: "role", op: "eq", value: "compliance" },
        { input: "action", op: "in", value: ["audit:read", "rules:read"] }
      ],
      outputs: { decision: "allow" }
    },
    {
      id: "4",
      priority: 4,
      conditions: [
        { input: "role", op: "eq", value: "compliance" },
        { input: "action", op: "regex", value: "^trade:" }
      ],
      outputs: { decision: "deny" }
    },
    {
      id: "5",
      priority: 5,
      conditions: [
        { input: "role", op: "eq", value: "trader" },
        {
          input: "action",
          op: "in",
          value: [
            "rules:evaluate",
            "provision-account",
            "profile-wizard",
            "news:search",
            "chart:bars"
          ]
        }
      ],
      outputs: { decision: "allow" }
    }
  ]
};
var dtAlrt01 = {
  id: "DT-ALRT-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "deliver" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "same_rule_fired_within_min", op: "lt", value: 15 }],
      outputs: { decision: "suppress" }
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "rule_fires_today", op: "gte", value: 20 }],
      outputs: { decision: "suppress_and_pause_rule" }
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "user_alerts_today", op: "gte", value: 100 }],
      outputs: { decision: "suppress" }
    }
  ]
};
var dtRisk02 = {
  id: "DT-RISK-02",
  hit_policy: "COLLECT",
  default_outputs: { flags: [] },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "max_position_pct", op: "gt", value: 25 }],
      outputs: { flag: "CONCENTRATION_POSITION" }
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "max_sector_pct", op: "gt", value: 40 }],
      outputs: { flag: "CONCENTRATION_SECTOR" }
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "portfolio_beta", op: "gt", value: 1.4 }],
      outputs: { flag: "HIGH_BETA_TILT" }
    },
    {
      id: "4",
      priority: 4,
      conditions: [{ input: "cash_pct", op: "gt", value: 30 }],
      outputs: { flag: "CASH_DRAG" }
    },
    {
      id: "5",
      priority: 5,
      conditions: [
        { input: "positions_count", op: "lt", value: 3 },
        { input: "equity", op: "gt", value: 1e4 }
      ],
      outputs: { flag: "LOW_DIVERSIFICATION" }
    }
  ]
};
var dtSuit01 = {
  id: "DT-SUIT-01",
  hit_policy: "FIRST",
  default_outputs: { suitability_tier: "standard" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "experience_level", op: "eq", value: "novice" }],
      outputs: { suitability_tier: "conservative" }
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "experience_level", op: "eq", value: "intermediate" }],
      outputs: { suitability_tier: "standard" }
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "experience_level", op: "eq", value: "advanced" }],
      outputs: { suitability_tier: "full" }
    }
  ]
};
var dtSim01 = {
  id: "DT-SIM-01",
  hit_policy: "ALL",
  default_outputs: { regime: "normal" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "beta_class", op: "any" }],
      outputs: { gap_event_prob_per_day: 0.02, gap_range_pct: [1, 6] }
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "beta_class", op: "eq", value: "high" }],
      outputs: { vol_multiplier: 1.8 }
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "beta_class", op: "eq", value: "low" }],
      outputs: { vol_multiplier: 0.6 }
    },
    {
      id: "4",
      priority: 4,
      conditions: [{ input: "news_sentiment_shock", op: "eq", value: true }],
      outputs: { drift_nudge_bps_per_sentiment: 30 }
    }
  ]
};
var TABLES = {
  "DT-VAL-01": dtVal01,
  "DT-VAL-02": dtVal02,
  "DT-RISK-01": dtRisk01,
  "DT-HRS-01": dtHrs01,
  "DT-EXEC-01": dtExec01,
  "DT-FEE-01": dtFee01,
  "DT-AI-01": dtAi01,
  "DT-ENT-01": dtEnt01,
  "DT-ALRT-01": dtAlrt01,
  "DT-RISK-02": dtRisk02,
  "DT-SUIT-01": dtSuit01,
  "DT-SIM-01": dtSim01
};
function baselineTable(key) {
  const table = TABLES[key];
  if (!table) {
    throw new Error(`UNKNOWN_BASELINE_TABLE:${key}`);
  }
  return table;
}

// packages/rules-engine/src/evaluate-domain.ts
function assembleDecisionTable(input) {
  return {
    id: input.tableKey,
    hit_policy: input.hit_policy,
    default_outputs: input.default_outputs,
    rows: input.rows.map((row) => ({
      id: row.row_key,
      priority: row.priority,
      conditions: row.conditions,
      outputs: row.outputs,
      effective_from: row.effective_from ?? null,
      effective_to: row.effective_to ?? null
    }))
  };
}
function resolveRulesServiceApiKey(env) {
  const key = env.API_KEY ?? env.INSFORGE_API_KEY;
  if (typeof key !== "string" || key.length === 0) {
    return null;
  }
  return key;
}

// packages/copilot/src/prompt.ts
function buildContextPreamble(input) {
  const lines = ["Session context (retrieved by the host \u2014 treat as tool data, not memory):"];
  if (input.activeSymbol) {
    lines.push(`activeSymbol=${input.activeSymbol}`);
  }
  if (input.portfolioSummary) {
    lines.push(input.portfolioSummary);
  }
  if (lines.length === 1) {
    lines.push("No linked symbol. Call tools before stating any figure.");
  }
  return lines.join("\n");
}

// packages/copilot/src/tools.ts
var READ_TOOL_LABELS = {
  get_quote: "Looking up quote\u2026",
  get_bars: "Loading bars\u2026",
  search_news: "Searching news\u2026",
  get_fundamentals: "Loading fundamentals\u2026",
  screen_instruments: "Screening instruments\u2026",
  get_portfolio: "Loading portfolio\u2026",
  explain_rule_decision: "Explaining rule decision\u2026"
};
var READ_TOOLS = [
  {
    name: "get_quote",
    description: "Latest bid/ask/last/volume for a US equity or ETF symbol.",
    label: READ_TOOL_LABELS.get_quote,
    inputSchema: getQuoteToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: { symbol: { type: "string" } },
      required: ["symbol"],
      additionalProperties: false
    }
  },
  {
    name: "get_bars",
    description: "OHLCV bars for a symbol (1D minute, otherwise daily).",
    label: READ_TOOL_LABELS.get_bars,
    inputSchema: getBarsToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        range: { type: "string", enum: ["1D", "1W", "1M", "1Y", "5Y"] }
      },
      required: ["symbol"],
      additionalProperties: false
    }
  },
  {
    name: "search_news",
    description: "Semantic news search. Returns items with ids to cite as [news:<id>].",
    label: READ_TOOL_LABELS.search_news,
    inputSchema: searchNewsToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        symbols: { type: "array", items: { type: "string" } },
        since: { type: "string" },
        limit: { type: "integer" }
      },
      required: ["query"],
      additionalProperties: false
    }
  },
  {
    name: "get_fundamentals",
    description: "DES fundamentals: valuation, income, margins, analyst mix.",
    label: READ_TOOL_LABELS.get_fundamentals,
    inputSchema: getFundamentalsToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: { symbol: { type: "string" } },
      required: ["symbol"],
      additionalProperties: false
    }
  },
  {
    name: "screen_instruments",
    description: "Run the instrument screener. Prefer sector plus optional full criteria.",
    label: READ_TOOL_LABELS.screen_instruments,
    inputSchema: screenInstrumentsToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        sector: { type: "string" },
        criteria: { type: "object" },
        sort: { type: "object" }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_portfolio",
    description: "Paper portfolio: cash, equity, positions, P&L. Never invent these figures.",
    label: READ_TOOL_LABELS.get_portfolio,
    inputSchema: getPortfolioToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: { range: { type: "string", enum: ["1M", "3M", "1Y"] } },
      additionalProperties: false
    }
  },
  {
    name: "explain_rule_decision",
    description: "Explain a rule_audit row (matched decision-table rows and outcome).",
    label: READ_TOOL_LABELS.explain_rule_decision,
    inputSchema: explainRuleDecisionToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: { audit_id: { type: "string" } },
      required: ["audit_id"],
      additionalProperties: false
    }
  }
];
function toolByName(name) {
  return READ_TOOLS.find((tool) => tool.name === name);
}
function openaiToolSpecs() {
  return READ_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.jsonSchema
    }
  }));
}

// packages/copilot/src/citations.ts
var NEWS_RE = /\[news:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi;
var DES_RE = /\[des:([A-Z][A-Z0-9.]{0,9})\]/g;
function extractCitations(text, newsMeta) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of text.matchAll(NEWS_RE)) {
    const id = match[1];
    if (!id || seen.has(`news:${id}`)) {
      continue;
    }
    seen.add(`news:${id}`);
    const meta = newsMeta.get(id);
    out.push(
      copilotCitationSchema.parse({
        kind: "news",
        id,
        label: "news",
        headline: meta?.headline,
        symbol: meta?.symbol
      })
    );
  }
  for (const match of text.matchAll(DES_RE)) {
    const symbol = match[1];
    if (!symbol || seen.has(`des:${symbol}`)) {
      continue;
    }
    seen.add(`des:${symbol}`);
    out.push(
      copilotCitationSchema.parse({
        kind: "des",
        id: symbol,
        label: symbol,
        symbol
      })
    );
  }
  return out;
}
function newsMetaFromToolResults(results) {
  const map = /* @__PURE__ */ new Map();
  for (const result of results) {
    const items = collectNewsItems(result);
    for (const item of items) {
      map.set(item.id, { headline: item.headline, symbol: item.symbols?.[0] });
    }
  }
  return map;
}
function collectNewsItems(value) {
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value;
  const bag = Array.isArray(record.items) ? record.items : Array.isArray(value) ? value : [];
  const out = [];
  for (const row of bag) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const item = row;
    if (typeof item.id === "string") {
      out.push({
        id: item.id,
        headline: typeof item.headline === "string" ? item.headline : void 0,
        symbols: Array.isArray(item.symbols) ? item.symbols.filter((s) => typeof s === "string") : void 0
      });
    }
  }
  return out;
}

// packages/copilot/src/loop.ts
function emit(onEvent, event) {
  onEvent?.(copilotChatEventSchema.parse(event));
}
async function runOrchestratorLoop(input) {
  const max = input.maxToolCalls ?? COPILOT_MAX_TOOL_CALLS;
  const history = [...input.messages];
  const recorded = [];
  const results = [];
  let toolCallCount = 0;
  while (true) {
    const turn = await input.llm.complete(history);
    const calls = turn.tool_calls ?? [];
    if (calls.length === 0) {
      const content = turn.content ?? "";
      for (const chunk of chunkTokens(content)) {
        emit(input.onEvent, { type: "token", text: chunk });
      }
      const citations = extractCitations(content, newsMetaFromToolResults(results));
      emit(input.onEvent, {
        type: "message",
        role: "assistant",
        content,
        citations
      });
      return {
        assistantContent: content,
        toolCalls: recorded,
        citations,
        toolCallCount
      };
    }
    history.push({
      role: "assistant",
      content: turn.content ?? "",
      tool_calls: calls
    });
    for (const call of calls) {
      if (toolCallCount >= max) {
        const content = "Stopped after the tool-call budget. Partial tool results are above \u2014 I will not invent missing figures.";
        emit(input.onEvent, { type: "token", text: content });
        emit(input.onEvent, {
          type: "message",
          role: "assistant",
          content,
          citations: extractCitations(content, newsMetaFromToolResults(results))
        });
        return {
          assistantContent: content,
          toolCalls: recorded,
          citations: [],
          toolCallCount
        };
      }
      toolCallCount += 1;
      const spec = toolByName(call.name);
      const label = spec?.label ?? `${call.name}\u2026`;
      emit(input.onEvent, {
        type: "tool_start",
        name: call.name,
        label,
        call_id: call.id
      });
      let parsedArgs = call.arguments;
      let result;
      let error;
      try {
        if (spec) {
          parsedArgs = spec.inputSchema.parse(call.arguments);
        }
        result = await input.executeTool(call.name, parsedArgs);
      } catch (caught) {
        error = caught instanceof Error ? caught.message : "TOOL_ERROR";
        result = { error };
      }
      recorded.push({
        id: call.id,
        name: call.name,
        arguments: parsedArgs,
        result,
        error
      });
      results.push(result);
      emit(input.onEvent, {
        type: "tool_end",
        name: call.name,
        call_id: call.id,
        ok: error === void 0
      });
      history.push({
        role: "tool",
        name: call.name,
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
  }
}
function chunkTokens(text, size = 24) {
  if (text.length === 0) {
    return [];
  }
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}

// packages/copilot/src/fake-llm.ts
function newsSummaryLlm() {
  return {
    async complete(messages) {
      const lastTool = [...messages].reverse().find((row) => row.role === "tool");
      if (!lastTool) {
        return {
          tool_calls: [
            {
              id: "call_search_news",
              name: "search_news",
              arguments: { query: "AAPL news today", symbols: ["AAPL"], limit: 5 }
            }
          ]
        };
      }
      const parsed = JSON.parse(lastTool.content);
      const items = newsItems(parsed);
      const cites = items.slice(0, 2).map((item) => `[news:${item.id}]`).join(" ");
      const headlines = items.slice(0, 2).map((item) => item.headline).filter((row) => Boolean(row)).join("; ");
      return {
        content: `AAPL news today (tool-cited): ${headlines || "see items"} ${cites}`.trim()
      };
    }
  };
}
function newsItems(value) {
  if (!value || typeof value !== "object") {
    return [];
  }
  const items = value.items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((row) => {
    return Boolean(
      row && typeof row === "object" && typeof row.id === "string"
    );
  });
}

// packages/copilot/src/rate-limit.ts
function rateLimitFromAiPolicy(outcome) {
  if (!outcome || typeof outcome !== "object" || !("decision" in outcome)) {
    return { limited: false };
  }
  const decision = outcome.decision;
  if (decision !== "rate_limit") {
    return { limited: false };
  }
  const message = outcome.message;
  return {
    limited: true,
    message: typeof message === "string" && message.length > 0 ? message : "Daily copilot quota reached."
  };
}

// packages/copilot/src/slash.ts
function expandSlashPrompt(input, activeSymbol) {
  const trimmed = input.trim();
  const symbol = activeSymbol ?? "the linked symbol";
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(" ");
  switch (cmd) {
    case "/quote":
      return `What is the latest quote for ${arg || symbol}? Use get_quote.`;
    case "/news":
      return `Summarize recent news for ${arg || symbol}. Use search_news and cite [news:id].`;
    case "/bars":
      return `Describe recent bars for ${arg || symbol}. Use get_bars.`;
    case "/des":
      return `Summarize fundamentals for ${arg || symbol}. Use get_fundamentals and cite [des:SYMBOL].`;
    case "/screen":
      return `Screen instruments${arg ? ` in ${arg}` : ""}. Use screen_instruments.`;
    case "/portfolio":
      return "Summarize my paper portfolio. Use get_portfolio. Do not invent P&L.";
    case "/explain":
      return arg ? `Explain rule decision ${arg} using explain_rule_decision.` : "Ask for a rule_audit id to explain.";
    default:
      return trimmed;
  }
}

// packages/copilot/src/gateway.ts
var DEFAULT_OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
var DEFAULT_OPENROUTER_CHAT_MODEL = "openai/gpt-4.1-mini";
var completionSchema = external_exports.object({
  choices: external_exports.array(
    external_exports.object({
      message: external_exports.object({
        content: external_exports.string().nullable().optional(),
        tool_calls: external_exports.array(
          external_exports.object({
            id: external_exports.string(),
            function: external_exports.object({
              name: external_exports.string(),
              arguments: external_exports.string()
            })
          })
        ).optional()
      }).optional()
    })
  ).min(1)
});
function toOpenAiMessages(messages) {
  return messages.map((row) => {
    if (row.role === "tool") {
      return {
        role: "tool",
        content: row.content,
        tool_call_id: row.tool_call_id,
        name: row.name
      };
    }
    if (row.role === "assistant" && row.tool_calls && row.tool_calls.length > 0) {
      return {
        role: "assistant",
        content: row.content || null,
        tool_calls: row.tool_calls.map((call) => ({
          id: call.id,
          type: "function",
          function: {
            name: call.name,
            arguments: JSON.stringify(call.arguments ?? {})
          }
        }))
      };
    }
    return { role: row.role, content: row.content };
  });
}
function openRouterLlm(input) {
  const fetchImpl = input.fetchImpl ?? fetch;
  return {
    async complete(messages) {
      const response = await fetchImpl(input.url ?? DEFAULT_OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.model ?? DEFAULT_OPENROUTER_CHAT_MODEL,
          messages: toOpenAiMessages(messages),
          tools: openaiToolSpecs()
        })
      });
      const raw = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`GATEWAY_${response.status}`);
      }
      const parsed = completionSchema.parse(raw);
      const message = parsed.choices[0]?.message;
      const toolCalls = (message?.tool_calls ?? []).map((call) => {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments);
        } catch {
          args = {};
        }
        return { id: call.id, name: call.function.name, arguments: args };
      });
      return {
        content: message?.content ?? "",
        tool_calls: toolCalls.length > 0 ? toolCalls : void 0
      };
    }
  };
}

// packages/copilot/src/run-request.ts
async function runCopilotRequest(input) {
  const request = copilotChatRequestSchema.parse(input.request);
  const limited = rateLimitFromAiPolicy(input.policyOutcome);
  if (limited.limited) {
    input.onEvent?.({ type: "rate_limited", message: limited.message });
    return { sessionId: request.session_id ?? "", assistantContent: limited.message };
  }
  const title = request.message.slice(0, 72) || "New session";
  let sessionId = request.session_id;
  if (!sessionId) {
    const created = await input.persist.createSession(title);
    sessionId = created.id;
  }
  input.onEvent?.({ type: "session", session_id: sessionId });
  const prior = request.session_id ? await input.persist.loadHistory(sessionId) : [];
  const userText = expandSlashPrompt(request.message, request.active_symbol);
  await input.persist.appendMessage({
    sessionId,
    role: "user",
    content: userText,
    tool_calls: []
  });
  const history = [
    { role: "system", content: COPILOT_SYSTEM_PROMPT },
    {
      role: "system",
      content: buildContextPreamble({
        activeSymbol: request.active_symbol,
        portfolioSummary: input.portfolioSummary
      })
    },
    ...prior.filter((row) => row.role === "user" || row.role === "assistant").slice(-20).map((row) => ({ role: row.role, content: row.content })),
    { role: "user", content: userText }
  ];
  const execute = async (name, args) => {
    await input.persist.auditTool(name, args);
    return input.executeTool(name, args);
  };
  const result = await runOrchestratorLoop({
    messages: history,
    llm: input.llm,
    executeTool: execute,
    onEvent: input.onEvent
  });
  await input.persist.appendMessage({
    sessionId,
    role: "assistant",
    content: result.assistantContent,
    tool_calls: result.toolCalls
  });
  return { sessionId, assistantContent: result.assistantContent };
}

// packages/copilot/src/session-access.ts
var COPILOT_SESSION_NOT_FOUND = "SESSION_NOT_FOUND";

// insforge/functions/_shared/entitlements.ts
function asRows(data) {
  return Array.isArray(data) ? data : [];
}
async function loadUserRole(db, userId) {
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  const row = asRows(data)[0];
  return row?.role ?? null;
}
async function loadPublishedEntitlementsTable(db) {
  const { data: bindings, error: bindErr } = await db.from("rule_bindings").select("domain,table_id").eq("domain", "entitlements");
  if (bindErr) {
    throw new Error(bindErr.message);
  }
  const tableIds = asRows(bindings).map((row) => row.table_id);
  if (tableIds.length === 0) {
    return null;
  }
  const wanted = new Set(tableIds);
  const { data: tables, error: tableErr } = await db.from("decision_tables").select("id,table_key,version,hit_policy,default_outputs,status").eq("status", "published");
  if (tableErr) {
    throw new Error(tableErr.message);
  }
  const published = asRows(tables).find((row) => wanted.has(row.id));
  if (!published) {
    return null;
  }
  const { data: rows, error: rowErr } = await db.from("decision_rows").select("*").eq("table_id", published.id);
  if (rowErr) {
    throw new Error(rowErr.message);
  }
  return assembleDecisionTable({
    tableKey: published.table_key,
    hit_policy: published.hit_policy,
    default_outputs: published.default_outputs,
    rows: asRows(rows).map((row) => ({
      row_key: row.row_key,
      priority: row.priority,
      conditions: decisionConditionSchema.array().parse(row.conditions),
      outputs: decisionOutputsSchema.parse(row.outputs),
      effective_from: row.effective_from,
      effective_to: row.effective_to
    }))
  });
}
async function authorizeEdgeUser(input) {
  return authorize({
    userId: input.userId,
    action: input.action,
    ports: {
      loadRole: (id) => loadUserRole(input.db, id),
      evaluateEntitlements: async (ctx) => {
        const table = await loadPublishedEntitlementsTable(input.db) ?? baselineTable("DT-ENT-01");
        return evaluate(table, ctx, /* @__PURE__ */ new Date());
      }
    }
  });
}

// insforge/functions/copilot-orchestrator-src.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
function asRows2(data) {
  return Array.isArray(data) ? data : [];
}
async function invokeSibling(input) {
  const origin = input.baseUrl.replace(/\/+$/, "");
  const response = await fetch(`${origin}/functions/${input.slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input.body)
  });
  const raw = await response.json().catch(() => ({ error: "SIBLING_UNAVAILABLE" }));
  if (!response.ok) {
    throw new Error(
      typeof raw === "object" && raw && "error" in raw ? String(raw.error) : `SIBLING_${response.status}`
    );
  }
  return raw;
}
function encodeSse(event) {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}

`);
}
async function requireOwnedCopilotSession(admin, userId, sessionId) {
  const { data, error } = await admin.database.from("copilot_sessions").select("id,user_id").eq("id", sessionId).eq("user_id", userId).limit(1);
  if (error) {
    throw new Error(error.message);
  }
  if (!asRows2(data)[0]) {
    throw new Error(COPILOT_SESSION_NOT_FOUND);
  }
}
async function copilot_orchestrator_src_default(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return json(401, { error: "UNAUTHENTICATED" });
  }
  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  if (!baseUrl) {
    return json(500, { error: "INSFORGE_URL_MISSING" });
  }
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = copilotChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: "INVALID_BODY" });
  }
  const userClient = createClient({ baseUrl, accessToken: token });
  const { data: userData } = await userClient.auth.getCurrentUser();
  const userId = userData?.user?.id;
  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY")
  });
  if (!apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }
  const admin = createAdminClient({ baseUrl, apiKey });
  const gate = await authorizeEdgeUser({ db: admin.database, userId, action: "copilot:chat" });
  if (!gate.allowed || !userId) {
    return json(gate.reason === "UNAUTHENTICATED" || !userId ? 401 : 403, {
      error: gate.reason ?? "UNAUTHENTICATED"
    });
  }
  const countRpc = await admin.database.rpc("count_copilot_user_messages_today", {
    p_user_id: userId
  });
  const messagesToday = Number(countRpc.data ?? 0);
  let policyOutcome = evaluate(
    baselineTable("DT-AI-01"),
    {
      tool: "chat",
      messages_today: messagesToday
    },
    /* @__PURE__ */ new Date()
  ).outcome;
  try {
    const evaluated = await invokeSibling({
      baseUrl,
      slug: "rules-service",
      token,
      body: {
        op: "evaluateDomain",
        domain: "ai_action_policy",
        context: { tool: "chat", messages_today: messagesToday }
      }
    });
    if (evaluated && typeof evaluated === "object" && "outcome" in evaluated) {
      policyOutcome = evaluated.outcome;
    }
  } catch {
  }
  const mode = (Deno.env.get("MERIDIAN_COPILOT_LLM") ?? "").trim().toLowerCase();
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const llm = mode === "fake" || !openRouterKey ? newsSummaryLlm() : openRouterLlm({
    apiKey: openRouterKey,
    model: Deno.env.get("OPENROUTER_CHAT_MODEL") ?? DEFAULT_OPENROUTER_CHAT_MODEL,
    url: Deno.env.get("OPENROUTER_CHAT_URL") ?? DEFAULT_OPENROUTER_CHAT_URL
  });
  const stream = new ReadableStream({
    async start(controller) {
      const emit2 = (event) => {
        controller.enqueue(encodeSse(event));
      };
      try {
        await runCopilotRequest({
          request: parsed.data,
          policyOutcome,
          llm,
          portfolioSummary: void 0,
          executeTool: (name, args) => executeReadTool({
            name,
            args,
            admin,
            baseUrl,
            token,
            userId
          }),
          persist: {
            async createSession(title) {
              await admin.database.from("copilot_sessions").insert([{ user_id: userId, title: title.slice(0, 72) || "New session" }]);
              const { data, error } = await admin.database.from("copilot_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
              if (error) {
                throw new Error(error.message);
              }
              return copilotSessionSchema.parse(asRows2(data)[0]);
            },
            async appendMessage(row) {
              await requireOwnedCopilotSession(admin, userId, row.sessionId);
              await admin.database.from("copilot_messages").insert([
                {
                  session_id: row.sessionId,
                  user_id: userId,
                  role: row.role,
                  content: row.content,
                  tool_calls: row.tool_calls
                }
              ]);
              await admin.database.from("copilot_sessions").update({ updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", row.sessionId).eq("user_id", userId);
              return copilotMessageSchema.parse({
                id: crypto.randomUUID(),
                session_id: row.sessionId,
                user_id: userId,
                role: row.role,
                content: row.content,
                tool_calls: row.tool_calls,
                created_at: (/* @__PURE__ */ new Date()).toISOString()
              });
            },
            async loadHistory(sessionId) {
              await requireOwnedCopilotSession(admin, userId, sessionId);
              const { data, error } = await admin.database.from("copilot_messages").select("*").eq("session_id", sessionId).eq("user_id", userId).order("created_at", { ascending: true });
              if (error) {
                throw new Error(error.message);
              }
              return asRows2(data).map((row) => copilotMessageSchema.parse(row));
            },
            async auditTool(name, args) {
              await admin.database.from("audit_log").insert([
                {
                  user_id: userId,
                  action: `copilot:tool:${name}`,
                  entity_type: "copilot_messages",
                  payload: { tool: name, arguments: args }
                }
              ]);
            }
          },
          onEvent: emit2
        });
      } catch (error) {
        emit2({
          type: "error",
          message: error instanceof Error ? error.message : "COPILOT_FAILED"
        });
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache"
    }
  });
}
async function executeReadTool(input) {
  const db = input.admin.database;
  switch (input.name) {
    case "get_quote": {
      const { symbol } = getQuoteToolInputSchema.parse(input.args);
      const inst = await db.from("instruments").select("*").eq("symbol", symbol.toUpperCase());
      const instrument = asRows2(inst.data)[0];
      if (!instrument) {
        throw new Error("SYMBOL_NOT_FOUND");
      }
      const quotes = await db.from("quotes_latest").select("*").eq("instrument_id", String(instrument.id));
      return { instrument, quote: asRows2(quotes.data)[0] ?? null };
    }
    case "get_bars": {
      const { symbol, range } = getBarsToolInputSchema.parse(input.args);
      const inst = await db.from("instruments").select("id,symbol").eq("symbol", symbol.toUpperCase());
      const instrument = asRows2(inst.data)[0];
      if (!instrument) {
        throw new Error("SYMBOL_NOT_FOUND");
      }
      const timeframe = range === "1D" ? "1m" : "1d";
      const bars = await db.from("market_bars").select("*").eq("instrument_id", String(instrument.id)).eq("timeframe", timeframe).order("ts", { ascending: false }).limit(80);
      return { symbol: instrument.symbol, range, timeframe, bars: asRows2(bars.data).reverse() };
    }
    case "search_news": {
      const request = searchNewsToolInputSchema.parse(input.args);
      return invokeSibling({
        baseUrl: input.baseUrl,
        slug: "search-news",
        token: input.token,
        body: request
      });
    }
    case "get_fundamentals": {
      const { symbol } = getFundamentalsToolInputSchema.parse(input.args);
      const inst = await db.from("instruments").select("*").eq("symbol", symbol.toUpperCase());
      const instrument = asRows2(inst.data)[0];
      if (!instrument) {
        throw new Error("SYMBOL_NOT_FOUND");
      }
      const fund = await db.from("fundamentals").select("*").eq("instrument_id", String(instrument.id));
      return { symbol: instrument.symbol, instrument, fundamentals: asRows2(fund.data)[0] ?? null };
    }
    case "screen_instruments": {
      const request = screenInstrumentsToolInputSchema.parse(input.args);
      const criteria = request.criteria ?? {
        combinator: "and",
        groups: [
          {
            combinator: "and",
            conditions: request.sector ? [{ field: "sector", op: "eq", value: request.sector }] : [{ field: "sector", op: "any", value: null }]
          }
        ]
      };
      return invokeSibling({
        baseUrl: input.baseUrl,
        slug: "screener",
        token: input.token,
        body: { op: "run", criteria, sort: request.sort }
      });
    }
    case "get_portfolio": {
      const request = getPortfolioToolInputSchema.parse(input.args);
      return invokeSibling({
        baseUrl: input.baseUrl,
        slug: "analytics-service/portfolio",
        token: input.token,
        body: { op: "portfolio", range: request.range ?? "1Y" }
      });
    }
    case "explain_rule_decision": {
      const { audit_id } = explainRuleDecisionToolInputSchema.parse(input.args);
      const { data, error } = await db.from("rule_audit").select("*").eq("id", audit_id);
      if (error) {
        throw new Error(error.message);
      }
      const row = asRows2(data)[0];
      if (!row) {
        throw new Error("AUDIT_NOT_FOUND");
      }
      return row;
    }
    default:
      throw new Error(`UNKNOWN_TOOL:${input.name}`);
  }
}

module.exports = copilot_orchestrator_src_default;
