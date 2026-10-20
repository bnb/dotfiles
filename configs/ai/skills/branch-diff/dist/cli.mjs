import { lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
	const numericValues = Object.values(entries).filter((v) => typeof v === "number");
	return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
}
function joinValues(array, separator = "|") {
	return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
var Cached = class {
	constructor(getter) {
		this._getter = getter;
		this._value = void 0;
	}
	get value() {
		const getter = this._getter;
		if (getter !== void 0) {
			this._value = getter();
			this._getter = void 0;
		}
		return this._value;
	}
};
function cached(getter) {
	return new Cached(getter);
}
function nullish(input) {
	return input === null || input === void 0;
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const ratio = val / step;
	const roundedRatio = Math.round(ratio);
	const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
	if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
	return ratio - roundedRatio;
}
var EVALUATING = /* @__PURE__*/ Symbol("evaluating");
function defineLazy(object, key, getter) {
	let value = void 0;
	Object.defineProperty(object, key, {
		get() {
			if (value === EVALUATING) return;
			if (value === void 0) {
				value = EVALUATING;
				value = getter();
			}
			return value;
		},
		set(v) {
			Object.defineProperty(object, key, { value: v });
		},
		configurable: true
	});
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
/**
* Whichever object a def's `shape` currently answers from: the one the caller passed until the first read, the frozen copy after it.
*
* Its keys and descriptors read without invoking anything, which is what lets a discriminated union check its discriminator, and the cycle walk read a shape, without resolving a getter that references the schema being constructed. A def that answers `shape` from an accessor of its own has none.
*/
function rawShape(def) {
	const desc = Object.getOwnPropertyDescriptor(def, "shape");
	return desc?.get ? desc.get.raw : desc?.value;
}
function sourceShape(schema) {
	return rawShape(schema._zod.def) ?? schema._zod.def.shape;
}
function deferProp(target, key, getter) {
	Object.defineProperty(target, key, {
		get() {
			const value = getter();
			assignProp(this, key, value);
			return value;
		},
		enumerable: true,
		configurable: true
	});
}
function putProp(target, key, value) {
	if (key in target) assignProp(target, key, value);
	else target[key] = value;
}
/**
* Copies `keys` of `source`'s shape onto `target`, each value passed through `wrap`.
*
* A key the source has resolved is copied through now, so the derived shape states it outright and nothing has to resolve it to learn what it holds. A key the source still defers stays deferred, and reads back through the source's own `shape`, so it resolves once and both shapes get that one schema.
*/
function mirrorShape(target, source, keys, wrap) {
	const raw = sourceShape(source);
	for (const key of keys) {
		const desc = Object.getOwnPropertyDescriptor(raw, key);
		if (!desc.enumerable) continue;
		if (desc.get) deferProp(target, key, () => {
			const value = source._zod.def.shape[key];
			return wrap ? wrap(value, key) : value;
		});
		else putProp(target, key, wrap ? wrap(desc.value, key) : desc.value);
	}
}
function mirrorProps(target, source) {
	for (const key of Reflect.ownKeys(source)) {
		const desc = Object.getOwnPropertyDescriptor(source, key);
		if (!desc.enumerable) continue;
		if (desc.get) deferProp(target, key, () => source[key]);
		else putProp(target, key, desc.value);
	}
}
function mergeDefs(...defs) {
	const mergedDescriptors = {};
	for (const def of defs) {
		const descriptors = Object.getOwnPropertyDescriptors(def);
		Object.assign(mergedDescriptors, descriptors);
	}
	return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
	return JSON.stringify(str);
}
function slugify(input) {
	return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = /* @__PURE__*/ cached(() => {
	if (globalConfig.jitless) return false;
	if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
	try {
		new Function("");
		return true;
	} catch (_) {
		return false;
	}
});
function isPlainObject(o) {
	if (isObject(o) === false) return false;
	const ctor = o.constructor;
	if (ctor === void 0) return true;
	if (typeof ctor !== "function") return true;
	const prot = ctor.prototype;
	if (isObject(prot) === false) return false;
	if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
	return true;
}
function shallowClone(o) {
	if (isPlainObject(o)) return { ...o };
	if (Array.isArray(o)) return [...o];
	if (o instanceof Map) return new Map(o);
	if (o instanceof Set) return new Set(o);
	return o;
}
var propertyKeyTypes = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function stringifyPrimitive(value) {
	if (typeof value === "bigint") return value.toString() + "n";
	if (typeof value === "string") return `"${value}"`;
	return `${value}`;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
	});
}
var NUMBER_FORMAT_RANGES = /*@__PURE__*/ (() => ({
	safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}))();
var BIGINT_FORMAT_RANGES = {
	int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
	uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
	const newShape = {};
	mirrorShape(newShape, schema, maskedKeys(schema, mask));
	return clone(schema, mergeDefs(currDef, {
		shape: newShape,
		checks: []
	}));
}
function maskedKeys(schema, mask) {
	const raw = sourceShape(schema);
	const keys = [];
	for (const key of Reflect.ownKeys(mask)) {
		if (!Object.getOwnPropertyDescriptor(raw, key)?.enumerable) throw new Error(`Unrecognized key: "${String(key)}"`);
		if (mask[key]) keys.push(key);
	}
	return keys;
}
function omit(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
	const omitted = new Set(maskedKeys(schema, mask));
	const newShape = {};
	mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)).filter((key) => !omitted.has(key)));
	return clone(schema, mergeDefs(currDef, {
		shape: newShape,
		checks: []
	}));
}
function extend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) {
		const existingShape = sourceShape(schema);
		for (const key of Reflect.ownKeys(shape)) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function extended(schema, shape) {
	const newShape = {};
	mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
	mirrorProps(newShape, shape);
	return newShape;
}
function safeExtend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
	return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function merge(a, b) {
	if (!b?._zod?.def) throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
	if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	const newShape = {};
	mirrorShape(newShape, a, Reflect.ownKeys(sourceShape(a)));
	mirrorShape(newShape, b, Reflect.ownKeys(sourceShape(b)));
	return clone(a, mergeDefs(a._zod.def, {
		shape: newShape,
		get catchall() {
			return b._zod.def.catchall;
		},
		checks: b._zod.def.checks ?? []
	}));
}
function partial(Class, schema, mask, name = "partial") {
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) throw new Error(`.${name}() cannot be used on object schemas containing refinements`);
	const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
	const newShape = {};
	mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), Class && ((value, key) => selected && !selected.has(key) ? value : new Class({
		type: "optional",
		innerType: value
	})));
	return clone(schema, mergeDefs(schema._zod.def, {
		shape: newShape,
		checks: []
	}));
}
function required(Class, schema, mask) {
	const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
	const newShape = {};
	mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), (value, key) => selected && !selected.has(key) ? value : new Class({
		type: "nonoptional",
		innerType: value
	}));
	return clone(schema, mergeDefs(schema._zod.def, { shape: newShape }));
}
function aborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function explicitlyAborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
/** The leading size checks of `defChecks` that set an upper bound, each paired with it. */
function sizeCaps(defChecks) {
	const caps = [];
	for (const ch of defChecks ?? []) {
		const d = ch._zod.def;
		if (!/_(length|size)$|_equals$/.test(d.check)) break;
		const max = d.maximum ?? d.length ?? d.size;
		if (max >= 0) caps.push([max, ch]);
	}
	return caps;
}
function attachSchema(issues, start, inst) {
	var _a;
	for (let i = start; i < issues.length; i++) (_a = issues[i]).schema ?? (_a.schema = inst);
}
function finalizeIssue(iss, ctx, config) {
	var _a;
	const traits = iss.inst?._zod?.traits;
	if (traits?.has("$ZodType")) {
		if (traits.has("$ZodCheck")) (_a = iss).schema ?? (_a.schema = iss.inst);
		else iss.schema = iss.inst;
	}
	const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
	const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
	const full = {};
	for (const k of Object.keys(iss)) {
		if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__") continue;
		full[k] = iss[k];
	}
	full.path ?? (full.path = []);
	full.message = message;
	if (ctx?.reportInput) full.input = iss.input;
	return full;
}
var highSurrogate = /[\uD800-\uDBFF]/;
function codePointLength(str) {
	const units = str.length;
	if (!highSurrogate.test(str)) return units;
	let count = units;
	for (let i = 0; i < units - 1; i++) if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
		count--;
		i++;
	}
	return count;
}
function getLengthableOrigin(input) {
	if (Array.isArray(input)) return "array";
	if (typeof input === "string") return "string";
	return "unknown";
}
function parsedType(data) {
	const t = typeof data;
	switch (t) {
		case "number": return Number.isNaN(data) ? "nan" : "number";
		case "object": {
			if (data === null) return "null";
			if (Array.isArray(data)) return "array";
			const obj = data;
			if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) return obj.constructor.name;
		}
	}
	return t;
}
function issue(...args) {
	const [iss, input, inst] = args;
	if (typeof iss === "string") return {
		message: iss,
		code: "custom",
		input,
		inst
	};
	return { ...iss };
}
/**
* Installs a trait's members on its prototype. Each value builds that member for the instance on first read; the built value shadows the accessor as an own property, so a detached `const { parse } = schema` keeps working.
*
* Call this from a `proto` initializer, which runs once per prototype — never per instance.
*/
function members(proto, table) {
	for (const key in table) {
		const desc = Object.getOwnPropertyDescriptor(table, key);
		if (desc.get) Object.defineProperty(proto, key, {
			...desc,
			enumerable: false
		});
		else defineBound(proto, key, desc.value);
	}
}
/** Shadows a prototype member with an own value, so a getter that builds from the instance runs once. */
function own(inst, key, value, enumerable = true) {
	Object.defineProperty(inst, key, {
		configurable: true,
		writable: true,
		enumerable,
		value
	});
	return value;
}
/** Like {@link own}, for a member that was never an own data property and has to stay out of `Object.keys`. */
function hide(inst, key, value) {
	return own(inst, key, value, false);
}
/** Adds members a table derives from the instance: each builds on first read and shadows as own data, and assignment shadows the same way, as when these were own properties. */
/* @__NO_SIDE_EFFECTS__ */
function derived(computes, table) {
	for (const key in computes) {
		const compute = computes[key];
		Object.defineProperty(table, key, {
			configurable: true,
			enumerable: true,
			get() {
				return own(this, key, compute(this));
			},
			set(value) {
				own(this, key, value);
			}
		});
	}
	return table;
}
function defineBound(proto, key, fn) {
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			return this == null ? fn : own(this, key, fn.bind(this));
		},
		set(value) {
			own(this, key, value);
		}
	});
}
/** Returns the prototype to install on, or `undefined` if this group is already installed on it. */
function claim(inst, sentinel) {
	const proto = Object.getPrototypeOf(inst);
	return sentinel in proto ? void 0 : proto;
}
var installing;
var broke = false;
var breaker = {
	configurable: true,
	get() {
		broke = true;
	}
};
/**
* Installs a lazily-derived internal on the `_zod` prototype of `inst`'s
* constructor, computed from the internals object itself and cached there on
* first read. One accessor per constructor rather than one per instance.
*/
function defineLazyInternal(inst, key, compute) {
	const proto = Object.getPrototypeOf(inst._zod);
	if (key in proto && installing !== inst._zod) {
		installing = void 0;
		return;
	}
	installing = inst._zod;
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			Object.defineProperty(this, key, breaker);
			const outer = broke;
			broke = false;
			try {
				const value = compute(this);
				if (broke) delete this[key];
				else Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					value
				});
				broke = broke || outer;
				return value;
			} catch (err) {
				delete this[key];
				broke = broke || outer;
				throw err;
			}
		},
		set(value) {
			Object.defineProperty(this, key, {
				configurable: true,
				writable: true,
				value
			});
		}
	});
}
/**
* Installs `key` on `inst`'s prototype, computed by `make` on first read and cached there as an own
* data property. One accessor per constructor rather than one per instance, because an own accessor
* puts every instance after the first into v8 dictionary mode. The key doubles as the sentinel.
*/
function installLazyProp(inst, key, make, enumerable) {
	const proto = claim(inst, key);
	if (!proto) return;
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			const desc = {
				configurable: true,
				writable: true,
				enumerable,
				value: void 0
			};
			Object.defineProperty(this, key, desc);
			desc.value = make(this);
			Object.defineProperty(this, key, desc);
			return desc.value;
		},
		set(value) {
			Object.defineProperty(this, key, {
				configurable: true,
				writable: true,
				enumerable,
				value
			});
		}
	});
}
/** Marks the thunk `_catch` synthesises for a constant catch value. `Function.length` cannot tell that thunk from a user callback — rest and defaulted parameters both report arity 0 — and a user callback reads `ctx.error`, whose issues only finalize correctly against the caller's per-parse error map. Provenance can say what arity cannot. A plain string key rather than `Symbol.for`, whose call at module scope no bundler can prove pure — the same shape that anchored `urlCanParse` into every build. */
var CONSTANT_CATCH = "~constantCatch";
/** Wraps a constant catch value in a thunk tagged with {@link CONSTANT_CATCH}. */
function constantCatch(value) {
	const fn = () => value;
	fn[CONSTANT_CATCH] = true;
	return fn;
}
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/core.js
var _a$1;
var _zodDesc = {
	value: void 0,
	enumerable: false
};
var _E = "captureStackTrace" in Error ? Error : null;
function newError(Definition) {
	const E = _E;
	if (E) {
		const saved = E.stackTraceLimit;
		if (typeof saved === "number") {
			try {
				E.stackTraceLimit = 0;
			} catch {
				_E = null;
				return new Definition();
			}
			try {
				return new Definition();
			} finally {
				E.stackTraceLimit = saved;
			}
		}
	}
	return new Definition();
}
/* @__NO_SIDE_EFFECTS__ */
function $constructor(name, initializer, proto, params) {
	const zodProto = {};
	function Internals(def) {
		this.def = def;
		this.constr = _;
		this.traits = /* @__PURE__ */ new Set();
	}
	Internals.prototype = zodProto;
	const protoMembers = proto;
	const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
	function init(inst, def) {
		if (!inst._zod) {
			_zodDesc.value = new Internals(def);
			try {
				Object.defineProperty(inst, "_zod", _zodDesc);
			} finally {
				_zodDesc.value = void 0;
			}
		} else if (inst._zod.traits.has(name)) return;
		inst._zod.traits.add(name);
		initializer(inst, def);
		if (initialized) {
			const own = Object.getPrototypeOf(inst);
			const ctorProto = inst._zod.constr.prototype;
			let up = own;
			while (up && up !== ctorProto) up = Object.getPrototypeOf(up);
			const target = up ?? own;
			if (!initialized.has(target)) {
				initialized.add(target);
				members(target, protoMembers);
			}
		}
		const proto = _.prototype;
		for (const k in proto) {
			if (!Object.prototype.hasOwnProperty.call(proto, k)) continue;
			if (!(k in inst)) inst[k] = proto[k].bind(inst);
		}
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		const inst = params?.Parent ? newError(Definition) : this;
		init(inst, def);
		const deferred = inst._zod.deferred;
		if (deferred) {
			for (const fn of deferred) fn();
			inst._zod.deferred = void 0;
		}
		const pp = globalThis.__zod_globalConfig?.postProcessor;
		if (pp) pp(inst);
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
var $ZodEncodeError = class extends Error {
	constructor(name) {
		super(`Encountered unidirectional transform during encode: ${name}`);
		this.name = "ZodEncodeError";
	}
};
(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/errors.js
function _getMessage() {
	const internals = this._zod;
	internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
	return internals.message;
}
function _setMessage(value) {
	this._zod.message = value;
}
var _messageDesc = {
	get: _getMessage,
	set: _setMessage,
	enumerable: true,
	configurable: true
};
var _issuesDesc = {
	value: void 0,
	enumerable: false
};
var _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
var initializer$1 = (inst, def) => {
	inst.name = "$ZodError";
	_issuesDesc.value = def;
	Object.defineProperty(inst, "issues", _issuesDesc);
	_issuesDesc.value = void 0;
	Object.defineProperty(inst, "message", _messageDesc);
	const proto = Object.getPrototypeOf(inst);
	if (!_installedToString.has(proto)) {
		_installedToString.add(proto);
		Object.defineProperty(proto, "toString", {
			configurable: true,
			enumerable: false,
			get() {
				const value = () => this.message;
				Object.defineProperty(this, "toString", {
					value,
					configurable: true,
					writable: true
				});
				return value;
			},
			set(value) {
				Object.defineProperty(this, "toString", {
					value,
					configurable: true,
					writable: true
				});
			}
		});
	}
};
var $ZodError = /* @__PURE__ */ $constructor("$ZodError", initializer$1);
/** Get-or-create `obj[key]` as an own data property. A path segment naming an inherited member
* ("toString", "constructor") would otherwise read through to the prototype, and assigning
* "__proto__" would hit the setter instead of creating a key. */
function node(obj, key, make) {
	if (!Object.prototype.hasOwnProperty.call(obj, key)) {
		if (key === "__proto__") Object.defineProperty(obj, key, {
			value: make(),
			writable: true,
			enumerable: true,
			configurable: true
		});
		else obj[key] = make();
	}
	return obj[key];
}
function flattenError(error, mapper = (issue) => issue.message) {
	const fieldErrors = {};
	const formErrors = [];
	for (const sub of error.issues) if (sub.path.length > 0) node(fieldErrors, sub.path[0], () => []).push(mapper(sub));
	else formErrors.push(mapper(sub));
	return {
		formErrors,
		fieldErrors
	};
}
function formatError(error, mapper = (issue) => issue.message) {
	const fieldErrors = { _errors: [] };
	const processError = (error, path = []) => {
		for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
		else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else {
			const fullpath = [...path, ...issue.path];
			if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
			else {
				let curr = fieldErrors;
				let i = 0;
				while (i < fullpath.length) {
					const el = fullpath[i];
					const terminal = i === fullpath.length - 1;
					if (el === "_errors") {
						if (terminal) curr._errors.push(mapper(issue));
						i++;
						continue;
					}
					if (!Object.prototype.hasOwnProperty.call(curr, el)) Object.defineProperty(curr, el, {
						value: { _errors: [] },
						enumerable: true,
						writable: true,
						configurable: true
					});
					const node = curr[el];
					if (terminal) node._errors.push(mapper(issue));
					curr = node;
					i++;
				}
			}
		}
	};
	processError(error);
	return fieldErrors;
}
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/parse.js
function finalizeParams(callee, params) {
	return {
		callee: params?.callee ?? callee,
		Err: params?.Err
	};
}
var _parse = (_Err) => {
	const fn = (schema, value, _ctx, _params) => {
		const ctx = _ctx ? {
			..._ctx,
			async: false
		} : { async: false };
		const result = schema._zod.run({
			value,
			issues: []
		}, ctx);
		if (result instanceof Promise) throw new $ZodAsyncError();
		if (result.issues.length) {
			const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
			captureStackTrace(e, _params?.callee ?? fn);
			throw e;
		}
		return result.value;
	};
	return fn;
};
var _parseAsync = (_Err) => {
	const fn = async (schema, value, _ctx, params) => {
		const ctx = _ctx ? {
			..._ctx,
			async: true
		} : { async: true };
		let result = schema._zod.run({
			value,
			issues: []
		}, ctx);
		if (result instanceof Promise) result = await result;
		if (result.issues.length) {
			const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
			captureStackTrace(e, params?.callee ?? fn);
			throw e;
		}
		return result.value;
	};
	return fn;
};
var _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? failure(_Err, result.issues, ctx) : {
		success: true,
		data: result.value
	};
};
function failure(Err, issues, ctx) {
	let error;
	return {
		success: false,
		get error() {
			if (!error) {
				error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
				issues = void 0;
				ctx = void 0;
			}
			return error;
		},
		set error(e) {
			error = e;
			issues = void 0;
			ctx = void 0;
		}
	};
}
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? failure(_Err, result.issues, ctx) : {
		success: true,
		data: result.value
	};
};
var COMPILE_INVALID = /* @__PURE__ */ Symbol.for("zod.compile.invalid");
var COMPILE_FALLBACK = /* @__PURE__ */ Symbol.for("zod.compile.fallback");
var validate = ((schema, value, _ctx) => {
	const validator = schema._zod.bag.validator;
	if (validator !== void 0) {
		if (validator(value) !== COMPILE_INVALID) return true;
		if (validator.definite === true && _ctx === void 0) return false;
	}
	return validateFallback(schema, value, _ctx);
});
function validateFallback(schema, value, _ctx) {
	const ctx = _ctx ? {
		..._ctx,
		async: false,
		abortEarly: true
	} : {
		async: false,
		abortEarly: true
	};
	const fallbackRun = schema._zod.bag.fallbackRun;
	let result;
	if (fallbackRun) {
		ctx[COMPILE_FALLBACK] = true;
		result = fallbackRun({
			value,
			issues: []
		}, ctx);
	} else result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length === 0;
}
var validateAsync$1 = async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true,
		abortEarly: true
	} : {
		async: true,
		abortEarly: true
	};
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length === 0;
};
var _encode = (_Err) => {
	const parse = _parse(_Err);
	const fn = (schema, value, _ctx, _params) => {
		const ctx = _ctx ? {
			..._ctx,
			direction: "backward"
		} : { direction: "backward" };
		return parse(schema, value, ctx, finalizeParams(fn, _params));
	};
	return fn;
};
var _decode = (_Err) => {
	const parse = _parse(_Err);
	const fn = (schema, value, _ctx, _params) => {
		return parse(schema, value, _ctx, finalizeParams(fn, _params));
	};
	return fn;
};
var _encodeAsync = (_Err) => {
	const parseAsync = _parseAsync(_Err);
	const fn = async (schema, value, _ctx, _params) => {
		const ctx = _ctx ? {
			..._ctx,
			direction: "backward"
		} : { direction: "backward" };
		return await parseAsync(schema, value, ctx, finalizeParams(fn, _params));
	};
	return fn;
};
var _decodeAsync = (_Err) => {
	const parseAsync = _parseAsync(_Err);
	const fn = async (schema, value, _ctx, _params) => {
		return await parseAsync(schema, value, _ctx, finalizeParams(fn, _params));
	};
	return fn;
};
var _safeEncode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParse(_Err)(schema, value, ctx);
};
var _safeDecode = (_Err) => (schema, value, _ctx) => {
	return _safeParse(_Err)(schema, value, _ctx);
};
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParseAsync(_Err)(schema, value, ctx);
};
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _safeParseAsync(_Err)(schema, value, _ctx);
};
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/regexes.js
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
var cuid = /^[cC][0-9a-z]{6,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
function nanoidOfLength(length) {
	return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
}
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
*
* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
var uuid = (version) => {
	if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
	return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
/** Practical email validation */
var email = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var _emoji$1 = `^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$`;
function emoji() {
	return new RegExp(_emoji$1, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
var httpProtocol = /^https?$/;
var e164 = /^\+[1-9]\d{6,14}$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
/** Anchors a pattern source. The interpolation lives here rather than at the call site because
* esbuild will not drop a `@__PURE__` call whose own argument interpolates a variable, but it
* will drop `anchor(dateSource)`. Keeping it inline pinned `date` into every bundle. */
function anchor(source) {
	return new RegExp(`^${source}$`);
}
var date = /*@__PURE__*/ anchor(dateSource);
function timeSource(args) {
	const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
	return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : args.seconds ? `${hhmm}:[0-5]\\d(?:\\.\\d+)?` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function time(args) {
	return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
	const opts = ["Z"];
	if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
	const qualified = `${timeSource({
		precision: args.precision,
		seconds: true
	})}(?:${opts.join("|")})`;
	const timeRegex = args.local ? `${qualified}|${timeSource({ precision: args.precision })}` : qualified;
	return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var anyString = /^[\s\S]{0,}$/;
var integer = /^-?\d+$/;
var number$1 = /^-?\d+(?:\.\d+)?$/;
var boolean$1 = /^(?:true|false)$/i;
var _null$2 = /^null$/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/checks.js
var $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
/** Default `when` for length-based checks: run only on non-nullish values with a `length`. */
var _whenHasLength = (payload) => {
	const val = payload.value;
	return !nullish(val) && val.length !== void 0;
};
var numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
var $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
		payload.issues.push({
			origin: numericOriginMap[typeof payload.value] ?? origin,
			code: "too_big",
			maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin: numericOriginMap[typeof payload.value] ?? origin,
			code: "too_small",
			minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		if (typeof payload.value === "bigint" ? def.value !== BigInt(0) && payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	def.format = def.format || "float64";
	const isInt = def.format?.includes("int");
	const origin = isInt ? "int" : "number";
	const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (isInt) {
			if (!Number.isInteger(input)) {
				payload.issues.push({
					expected: origin,
					format: def.format,
					code: "invalid_type",
					continue: false,
					input,
					inst
				});
				return;
			}
			if (!Number.isSafeInteger(input)) {
				if (input > 0) payload.issues.push({
					input,
					code: "too_big",
					maximum: Number.MAX_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				else payload.issues.push({
					input,
					code: "too_small",
					minimum: Number.MIN_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				return;
			}
		}
		if (input < minimum) payload.issues.push({
			origin: "number",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "number",
			input,
			code: "too_big",
			maximum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
	inst._zod.check = (payload) => {
		const input = payload.value;
		const units = input.length;
		if ((typeof input === "string" && units > def.maximum ? codePointLength(input) : units) <= def.maximum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
	inst._zod.check = (payload) => {
		const input = payload.value;
		const units = input.length;
		if ((typeof input === "string" && units >= def.minimum && units < def.minimum * 2 ? codePointLength(input) : units) >= def.minimum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
	inst._zod.check = (payload) => {
		const input = payload.value;
		const units = input.length;
		const length = typeof input === "string" && units >= def.length && units <= def.length * 2 ? codePointLength(input) : units;
		if (length === def.length) return;
		const origin = getLengthableOrigin(input);
		const tooBig = length > def.length;
		payload.issues.push({
			origin,
			...tooBig ? {
				code: "too_big",
				maximum: def.length
			} : {
				code: "too_small",
				minimum: def.length
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
	var _a, _b;
	$ZodCheck.init(inst, def);
	if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			...def.pattern ? { pattern: def.pattern.toString() } : {},
			inst,
			continue: !def.abort
		});
	});
	else (_b = inst._zod).check ?? (_b.check = () => {});
});
var $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: payload.value,
			pattern: def.pattern.toString(),
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
	def.pattern ?? (def.pattern = lowercase);
	$ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
	def.pattern ?? (def.pattern = uppercase);
	$ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
	$ZodCheck.init(inst, def);
	const escapedRegex = escapeRegex(def.includes);
	def.pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position},}${escapedRegex}` : escapedRegex);
	inst._zod.check = (payload) => {
		if (payload.value.includes(def.includes, def.position)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: def.includes,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.check = (payload) => {
		if (payload.value.startsWith(def.prefix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: def.prefix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.check = (payload) => {
		if (payload.value.endsWith(def.suffix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: def.suffix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		payload.value = def.tx(payload.value);
	};
});
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/doc.js
var Doc = class {
	constructor(args = [], closed = {}) {
		this.content = [];
		this.indent = 0;
		this.args = args;
		this.closed = closed;
	}
	indented(fn) {
		this.indent += 1;
		try {
			fn(this);
		} finally {
			this.indent -= 1;
		}
	}
	write(arg) {
		if (typeof arg === "function") {
			arg(this, { execution: "sync" });
			arg(this, { execution: "async" });
			return;
		}
		const lines = arg.split("\n").filter((x) => x);
		const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
		const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
		for (const line of dedented) this.content.push(line);
	}
	compile() {
		const F = Function;
		const content = this?.content ?? [``];
		return new F(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {\n${content.join("\n")}\n};`)(...Object.values(this.closed));
	}
};
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/versions.js
var version = {
	major: 4,
	minor: 6,
	patch: 7
};
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/schemas.js
var $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const defChecks = inst._zod.def.checks;
	const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks, ctx) => {
			if (payload.memo) return payload;
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks) {
				if (ch._zod.def.when) {
					if (explicitlyAborted(payload)) continue;
					if (!ch._zod.def.when(payload)) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					if (payload.issues.length === currLen) return;
					attachSchema(payload.issues, currLen, inst);
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					if (payload.issues.length === currLen) continue;
					attachSchema(payload.issues, currLen, inst);
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		const handleCanaryResult = (canary, payload, ctx) => {
			if (aborted(canary)) {
				canary.aborted = true;
				return canary;
			}
			const checkResult = runChecks(payload, checks, ctx);
			if (checkResult instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
			}
			return inst._zod.parse(checkResult, ctx);
		};
		inst._zod.run = (payload, ctx) => {
			if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
			if (ctx.direction === "backward") {
				const canary = inst._zod.parse({
					value: payload.value,
					issues: []
				}, {
					...ctx,
					skipChecks: true
				});
				if (canary instanceof Promise) return canary.then((canary) => {
					return handleCanaryResult(canary, payload, ctx);
				});
				return handleCanaryResult(canary, payload, ctx);
			}
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result) => runChecks(result, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
}, {
	get "~standard"() {
		return hide(this, "~standard", standardProps(this));
	},
	set "~standard"(value) {
		own(this, "~standard", value);
	}
});
/** The Standard Schema surface for `inst`. Shared so wrappers can extend it without forcing it. */
var toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
async function validateAsync(inst, value) {
	const ctx = { async: true };
	return toStandardResult(await inst._zod.run({
		value,
		issues: []
	}, ctx), ctx);
}
function standardProps(inst) {
	return {
		validate: (value) => {
			const ctx = { async: false };
			try {
				const r = inst._zod.run({
					value,
					issues: []
				}, ctx);
				if (!(r instanceof Promise)) return toStandardResult(r, ctx);
			} catch (_) {}
			return validateAsync(inst, value);
		},
		vendor: "zod",
		version: 1
	};
}
var $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = def.pattern ?? anyString;
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
var $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	$ZodString.init(inst, def);
});
var $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
	def.pattern ?? (def.pattern = guid);
	$ZodStringFormat.init(inst, def);
});
var $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
	if (def.version) {
		const v = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[def.version];
		if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
		def.pattern ?? (def.pattern = uuid(v));
	} else def.pattern ?? (def.pattern = uuid());
	$ZodStringFormat.init(inst, def);
});
var $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
	def.pattern ?? (def.pattern = email);
	$ZodStringFormat.init(inst, def);
});
function canParseURL(input) {
	try {
		if (typeof URL !== "undefined" && typeof URL.canParse === "function") return URL.canParse(input);
		new URL(input);
		return true;
	} catch {
		return false;
	}
}
function validateURL(trimmed, def) {
	if (!("normalize" in def) && !("hostname" in def) && !("protocol" in def)) return canParseURL(trimmed) || 2;
	return parseURLObject(trimmed, def);
}
/** Parses a URL while preserving the non-normalizing HTTP guard. */
function parseURLObject(trimmed, def) {
	if (!def.normalize && def.protocol?.source === httpProtocol.source && !/^https?:\/\//i.test(trimmed)) return 1;
	try {
		if (typeof URL !== "undefined") {
			const URLStatic = URL;
			if (typeof URLStatic.parse === "function") return URLStatic.parse(trimmed) ?? 2;
		}
		return new URL(trimmed);
	} catch {
		return 2;
	}
}
var asciiTabOrNewline = /[\t\n\r]/g;
/** The URL parser deletes every ASCII tab, LF and CR from its input before it parses, so `new URL("https://exa\nmple.com")` reports on `example.com`. Applying the same deletion to the returned value closes the half of that divergence which can move the host; the parser's other rewrite, stripping C0 controls at the edges, cannot. */
function stripTabAndNewline(value) {
	return value.replace(asciiTabOrNewline, "");
}
function urlHostnameOk(url, hostname) {
	hostname.lastIndex = 0;
	return hostname.test(url.hostname);
}
function urlProtocolOk(url, protocol) {
	protocol.lastIndex = 0;
	return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
}
var $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		try {
			const trimmed = payload.value.trim();
			const url = validateURL(trimmed, def);
			if (url === 1) {
				payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid URL format",
					input: payload.value,
					inst,
					continue: !def.abort
				});
				return;
			}
			if (url === 2) {
				payload.issues.push({
					code: "invalid_format",
					format: "url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
				return;
			}
			if (url === true) {
				payload.value = stripTabAndNewline(trimmed);
				return;
			}
			if (def.hostname && !urlHostnameOk(url, def.hostname)) payload.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid hostname",
				pattern: def.hostname.source,
				input: payload.value,
				inst,
				continue: !def.abort
			});
			if (def.protocol && !urlProtocolOk(url, def.protocol)) payload.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid protocol",
				pattern: def.protocol.source,
				input: payload.value,
				inst,
				continue: !def.abort
			});
			payload.value = def.normalize ? url.href : stripTabAndNewline(trimmed);
			return;
		} catch (_) {
			payload.issues.push({
				code: "invalid_format",
				format: "url",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
var $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
	def.pattern ?? (def.pattern = emoji());
	$ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
	if (def.length !== void 0 && (!Number.isInteger(def.length) || def.length < 1)) throw new Error(`Invalid nanoid length: ${def.length}`);
	def.pattern ?? (def.pattern = def.length === void 0 ? nanoid : nanoidOfLength(def.length));
	$ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
var $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
	def.pattern ?? (def.pattern = cuid);
	$ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
	def.pattern ?? (def.pattern = cuid2);
	$ZodStringFormat.init(inst, def);
});
var $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
	def.pattern ?? (def.pattern = ulid);
	$ZodStringFormat.init(inst, def);
});
var $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
	def.pattern ?? (def.pattern = xid);
	$ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
	def.pattern ?? (def.pattern = ksuid);
	$ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
	def.pattern ?? (def.pattern = datetime(def));
	$ZodStringFormat.init(inst, def);
});
var $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
	def.pattern ?? (def.pattern = date);
	$ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
	def.pattern ?? (def.pattern = time(def));
	$ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
	def.pattern ?? (def.pattern = duration);
	$ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
	def.pattern ?? (def.pattern = ipv4);
	$ZodStringFormat.init(inst, def);
});
/** An IPv6 address is written with hex digits, colons and dots, and nothing else. The guard is what makes the check below an IPv6 check: `new URL("http://[...]")` parses an authority, not an address, so `@` and `\` re-delimit it and `"::@1\\"` validates against the host `0.0.0.1`. The URL parser also deletes ASCII tab, LF and CR rather than failing, which is how `"::1\n"` validated as `::1`. */
var ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
function isValidIPv6(value) {
	if (!ipv6Alphabet.test(value)) return false;
	return canParseURL(`http://[${value}]`);
}
var $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
	def.pattern ?? (def.pattern = ipv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (!isValidIPv6(payload.value)) payload.issues.push({
			code: "invalid_format",
			format: "ipv6",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv4);
	$ZodStringFormat.init(inst, def);
});
function isValidCIDRv6(value) {
	const parts = value.split("/");
	if (parts.length !== 2) return false;
	const [address, prefix] = parts;
	if (!prefix) return false;
	const prefixNum = Number(prefix);
	if (`${prefixNum}` !== prefix) return false;
	if (prefixNum < 0 || prefixNum > 128) return false;
	return isValidIPv6(address);
}
var $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (!isValidCIDRv6(payload.value)) payload.issues.push({
			code: "invalid_format",
			format: "cidrv6",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function isValidBase64(data) {
	if (data === "") return true;
	if (/\s/.test(data)) return false;
	if (data.length % 4 !== 0) return false;
	try {
		atob(data);
		return true;
	} catch {
		return false;
	}
}
var base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
var $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
	def.pattern ?? (def.pattern = base64Charset);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidBase64(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var base64urlCharset = /^[A-Za-z0-9_-]*$/;
function isValidBase64URL(data) {
	if (!base64urlCharset.test(data)) return false;
	const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
	return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}
var $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
	def.pattern ?? (def.pattern = base64urlCharset);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidBase64URL(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
	def.pattern ?? (def.pattern = e164);
	$ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
	try {
		const tokensParts = token.split(".");
		if (tokensParts.length !== 3) return false;
		const [header] = tokensParts;
		if (!header) return false;
		const parsedHeader = JSON.parse(atob(header));
		if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
		if (!parsedHeader.alg) return false;
		if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
		return true;
	} catch {
		return false;
	}
}
var $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidJWT(payload.value, def.alg)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
var $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = number$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
var $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
	$ZodCheckNumberFormat.init(inst, def);
	$ZodNumber.init(inst, def);
});
var $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = boolean$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Boolean(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "boolean") return payload;
		payload.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
var $ZodNull = /*@__PURE__*/ $constructor("$ZodNull", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = _null$2;
	inst._zod.values = /* @__PURE__ */ new Set([null]);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (input === null) return payload;
		payload.issues.push({
			expected: "null",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
var $ZodAny = /*@__PURE__*/ $constructor("$ZodAny", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
var $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
var $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.issues.push({
			expected: "never",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
function capSize(inst, size) {
	const caps = sizeCaps(inst._zod.def.checks);
	if (!caps.length) return;
	const cap = Math.min(...caps.map((c) => c[0]));
	const parse = inst._zod.parse;
	inst._zod.parse = (payload, ctx) => {
		const n = size(payload.value);
		if (n > cap && !ctx?.skipChecks && ctx?.direction !== "backward") {
			for (const [max, ch] of sizeCaps(inst._zod.def.checks)) if (n > max && ch._zod.def.when(payload)) {
				const start = payload.issues.length;
				ch._zod.check(payload);
				payload.issues[start].continue = false;
				attachSchema(payload.issues, start, inst);
				return payload;
			}
		}
		return parse(payload, ctx);
	};
}
var arraySize = (input) => Array.isArray(input) ? input.length : -1;
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
var $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	const memo = globalConfig.memoizer;
	memo?.attach(inst);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
		const proms = [];
		const abortEarly = ctx?.abortEarly;
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
			else {
				handleArrayResult(result, payload, i);
				if (abortEarly && result.issues.length !== 0 && aborted(result)) break;
			}
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
	capSize(inst, arraySize);
});
function handlePropertyResult(result, final, key, input, optin, optout) {
	const isPresent = key in input;
	const isOptionalOut = optout === "optional";
	if (!isPresent && isOptionalOut && optin === "optional") return;
	if (result.issues.length) {
		if (optin !== void 0 && isOptionalOut && !isPresent) return;
		final.issues.push(...prefixIssues(key, result.issues));
	}
	if (!isPresent && optin === void 0) {
		if (!result.issues.length) final.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [key]
		});
		return;
	}
	if (result.value === void 0) {
		if (isPresent || optin === "defaulted" && !isOptionalOut) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
var NO_SYMBOL_KEYS = [];
function normalizeDef(def) {
	const keys = Object.keys(def.shape);
	const ownSymbols = Object.getOwnPropertySymbols(def.shape);
	const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
	const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
	for (const k of allKeys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
	const okeys = optionalKeys(def.shape);
	return {
		...def,
		allKeys,
		symbolKeys,
		keySet: new Set(keys),
		numKeys: keys.length,
		optionalKeys: new Set(okeys)
	};
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
	const unrecognized = [];
	const keySet = def.keySet;
	const _catchall = def.catchall._zod;
	const t = _catchall.def.type;
	const optin = _catchall.optin;
	const optout = _catchall.optout;
	let seen = 0;
	for (const key in input) {
		if (abortEarly && payload.issues.length !== seen) {
			if (aborted(payload, seen)) break;
			seen = payload.issues.length;
		}
		if (keySet.has(key)) continue;
		if (key === "__proto__") {
			if (t === "never") unrecognized.push(key);
			continue;
		}
		if (t === "never") {
			unrecognized.push(key);
			continue;
		}
		const r = _catchall.run({
			value: input[key],
			issues: []
		}, ctx);
		if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
		else handlePropertyResult(r, payload, key, input, optin, optout);
	}
	if (unrecognized.length) payload.issues.push({
		code: "unrecognized_keys",
		keys: unrecognized,
		input,
		inst,
		continue: true
	});
	if (!proms.length) return payload;
	return Promise.all(proms).then(() => {
		return payload;
	});
}
var $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	const desc = Object.getOwnPropertyDescriptor(def, "shape");
	const sh = desc?.get ? desc.get.raw : def.shape ?? {};
	if (sh) {
		const get = () => {
			const newSh = { ...sh };
			Object.defineProperty(def, "shape", { value: newSh });
			get.raw = newSh;
			return newSh;
		};
		get.raw = sh;
		Object.defineProperty(def, "shape", { get });
	}
	const _normalized = cached(() => normalizeDef(def));
	defineLazyInternal(inst, "propValues", (zod) => {
		const shape = zod.def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				if (!Object.prototype.hasOwnProperty.call(propValues, key)) assignProp(propValues, key, /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
				if (field.optin !== void 0) propValues[key].add(void 0);
			}
		}
		return propValues;
	});
	const isObject$1 = isObject;
	const catchall = def.catchall;
	let value;
	const memo = globalConfig.memoizer;
	memo?.attach(inst);
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$1(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
		const proms = [];
		const shape = value.shape;
		const abortEarly = ctx?.abortEarly;
		let seen = payload.issues.length;
		for (const key of value.allKeys) {
			if (abortEarly && payload.issues.length !== seen) {
				if (aborted(payload, seen)) break;
				seen = payload.issues.length;
			}
			if (key === "__proto__") continue;
			const el = shape[key];
			const optin = el._zod.optin;
			const optout = el._zod.optout;
			const r = el._zod.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
			else handlePropertyResult(r, payload, key, input, optin, optout);
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
	};
});
var $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
	$ZodObject.init(inst, def);
	const superParse = inst._zod.parse;
	const _normalized = cached(() => normalizeDef(def));
	const memo = globalConfig.memoizer;
	const generateFastpass = (shape) => {
		const normalized = _normalized.value;
		const syms = normalized.symbolKeys;
		const doc = new Doc(["payload", "ctx"], {
			shape,
			inst,
			memo,
			syms
		});
		const parseStr = (k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
		const prefixStr = (id, k) => `
          let ${id}_ab = false;
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${id}_ab = true;
          }
          if (${id}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
		doc.write(`const input = payload.value;`);
		const ids = Object.create(null);
		let counter = 0;
		for (const key of normalized.allKeys) ids[key] = `key_${counter++}`;
		doc.write(memo ? `const newResult = memo.alloc(inst, payload, {}, ctx);` : `const newResult = {};`);
		for (const key of normalized.allKeys) {
			if (key === "__proto__") continue;
			const id = ids[key];
			const k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : esc(key);
			const isPresent = `${k} in input`;
			const schema = shape[key];
			const optin = schema?._zod?.optin;
			const isOptionalIn = optin !== void 0;
			const isOptionalOut = schema?._zod?.optout === "optional";
			doc.write(`const ${id} = ${parseStr(k)};`);
			if (isOptionalIn && isOptionalOut) {
				const assign = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
				doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
			} else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
			else {
				doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
      `);
				if (optin === "defaulted") doc.write(`newResult[${k}] = ${id}.value;`);
				else doc.write(`
        if (${id}.value !== undefined || ${isPresent}) {
          newResult[${k}] = ${id}.value;
        }
      `);
			}
		}
		doc.write(`payload.value = newResult;`);
		doc.write(`return payload;`);
		return doc.compile();
	};
	let fastpass;
	const isObject$2 = isObject;
	const jit = !globalConfig.jitless;
	const fastEnabled = jit && allowsEval.value;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$2(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
			if (!fastpass) fastpass = generateFastpass(def.shape);
			payload = fastpass(payload, ctx);
			if (!catchall) return payload;
			return handleCatchall([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
		}
		return superParse(payload, ctx);
	};
});
function handleUnionResults(results, final, inst, ctx) {
	for (const result of results) if (result.issues.length === 0) {
		final.value = result.value;
		return final;
	}
	const nonaborted = results.filter((r) => !aborted(r));
	if (nonaborted.length === 1) {
		final.value = nonaborted[0].value;
		return nonaborted[0];
	}
	final.issues.push({
		code: "invalid_union",
		input: final.value,
		inst,
		errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	});
	return final;
}
var $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
	defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
	defineLazyInternal(inst, "values", (zod) => {
		if (zod.def.options.every((o) => o._zod.values)) return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
	});
	defineLazyInternal(inst, "pattern", (zod) => {
		if (zod.def.options.every((o) => o._zod.pattern)) {
			const patterns = zod.def.options.map((o) => o._zod.pattern);
			return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
		}
	});
	const first = def.options.length === 1 ? def.options[0]._zod.run : null;
	inst._zod.parse = (payload, ctx) => {
		if (first) return first(payload, ctx);
		let async = false;
		const results = [];
		for (const option of def.options) {
			const result = option._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) {
				results.push(result);
				async = true;
			} else {
				if (result.issues.length === 0) return result;
				results.push(result);
			}
		}
		if (!async) return handleUnionResults(results, payload, inst, ctx);
		return Promise.all(results).then((results) => {
			return handleUnionResults(results, payload, inst, ctx);
		});
	};
});
var $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		const left = def.left._zod.run({
			value: input,
			issues: []
		}, ctx);
		const right = def.right._zod.run({
			value: input,
			issues: []
		}, ctx);
		if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
			return handleIntersectionResults(payload, left, right);
		});
		return handleIntersectionResults(payload, left, right);
	};
});
function mergeValues(a, b) {
	if (a === b) return {
		valid: true,
		data: a
	};
	if (a instanceof Date && b instanceof Date && +a === +b) return {
		valid: true,
		data: a
	};
	if (isPlainObject(a) && isPlainObject(b)) {
		const bKeys = Object.keys(b);
		const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
		const newObj = {
			...a,
			...b
		};
		if (Object.prototype.hasOwnProperty.call(newObj, "__proto__")) delete newObj.__proto__;
		for (const key of sharedKeys) {
			if (key === "__proto__") continue;
			const sharedValue = mergeValues(a[key], b[key]);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
			};
			newObj[key] = sharedValue.data;
		}
		return {
			valid: true,
			data: newObj
		};
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return {
			valid: false,
			mergeErrorPath: []
		};
		const newArray = [];
		for (let index = 0; index < a.length; index++) {
			const itemA = a[index];
			const itemB = b[index];
			const sharedValue = mergeValues(itemA, itemB);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
			};
			newArray.push(sharedValue.data);
		}
		return {
			valid: true,
			data: newArray
		};
	}
	return {
		valid: false,
		mergeErrorPath: []
	};
}
function handleIntersectionResults(result, left, right) {
	const unrecKeys = /* @__PURE__ */ new Map();
	let unrecIssue;
	const keyIssues = /* @__PURE__ */ new Map();
	const collect = (iss, side) => {
		let keys;
		if (iss.code === "unrecognized_keys" && !iss.path?.length) {
			unrecIssue ?? (unrecIssue = iss);
			keys = iss.keys;
		} else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
			const k = String(iss.path[0]);
			if (!keyIssues.has(k)) keyIssues.set(k, iss);
			keys = [k];
		} else return false;
		for (const k of keys) {
			if (!unrecKeys.has(k)) unrecKeys.set(k, {});
			unrecKeys.get(k)[side] = true;
		}
		return true;
	};
	for (const iss of left.issues) if (!collect(iss, "l")) result.issues.push(iss);
	for (const iss of right.issues) if (!collect(iss, "r")) result.issues.push(iss);
	const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
	if (bothKeys.length) {
		const aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
		if (aggregated.length) result.issues.push({
			...unrecIssue,
			keys: aggregated
		});
		for (const k of bothKeys) if (!aggregated.includes(k) && keyIssues.has(k)) result.issues.push(keyIssues.get(k));
	}
	const merged = mergeValues(left.value, right.value);
	if (!merged.valid) {
		if (aborted(result)) return result;
		throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
	}
	result.value = merged.data;
	return result;
}
var $ZodRecord = /*@__PURE__*/ $constructor("$ZodRecord", (inst, def) => {
	$ZodType.init(inst, def);
	const memo = globalConfig.memoizer;
	memo?.attach(inst);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!isPlainObject(input)) {
			payload.issues.push({
				expected: "record",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		const proms = [];
		const values = def.keyType._zod.values;
		if (values && !def.partial) {
			payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
			const recordKeys = /* @__PURE__ */ new Set();
			for (const key of values) if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
				recordKeys.add(typeof key === "number" ? key.toString() : key);
				if (key === "__proto__") continue;
				const keyResult = def.keyType._zod.run({
					value: key,
					issues: []
				}, ctx);
				if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
				if (keyResult.issues.length) {
					payload.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
						input: key,
						path: [key],
						inst
					});
					continue;
				}
				const outKey = keyResult.value;
				if (outKey === "__proto__") continue;
				const result = def.valueType._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result) => {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}));
				else {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}
			}
			let unrecognized;
			for (const key in input) if (!recordKeys.has(key)) {
				if (def.mode === "loose") {
					if (key === "__proto__") continue;
					payload.value[key] = input[key];
				} else {
					unrecognized = unrecognized ?? [];
					unrecognized.push(key);
				}
			}
			if (unrecognized && unrecognized.length > 0) payload.issues.push({
				code: "unrecognized_keys",
				input,
				inst,
				keys: unrecognized,
				continue: true
			});
		} else {
			payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
			let unrecognized;
			for (const key of Reflect.ownKeys(input)) {
				if (key === "__proto__") continue;
				if (!Object.prototype.propertyIsEnumerable.call(input, key)) continue;
				let keyResult = def.keyType._zod.run({
					value: key,
					issues: []
				}, ctx);
				if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
				if (typeof key === "string" && number$1.test(key) && keyResult.issues.length) {
					const retryResult = def.keyType._zod.run({
						value: Number(key),
						issues: []
					}, ctx);
					if (retryResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
					if (retryResult.issues.length === 0) keyResult = retryResult;
				}
				if (keyResult.issues.length) {
					if (def.mode === "loose") payload.value[key] = input[key];
					else if (values) {
						unrecognized = unrecognized ?? [];
						unrecognized.push(key);
					} else payload.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
						input: key,
						path: [key],
						inst
					});
					continue;
				}
				const outKey = keyResult.value;
				if (outKey === "__proto__") continue;
				const result = def.valueType._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result) => {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}));
				else {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}
			}
			if (unrecognized && unrecognized.length > 0) payload.issues.push({
				code: "unrecognized_keys",
				input,
				inst,
				keys: unrecognized,
				continue: true
			});
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
var $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
	$ZodType.init(inst, def);
	const values = getEnumValues(def.entries);
	const valuesSet = new Set(values);
	inst._zod.values = valuesSet;
	defineLazyInternal(inst, "pattern", (zod) => {
		const patternValues = getEnumValues(zod.def.entries).filter((k) => propertyKeyTypes.has(typeof k));
		return new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
	});
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (valuesSet.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values,
			input,
			inst
		});
		return payload;
	};
});
var $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
	$ZodType.init(inst, def);
	const values = new Set(def.values);
	inst._zod.values = values;
	defineLazyInternal(inst, "pattern", (zod) => {
		const vals = zod.def.values;
		return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
	});
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (values.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values: def.values,
			input,
			inst
		});
		return payload;
	};
});
var $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	globalConfig.memoizer?.guard(inst);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		const _out = def.transform(payload.value, payload);
		if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
			payload.value = output;
			return payload;
		});
		if (_out instanceof Promise) throw new $ZodAsyncError();
		payload.value = _out;
		return payload;
	};
});
function handleOptionalResult(payload, result) {
	payload.value = result.issues.length ? void 0 : result.value;
	return payload;
}
var $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
	inst._zod.optout = "optional";
	defineLazyInternal(inst, "values", (zod) => {
		const values = zod.def.innerType._zod.values;
		return values ? /* @__PURE__ */ new Set([...values, void 0]) : void 0;
	});
	defineLazyInternal(inst, "pattern", (zod) => {
		const pattern = zod.def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === void 0) {
			if (def.innerType._zod.optin !== "defaulted") return payload;
			const result = def.innerType._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) return result.then((result) => handleOptionalResult(payload, result));
			return handleOptionalResult(payload, result);
		}
		return def.innerType._zod.run(payload, ctx);
	};
});
var $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
	inst._zod.parse = (payload, ctx) => {
		return def.innerType._zod.run(payload, ctx);
	};
});
var $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
	defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
	defineLazyInternal(inst, "pattern", (zod) => {
		const pattern = zod.def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
	});
	defineLazyInternal(inst, "values", (zod) => {
		return zod.def.innerType._zod.values ? /* @__PURE__ */ new Set([...zod.def.innerType._zod.values, null]) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === null) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
var $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "defaulted";
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) {
			payload.value = def.defaultValue;
			/**
			* $ZodDefault returns the default value immediately in forward direction.
			* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
			return payload;
		}
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
		return handleDefaultResult(result, def);
	};
});
function handleDefaultResult(payload, def) {
	if (payload.value === void 0) payload.value = def.defaultValue;
	return payload;
}
var $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "defaulted";
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) payload.value = def.defaultValue;
		return def.innerType._zod.run(payload, ctx);
	};
});
var $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "values", (zod) => {
		const v = zod.def.innerType._zod.values;
		return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
		return handleNonOptionalResult(result, inst);
	};
});
function handleNonOptionalResult(payload, inst) {
	if (!payload.issues.length && payload.value === void 0) payload.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: payload.value,
		inst
	});
	return payload;
}
function handleCatchResult(payload, result, def, ctx) {
	if (!result.issues.length) {
		payload.value = result.value;
		if (result.memo) payload.memo = true;
		return payload;
	}
	payload.value = def.catchValue({
		...result,
		value: payload.value,
		error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
		input: payload.value
	});
	return payload;
}
var $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
	defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run({
			value: payload.value,
			issues: []
		}, ctx);
		if (result instanceof Promise) return result.then((result) => handleCatchResult(payload, result, def, ctx));
		return handleCatchResult(payload, result, def, ctx);
	};
});
var $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
	defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
	defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
	defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
			return handlePipeResult(right, def.in, ctx);
		}
		const left = def.in._zod.run(payload, ctx);
		if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
		return handlePipeResult(left, def.out, ctx);
	};
});
function handlePipeResult(left, next, ctx) {
	if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
		left.aborted = true;
		return left;
	}
	return next._zod.run({
		value: left.value,
		issues: left.issues
	}, ctx);
}
var $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
	defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then(handleReadonlyResult);
		return handleReadonlyResult(result);
	};
});
function handleReadonlyResult(payload) {
	if (!payload.memo) payload.value = Object.freeze(payload.value);
	return payload;
}
var $ZodLazy = /*@__PURE__*/ $constructor("$ZodLazy", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "innerType", () => {
		const d = def;
		if (!d._cachedInner) d._cachedInner = def.getter();
		return d._cachedInner;
	});
	defineLazyInternal(inst, "pattern", (zod) => zod.innerType?._zod?.pattern);
	defineLazyInternal(inst, "propValues", (zod) => zod.innerType?._zod?.propValues);
	defineLazyInternal(inst, "optin", (zod) => zod.innerType?._zod?.optin ?? void 0);
	defineLazyInternal(inst, "optout", (zod) => zod.innerType?._zod?.optout ?? void 0);
	inst._zod.parse = (payload, ctx) => {
		return inst._zod.innerType._zod.run(payload, ctx);
	};
});
var $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
	$ZodCheck.init(inst, def);
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _) => {
		return payload;
	};
	inst._zod.check = (payload) => {
		const input = payload.value;
		const r = def.fn(input);
		if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
		handleRefineResult(r, payload, input, inst);
	};
});
function handleRefineResult(result, payload, input, inst) {
	if (!result) {
		const _iss = {
			code: "custom",
			input,
			inst,
			path: [...inst._zod.def.path ?? []],
			continue: !inst._zod.def.abort
		};
		if (inst._zod.def.params) _iss.params = inst._zod.def.params;
		payload.issues.push(issue(_iss));
	}
}
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/memoizer.js
var $ZodCyclicError = class extends Error {
	constructor() {
		super(`Cannot parse a reference cycle that closes through a transform`);
		this.name = "ZodCyclicError";
	}
};
/** Keyed off the context object every schema in one parse call already shares. */
var STATE = "~memo";
var NO_ISSUES = [];
function isRef(value) {
	return value !== null && typeof value === "object";
}
function cloneIssues(issues) {
	return issues.map((iss) => iss.path ? {
		...iss,
		path: iss.path.slice()
	} : { ...iss });
}
var recursive = /*@__PURE__*/ new WeakMap();
/** What the walk established, in order of certainty: ordered so the strongest answer among children wins. */
var NONE = 0;
var ASSUMED = 1;
var PROVEN = 2;
/** Whether this schema's subtree contains a cycle, so one parse can re-enter it. */
function isRecursive(inst, stack, resolve) {
	const cached = recursive.get(inst);
	if (cached !== void 0) return cached ? PROVEN : NONE;
	if (stack.has(inst)) return PROVEN;
	stack.add(inst);
	let result = NONE;
	const check = (child) => {
		if (result !== PROVEN && child?._zod) {
			const answer = isRecursive(child, stack, resolve);
			if (answer > result) result = answer;
		}
	};
	const shape = (sh, spread) => {
		let answer = NONE;
		for (const key of Reflect.ownKeys(sh)) {
			const desc = Object.getOwnPropertyDescriptor(sh, key);
			if (spread && !desc.enumerable) continue;
			const child = desc.get ? ASSUMED : desc.value?._zod ? isRecursive(desc.value, stack, resolve) : NONE;
			if (child > answer) answer = child;
		}
		return answer;
	};
	const merge = (answer) => {
		if (answer > result) result = answer;
	};
	const def = inst._zod.def;
	switch (def.type) {
		case "object": {
			const raw = rawShape(def);
			merge(raw ? shape(raw, true) : ASSUMED);
			check(def.catchall);
			break;
		}
		case "array":
			check(def.element);
			break;
		case "tuple":
			for (const el of def.items) check(el);
			check(def.rest);
			break;
		case "record":
		case "map":
			check(def.keyType);
			check(def.valueType);
			break;
		case "set":
			check(def.valueType);
			break;
		case "union":
			for (const el of def.options) check(el);
			break;
		case "intersection":
			check(def.left);
			check(def.right);
			break;
		case "optional":
		case "nullable":
		case "default":
		case "prefault":
		case "catch":
		case "readonly":
		case "nonoptional":
		case "promise":
		case "success":
			check(def.innerType);
			break;
		case "pipe":
			check(def.in);
			check(def.out);
			break;
		case "function":
			check(def.input);
			check(def.output);
			break;
		case "lazy": {
			const inner = def._cachedInner ?? (resolve ? inst._zod.innerType : void 0);
			merge(inner ? isRecursive(inner, stack, false) : ASSUMED);
			break;
		}
		case "template_literal":
		case "string":
		case "number":
		case "int":
		case "boolean":
		case "bigint":
		case "symbol":
		case "undefined":
		case "null":
		case "void":
		case "never":
		case "any":
		case "unknown":
		case "date":
		case "nan":
		case "enum":
		case "literal":
		case "file":
		case "transform":
		case "custom": break;
		default: for (const key in def) {
			const desc = Object.getOwnPropertyDescriptor(def, key);
			if (!desc || desc.get) continue;
			const value = desc.value;
			if (!value || typeof value !== "object") continue;
			if (value._zod) check(value);
			else if (Array.isArray(value)) for (const el of value) check(el);
		}
	}
	stack.delete(inst);
	return settle(inst, result);
}
/** An assumed answer must not outlive the resolution that settles it, so only a certain one is cached. */
function settle(inst, answer) {
	if (answer !== ASSUMED) recursive.set(inst, answer === PROVEN);
	return answer;
}
function bucketFor(state, inst) {
	let bucket = state.buckets.get(inst);
	if (!bucket) {
		bucket = /* @__PURE__ */ new WeakMap();
		state.buckets.set(inst, bucket);
	}
	return bucket;
}
var handoff;
var open = [];
var memo = {
	alloc(_inst, payload, empty) {
		const bucket = handoff;
		if (!bucket) return empty;
		handoff = void 0;
		const entry = {
			value: empty,
			issues: null
		};
		bucket.set(payload.value, entry);
		open.push(entry);
		return empty;
	},
	guard(inst) {
		var _a;
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred.push(() => {
			const base = inst._zod.parse;
			const wrapped = (payload, ctx) => {
				if (ctx.direction !== "backward" && isBackEdge(ctx, payload.value)) throw new $ZodCyclicError();
				return base(payload, ctx);
			};
			inst._zod.parse = wrapped;
			if (inst._zod.run === base) inst._zod.run = wrapped;
		});
	},
	attach(inst) {
		var _a;
		let isRecursiveInst;
		let rechecked = false;
		let lastCtx;
		let lastBucket;
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred.push(() => {
			const base = inst._zod.parse;
			const wrapped = (payload, ctx) => {
				if (isRecursiveInst === void 0) {
					const walked = isRecursive(inst, /* @__PURE__ */ new Set(), false);
					if (walked === NONE) {
						inst._zod.parse = base;
						if (inst._zod.run === wrapped) inst._zod.run = base;
						return base(payload, ctx);
					}
					if (walked === PROVEN || rechecked) isRecursiveInst = true;
					else rechecked = true;
				}
				const input = payload.value;
				if (!isRef(input)) return base(payload, ctx);
				let state = ctx[STATE];
				if (!state) {
					state = {
						buckets: /* @__PURE__ */ new WeakMap(),
						backEdges: void 0
					};
					ctx[STATE] = state;
				}
				let bucket;
				if (lastCtx === ctx) bucket = lastBucket;
				else {
					bucket = bucketFor(state, inst);
					lastCtx = ctx;
					lastBucket = bucket;
				}
				const hit = bucket.get(input);
				if (hit) {
					payload.value = hit.value;
					if (hit.issues) {
						if (hit.issues.length) payload.issues.push(...cloneIssues(hit.issues));
					} else {
						payload.memo = true;
						state.backEdges ?? (state.backEdges = /* @__PURE__ */ new WeakSet());
						state.backEdges.add(hit.value);
					}
					return payload;
				}
				handoff = bucket;
				const depth = open.length;
				const result = base(payload, ctx);
				handoff = void 0;
				const entry = open.length > depth ? open.pop() : void 0;
				if (result instanceof Promise) return result.then((r) => {
					if (entry) entry.issues = r.issues.length ? cloneIssues(r.issues) : NO_ISSUES;
					return r;
				});
				if (entry) entry.issues = result.issues.length ? cloneIssues(result.issues) : NO_ISSUES;
				return result;
			};
			inst._zod.parse = wrapped;
			if (inst._zod.run === base) inst._zod.run = wrapped;
		});
	}
};
/** The memoizer that gives containers cycle support. `zod` installs it by default; `zod/mini` opts in with `config({ memoizer: memoizer() })`. */
function memoizer() {
	return memo;
}
/** Whether this value is a node a back-edge resolved to before it finished. */
function isBackEdge(ctx, value) {
	const backEdges = ctx[STATE]?.backEdges;
	return backEdges !== void 0 && isRef(value) && backEdges.has(value);
}
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/locales/en.js
var error = () => {
	const Sizable = {
		string: {
			unit: "characters",
			verb: "to have"
		},
		file: {
			unit: "bytes",
			verb: "to have"
		},
		array: {
			unit: "items",
			verb: "to have"
		},
		set: {
			unit: "items",
			verb: "to have"
		},
		map: {
			unit: "entries",
			verb: "to have"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const FormatDictionary = {
		regex: "input",
		email: "email address",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datetime",
		date: "ISO date",
		time: "ISO time",
		duration: "ISO duration",
		ipv4: "IPv4 address",
		ipv6: "IPv6 address",
		mac: "MAC address",
		cidrv4: "IPv4 range",
		cidrv6: "IPv6 range",
		base64: "base64-encoded string",
		base64url: "base64url-encoded string",
		json_string: "JSON string",
		e164: "E.164 number",
		currency_code: "currency code",
		credit_card: "credit card number",
		iban: "IBAN",
		jwt: "JWT",
		template_literal: "input"
	};
	const TypeDictionary = { nan: "NaN" };
	function getTypeName(type, input) {
		if (type === "number" && typeof input === "number" && !Number.isFinite(input)) return String(input);
		return TypeDictionary[type] ?? type;
	}
	return (issue) => {
		switch (issue.code) {
			case "invalid_type": return `Invalid input: expected ${getTypeName(issue.expected)}, received ${getTypeName(parsedType(issue.input), issue.input)}`;
			case "invalid_value":
				if (issue.values.length === 1) return `Invalid input: expected ${stringifyPrimitive(issue.values[0])}`;
				return `Invalid option: expected one of ${joinValues(issue.values, "|")}`;
			case "too_big": {
				const adj = issue.exact ? "exactly " : issue.inclusive ? "<=" : "<";
				const sizing = getSizing(issue.origin);
				if (sizing) return `Too big: expected ${issue.origin ?? "value"} to have ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"}`;
				return `Too big: expected ${issue.origin ?? "value"} to be ${adj}${issue.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue.exact ? "exactly " : issue.inclusive ? ">=" : ">";
				const sizing = getSizing(issue.origin);
				if (sizing) return `Too small: expected ${issue.origin} to have ${adj}${issue.minimum.toString()} ${sizing.unit}`;
				return `Too small: expected ${issue.origin} to be ${adj}${issue.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue;
				if (_issue.format === "starts_with") return `Invalid string: must start with "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Invalid string: must end with "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Invalid string: must include "${_issue.includes}"`;
				if (_issue.format === "regex") return `Invalid string: must match pattern ${_issue.pattern}`;
				return `Invalid ${FormatDictionary[_issue.format] ?? issue.format}`;
			}
			case "not_multiple_of": return `Invalid number: must be a multiple of ${issue.divisor}`;
			case "unrecognized_keys": return `Unrecognized key${issue.keys.length > 1 ? "s" : ""}: ${joinValues(issue.keys, ", ")}`;
			case "invalid_key": return `Invalid key in ${issue.origin}`;
			case "invalid_union":
				if (issue.options && Array.isArray(issue.options) && issue.options.length > 0) return `Invalid discriminator value. Expected ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
				if (issue.inclusive === false) return "Invalid input: more than one option matched";
				return "Invalid input";
			case "invalid_element": return `Invalid value in ${issue.origin}`;
			default: return `Invalid input`;
		}
	};
};
function en_default() {
	return { localeError: error() };
}
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/registries.js
var _a;
var $ZodRegistry = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			const f = {
				...pm,
				...this._map.get(schema)
			};
			return Object.keys(f).length ? f : void 0;
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry() {
	return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
var globalRegistry = globalThis.__zod_globalRegistry;
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/api.js
function snapshotChecks(def) {
	if (def.checks) def.checks = [...def.checks];
	return def;
}
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
	return new Class(snapshotChecks({
		type: "string",
		...normalizeParams(params)
	}));
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
	return new Class({
		type: "string",
		format: "email",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
	return new Class({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v4",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v6",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v7",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
	return new Class({
		type: "string",
		format: "url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
	return new Class({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
	return new Class({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link _cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
	return new Class({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
	return new Class({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
	return new Class({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
	return new Class({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
	return new Class({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
	return new Class({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
	return new Class({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
	return new Class({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
	return new Class({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
	return new Class({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
	return new Class({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
	return new Class({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: false,
		local: false,
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
	return new Class({
		type: "string",
		format: "date",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
	return new Class({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
	return new Class({
		type: "string",
		format: "duration",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
	return new Class(snapshotChecks({
		type: "number",
		checks: [],
		...normalizeParams(params)
	}));
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
	return new Class({
		type: "number",
		check: "number_format",
		abort: false,
		format: "safeint",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
	return new Class({
		type: "boolean",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _null$1(Class, params) {
	return new Class({
		type: "null",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _any(Class) {
	return new Class({ type: "any" });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
	return new Class({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
	return new Class({
		type: "never",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
	return new $ZodCheckMaxLength({
		check: "max_length",
		...normalizeParams(params),
		maximum
	});
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
	return new $ZodCheckMinLength({
		check: "min_length",
		...normalizeParams(params),
		minimum
	});
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
	return new $ZodCheckLengthEquals({
		check: "length_equals",
		...normalizeParams(params),
		length
	});
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
	return new $ZodCheckRegex({
		check: "string_format",
		format: "regex",
		...normalizeParams(params),
		pattern
	});
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
	return new $ZodCheckLowerCase({
		check: "string_format",
		format: "lowercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
	return new $ZodCheckUpperCase({
		check: "string_format",
		format: "uppercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
	return new $ZodCheckIncludes({
		check: "string_format",
		format: "includes",
		...normalizeParams(params),
		includes
	});
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
	return new $ZodCheckStartsWith({
		check: "string_format",
		format: "starts_with",
		...normalizeParams(params),
		prefix
	});
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
	return new $ZodCheckEndsWith({
		check: "string_format",
		format: "ends_with",
		...normalizeParams(params),
		suffix
	});
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
	return new $ZodCheckOverwrite({
		check: "overwrite",
		tx
	});
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
	return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
	return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
	return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
	return new Class({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
	return new Class({
		type: "custom",
		check: "custom",
		fn,
		...normalizeParams(_params)
	});
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
	const ch = /* @__PURE__ */ _check((payload) => {
		payload.addIssue = (issue$2) => {
			if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
			else {
				const _issue = issue$2;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				if (!("input" in _issue)) _issue.input = payload.value;
				_issue.inst ?? (_issue.inst = ch);
				_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
				payload.issues.push(issue(_issue));
			}
		};
		return fn(payload.value, payload);
	}, params);
	return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
	const ch = new $ZodCheck({
		check: "custom",
		...normalizeParams(params)
	});
	ch._zod.check = fn;
	return ch;
}
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/to-json-schema.js
function assignProps(target, ...sources) {
	for (const source of sources) for (const key of Reflect.ownKeys(source)) if (Object.prototype.propertyIsEnumerable.call(source, key)) assignProp(target, key, source[key]);
	return target;
}
function initializeContext(params) {
	let target = params?.target ?? "draft-2020-12";
	if (target === "draft-4") target = "draft-04";
	if (target === "draft-7") target = "draft-07";
	return {
		processors: params.processors ?? {},
		metadataRegistry: params?.metadata ?? globalRegistry,
		target,
		unrepresentable: params?.unrepresentable ?? "throw",
		override: params?.override ?? (() => {}),
		io: params?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		sharedDefsExtractedFor: void 0,
		sharedEmitDoneFor: void 0,
		cycles: params?.cycles ?? "ref",
		reused: params?.reused ?? "inline",
		intersections: [],
		deferred: [],
		external: params?.external ?? void 0
	};
}
/**
* Applies the `unrepresentable` setting at a site that has no JSON Schema equivalent. Throws
* `message` unless the setting (or the handler's return value) says otherwise. Returns `true` if a
* custom JSON Schema was written into `json`, in which case the caller must not write its own.
*/
function handleUnrepresentable(schema, ctx, json, params, message) {
	const result = typeof ctx.unrepresentable === "function" ? ctx.unrepresentable({
		zodSchema: schema,
		path: params.path,
		message
	}) : ctx.unrepresentable;
	if (result === "any") return false;
	if (result === void 0 || result === "throw") throw new Error(message);
	Object.assign(json, result);
	return true;
}
function processSchema(schema, ctx, _params = {
	path: [],
	schemaPath: []
}) {
	var _a;
	const def = schema._zod.def;
	const seen = ctx.seen.get(schema);
	if (seen) {
		seen.count++;
		if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
		return seen.schema;
	}
	const result = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: _params.path
	};
	ctx.seen.set(schema, result);
	ctx.sharedDefsExtractedFor = void 0;
	ctx.sharedEmitDoneFor = void 0;
	const overrideSchema = schema._zod.toJSONSchema?.();
	if (overrideSchema) result.schema = overrideSchema;
	else {
		const params = {
			..._params,
			schemaPath: [..._params.schemaPath, schema],
			path: _params.path
		};
		if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
		else {
			const _json = result.schema;
			const processor = ctx.processors[def.type];
			if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
			processor(schema, ctx, _json, params);
		}
		const parent = schema._zod.parent;
		if (parent) {
			if (!result.ref) result.ref = parent;
			processSchema(parent, ctx, params);
			ctx.seen.get(parent).isParent = true;
		}
	}
	const meta = ctx.metadataRegistry.get(schema);
	if (meta) assignProps(result.schema, meta);
	if (ctx.io === "input" && isTransforming(schema)) {
		delete result.schema.examples;
		delete result.schema.default;
	}
	if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
	delete result.schema._prefault;
	return ctx.seen.get(schema).schema;
}
function encodeJSONPointerSegment(segment) {
	return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
function extractDefs(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external) return;
	const idToSchema = /* @__PURE__ */ new Map();
	for (const entry of ctx.seen.entries()) {
		const id = ctx.metadataRegistry.get(entry[0])?.id;
		if (id) {
			const existing = idToSchema.get(id);
			if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			idToSchema.set(id, entry[0]);
		}
	}
	const makeURI = (entry) => {
		const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
		if (ctx.external) {
			const externalId = ctx.external.registry.get(entry[0])?.id;
			const uriGenerator = ctx.external.uri ?? ((id) => id);
			if (externalId) return { ref: uriGenerator(externalId) };
			const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
			entry[1].defId = id;
			return {
				defId: id,
				ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}`
			};
		}
		const uriPrefix = `#`;
		const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
		if (entry[1] === root && !entry[1].schema.id) return { ref: uriPrefix };
		const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
		return {
			defId,
			ref: defUriPrefix + encodeJSONPointerSegment(defId)
		};
	};
	const extractToDef = (entry) => {
		if (entry[1].schema.$ref) return;
		const seen = entry[1];
		const { ref, defId } = makeURI(entry);
		seen.def = { ...seen.schema };
		if (defId) seen.defId = defId;
		const schema = seen.schema;
		for (const key in schema) delete schema[key];
		schema.$ref = ref;
	};
	if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (schema === entry[0]) {
			extractToDef(entry);
			continue;
		}
		if (ctx.external) {
			const ext = ctx.external.registry.get(entry[0])?.id;
			if (schema !== entry[0] && ext) {
				extractToDef(entry);
				continue;
			}
		}
		if (ctx.metadataRegistry.get(entry[0])?.id) {
			extractToDef(entry);
			continue;
		}
		if (seen.cycle) {
			extractToDef(entry);
			continue;
		}
		if (seen.count > 1) {
			if (ctx.reused === "ref") extractToDef(entry);
		}
	}
	if (ctx.external) ctx.sharedDefsExtractedFor = ctx.external;
}
/** Rewrites `anyOf: [{type: "a"}, {type: "b"}]` to `type: ["a", "b"]`, which every JSON Schema draft treats as equivalent and most consumers render far better for the nullable case. Only branches that are a bare type assertion qualify — anything carrying a constraint, `$ref`, `const` or metadata is left alone. Runs after `flattenRef`, so a branch an override decorated or `$defs` extraction turned into a `$ref` is no longer bare and correctly stays in `anyOf`. `oneOf` is excluded: `integer` and `number` overlap, so "exactly one" and "at least one" are not the same there. OpenAPI 3.0 is excluded: its `type` must be a single string. */
function compactTypeUnion(schema) {
	const options = schema.anyOf;
	if (!Array.isArray(options) || options.length === 0 || schema.type !== void 0) return;
	const types = [];
	for (const option of options) {
		if (!option || typeof option !== "object") return;
		compactTypeUnion(option);
		const keys = Object.keys(option);
		if (keys.length !== 1 || keys[0] !== "type") return;
		const type = option.type;
		for (const member of Array.isArray(type) ? type : [type]) {
			if (typeof member !== "string") return;
			if (!types.includes(member)) types.push(member);
		}
	}
	delete schema.anyOf;
	schema.type = types.length === 1 ? types[0] : types;
}
/** Keywords `foldIntersection` knows how to combine. Anything else — `$ref`, `patternProperties`,
* an annotation like `description` — makes a member unfoldable, so a constraint this does not
* understand leaves the `allOf` alone instead of being silently dropped or misattributed. */
var FOLDABLE_KEYS = /* @__PURE__ */ new Set([
	"type",
	"properties",
	"required",
	"additionalProperties"
]);
var UNION_KEYS = ["oneOf", "anyOf"];
/** A member's constraint on a key it does not declare itself. A `catchall` states one; `false`, an absent `additionalProperties`, and the empty schema a loose object emits state nothing. */
function undeclaredConstraint(member) {
	const extra = member.additionalProperties;
	if (extra === void 0 || extra === false || typeof extra !== "object" || extra === null) return null;
	return Object.keys(extra).length ? extra : null;
}
/** Combines object members into the single object they describe together, or returns `null` if any of them carries a keyword outside {@link FOLDABLE_KEYS}. */
function foldObjects(members) {
	const objects = [];
	for (const member of members) {
		if (typeof member !== "object" || member.type !== "object") return null;
		for (const key in member) if (!FOLDABLE_KEYS.has(key)) return null;
		objects.push(member);
	}
	const properties = {};
	const required = /* @__PURE__ */ new Set();
	for (const object of objects) {
		for (const key in object.properties) {
			if (Object.prototype.hasOwnProperty.call(properties, key)) continue;
			const parts = [];
			for (const other of objects) {
				const part = other.properties?.[key] ?? undeclaredConstraint(other);
				if (part === null || part === void 0) continue;
				if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part))) parts.push(part);
			}
			assignProp(properties, key, parts.length === 1 ? parts[0] : foldObjects(parts) ?? { allOf: parts });
		}
		for (const key of object.required ?? []) required.add(key);
	}
	const folded = {
		type: "object",
		properties
	};
	if (required.size) folded.required = [...required];
	if (objects.every((object) => object.additionalProperties === false)) folded.additionalProperties = false;
	else {
		const constraints = [];
		for (const object of objects) {
			const constraint = undeclaredConstraint(object);
			if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint))) constraints.push(constraint);
		}
		if (constraints.length === 1) folded.additionalProperties = constraints[0];
		else if (constraints.length > 1) folded.additionalProperties = { allOf: constraints };
	}
	return folded;
}
/** `additionalProperties` in an `allOf` member sees only that member's own `properties`, so two
* closed object members reject each other's keys and the schema validates nothing. Zod's parser
* pools the key sets instead — `handleIntersectionResults` reports a key as unrecognized only when
* *every* side rejects it — so the emitted schema has to pool them too, and folding the members
* into one object is the encoding that says so on every target.
*
* This runs from `finalize`, after `extractDefs`, which is what keeps it clear of the `$ref`
* machinery: a member extracted into `$defs` is already a `$ref` by now and declines to fold, so it
* keeps its reference and its own closedness rather than being inlined as a stale copy. */
function foldIntersection(json) {
	const allOf = json.allOf;
	if (!Array.isArray(allOf) || allOf.length < 2) return;
	for (const key of FOLDABLE_KEYS) if (key in json) return;
	const unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
	let folded = null;
	if (!unions.length) folded = foldObjects(allOf);
	else {
		const union = unions[0];
		const keyword = UNION_KEYS.find((k) => Array.isArray(union[k]));
		if (Object.keys(union).length !== 1) return;
		const rest = allOf.filter((m) => m !== union);
		const branches = union[keyword].map((branch) => foldObjects([...rest, branch]));
		if (branches.some((b) => !b)) return;
		folded = { [keyword]: branches };
	}
	if (!folded) return;
	delete json.allOf;
	assignProps(json, folded);
}
function finalize(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const flattenRef = (zodSchema) => {
		const seen = ctx.seen.get(zodSchema);
		if (seen.ref === null) return;
		const schema = seen.def ?? seen.schema;
		const _cached = { ...schema };
		const ref = seen.ref;
		seen.ref = null;
		if (ref) {
			flattenRef(ref);
			const refSeen = ctx.seen.get(ref);
			const refSchema = refSeen.schema;
			if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
				schema.allOf = schema.allOf ?? [];
				schema.allOf.push(refSchema);
			} else assignProps(schema, refSchema);
			assignProps(schema, _cached);
			if (zodSchema._zod.parent === ref) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (!(key in _cached)) delete schema[key];
			}
			if (refSchema.$ref && refSeen.def) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
			}
		}
		const parent = zodSchema._zod.parent;
		if (parent && parent !== ref) {
			flattenRef(parent);
			const parentSeen = ctx.seen.get(parent);
			if (parentSeen?.schema.$ref) {
				schema.$ref = parentSeen.schema.$ref;
				if (parentSeen.def) for (const key in schema) {
					if (key === "$ref" || key === "allOf") continue;
					if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
				}
			}
		}
		ctx.override({
			zodSchema,
			jsonSchema: schema,
			path: seen.path ?? []
		});
	};
	if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
		for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
		if (ctx.target !== "openapi-3.0") for (const entry of ctx.seen.entries()) compactTypeUnion(entry[1].def ?? entry[1].schema);
		for (const rewrite of ctx.deferred) rewrite();
		if (ctx.intersections.length) {
			const carriers = /* @__PURE__ */ new Map();
			for (const seen of ctx.seen.values()) for (const json of [seen.schema, seen.def]) {
				const allOf = json?.allOf;
				if (!Array.isArray(allOf)) continue;
				const existing = carriers.get(allOf);
				if (existing) existing.push(json);
				else carriers.set(allOf, [json]);
			}
			for (const allOf of ctx.intersections) for (const json of carriers.get(allOf) ?? []) foldIntersection(json);
		}
	}
	const result = {};
	if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
	else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
	else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
	else if (ctx.target === "openapi-3.0") {}
	if (ctx.external?.uri) {
		const id = ctx.external.registry.get(schema)?.id;
		if (!id) throw new Error("Schema is missing an `id` property");
		result.$id = ctx.external.uri(id);
	}
	assignProps(result, root.defId ? root.schema : root.def ?? root.schema);
	const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
	if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
	const defs = ctx.external?.defs ?? {};
	if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.def && seen.defId) {
			if (seen.def.id === seen.defId) delete seen.def.id;
			assignProp(defs, seen.defId, seen.def);
		}
	}
	if (ctx.external) ctx.sharedEmitDoneFor = ctx.external;
	if (ctx.external) {} else if (Object.keys(defs).length > 0) {
		if (ctx.target === "draft-2020-12") result.$defs = defs;
		else result.definitions = defs;
	}
	try {
		const finalized = JSON.parse(JSON.stringify(result));
		Object.defineProperty(finalized, "~standard", {
			value: {
				...schema["~standard"],
				jsonSchema: {
					input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
					output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
				}
			},
			enumerable: false,
			writable: false
		});
		return finalized;
	} catch (_err) {
		throw new Error("Error converting schema to JSON.");
	}
}
function isTransforming(_schema, _ctx) {
	const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
	if (ctx.seen.has(_schema)) return false;
	ctx.seen.add(_schema);
	const def = _schema._zod.def;
	if (def.type === "transform") return true;
	if (def.type === "array") return isTransforming(def.element, ctx);
	if (def.type === "set") return isTransforming(def.valueType, ctx);
	if (def.type === "lazy") return isTransforming(def.getter(), ctx);
	if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault" || def.type === "catch") return isTransforming(def.innerType, ctx);
	if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
	if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
	if (def.type === "pipe") {
		if (_schema._zod.traits.has("$ZodCodec")) return true;
		return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
	}
	if (def.type === "object") {
		for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
		return false;
	}
	if (def.type === "union") {
		for (const option of def.options) if (isTransforming(option, ctx)) return true;
		return false;
	}
	if (def.type === "tuple") {
		for (const item of def.items) if (isTransforming(item, ctx)) return true;
		if (def.rest && isTransforming(def.rest, ctx)) return true;
		return false;
	}
	return false;
}
/**
* Creates a toJSONSchema method for a schema instance.
* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
*/
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
	const ctx = initializeContext({
		...params,
		processors
	});
	processSchema(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
var createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
	const { libraryOptions, target } = params ?? {};
	const ctx = initializeContext({
		...libraryOptions ?? {},
		target,
		io,
		processors
	});
	processSchema(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/json-schema-processors.js
var narrowMin = (agg, key, value) => {
	if (agg[key] === void 0 || value > agg[key]) agg[key] = value;
};
var narrowMax = (agg, key, value) => {
	if (agg[key] === void 0 || value < agg[key]) agg[key] = value;
};
var narrowBoth = (agg, value) => {
	narrowMin(agg, "minimum", value);
	narrowMax(agg, "maximum", value);
};
var addDivisor = (agg, value) => {
	agg.multipleOf ?? (agg.multipleOf = []);
	if (!agg.multipleOf.includes(value)) agg.multipleOf.push(value);
};
var addPattern = (agg, pattern) => {
	agg.patterns ?? (agg.patterns = /* @__PURE__ */ new Set());
	agg.patterns.add(pattern);
};
var intersectMime = (agg, mime) => {
	agg.mime = agg.mime ? agg.mime.filter((m) => mime.includes(m)) : [...mime];
};
var setFormat = (agg, format) => {
	agg.format = format;
	if (format.includes("int")) agg.isInt = true;
};
var minContributor = (agg, def) => narrowMin(agg, "minimum", def.minimum);
var maxContributor = (agg, def) => narrowMax(agg, "maximum", def.maximum);
var formatContributor = (ranges) => (agg, def) => {
	setFormat(agg, def.format);
	const [minimum, maximum] = ranges[def.format];
	narrowMin(agg, "minimum", minimum);
	narrowMax(agg, "maximum", maximum);
};
var contributors = {
	greater_than: (agg, def) => narrowMin(agg, def.inclusive ? "minimum" : "exclusiveMinimum", def.value),
	less_than: (agg, def) => narrowMax(agg, def.inclusive ? "maximum" : "exclusiveMaximum", def.value),
	multiple_of: (agg, def) => addDivisor(agg, def.value),
	number_format: formatContributor(NUMBER_FORMAT_RANGES),
	bigint_format: formatContributor(BIGINT_FORMAT_RANGES),
	min_length: minContributor,
	max_length: maxContributor,
	length_equals: (agg, def) => narrowBoth(agg, def.length),
	min_size: minContributor,
	max_size: maxContributor,
	size_equals: (agg, def) => narrowBoth(agg, def.size),
	string_format: (agg, def) => {
		setFormat(agg, def.format);
		if (def.pattern) addPattern(agg, def.pattern);
		if (def.format === "base64" || def.format === "base64url") agg.contentEncoding = def.format;
		if (def.local || def.precision === -1) agg.laxFormat = true;
	},
	mime_type: (agg, def) => intersectMime(agg, def.mime)
};
function aggregateChecks(schema) {
	const agg = {};
	const def = schema._zod.def;
	const list = schema._zod.traits.has("$ZodCheck") ? [schema, ...def.checks ?? []] : def.checks ?? [];
	for (const ch of list) contributors[ch._zod.def.check]?.(agg, ch._zod.def);
	const bag = schema._zod.bag;
	if (bag.minimum !== void 0) narrowMin(agg, "minimum", bag.minimum);
	if (bag.exclusiveMinimum !== void 0) narrowMin(agg, "exclusiveMinimum", bag.exclusiveMinimum);
	if (bag.maximum !== void 0) narrowMax(agg, "maximum", bag.maximum);
	if (bag.exclusiveMaximum !== void 0) narrowMax(agg, "exclusiveMaximum", bag.exclusiveMaximum);
	if (bag.multipleOf !== void 0) addDivisor(agg, bag.multipleOf);
	if (bag.format !== void 0) {
		agg.format ?? (agg.format = bag.format);
		if (bag.format.includes("int")) agg.isInt = true;
	}
	if (bag.mime) intersectMime(agg, bag.mime);
	for (const pattern of bag.patterns ?? []) addPattern(agg, pattern);
	return agg;
}
var formatMap = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
};
var exactPatterns = /* @__PURE__ */ new Map([[base64Charset, base64], [base64urlCharset, base64url]]);
var exactPattern = (p) => exactPatterns.get(p) ?? p;
var stringProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	json.type = "string";
	const { minimum, maximum, format, patterns, contentEncoding, laxFormat } = aggregateChecks(schema);
	if (typeof minimum === "number") json.minLength = minimum;
	if (typeof maximum === "number") json.maxLength = maximum;
	if (format) {
		json.format = formatMap[format] ?? format;
		if (json.format === "") delete json.format;
		if (format === "time" || laxFormat) delete json.format;
	}
	if (contentEncoding) json.contentEncoding = contentEncoding;
	if (patterns && patterns.size > 0) {
		const patternList = [...patterns].map(exactPattern);
		if (patternList.length === 1) json.pattern = patternList[0].source;
		else if (patternList.length > 1) json.allOf = [...patternList.map((regex) => ({
			...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: regex.source
		}))];
	}
};
var numberProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const { minimum, maximum, multipleOf, exclusiveMaximum, exclusiveMinimum, isInt } = aggregateChecks(schema);
	json.type = isInt ? "integer" : "number";
	const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
	const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
	const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
	if (exMin) {
		if (legacy) {
			json.minimum = exclusiveMinimum;
			json.exclusiveMinimum = true;
		} else json.exclusiveMinimum = exclusiveMinimum;
	} else if (typeof minimum === "number") json.minimum = minimum;
	if (exMax) {
		if (legacy) {
			json.maximum = exclusiveMaximum;
			json.exclusiveMaximum = true;
		} else json.exclusiveMaximum = exclusiveMaximum;
	} else if (typeof maximum === "number") json.maximum = maximum;
	if (multipleOf) {
		const divisors = /* @__PURE__ */ new Set();
		for (const divisor of multipleOf) if (Number.isFinite(divisor) && divisor !== 0) divisors.add(Math.abs(divisor));
		else handleUnrepresentable(schema, ctx, json, params, `A multipleOf divisor of ${divisor} cannot be represented in JSON Schema`);
		const [first, ...rest] = divisors;
		if (first !== void 0) json.multipleOf = first;
		if (rest.length) json.allOf = [...json.allOf ?? [], ...rest.map((m) => ({ multipleOf: m }))];
	}
};
var booleanProcessor = (_schema, _ctx, json, _params) => {
	json.type = "boolean";
};
var nullProcessor = (_schema, ctx, json, _params) => {
	if (ctx.target === "openapi-3.0") {
		json.type = "string";
		json.nullable = true;
		json.enum = [null];
	} else json.type = "null";
};
var neverProcessor = (_schema, _ctx, json, _params) => {
	json.not = {};
};
var enumProcessor = (schema, _ctx, json, _params) => {
	const def = schema._zod.def;
	const values = getEnumValues(def.entries);
	if (values.length === 0) {
		json.not = {};
		return;
	}
	if (values.every((v) => typeof v === "number")) json.type = "number";
	if (values.every((v) => typeof v === "string")) json.type = "string";
	json.enum = values;
};
var literalProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	if (def.values.length === 0) {
		json.not = {};
		return;
	}
	const vals = [];
	for (const val of def.values) if (val === void 0) {
		if (handleUnrepresentable(schema, ctx, json, params, "Literal `undefined` cannot be represented in JSON Schema")) return;
	} else if (typeof val === "bigint") {
		if (handleUnrepresentable(schema, ctx, json, params, "BigInt literals cannot be represented in JSON Schema")) return;
		vals.push(Number(val));
	} else vals.push(val);
	if (vals.length === 0) {} else if (vals.length === 1) {
		const val = vals[0];
		json.type = val === null ? "null" : typeof val;
		if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
		else json.const = val;
	} else {
		if (vals.every((v) => typeof v === "number")) json.type = "number";
		if (vals.every((v) => typeof v === "string")) json.type = "string";
		if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
		if (vals.every((v) => v === null)) json.type = "null";
		json.enum = vals;
	}
};
var customProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Custom types cannot be represented in JSON Schema");
};
var transformProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Transforms cannot be represented in JSON Schema");
};
var arrayProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	const { minimum, maximum } = aggregateChecks(schema);
	if (typeof minimum === "number") json.minItems = minimum;
	if (typeof maximum === "number") json.maxItems = maximum;
	json.type = "array";
	json.items = processSchema(def.element, ctx, {
		...params,
		path: [...params.path, "items"]
	});
};
function inputOptin(schema) {
	const def = schema._zod.def;
	if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) return inputOptin(def.out);
	if (def.type === "catch") return inputOptin(def.innerType);
	return schema._zod.optin;
}
var objectProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	const shape = def.shape;
	if (Object.getOwnPropertySymbols(shape).length && handleUnrepresentable(schema, ctx, json, params, "Symbol keys cannot be represented in JSON Schema")) return;
	json.type = "object";
	json.properties = {};
	for (const key in shape) assignProp(json.properties, key, processSchema(shape[key], ctx, {
		...params,
		path: [
			...params.path,
			"properties",
			key
		]
	}));
	const requiredKeys = [];
	for (const key of Object.keys(shape)) {
		const field = def.shape[key];
		if (ctx.io === "input" ? inputOptin(field) === void 0 : field._zod.optout === void 0) requiredKeys.push(key);
	}
	if (requiredKeys.length > 0) json.required = requiredKeys;
	if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
	else if (!def.catchall) {
		if (ctx.io === "output") json.additionalProperties = false;
	} else if (def.catchall) json.additionalProperties = processSchema(def.catchall, ctx, {
		...params,
		path: [...params.path, "additionalProperties"]
	});
};
var unionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const isExclusive = def.inclusive === false;
	const options = def.options.map((x, i) => processSchema(x, ctx, {
		...params,
		path: [
			...params.path,
			isExclusive ? "oneOf" : "anyOf",
			i
		]
	}));
	if (isExclusive) json.oneOf = options;
	else json.anyOf = options;
};
var intersectionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const a = processSchema(def.left, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			0
		]
	});
	const b = processSchema(def.right, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			1
		]
	});
	const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
	const allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
	json.allOf = allOf;
	ctx.intersections.push(allOf);
};
/** JSON object keys are always strings, so a numeric record key schema is re-expressed over the
* numeric-string form the record parser matches. Deferred to `finalize`, after the flatten: a key
* behind a wrapper only carries its own `type` before then, and a union key only has its branches.
*
* A numeric bound cannot apply to a property name, so `minimum` and its siblings are dropped rather
* than carried over: keeping them beside `type: "string"` reproduces the match-nothing schema this
* exists to fix. A key that carries one therefore emits wider than the record parses — `z.record(z.number().min(5), V)`
* accepts `"3"` — which is the deliberate trade, since throwing on it would reject an ordinary schema
* outright. */
function stringifyKeyNames(bySchema, json, visited) {
	if (json.$ref) {
		if (visited.has(json)) return json;
		visited.add(json);
		const def = bySchema.get(json)?.def;
		if (!def) return json;
		const inlined = stringifyKeyNames(bySchema, def, visited);
		return inlined === def ? json : inlined;
	}
	for (const keyword of ["anyOf", "oneOf"]) {
		const branches = json[keyword];
		if (!Array.isArray(branches)) continue;
		const mapped = branches.map((branch) => stringifyKeyNames(bySchema, branch, visited));
		if (mapped.some((branch, i) => branch !== branches[i])) json = {
			...json,
			[keyword]: mapped
		};
	}
	const types = Array.isArray(json.type) ? json.type : [json.type];
	const numericType = !types.includes("string") && types.some((t) => t === "number" || t === "integer");
	const values = json.enum ?? (json.const !== void 0 ? [json.const] : void 0);
	if (!numericType && !values?.some((v) => typeof v === "number")) return json;
	const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, format, id, ...rest } = json;
	if (rest.enum) rest.enum = rest.enum.map((v) => typeof v === "number" ? String(v) : v);
	else if (typeof rest.const === "number") rest.const = String(rest.const);
	if (!numericType) return rest;
	rest.type = "string";
	if (!values) rest.pattern = (types.includes("number") ? number$1 : integer).source;
	return rest;
}
/** Every record of one conversion, so the carriers are found in a single pass rather than once per record. */
var pendingRecords = /* @__PURE__ */ new WeakMap();
function rewriteKeyNames(ctx) {
	const bySchema = /* @__PURE__ */ new Map();
	for (const entry of ctx.seen.values()) if (entry.def && !bySchema.has(entry.schema)) bySchema.set(entry.schema, entry);
	const rewrites = /* @__PURE__ */ new Map();
	for (const record of pendingRecords.get(ctx) ?? []) {
		const seen = ctx.seen.get(record);
		const names = (seen?.def ?? seen?.schema)?.propertyNames;
		if (!names || names === true || rewrites.has(names)) continue;
		const rewritten = stringifyKeyNames(bySchema, names, /* @__PURE__ */ new Set());
		if (rewritten !== names) rewrites.set(names, rewritten);
	}
	if (!rewrites.size) return;
	for (const entry of ctx.seen.values()) for (const carrier of [entry.schema, entry.def]) {
		const rewritten = carrier && rewrites.get(carrier.propertyNames);
		if (rewritten) carrier.propertyNames = rewritten;
	}
}
var recordProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "object";
	const keyType = def.keyType;
	const patterns = aggregateChecks(keyType).patterns;
	if (def.mode === "loose" && patterns && patterns.size > 0) {
		const valueSchema = processSchema(def.valueType, ctx, {
			...params,
			path: [
				...params.path,
				"patternProperties",
				"*"
			]
		});
		json.patternProperties = {};
		for (const pattern of patterns) assignProp(json.patternProperties, exactPattern(pattern).source, valueSchema);
	} else {
		if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
			json.propertyNames = processSchema(def.keyType, ctx, {
				...params,
				path: [...params.path, "propertyNames"]
			});
			let pending = pendingRecords.get(ctx);
			if (!pending) {
				pending = [];
				pendingRecords.set(ctx, pending);
				ctx.deferred.push(() => rewriteKeyNames(ctx));
			}
			pending.push(schema);
		}
		json.additionalProperties = processSchema(def.valueType, ctx, {
			...params,
			path: [...params.path, "additionalProperties"]
		});
	}
	const keyValues = keyType._zod.values;
	const omittableOnInput = ctx.io === "input" && inputOptin(def.valueType) !== void 0;
	if (keyValues && !def.partial && !omittableOnInput) {
		const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
		if (validKeyValues.length > 0) json.required = validKeyValues.map(String);
	}
};
var nullableProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const inner = processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	if (ctx.target === "openapi-3.0") {
		seen.ref = def.innerType;
		json.nullable = true;
	} else json.anyOf = [inner, { type: "null" }];
};
var nonoptionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
/** Round-trips a default value through JSON so the emitted schema is guaranteed to be valid JSON.
* A BigInt has no reliable encoding, so it goes through `unrepresentable` like any other
* unrepresentable value. Returns a sentinel when the caller must not write a default of its own. */
var UNREPRESENTABLE_DEFAULT = Symbol();
function serializeDefaultValue(value, schema, ctx, json, params) {
	let unrepresentable = false;
	const serialized = JSON.stringify(value, (_, val) => {
		if (typeof val !== "bigint") return val;
		unrepresentable = true;
		return null;
	});
	if (!unrepresentable) return JSON.parse(serialized);
	handleUnrepresentable(schema, ctx, json, params, "BigInt defaults cannot be represented in JSON Schema");
	return UNREPRESENTABLE_DEFAULT;
}
var defaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
	if (value !== UNREPRESENTABLE_DEFAULT) json.default = value;
};
var prefaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	if (ctx.io !== "input") return;
	const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
	if (value !== UNREPRESENTABLE_DEFAULT) json._prefault = value;
};
var catchProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	let catchValue;
	try {
		catchValue = def.catchValue(void 0);
	} catch {
		handleUnrepresentable(schema, ctx, json, params, "Dynamic catch values are not supported in JSON Schema");
		return;
	}
	json.default = catchValue;
};
var pipeProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	const inIsTransform = def.in._zod.traits.has("$ZodTransform");
	const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
	processSchema(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
var readonlyProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.readOnly = true;
};
var optionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
var lazyProcessor = (schema, ctx, _json, params) => {
	const innerType = schema._zod.innerType;
	processSchema(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/classic/errors.js
var _installedErrorProtos = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function _lazyMethod(proto, key, make) {
	Object.defineProperty(proto, key, {
		configurable: true,
		enumerable: false,
		get() {
			const value = make(this);
			Object.defineProperty(this, key, {
				value,
				configurable: true,
				writable: true
			});
			return value;
		},
		set(value) {
			Object.defineProperty(this, key, {
				value,
				configurable: true,
				writable: true
			});
		}
	});
}
var initializer = (inst, issues) => {
	$ZodError.init(inst, issues);
	inst.name = "ZodError";
	const proto = Object.getPrototypeOf(inst);
	if (_installedErrorProtos.has(proto)) return;
	_installedErrorProtos.add(proto);
	_lazyMethod(proto, "format", (self) => (mapper) => formatError(self, mapper));
	_lazyMethod(proto, "flatten", (self) => (mapper) => flattenError(self, mapper));
	_lazyMethod(proto, "addIssue", (self) => (issue) => {
		self.issues.push(issue);
		self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
	});
	_lazyMethod(proto, "addIssues", (self) => (issues) => {
		self.issues.push(...issues);
		self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
	});
	Object.defineProperty(proto, "isEmpty", {
		configurable: true,
		enumerable: false,
		get() {
			return this.issues.length === 0;
		}
	});
};
var ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, void 0, { Parent: Error });
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/classic/parse.js
var parse$1 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode = /* @__PURE__ */ _encode(ZodRealError);
var decode = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
//#endregion
//#region node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/classic/schemas.js
function _ensureDefaultLocale() {
	if (!globalConfig.localeError) config(en_default());
}
function _ensureDefaultMemoizer() {
	if (!globalConfig.memoizer) config({ memoizer: memoizer() });
}
var ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
	_ensureDefaultLocale();
	$ZodType.init(inst, def);
	inst.def = def;
	inst.type = def.type;
	return inst;
}, {
	check(...chks) {
		const def = this.def;
		return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
			check: ch,
			def: { check: "custom" },
			onattach: []
		} } : ch)] }), { parent: true });
	},
	with(...chks) {
		return this.check(...chks);
	},
	clone(def, params) {
		return clone(this, def, params);
	},
	brand() {
		return this;
	},
	register(reg, meta) {
		reg.add(this, meta);
		return this;
	},
	refine(check, params) {
		return this.check(refine(check, params));
	},
	superRefine(refinement, params) {
		return this.check(superRefine(refinement, params));
	},
	overwrite(fn) {
		return this.check(/* @__PURE__ */ _overwrite(fn));
	},
	optional() {
		return optional(this);
	},
	exactOptional() {
		return exactOptional(this);
	},
	nullable() {
		return nullable(this);
	},
	nullish() {
		return optional(nullable(this));
	},
	nonoptional(params) {
		return nonoptional(this, params);
	},
	array() {
		return array(this);
	},
	or(arg) {
		return union([this, arg]);
	},
	and(arg) {
		return intersection(this, arg);
	},
	transform(tx) {
		return pipe(this, transform(tx));
	},
	default(d) {
		return _default(this, d);
	},
	prefault(d) {
		return prefault(this, d);
	},
	catch(params) {
		return _catch(this, params);
	},
	pipe(target) {
		return pipe(this, target);
	},
	readonly() {
		return readonly(this);
	},
	describe(description) {
		const cl = this.clone();
		globalRegistry.add(cl, { description });
		return cl;
	},
	meta(...args) {
		if (args.length === 0) return globalRegistry.get(this);
		const cl = this.clone();
		globalRegistry.add(cl, args[0]);
		return cl;
	},
	isOptional() {
		return this.safeParse(void 0).success;
	},
	isNullable() {
		return this.safeParse(null).success;
	},
	apply(fn, ...args) {
		return args.length === 0 ? fn(this) : fn(this, ...args);
	},
	get "~standard"() {
		return hide(this, "~standard", {
			...standardProps(this),
			jsonSchema: {
				input: createStandardJSONSchemaMethod(this, "input"),
				output: createStandardJSONSchemaMethod(this, "output")
			}
		});
	},
	set "~standard"(value) {
		own(this, "~standard", value);
	},
	parse: function _parse(data, params) {
		return parse$1(this, data, params, { callee: _parse });
	},
	parseAsync: async function _parseAsync(data, params) {
		return await parseAsync(this, data, params, { callee: _parseAsync });
	},
	safeParse(data, params) {
		return safeParse(this, data, params);
	},
	async safeParseAsync(data, params) {
		return safeParseAsync(this, data, params);
	},
	get spa() {
		return this?.safeParseAsync;
	},
	set spa(value) {
		own(this, "spa", value);
	},
	validate(data, params) {
		return validate(this, data, params);
	},
	validateAsync(data, params) {
		return validateAsync$1(this, data, params);
	},
	encode: function _encode(data, params) {
		return encode(this, data, params, { callee: _encode });
	},
	decode: function _decode(data, params) {
		return decode(this, data, params, { callee: _decode });
	},
	encodeAsync: async function _encodeAsync(data, params) {
		return await encodeAsync(this, data, params, { callee: _encodeAsync });
	},
	decodeAsync: async function _decodeAsync(data, params) {
		return await decodeAsync(this, data, params, { callee: _decodeAsync });
	},
	safeEncode(data, params) {
		return safeEncode(this, data, params);
	},
	safeDecode(data, params) {
		return safeDecode(this, data, params);
	},
	async safeEncodeAsync(data, params) {
		return safeEncodeAsync(this, data, params);
	},
	async safeDecodeAsync(data, params) {
		return safeDecodeAsync(this, data, params);
	},
	toJSONSchema(params) {
		return createToJSONSchemaMethod(this, {})(params);
	},
	get description() {
		return globalRegistry.get(this)?.description;
	},
	get _def() {
		return this._zod.def;
	}
});
/** @internal */
var _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
}, /*@__PURE__*/ derived({
	format: (inst) => aggregateChecks(inst).format ?? null,
	minLength: (inst) => aggregateChecks(inst).minimum ?? null,
	maxLength: (inst) => aggregateChecks(inst).maximum ?? null
}, {
	regex(...args) {
		return this.check(/* @__PURE__ */ _regex(...args));
	},
	includes(...args) {
		return this.check(/* @__PURE__ */ _includes(...args));
	},
	startsWith(...args) {
		return this.check(/* @__PURE__ */ _startsWith(...args));
	},
	endsWith(...args) {
		return this.check(/* @__PURE__ */ _endsWith(...args));
	},
	min(...args) {
		return this.check(/* @__PURE__ */ _minLength(...args));
	},
	max(...args) {
		return this.check(/* @__PURE__ */ _maxLength(...args));
	},
	length(...args) {
		return this.check(/* @__PURE__ */ _length(...args));
	},
	nonempty(...args) {
		return this.check(/* @__PURE__ */ _minLength(1, ...args));
	},
	lowercase(params) {
		return this.check(/* @__PURE__ */ _lowercase(params));
	},
	uppercase(params) {
		return this.check(/* @__PURE__ */ _uppercase(params));
	},
	trim() {
		return this.check(/* @__PURE__ */ _trim());
	},
	normalize(...args) {
		return this.check(/* @__PURE__ */ _normalize(...args));
	},
	toLowerCase() {
		return this.check(/* @__PURE__ */ _toLowerCase());
	},
	toUpperCase() {
		return this.check(/* @__PURE__ */ _toUpperCase());
	},
	slugify() {
		return this.check(/* @__PURE__ */ _slugify());
	}
}));
var ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	_ZodString.init(inst, def);
}, {
	email(params) {
		return this.check(/* @__PURE__ */ _email(ZodEmail, params));
	},
	url(params) {
		return this.check(/* @__PURE__ */ _url(ZodURL, params));
	},
	jwt(params) {
		return this.check(/* @__PURE__ */ _jwt(ZodJWT, params));
	},
	emoji(params) {
		return this.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
	},
	guid(params) {
		return this.check(/* @__PURE__ */ _guid(ZodGUID, params));
	},
	uuid(params) {
		return this.check(/* @__PURE__ */ _uuid(ZodUUID, params));
	},
	uuidv4(params) {
		return this.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
	},
	uuidv6(params) {
		return this.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
	},
	uuidv7(params) {
		return this.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
	},
	nanoid(params) {
		return this.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
	},
	cuid(params) {
		return this.check(/* @__PURE__ */ _cuid(ZodCUID, params));
	},
	cuid2(params) {
		return this.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
	},
	ulid(params) {
		return this.check(/* @__PURE__ */ _ulid(ZodULID, params));
	},
	base64(params) {
		return this.check(/* @__PURE__ */ _base64(ZodBase64, params));
	},
	base64url(params) {
		return this.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
	},
	xid(params) {
		return this.check(/* @__PURE__ */ _xid(ZodXID, params));
	},
	ksuid(params) {
		return this.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
	},
	ipv4(params) {
		return this.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
	},
	ipv6(params) {
		return this.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
	},
	cidrv4(params) {
		return this.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
	},
	cidrv6(params) {
		return this.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
	},
	e164(params) {
		return this.check(/* @__PURE__ */ _e164(ZodE164, params));
	},
	datetime(params) {
		return this.check(/* @__PURE__ */ _isoDateTime(ZodISODateTime, params));
	},
	date(params) {
		return this.check(/* @__PURE__ */ _isoDate(ZodISODate, params));
	},
	time(params) {
		return this.check(/* @__PURE__ */ _isoTime(ZodISOTime, params));
	},
	duration(params) {
		return this.check(/* @__PURE__ */ _isoDuration(ZodISODuration, params));
	}
});
function string(params) {
	return /* @__PURE__ */ _string(ZodString, params);
}
var ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	_ZodString.init(inst, def);
});
var ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
	$ZodISODateTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
	$ZodISODate.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
	$ZodISOTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
	$ZodISODuration.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
	$ZodEmail.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
	$ZodGUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
	$ZodUUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
	$ZodURL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
	$ZodEmoji.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
	$ZodNanoID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
var ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
	$ZodCUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
	$ZodCUID2.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
	$ZodULID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
	$ZodXID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
	$ZodKSUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
	$ZodIPv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
	$ZodIPv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
	$ZodCIDRv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
	$ZodCIDRv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
	$ZodBase64.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
	$ZodBase64URL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
	$ZodE164.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
	$ZodJWT.init(inst, def);
	ZodStringFormat.init(inst, def);
});
var ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
	inst.isFinite = true;
}, /*@__PURE__*/ derived({
	minValue: (inst) => {
		const { minimum, exclusiveMinimum } = aggregateChecks(inst);
		return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
	},
	maxValue: (inst) => {
		const { maximum, exclusiveMaximum } = aggregateChecks(inst);
		return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
	},
	isInt: (inst) => {
		const { isInt, multipleOf } = aggregateChecks(inst);
		return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
	},
	format: (inst) => aggregateChecks(inst).format ?? null
}, {
	gt(value, params) {
		return this.check(/* @__PURE__ */ _gt(value, params));
	},
	gte(value, params) {
		return this.check(/* @__PURE__ */ _gte(value, params));
	},
	min(value, params) {
		return this.check(/* @__PURE__ */ _gte(value, params));
	},
	lt(value, params) {
		return this.check(/* @__PURE__ */ _lt(value, params));
	},
	lte(value, params) {
		return this.check(/* @__PURE__ */ _lte(value, params));
	},
	max(value, params) {
		return this.check(/* @__PURE__ */ _lte(value, params));
	},
	int(params) {
		return this.check(int(params));
	},
	safe(params) {
		return this.check(int(params));
	},
	positive(params) {
		return this.check(/* @__PURE__ */ _gt(0, params));
	},
	nonnegative(params) {
		return this.check(/* @__PURE__ */ _gte(0, params));
	},
	negative(params) {
		return this.check(/* @__PURE__ */ _lt(0, params));
	},
	nonpositive(params) {
		return this.check(/* @__PURE__ */ _lte(0, params));
	},
	multipleOf(value, params) {
		return this.check(/* @__PURE__ */ _multipleOf(value, params));
	},
	step(value, params) {
		return this.check(/* @__PURE__ */ _multipleOf(value, params));
	},
	finite() {
		return this;
	}
}));
function number(params) {
	return /* @__PURE__ */ _number(ZodNumber, params);
}
var ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
	$ZodNumberFormat.init(inst, def);
	ZodNumber.init(inst, def);
});
function int(params) {
	return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
var ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
	$ZodBoolean.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
function boolean(params) {
	return /* @__PURE__ */ _boolean(ZodBoolean, params);
}
var ZodNull = /*@__PURE__*/ $constructor("ZodNull", (inst, def) => {
	$ZodNull.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
});
function _null(params) {
	return /* @__PURE__ */ _null$1(ZodNull, params);
}
var ZodAny = /*@__PURE__*/ $constructor("ZodAny", (inst, def) => {
	$ZodAny.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => void 0;
});
function any() {
	return /* @__PURE__ */ _any(ZodAny);
}
var ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
	$ZodUnknown.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => void 0;
});
function unknown() {
	return /* @__PURE__ */ _unknown(ZodUnknown);
}
var ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
	$ZodNever.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
	return /* @__PURE__ */ _never(ZodNever, params);
}
var ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
	_ensureDefaultMemoizer();
	$ZodArray.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
	inst.element = def.element;
}, {
	min(n, params) {
		return this.check(/* @__PURE__ */ _minLength(n, params));
	},
	nonempty(params) {
		return this.check(/* @__PURE__ */ _minLength(1, params));
	},
	max(n, params) {
		return this.check(/* @__PURE__ */ _maxLength(n, params));
	},
	length(n, params) {
		return this.check(/* @__PURE__ */ _length(n, params));
	},
	unwrap() {
		return this.element;
	}
});
function array(element, params) {
	return /* @__PURE__ */ _array(ZodArray, element, params);
}
var ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
	_ensureDefaultMemoizer();
	$ZodObjectJIT.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
	installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
}, {
	keyof() {
		return _enum(Object.keys(this._zod.def.shape));
	},
	catchall(catchall) {
		return this.clone(mergeDefs(this._zod.def, { catchall }));
	},
	passthrough() {
		return this.clone(mergeDefs(this._zod.def, { catchall: unknown() }));
	},
	loose() {
		return this.clone(mergeDefs(this._zod.def, { catchall: unknown() }));
	},
	strict() {
		return this.clone(mergeDefs(this._zod.def, { catchall: never() }));
	},
	strip() {
		return this.clone(mergeDefs(this._zod.def, { catchall: void 0 }));
	},
	extend(incoming) {
		return extend(this, incoming);
	},
	safeExtend(incoming) {
		return safeExtend(this, incoming);
	},
	merge(other) {
		return merge(this, other);
	},
	pick(mask) {
		return pick(this, mask);
	},
	omit(mask) {
		return omit(this, mask);
	},
	partial(...args) {
		return partial(ZodOptional, this, args[0]);
	},
	exactPartial(...args) {
		return partial(ZodExactOptional, this, args[0], "exactPartial");
	},
	required(...args) {
		return required(ZodNonOptional, this, args[0]);
	}
});
function object(shape, params) {
	return new ZodObject({
		type: "object",
		shape: shape ?? {},
		...normalizeParams(params)
	});
}
function strictObject(shape, params) {
	return new ZodObject({
		type: "object",
		shape,
		catchall: never(),
		...normalizeParams(params)
	});
}
var ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
	inst.options = def.options;
});
function union(options, params) {
	return new ZodUnion({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
var ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
	$ZodIntersection.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
	return new ZodIntersection({
		type: "intersection",
		left,
		right
	});
}
var ZodRecord = /*@__PURE__*/ $constructor("ZodRecord", (inst, def) => {
	_ensureDefaultMemoizer();
	$ZodRecord.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
	inst.keyType = def.keyType;
	inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
	if (!valueType || !valueType._zod) return new ZodRecord({
		type: "record",
		keyType: string(),
		valueType: keyType,
		...normalizeParams(valueType)
	});
	return new ZodRecord({
		type: "record",
		keyType,
		valueType,
		...normalizeParams(params)
	});
}
var ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
	$ZodEnum.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
	inst.enum = def.entries;
	inst.options = [...inst._zod.values];
	const keys = new Set(Object.keys(def.entries));
	inst.extract = (values, params) => {
		const newEntries = {};
		for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
	inst.exclude = (values, params) => {
		const newEntries = { ...def.entries };
		for (const value of values) if (keys.has(value)) delete newEntries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
});
function _enum(values, params) {
	return new ZodEnum({
		type: "enum",
		entries: Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values,
		...normalizeParams(params)
	});
}
var ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
	$ZodLiteral.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
	inst.values = new Set(def.values);
	Object.defineProperty(inst, "value", { get() {
		if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return def.values[0];
	} });
});
function literal(value, params) {
	return new ZodLiteral({
		type: "literal",
		values: Array.isArray(value) ? value : [value],
		...normalizeParams(params)
	});
}
var ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
	_ensureDefaultMemoizer();
	$ZodTransform.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
	inst._zod.parse = (payload, _ctx) => {
		if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				if (!("input" in _issue)) _issue.input = payload.value;
				_issue.inst ?? (_issue.inst = inst);
				payload.issues.push(issue(_issue));
			}
		};
		const output = def.transform(payload.value, payload);
		if (output instanceof Promise) return output.then((output) => {
			payload.value = output;
			return payload;
		});
		payload.value = output;
		return payload;
	};
});
function transform(fn) {
	return new ZodTransform({
		type: "transform",
		transform: fn
	});
}
var ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
	return new ZodOptional({
		type: "optional",
		innerType
	});
}
var ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
	$ZodExactOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
	return new ZodExactOptional({
		type: "optional",
		innerType
	});
}
var ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
	$ZodNullable.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
	return new ZodNullable({
		type: "nullable",
		innerType
	});
}
var ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
	$ZodDefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
	return new ZodDefault({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
var ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
	$ZodPrefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
	return new ZodPrefault({
		type: "prefault",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
var ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
	$ZodNonOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
	return new ZodNonOptional({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
var ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
	$ZodCatch.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
	return new ZodCatch({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : constantCatch(catchValue)
	});
}
var ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
	$ZodPipe.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
	inst.in = def.in;
	inst.out = def.out;
});
function pipe(in_, out) {
	return new ZodPipe({
		type: "pipe",
		in: in_,
		out
	});
}
var ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
	$ZodReadonly.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
	return new ZodReadonly({
		type: "readonly",
		innerType
	});
}
var ZodLazy = /*@__PURE__*/ $constructor("ZodLazy", (inst, def) => {
	$ZodLazy.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => lazyProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
	return new ZodLazy({
		type: "lazy",
		getter
	});
}
var ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
	$ZodCustom.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
	return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
	return /* @__PURE__ */ _superRefine(fn, params);
}
//#endregion
//#region node_modules/.pnpm/@json-render+core@0.21.1_zod@4.6.7/node_modules/@json-render/core/dist/chunk-JTLE2OL5.mjs
var DynamicValueSchema = union([
	string(),
	number(),
	boolean(),
	_null(),
	object({ $state: string() })
]);
union([string(), object({ $state: string() })]);
union([number(), object({ $state: string() })]);
union([boolean(), object({ $state: string() })]);
function unescapeJsonPointer(token) {
	return token.replace(/~1/g, "/").replace(/~0/g, "~");
}
function parseJsonPointer(path) {
	return (path.startsWith("/") ? path.slice(1).split("/") : path.split("/")).map(unescapeJsonPointer);
}
function getByPath(obj, path) {
	if (!path || path === "/") return obj;
	const segments = parseJsonPointer(path);
	let current = obj;
	for (const segment of segments) {
		if (current === null || current === void 0) return;
		if (Array.isArray(current)) current = current[parseInt(segment, 10)];
		else if (typeof current === "object") current = current[segment];
		else return;
	}
	return current;
}
function resolveRepeatStatePath(statePath, repeatBasePath) {
	if (typeof statePath === "string") return statePath;
	if (repeatBasePath == null) return;
	if (statePath.$item === "" || statePath.$item === "/") return repeatBasePath;
	return joinStatePath(repeatBasePath, statePath.$item);
}
function resolveRepeatItemStatePath(statePath, index) {
	return joinStatePath(statePath, String(index));
}
function joinStatePath(basePath, childPath) {
	const child = childPath.startsWith("/") ? childPath.slice(1) : childPath;
	if (basePath === "" || basePath === "/") return `/${child}`;
	return `${basePath}/${child}`;
}
function isNumericIndex(str) {
	return /^\d+$/.test(str);
}
function setByPath(obj, path, value) {
	const segments = parseJsonPointer(path);
	if (segments.length === 0) return;
	let current = obj;
	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i];
		const nextSegment = segments[i + 1];
		const nextIsNumeric = nextSegment !== void 0 && (isNumericIndex(nextSegment) || nextSegment === "-");
		if (Array.isArray(current)) {
			const index = parseInt(segment, 10);
			if (current[index] === void 0 || typeof current[index] !== "object") current[index] = nextIsNumeric ? [] : {};
			current = current[index];
		} else {
			if (!(segment in current) || typeof current[segment] !== "object") current[segment] = nextIsNumeric ? [] : {};
			current = current[segment];
		}
	}
	const lastSegment = segments[segments.length - 1];
	if (Array.isArray(current)) {
		if (lastSegment === "-") current.push(value);
		else {
			const index = parseInt(lastSegment, 10);
			current[index] = value;
		}
	} else current[lastSegment] = value;
}
function addByPath(obj, path, value) {
	const segments = parseJsonPointer(path);
	if (segments.length === 0) return;
	let current = obj;
	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i];
		const nextSegment = segments[i + 1];
		const nextIsNumeric = nextSegment !== void 0 && (isNumericIndex(nextSegment) || nextSegment === "-");
		if (Array.isArray(current)) {
			const index = parseInt(segment, 10);
			if (current[index] === void 0 || typeof current[index] !== "object") current[index] = nextIsNumeric ? [] : {};
			current = current[index];
		} else {
			if (!(segment in current) || typeof current[segment] !== "object") current[segment] = nextIsNumeric ? [] : {};
			current = current[segment];
		}
	}
	const lastSegment = segments[segments.length - 1];
	if (Array.isArray(current)) {
		if (lastSegment === "-") current.push(value);
		else {
			const index = parseInt(lastSegment, 10);
			current.splice(index, 0, value);
		}
	} else current[lastSegment] = value;
}
function removeByPath(obj, path) {
	const segments = parseJsonPointer(path);
	if (segments.length === 0) return;
	let current = obj;
	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i];
		if (Array.isArray(current)) {
			const index = parseInt(segment, 10);
			if (current[index] === void 0 || typeof current[index] !== "object") return;
			current = current[index];
		} else {
			if (!(segment in current) || typeof current[segment] !== "object") return;
			current = current[segment];
		}
	}
	const lastSegment = segments[segments.length - 1];
	if (Array.isArray(current)) {
		const index = parseInt(lastSegment, 10);
		if (index >= 0 && index < current.length) current.splice(index, 1);
	} else delete current[lastSegment];
}
function deepEqual(a, b) {
	if (a === b) return true;
	if (a === null || b === null) return false;
	if (typeof a !== typeof b) return false;
	if (typeof a !== "object") return false;
	if (Array.isArray(a)) {
		if (!Array.isArray(b)) return false;
		if (a.length !== b.length) return false;
		return a.every((item, i) => deepEqual(item, b[i]));
	}
	const aObj = a;
	const bObj = b;
	const aKeys = Object.keys(aObj);
	const bKeys = Object.keys(bObj);
	if (aKeys.length !== bKeys.length) return false;
	return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}
function parseSpecStreamLine(line) {
	const trimmed = line.trim();
	if (!trimmed || !trimmed.startsWith("{")) return null;
	try {
		const patch = JSON.parse(trimmed);
		if (patch.op && patch.path !== void 0) return patch;
		return null;
	} catch {
		return null;
	}
}
function applySpecStreamPatch(obj, patch) {
	switch (patch.op) {
		case "add":
			addByPath(obj, patch.path, patch.value);
			break;
		case "replace":
			setByPath(obj, patch.path, patch.value);
			break;
		case "remove":
			removeByPath(obj, patch.path);
			break;
		case "move": {
			if (!patch.from) break;
			const moveValue = getByPath(obj, patch.from);
			removeByPath(obj, patch.from);
			addByPath(obj, patch.path, moveValue);
			break;
		}
		case "copy": {
			if (!patch.from) break;
			const copyValue = getByPath(obj, patch.from);
			addByPath(obj, patch.path, copyValue);
			break;
		}
		case "test": if (!deepEqual(getByPath(obj, patch.path), patch.value)) throw new Error(`Test operation failed: value at "${patch.path}" does not match`);
	}
	return obj;
}
function compileSpecStream(stream, initial = {}) {
	const lines = stream.split("\n");
	const result = { ...initial };
	for (const line of lines) {
		const patch = parseSpecStreamLine(line);
		if (patch) applySpecStreamPatch(result, patch);
	}
	return result;
}
//#endregion
//#region node_modules/.pnpm/@json-render+core@0.21.1_zod@4.6.7/node_modules/@json-render/core/dist/index.mjs
var numericOrStateRef = union([number(), object({ $state: string() })]);
var comparisonOps = {
	eq: unknown().optional(),
	neq: unknown().optional(),
	gt: numericOrStateRef.optional(),
	gte: numericOrStateRef.optional(),
	lt: numericOrStateRef.optional(),
	lte: numericOrStateRef.optional(),
	not: literal(true).optional()
};
var SingleConditionSchema = union([
	object({
		$state: string(),
		...comparisonOps
	}),
	object({
		$item: string(),
		...comparisonOps
	}),
	object({
		$index: literal(true),
		...comparisonOps
	})
]);
var VisibilityConditionSchema = lazy(() => union([
	boolean(),
	SingleConditionSchema,
	array(SingleConditionSchema),
	object({ $and: array(VisibilityConditionSchema) }),
	object({ $or: array(VisibilityConditionSchema) })
]));
var StrictSingleConditionSchema = union([
	strictObject({
		$state: string(),
		...comparisonOps
	}),
	strictObject({
		$item: string(),
		...comparisonOps
	}),
	strictObject({
		$index: literal(true),
		...comparisonOps
	})
]);
var VisibilityConditionStrictSchema = lazy(() => union([
	boolean(),
	StrictSingleConditionSchema,
	array(StrictSingleConditionSchema),
	strictObject({ $and: array(VisibilityConditionStrictSchema) }),
	strictObject({ $or: array(VisibilityConditionStrictSchema) })
]));
var ActionConfirmSchema = object({
	title: string(),
	message: string(),
	confirmLabel: string().optional(),
	cancelLabel: string().optional(),
	variant: _enum(["default", "danger"]).optional()
});
var ActionOnSuccessSchema = union([
	object({ navigate: string() }),
	object({ set: record(string(), unknown()) }),
	object({
		action: string(),
		params: record(string(), DynamicValueSchema).optional()
	})
]);
var ActionOnErrorSchema = union([object({ set: record(string(), unknown()) }), object({
	action: string(),
	params: record(string(), DynamicValueSchema).optional()
})]);
var ActionBindingSchema = object({
	action: string(),
	params: record(string(), DynamicValueSchema).optional(),
	confirm: ActionConfirmSchema.optional(),
	onSuccess: ActionOnSuccessSchema.optional(),
	onError: ActionOnErrorSchema.optional(),
	preventDefault: boolean().optional()
});
object({
	checks: array(object({
		type: string(),
		args: record(string(), DynamicValueSchema).optional(),
		message: string()
	})).optional(),
	validateOn: _enum([
		"change",
		"blur",
		"submit"
	]).optional(),
	enabled: VisibilityConditionSchema.optional()
});
function validateSpec(spec, options = {}) {
	const { checkOrphans = false } = options;
	const issues = [];
	if (!spec.root) {
		issues.push({
			severity: "error",
			message: "Spec has no root element defined.",
			code: "missing_root"
		});
		return {
			valid: false,
			issues
		};
	}
	if (!spec.elements[spec.root]) issues.push({
		severity: "error",
		message: `Root element "${spec.root}" not found in elements map.`,
		code: "root_not_found"
	});
	if (Object.keys(spec.elements).length === 0) {
		issues.push({
			severity: "error",
			message: "Spec has no elements.",
			code: "empty_spec"
		});
		return {
			valid: false,
			issues
		};
	}
	for (const [key, element] of Object.entries(spec.elements)) {
		if (element.children) {
			for (const childKey of element.children) if (!spec.elements[childKey]) issues.push({
				severity: "error",
				message: `Element "${key}" references child "${childKey}" which does not exist in the elements map.`,
				elementKey: key,
				code: "missing_child"
			});
		}
		if (element.slots) {
			for (const [slotName, childKeys] of Object.entries(element.slots)) for (const childKey of childKeys) if (!spec.elements[childKey]) issues.push({
				severity: "error",
				message: `Element "${key}" references child "${childKey}" in slot "${slotName}" which does not exist in the elements map.`,
				elementKey: key,
				code: "missing_child"
			});
		}
		if (element.repeat !== void 0) {
			if (!element.children || element.children.length === 0) issues.push({
				severity: "error",
				message: `Element "${key}" has "repeat" but no children. The repeated template must be a child element: add a child that renders one item (it may read fields with {"$item": "field"}).`,
				elementKey: key,
				code: "repeat_without_children"
			});
		}
		if (element.visible !== void 0 && !VisibilityConditionStrictSchema.safeParse(element.visible).success) issues.push({
			severity: "error",
			message: `Element "${key}" has an invalid "visible" condition: ${JSON.stringify(element.visible)}. Valid forms: true, false, {"$state":"/path","eq":value}, {"$item":"field","eq":value}, {"$index":true,"eq":n}, an array of those (AND), or {"$and":[...]} / {"$or":[...]}. Use exactly one of $state, $item, or $index per condition object.`,
			elementKey: key,
			code: "invalid_visible"
		});
		const props = element.props;
		if (props && "visible" in props && props.visible !== void 0) issues.push({
			severity: "error",
			message: `Element "${key}" has "visible" inside "props". It should be a top-level field on the element (sibling of type/props/children).`,
			elementKey: key,
			code: "visible_in_props"
		});
		if (props && "on" in props && props.on !== void 0) issues.push({
			severity: "error",
			message: `Element "${key}" has "on" inside "props". It should be a top-level field on the element (sibling of type/props/children).`,
			elementKey: key,
			code: "on_in_props"
		});
		if (props && "repeat" in props && props.repeat !== void 0) issues.push({
			severity: "error",
			message: `Element "${key}" has "repeat" inside "props". It should be a top-level field on the element (sibling of type/props/children).`,
			elementKey: key,
			code: "repeat_in_props"
		});
		if (props && "watch" in props && props.watch !== void 0) issues.push({
			severity: "error",
			message: `Element "${key}" has "watch" inside "props". It should be a top-level field on the element (sibling of type/props/children).`,
			elementKey: key,
			code: "watch_in_props"
		});
	}
	const repeatValidatedKeys = /* @__PURE__ */ new Set();
	const repeatValidatedContexts = /* @__PURE__ */ new Set();
	const validateRepeatPaths = (key, repeatBasePath, sampleAvailable, ancestors) => {
		if (ancestors.has(key)) return;
		const element = spec.elements[key];
		if (!element) return;
		repeatValidatedKeys.add(key);
		const contextKey = `${key}\0${repeatBasePath ?? ""}\0${sampleAvailable}`;
		if (repeatValidatedContexts.has(contextKey)) return;
		repeatValidatedContexts.add(contextKey);
		let childRepeatBasePath = repeatBasePath;
		let childSampleAvailable = sampleAvailable;
		if (element.repeat !== void 0) {
			const statePath = resolveRepeatStatePath(element.repeat.statePath, repeatBasePath);
			const displayPath = typeof element.repeat.statePath === "string" ? element.repeat.statePath : JSON.stringify(element.repeat.statePath);
			if (statePath === void 0) {
				issues.push({
					severity: "error",
					message: `Element "${key}" uses relative repeat statePath ${displayPath} outside a repeat scope.`,
					elementKey: key,
					code: "repeat_item_outside_scope"
				});
				childRepeatBasePath = void 0;
				childSampleAvailable = false;
			} else {
				const canCheckSample = spec.state !== void 0 && (typeof element.repeat.statePath === "string" || sampleAvailable);
				const value = canCheckSample ? getByPath(spec.state, statePath) : void 0;
				if (canCheckSample && !Array.isArray(value)) issues.push({
					severity: "error",
					message: `Element "${key}" repeats over "${statePath}" but state${value === void 0 ? " has no value there" : ` has a ${typeof value} there`}. Repeat statePath must reference an array in state; add sample items to state at that path.`,
					elementKey: key,
					code: "repeat_state_mismatch"
				});
				childRepeatBasePath = resolveRepeatItemStatePath(statePath, 0);
				childSampleAvailable = canCheckSample && Array.isArray(value) && value.length > 0;
			}
		}
		const nextAncestors = new Set(ancestors);
		nextAncestors.add(key);
		for (const childKey of element.children ?? []) validateRepeatPaths(childKey, childRepeatBasePath, childSampleAvailable, nextAncestors);
		for (const childKeys of Object.values(element.slots ?? {})) for (const childKey of childKeys) validateRepeatPaths(childKey, repeatBasePath, sampleAvailable, nextAncestors);
	};
	if (spec.elements[spec.root]) validateRepeatPaths(spec.root, void 0, true, /* @__PURE__ */ new Set());
	for (const key of Object.keys(spec.elements)) if (!repeatValidatedKeys.has(key)) validateRepeatPaths(key, void 0, true, /* @__PURE__ */ new Set());
	if (checkOrphans) {
		const reachable = /* @__PURE__ */ new Set();
		const walk = (key) => {
			if (reachable.has(key)) return;
			reachable.add(key);
			const el = spec.elements[key];
			if (el?.children) {
				for (const childKey of el.children) if (spec.elements[childKey]) walk(childKey);
			}
			if (el?.slots) {
				for (const childKeys of Object.values(el.slots)) for (const childKey of childKeys) if (spec.elements[childKey]) walk(childKey);
			}
		};
		if (spec.elements[spec.root]) walk(spec.root);
		for (const key of Object.keys(spec.elements)) if (!reachable.has(key)) issues.push({
			severity: "warning",
			message: `Element "${key}" is not reachable from root "${spec.root}".`,
			elementKey: key,
			code: "orphaned_element"
		});
	}
	return {
		valid: !issues.some((i) => i.severity === "error"),
		issues
	};
}
var DEFAULT_MODES = ["patch"];
function normalizeModes(config) {
	if (!config?.modes?.length) return DEFAULT_MODES;
	return config.modes;
}
function jsonPatchInstructions() {
	return [
		"PATCH MODE (RFC 6902 JSON Patch):",
		"Output one JSON object per line. Each line is a patch operation.",
		"- Add: {\"op\":\"add\",\"path\":\"/elements/new-key\",\"value\":{...}}",
		"- Replace: {\"op\":\"replace\",\"path\":\"/elements/existing-key\",\"value\":{...}}",
		"- Remove: {\"op\":\"remove\",\"path\":\"/elements/old-key\"}",
		"Only output patches for what needs to change."
	].join("\n");
}
function jsonMergeInstructions() {
	return [
		"MERGE MODE (RFC 7396 JSON Merge Patch):",
		"Output a single JSON object on one line with __json_edit set to true.",
		"Include only the keys that changed. Unmentioned keys are preserved.",
		"Set a key to null to delete it.",
		"",
		"Example (update a title and add an element):",
		"{\"__json_edit\":true,\"elements\":{\"main\":{\"props\":{\"title\":\"New Title\"}},\"new-el\":{\"type\":\"Card\",\"props\":{},\"children\":[]}}}",
		"",
		"Example (delete an element):",
		"{\"__json_edit\":true,\"elements\":{\"old-widget\":null}}"
	].join("\n");
}
function jsonDiffInstructions() {
	return [
		"DIFF MODE (unified diff):",
		"Output a unified diff inside a ```diff code fence.",
		"The diff applies against the JSON-serialized current spec.",
		"",
		"Example:",
		"```diff",
		"--- a/spec.json",
		"+++ b/spec.json",
		"@@ -3,1 +3,1 @@",
		"-      \"title\": \"Login\"",
		"+      \"title\": \"Welcome Back\"",
		"```"
	].join("\n");
}
function yamlPatchInstructions() {
	return [
		"PATCH MODE (RFC 6902 JSON Patch):",
		"Output RFC 6902 JSON Patch lines inside a ```yaml-patch code fence.",
		"Each line is one JSON patch operation.",
		"",
		"Example:",
		"```yaml-patch",
		"{\"op\":\"replace\",\"path\":\"/elements/main/props/title\",\"value\":\"New Title\"}",
		"{\"op\":\"add\",\"path\":\"/elements/new-el\",\"value\":{\"type\":\"Card\",\"props\":{},\"children\":[]}}",
		"```"
	].join("\n");
}
function yamlMergeInstructions() {
	return [
		"MERGE MODE (RFC 7396 JSON Merge Patch):",
		"Output only the changed parts in a ```yaml-edit code fence.",
		"Uses deep merge semantics: only keys you include are updated. Unmentioned elements and props are preserved.",
		"Set a key to null to delete it.",
		"",
		"Example edit (update title, add a new element):",
		"```yaml-edit",
		"elements:",
		"  main:",
		"    props:",
		"      title: Updated Title",
		"  new-chart:",
		"    type: Card",
		"    props: {}",
		"    children: []",
		"```",
		"",
		"Example deletion:",
		"```yaml-edit",
		"elements:",
		"  old-widget: null",
		"```"
	].join("\n");
}
function yamlDiffInstructions() {
	return [
		"DIFF MODE (unified diff):",
		"Output a unified diff inside a ```diff code fence.",
		"The diff applies against the YAML-serialized current spec.",
		"",
		"Example:",
		"```diff",
		"--- a/spec.yaml",
		"+++ b/spec.yaml",
		"@@ -6,1 +6,1 @@",
		"-      title: Login",
		"+      title: Welcome Back",
		"```"
	].join("\n");
}
function modeSelectionGuidance(modes) {
	if (modes.length === 1) return "";
	const parts = ["Choose the best edit strategy for the requested change:"];
	if (modes.includes("patch")) parts.push("- PATCH: best for precise, targeted single-field updates");
	if (modes.includes("merge")) parts.push("- MERGE: best for structural changes (add/remove elements, reparent children, update multiple props at once)");
	if (modes.includes("diff")) parts.push("- DIFF: best for small text-level changes when you can see the exact lines to change");
	return parts.join("\n");
}
function buildEditInstructions(config, format) {
	const modes = normalizeModes(config);
	const sections = [];
	sections.push("EDITING EXISTING SPECS:");
	sections.push("");
	const guidance = modeSelectionGuidance(modes);
	if (guidance) {
		sections.push(guidance);
		sections.push("");
	}
	for (const mode of modes) {
		if (format === "json") switch (mode) {
			case "patch":
				sections.push(jsonPatchInstructions());
				break;
			case "merge":
				sections.push(jsonMergeInstructions());
				break;
			case "diff": sections.push(jsonDiffInstructions());
		}
		else switch (mode) {
			case "patch":
				sections.push(yamlPatchInstructions());
				break;
			case "merge":
				sections.push(yamlMergeInstructions());
				break;
			case "diff": sections.push(yamlDiffInstructions());
		}
		sections.push("");
	}
	return sections.join("\n");
}
function createBuilder() {
	return {
		string: () => ({ kind: "string" }),
		number: () => ({ kind: "number" }),
		boolean: () => ({ kind: "boolean" }),
		array: (item) => ({
			kind: "array",
			inner: item
		}),
		object: (shape) => ({
			kind: "object",
			inner: shape
		}),
		record: (value) => ({
			kind: "record",
			inner: value
		}),
		any: () => ({ kind: "any" }),
		zod: () => ({ kind: "zod" }),
		ref: (path) => ({
			kind: "ref",
			inner: path
		}),
		propsOf: (path) => ({
			kind: "propsOf",
			inner: path
		}),
		map: (entryShape) => ({
			kind: "map",
			inner: entryShape
		}),
		optional: () => ({ optional: true })
	};
}
function defineSchema(builder, options) {
	return {
		definition: builder(createBuilder()),
		promptTemplate: options?.promptTemplate,
		defaultRules: options?.defaultRules,
		builtInActions: options?.builtInActions,
		createCatalog(catalog) {
			return createCatalogFromSchema(this, catalog);
		}
	};
}
function createCatalogFromSchema(schema, catalogData) {
	const components = catalogData.components;
	const actions = catalogData.actions;
	const componentNames = components ? Object.keys(components) : [];
	const actionNames = actions ? Object.keys(actions) : [];
	const zodSchema = buildZodSchemaFromDefinition(schema.definition, catalogData);
	return {
		schema,
		data: catalogData,
		componentNames,
		actionNames,
		prompt(options = {}) {
			return generatePrompt(this, options);
		},
		jsonSchema(options = {}) {
			return zodToJsonSchema(zodSchema, options.strict ?? false);
		},
		validate(spec) {
			const result = zodSchema.safeParse(spec);
			if (result.success) return {
				success: true,
				data: result.data
			};
			return {
				success: false,
				error: result.error
			};
		},
		zodSchema() {
			return zodSchema;
		},
		get _specType() {
			throw new Error("_specType is only for type inference");
		}
	};
}
function buildZodSchemaFromDefinition(definition, catalogData) {
	return buildZodType(definition.spec, catalogData);
}
function buildZodType(schemaType, catalogData) {
	switch (schemaType.kind) {
		case "string": return string();
		case "number": return number();
		case "boolean": return boolean();
		case "any": return any();
		case "array": return array(buildZodType(schemaType.inner, catalogData));
		case "object": {
			const shape = schemaType.inner;
			const zodShape = {};
			for (const [key, value] of Object.entries(shape)) {
				let zodType = buildZodType(value, catalogData);
				if (value.optional) zodType = zodType.optional();
				zodShape[key] = zodType;
			}
			return object(zodShape);
		}
		case "record": {
			const inner = buildZodType(schemaType.inner, catalogData);
			return record(string(), inner);
		}
		case "ref": {
			const path = schemaType.inner;
			const keys = getKeysFromPath(path, catalogData);
			if (keys.length === 0) return string();
			if (keys.length === 1) return literal(keys[0]);
			return _enum(keys);
		}
		case "propsOf": {
			const path = schemaType.inner;
			const propsSchemas = getPropsFromPath(path, catalogData);
			if (propsSchemas.length === 0) return record(string(), unknown());
			if (propsSchemas.length === 1) return propsSchemas[0];
			return record(string(), unknown());
		}
		default: return unknown();
	}
}
function getKeysFromPath(path, catalogData) {
	const parts = path.split(".");
	let current = { catalog: catalogData };
	for (const part of parts) if (current && typeof current === "object") current = current[part];
	else return [];
	if (current && typeof current === "object") return Object.keys(current);
	return [];
}
function getPropsFromPath(path, catalogData) {
	const parts = path.split(".");
	let current = { catalog: catalogData };
	for (const part of parts) if (current && typeof current === "object") current = current[part];
	else return [];
	if (current && typeof current === "object") return Object.values(current).map((entry) => entry.props).filter((props) => props !== void 0);
	return [];
}
function generatePrompt(catalog, options) {
	if (catalog.schema.promptTemplate) {
		const context = {
			catalog: catalog.data,
			componentNames: catalog.componentNames,
			actionNames: catalog.actionNames,
			options,
			formatZodType
		};
		return catalog.schema.promptTemplate(context);
	}
	const { system = "You are a UI generator that outputs JSON.", customRules = [], mode: rawMode = "standalone" } = options;
	const mode = rawMode === "chat" ? (console.warn("[json-render] mode \"chat\" is deprecated, use \"inline\" instead"), "inline") : rawMode === "generate" ? (console.warn("[json-render] mode \"generate\" is deprecated, use \"standalone\" instead"), "standalone") : rawMode;
	const lines = [];
	lines.push(system);
	lines.push("");
	if (mode === "inline") {
		lines.push("OUTPUT FORMAT (text + JSONL, RFC 6902 JSON Patch):");
		lines.push("You respond conversationally. When generating UI, first write a brief explanation (1-3 sentences), then output JSONL patch lines wrapped in a ```spec code fence.");
		lines.push("The JSONL lines use RFC 6902 JSON Patch operations to build a UI tree. Always wrap them in a ```spec fence block:");
		lines.push("  ```spec");
		lines.push("  {\"op\":\"add\",\"path\":\"/root\",\"value\":\"main\"}");
		lines.push("  {\"op\":\"add\",\"path\":\"/elements/main\",\"value\":{\"type\":\"Card\",\"props\":{\"title\":\"Hello\"},\"children\":[]}}");
		lines.push("  ```");
		lines.push("If the user's message does not require a UI (e.g. a greeting or clarifying question), respond with text only — no JSONL.");
	} else {
		lines.push("OUTPUT FORMAT (JSONL, RFC 6902 JSON Patch):");
		lines.push("Output JSONL (one JSON object per line) using RFC 6902 JSON Patch operations to build a UI tree.");
	}
	lines.push("Each line is a JSON patch operation (add, remove, replace). Start with /root, then stream /elements and /state patches interleaved so the UI fills in progressively as it streams.");
	lines.push("");
	lines.push("Example output (each line is a separate JSON object):");
	lines.push("");
	const allComponents = catalog.data.components;
	const specDefinition = catalog.schema.definition.spec;
	const elementsDefinition = (specDefinition.kind === "object" ? specDefinition.inner : void 0)?.elements;
	const elementDefinition = elementsDefinition?.kind === "record" ? elementsDefinition.inner : void 0;
	const supportsNamedSlots = (elementDefinition?.kind === "object" ? elementDefinition.inner : void 0)?.slots !== void 0;
	const cn = catalog.componentNames;
	const comp1 = cn[0] || "Component";
	const comp2 = cn.length > 1 ? cn[1] : comp1;
	const comp1Def = allComponents?.[comp1];
	const comp2Def = allComponents?.[comp2];
	const comp1Props = comp1Def ? getExampleProps(comp1Def) : {};
	const comp2Props = comp2Def ? getExampleProps(comp2Def) : {};
	const dynamicPropName = comp2Def?.props ? findFirstStringProp(comp2Def.props) : null;
	const dynamicProps = dynamicPropName ? {
		...comp2Props,
		[dynamicPropName]: { $item: "title" }
	} : comp2Props;
	const exampleOutput = [
		JSON.stringify({
			op: "add",
			path: "/root",
			value: "main"
		}),
		JSON.stringify({
			op: "add",
			path: "/elements/main",
			value: {
				type: comp1,
				props: comp1Props,
				children: ["child-1", "list"]
			}
		}),
		JSON.stringify({
			op: "add",
			path: "/elements/child-1",
			value: {
				type: comp2,
				props: comp2Props,
				children: []
			}
		}),
		JSON.stringify({
			op: "add",
			path: "/elements/list",
			value: {
				type: comp1,
				props: comp1Props,
				repeat: {
					statePath: "/items",
					key: "id"
				},
				children: ["item"]
			}
		}),
		JSON.stringify({
			op: "add",
			path: "/elements/item",
			value: {
				type: comp2,
				props: dynamicProps,
				children: []
			}
		}),
		JSON.stringify({
			op: "add",
			path: "/state/items",
			value: []
		}),
		JSON.stringify({
			op: "add",
			path: "/state/items/0",
			value: {
				id: "1",
				title: "First Item"
			}
		}),
		JSON.stringify({
			op: "add",
			path: "/state/items/1",
			value: {
				id: "2",
				title: "Second Item"
			}
		})
	].join("\n");
	lines.push(`${exampleOutput}

Note: state patches appear right after the elements that use them, so the UI fills in as it streams. ONLY use component types from the AVAILABLE COMPONENTS list below.`);
	lines.push("");
	lines.push("INITIAL STATE:");
	lines.push("Specs include a /state field to seed the state model. Components with { $bindState } or { $bindItem } read from and write to this state, and $state expressions read from it.");
	lines.push("CRITICAL: You MUST include state patches whenever your UI displays data via $state, $bindState, $bindItem, $item, or $index expressions, or uses repeat to iterate over arrays. Without state, these references resolve to nothing and repeat lists render zero items.");
	lines.push("Output state patches right after the elements that reference them, so the UI fills in progressively as it streams.");
	lines.push("Stream state progressively - output one patch per array item instead of one giant blob:");
	lines.push("  For arrays: {\"op\":\"add\",\"path\":\"/state/posts/0\",\"value\":{\"id\":\"1\",\"title\":\"First Post\",...}} then /state/posts/1, /state/posts/2, etc.");
	lines.push("  For scalars: {\"op\":\"add\",\"path\":\"/state/newTodoText\",\"value\":\"\"}");
	lines.push("  Initialize the array first if needed: {\"op\":\"add\",\"path\":\"/state/posts\",\"value\":[]}");
	lines.push("When content comes from the state model, use { \"$state\": \"/some/path\" } dynamic props to display it instead of hardcoding the same value in both state and props. The state model is the single source of truth.");
	lines.push("Include realistic sample data in state. For blogs: 3-4 posts with titles, excerpts, authors, dates. For product lists: 3-5 items with names, prices, descriptions. Never leave arrays empty.");
	lines.push("");
	lines.push("DYNAMIC LISTS (repeat field):");
	lines.push("Any element can have a top-level \"repeat\" field to render its children once per item in a state array: { \"repeat\": { \"statePath\": \"/arrayPath\", \"key\": \"id\" } }.");
	lines.push("The element itself renders once (as the container), and its children are expanded once per array item. \"statePath\" is the state array path. \"key\" is an optional field name on each item for stable React keys.");
	lines.push("For nested lists, an inner repeat can read an array from the enclosing item with { \"statePath\": { \"$item\": \"field\" } }. This form is valid only inside another repeat. Use an empty field to repeat over the enclosing item itself.");
	lines.push(`Example: ${JSON.stringify({
		type: comp1,
		props: comp1Props,
		repeat: {
			statePath: "/todos",
			key: "id"
		},
		children: ["todo-item"]
	})}`);
	lines.push("Inside children of a repeated element, use { \"$item\": \"field\" } to read a field from the current item, and { \"$index\": true } to get the current array index. For two-way binding to an item field use { \"$bindItem\": \"completed\" } on the appropriate prop.");
	lines.push("ALWAYS use the repeat field for lists backed by state arrays. NEVER hardcode individual elements for each array item.");
	lines.push("IMPORTANT: \"repeat\" is a top-level field on the element (sibling of type/props/children), NOT inside props.");
	lines.push("");
	lines.push("ARRAY STATE ACTIONS:");
	lines.push("Use action \"pushState\" to append items to arrays. Params: { statePath: \"/arrayPath\", value: { ...item }, clearStatePath: \"/inputPath\" }.");
	lines.push("Values inside pushState can contain { \"$state\": \"/statePath\" } references to read current state (e.g. the text from an input field).");
	lines.push("Use \"$id\" inside a pushState value to auto-generate a unique ID.");
	lines.push("Example: on: { \"press\": { \"action\": \"pushState\", \"params\": { \"statePath\": \"/todos\", \"value\": { \"id\": \"$id\", \"title\": { \"$state\": \"/newTodoText\" }, \"completed\": false }, \"clearStatePath\": \"/newTodoText\" } } }");
	lines.push(`Use action "removeState" to remove items from arrays by index. Params: { statePath: "/arrayPath", index: N }. Inside a repeated element's children, use { "$index": true } for the current item index. Action params support the same expressions as props: { "$item": "field" } resolves to the absolute state path, { "$index": true } resolves to the index number, and { "$state": "/path" } reads a value from state.`);
	lines.push("For lists where users can add/remove items (todos, carts, etc.), use pushState and removeState instead of hardcoding with setState.");
	lines.push("");
	lines.push("IMPORTANT: State paths use RFC 6901 JSON Pointer syntax (e.g. \"/todos/0/title\"). Do NOT use JavaScript-style dot notation (e.g. \"/todos.length\" is WRONG). To generate unique IDs for new items, use \"$id\" instead of trying to read array length.");
	lines.push("");
	const components = allComponents;
	if (components) {
		lines.push(`AVAILABLE COMPONENTS (${catalog.componentNames.length}):`);
		lines.push("");
		for (const [name, def] of Object.entries(components)) {
			const propsStr = def.props ? formatZodType(def.props) : "{}";
			const slotNames = def.slots ?? [];
			const namedSlotNames = slotNames.filter((slot) => slot !== "default");
			const acceptsChildren = slotNames.includes("default");
			const slotsStr = supportsNamedSlots ? [acceptsChildren ? "accepts children" : "", namedSlotNames.length > 0 ? `slots: ${namedSlotNames.join(", ")}` : ""].filter(Boolean).join("; ") : slotNames.length > 0 ? "accepts children" : "";
			const slotsSuffix = slotsStr ? ` [${slotsStr}]` : "";
			const eventsStr = def.events && def.events.length > 0 ? ` [events: ${def.events.join(", ")}]` : "";
			const descStr = def.description ? ` - ${def.description}` : "";
			lines.push(`- ${name}: ${propsStr}${descStr}${slotsSuffix}${eventsStr}`);
		}
		lines.push("");
	}
	const actions = catalog.data.actions;
	const builtInActions = catalog.schema.builtInActions ?? [];
	const hasCustomActions = actions && catalog.actionNames.length > 0;
	const hasBuiltInActions = builtInActions.length > 0;
	if (hasCustomActions || hasBuiltInActions) {
		lines.push("AVAILABLE ACTIONS:");
		lines.push("");
		for (const action2 of builtInActions) lines.push(`- ${action2.name}: ${action2.description} [built-in]`);
		if (hasCustomActions) for (const [name, def] of Object.entries(actions)) lines.push(`- ${name}${def.description ? `: ${def.description}` : ""}`);
		lines.push("");
	}
	lines.push("EVENTS (the `on` field):");
	lines.push("Elements can have an optional `on` field to bind events to actions. The `on` field is a top-level field on the element (sibling of type/props/children), NOT inside props.");
	lines.push("Each key in `on` is an event name (from the component's supported events), and the value is an action binding: `{ \"action\": \"<actionName>\", \"params\": { ... } }`.");
	lines.push("");
	lines.push("Example:");
	lines.push(`  ${JSON.stringify({
		type: comp1,
		props: comp1Props,
		on: { press: {
			action: "setState",
			params: {
				statePath: "/saved",
				value: true
			}
		} },
		children: []
	})}`);
	lines.push("");
	lines.push("Action params can use dynamic references to read from state: { \"$state\": \"/statePath\" }.");
	lines.push("IMPORTANT: Do NOT put action/actionParams inside props. Always use the `on` field for event bindings.");
	lines.push("");
	lines.push("VISIBILITY CONDITIONS:");
	lines.push("Elements can have an optional `visible` field to conditionally show/hide based on state. IMPORTANT: `visible` is a top-level field on the element object (sibling of type/props/children), NOT inside props.");
	lines.push(`Correct: ${JSON.stringify({
		type: comp1,
		props: comp1Props,
		visible: {
			$state: "/activeTab",
			eq: "home"
		},
		children: ["..."]
	})}`);
	lines.push("- `{ \"$state\": \"/path\" }` - visible when state at path is truthy");
	lines.push("- `{ \"$state\": \"/path\", \"not\": true }` - visible when state at path is falsy");
	lines.push("- `{ \"$state\": \"/path\", \"eq\": \"value\" }` - visible when state equals value");
	lines.push("- `{ \"$state\": \"/path\", \"neq\": \"value\" }` - visible when state does not equal value");
	lines.push("- `{ \"$state\": \"/path\", \"gt\": N }` / `gte` / `lt` / `lte` - numeric comparisons");
	lines.push("- Use ONE operator per condition (eq, neq, gt, gte, lt, lte). Do not combine multiple operators.");
	lines.push("- Any condition can add `\"not\": true` to invert its result");
	lines.push("- `[condition, condition]` - all conditions must be true (implicit AND)");
	lines.push("- `{ \"$and\": [condition, condition] }` - explicit AND (use when nesting inside $or)");
	lines.push("- `{ \"$or\": [condition, condition] }` - at least one must be true (OR)");
	lines.push("- `true` / `false` - always visible/hidden");
	lines.push("");
	lines.push("Use a component with on.press bound to setState to update state and drive visibility.");
	lines.push(`Example: A ${comp1} with on: { "press": { "action": "setState", "params": { "statePath": "/activeTab", "value": "home" } } } sets state, then a container with visible: { "$state": "/activeTab", "eq": "home" } shows only when that tab is active.`);
	lines.push("");
	lines.push("For tab patterns where the first/default tab should be visible when no tab is selected yet, use $or to handle both cases: visible: { \"$or\": [{ \"$state\": \"/activeTab\", \"eq\": \"home\" }, { \"$state\": \"/activeTab\", \"not\": true }] }. This ensures the first tab is visible both when explicitly selected AND when /activeTab is not yet set.");
	lines.push("");
	lines.push("DYNAMIC PROPS:");
	lines.push("Any prop value can be a dynamic expression that resolves based on state. Three forms are supported:");
	lines.push("");
	lines.push("1. Read-only state: `{ \"$state\": \"/statePath\" }` - resolves to the value at that state path (one-way read).");
	lines.push("   Example: `\"color\": { \"$state\": \"/theme/primary\" }` reads the color from state.");
	lines.push("");
	lines.push("2. Two-way binding: `{ \"$bindState\": \"/statePath\" }` - resolves to the value at the state path AND enables write-back. Use on form input props (value, checked, pressed, etc.).");
	lines.push("   Example: `\"value\": { \"$bindState\": \"/form/email\" }` binds the input value to /form/email.");
	lines.push("   Inside repeat scopes: `\"checked\": { \"$bindItem\": \"completed\" }` binds to the current item's completed field.");
	lines.push("");
	lines.push("3. Conditional: `{ \"$cond\": <condition>, \"$then\": <value>, \"$else\": <value> }` - evaluates the condition (same syntax as visibility conditions) and picks the matching value.");
	lines.push("   Example: `\"color\": { \"$cond\": { \"$state\": \"/activeTab\", \"eq\": \"home\" }, \"$then\": \"#007AFF\", \"$else\": \"#8E8E93\" }`");
	lines.push("");
	lines.push("Use $bindState for form inputs (text fields, checkboxes, selects, sliders, etc.) and $state for read-only data display. Inside repeat scopes, use $bindItem for form inputs bound to the current item. Use dynamic props instead of duplicating elements with opposing visible conditions when only prop values differ.");
	lines.push("");
	lines.push("4. Template: `{ \"$template\": \"Hello, ${/name}!\" }` - interpolates references in the string. Absolute paths like `${/path}` resolve against the state model. Bare names like `${field}` resolve against the current repeat item first, then fall back to the state model at `/<field>`.");
	lines.push("   Example: `\"label\": { \"$template\": \"Items: ${/cart/count} | Total: ${/cart/total}\" }` renders \"Items: 3 | Total: 42.00\" when /cart/count is 3 and /cart/total is 42.00. Inside a repeat, `{ \"$template\": \"${name} - ${email}\" }` reads name and email from each item.");
	lines.push("");
	const catalogFunctions = catalog.data.functions;
	if (catalogFunctions && Object.keys(catalogFunctions).length > 0) {
		lines.push("5. Computed: `{ \"$computed\": \"<functionName>\", \"args\": { \"key\": <expression> } }` - calls a registered function with resolved args and returns the result.");
		lines.push("   Example: `\"value\": { \"$computed\": \"fullName\", \"args\": { \"first\": { \"$state\": \"/form/firstName\" }, \"last\": { \"$state\": \"/form/lastName\" } } }`");
		lines.push("   Available functions:");
		for (const name of Object.keys(catalogFunctions)) lines.push(`   - ${name}`);
		lines.push("");
	}
	const directives = options.directives;
	if (directives && directives.length > 0) {
		lines.push("CUSTOM DYNAMIC VALUES:");
		lines.push("");
		for (const d of directives) {
			const desc = d.description ? ` (${d.description})` : "";
			lines.push(`- ${d.name}${desc}: ${formatZodType(d.schema)}`);
		}
		lines.push("");
		lines.push("Directives compose: any value field can contain another directive or a $state expression, resolved inside-out.");
		lines.push("");
	}
	if (allComponents ? Object.entries(allComponents).some(([, def]) => {
		if (!def.props) return false;
		return formatZodType(def.props).includes("checks");
	}) : false) {
		lines.push("VALIDATION:");
		lines.push("Form components that accept a `checks` prop support client-side validation.");
		lines.push("Each check is an object: { \"type\": \"<name>\", \"message\": \"...\", \"args\": { ... } }");
		lines.push("");
		lines.push("Built-in validation types:");
		lines.push("  - required — value must be non-empty");
		lines.push("  - email — valid email format");
		lines.push("  - minLength — minimum string length (args: { \"min\": N })");
		lines.push("  - maxLength — maximum string length (args: { \"max\": N })");
		lines.push("  - pattern — match a regex (args: { \"pattern\": \"regex\" })");
		lines.push("  - min — minimum numeric value (args: { \"min\": N })");
		lines.push("  - max — maximum numeric value (args: { \"max\": N })");
		lines.push("  - numeric — value must be a number");
		lines.push("  - url — valid URL format");
		lines.push("  - matches — must equal another field (args: { \"other\": { \"$state\": \"/path\" } })");
		lines.push("  - equalTo — alias for matches (args: { \"other\": { \"$state\": \"/path\" } })");
		lines.push("  - lessThan — value must be less than another field (args: { \"other\": { \"$state\": \"/path\" } })");
		lines.push("  - greaterThan — value must be greater than another field (args: { \"other\": { \"$state\": \"/path\" } })");
		lines.push("  - requiredIf — required only when another field is truthy (args: { \"field\": { \"$state\": \"/path\" } })");
		lines.push("");
		lines.push("Example:");
		lines.push("  \"checks\": [{ \"type\": \"required\", \"message\": \"Email is required\" }, { \"type\": \"email\", \"message\": \"Invalid email\" }]");
		lines.push("");
		lines.push("IMPORTANT: When using checks, the component must also have a { $bindState } or { $bindItem } on its value/checked prop for two-way binding.");
		lines.push("Always include validation checks on form inputs for a good user experience (e.g. required, email, minLength).");
		lines.push("");
	}
	if (hasCustomActions || hasBuiltInActions) {
		lines.push("STATE WATCHERS:");
		lines.push("Elements can have an optional `watch` field to react to state changes and trigger actions. The `watch` field is a top-level field on the element (sibling of type/props/children), NOT inside props.");
		lines.push("Maps state paths (JSON Pointers) to action bindings. When the value at a watched path changes, the bound actions fire automatically.");
		lines.push("");
		lines.push("Example (cascading select — country changes trigger city loading):");
		lines.push(`  ${JSON.stringify({
			type: "Select",
			props: {
				value: { $bindState: "/form/country" },
				options: [
					"US",
					"Canada",
					"UK"
				]
			},
			watch: { "/form/country": {
				action: "loadCities",
				params: { country: { $state: "/form/country" } }
			} },
			children: []
		})}`);
		lines.push("");
		lines.push("Use `watch` for cascading dependencies where changing one field should trigger side effects (loading data, resetting dependent fields, computing derived values).");
		lines.push("IMPORTANT: `watch` is a top-level field on the element (sibling of type/props/children), NOT inside props. Watchers only fire when the value changes, not on initial render.");
		lines.push("");
	}
	const editModes = options.editModes;
	if (editModes && editModes.length > 0) lines.push(buildEditInstructions({ modes: editModes }, "json"));
	lines.push("RULES:");
	const baseRules = mode === "inline" ? [
		"When generating UI, wrap all JSONL patches in a ```spec code fence - one JSON object per line inside the fence",
		"Write a brief conversational response before any JSONL output",
		"First set root: {\"op\":\"add\",\"path\":\"/root\",\"value\":\"<root-key>\"}",
		"Then add each element: {\"op\":\"add\",\"path\":\"/elements/<key>\",\"value\":{...}}",
		"Output /state patches right after the elements that use them, one per array item for progressive loading. REQUIRED whenever using $state, $bindState, $bindItem, $item, $index, or repeat.",
		"ONLY use components listed above",
		"Each element value needs: type, props, children (array of child keys)",
		"Use unique keys for the element map entries (e.g., 'header', 'metric-1', 'chart-revenue')"
	] : [
		"Output ONLY JSONL patches - one JSON object per line, no markdown, no code fences",
		"First set root: {\"op\":\"add\",\"path\":\"/root\",\"value\":\"<root-key>\"}",
		"Then add each element: {\"op\":\"add\",\"path\":\"/elements/<key>\",\"value\":{...}}",
		"Output /state patches right after the elements that use them, one per array item for progressive loading. REQUIRED whenever using $state, $bindState, $bindItem, $item, $index, or repeat.",
		"ONLY use components listed above",
		"Each element value needs: type, props, children (array of child keys)",
		"Use unique keys for the element map entries (e.g., 'header', 'metric-1', 'chart-revenue')"
	];
	const schemaRules = catalog.schema.defaultRules ?? [];
	[
		...baseRules,
		...schemaRules,
		...customRules
	].forEach((rule, i) => {
		lines.push(`${i + 1}. ${rule}`);
	});
	return lines.join("\n");
}
function getExampleProps(def) {
	if (def.example && Object.keys(def.example).length > 0) return def.example;
	if (def.props) return generateExamplePropsFromZod(def.props);
	return {};
}
function generateExamplePropsFromZod(schema) {
	if (!schema || !schema._def) return {};
	const def = schema._def;
	const typeName = getZodTypeName(schema);
	if (typeName !== "ZodObject" && typeName !== "object") return {};
	const shape = typeof def.shape === "function" ? def.shape() : def.shape;
	if (!shape) return {};
	const result = {};
	for (const [key, value] of Object.entries(shape)) {
		const innerTypeName = getZodTypeName(value);
		if (innerTypeName === "ZodOptional" || innerTypeName === "optional" || innerTypeName === "ZodNullable" || innerTypeName === "nullable") continue;
		result[key] = generateExampleValue(value);
	}
	return result;
}
function generateExampleValue(schema) {
	if (!schema || !schema._def) return "...";
	const def = schema._def;
	switch (getZodTypeName(schema)) {
		case "ZodString":
		case "string": return "example";
		case "ZodNumber":
		case "number": return 0;
		case "ZodBoolean":
		case "boolean": return true;
		case "ZodLiteral":
		case "literal": return def.value;
		case "ZodEnum":
		case "enum":
			if (Array.isArray(def.values) && def.values.length > 0) return def.values[0];
			if (def.entries && typeof def.entries === "object") {
				const values = Object.values(def.entries);
				return values.length > 0 ? values[0] : "example";
			}
			return "example";
		case "ZodOptional":
		case "optional":
		case "ZodNullable":
		case "nullable":
		case "ZodDefault":
		case "default": {
			const inner = def.innerType ?? def.wrapped;
			return inner ? generateExampleValue(inner) : null;
		}
		case "ZodArray":
		case "array": return [];
		case "ZodObject":
		case "object": return generateExamplePropsFromZod(schema);
		case "ZodUnion":
		case "union": {
			const options = def.options;
			return options && options.length > 0 ? generateExampleValue(options[0]) : "...";
		}
		default: return "...";
	}
}
function findFirstStringProp(schema) {
	if (!schema || !schema._def) return null;
	const def = schema._def;
	const typeName = getZodTypeName(schema);
	if (typeName !== "ZodObject" && typeName !== "object") return null;
	const shape = typeof def.shape === "function" ? def.shape() : def.shape;
	if (!shape) return null;
	for (const [key, value] of Object.entries(shape)) {
		const innerTypeName = getZodTypeName(value);
		if (innerTypeName === "ZodOptional" || innerTypeName === "optional" || innerTypeName === "ZodNullable" || innerTypeName === "nullable") continue;
		if (innerTypeName === "ZodString" || innerTypeName === "string") return key;
	}
	return null;
}
function getZodTypeName(schema) {
	if (!schema || !schema._def) return "";
	const def = schema._def;
	return def.typeName ?? def.type ?? "";
}
function formatZodType(schema) {
	if (!schema || !schema._def) return "unknown";
	const def = schema._def;
	switch (getZodTypeName(schema)) {
		case "ZodString":
		case "string": return "string";
		case "ZodNumber":
		case "number": return "number";
		case "ZodBoolean":
		case "boolean": return "boolean";
		case "ZodLiteral":
		case "literal": {
			const litValue = def.values?.[0] ?? def.value;
			return JSON.stringify(litValue);
		}
		case "ZodEnum":
		case "enum": {
			let values;
			if (Array.isArray(def.values)) values = def.values;
			else if (def.entries && typeof def.entries === "object") values = Object.values(def.entries);
			else return "enum";
			return values.map((v) => `"${v}"`).join(" | ");
		}
		case "ZodArray":
		case "array": {
			const inner = typeof def.element === "object" ? def.element : typeof def.type === "object" ? def.type : void 0;
			return inner ? `Array<${formatZodType(inner)}>` : "Array<unknown>";
		}
		case "ZodObject":
		case "object": {
			const shape = typeof def.shape === "function" ? def.shape() : def.shape;
			if (!shape) return "object";
			return `{ ${Object.entries(shape).map(([key, value]) => {
				const innerTypeName = getZodTypeName(value);
				return `${key}${innerTypeName === "ZodOptional" || innerTypeName === "ZodNullable" || innerTypeName === "optional" || innerTypeName === "nullable" ? "?" : ""}: ${formatZodType(value)}`;
			}).join(", ")} }`;
		}
		case "ZodOptional":
		case "optional":
		case "ZodNullable":
		case "nullable": {
			const inner = def.innerType ?? def.wrapped;
			return inner ? formatZodType(inner) : "unknown";
		}
		case "ZodUnion":
		case "union": {
			const options = def.options;
			return options ? options.map((opt) => formatZodType(opt)).join(" | ") : "unknown";
		}
		case "ZodRecord":
		case "record": {
			const keyType = def.keyType ?? void 0;
			const valueType = def.valueType ?? def.element ?? void 0;
			return `Record<${keyType ? formatZodType(keyType) : "string"}, ${valueType ? formatZodType(valueType) : "unknown"}>`;
		}
		case "ZodDefault":
		case "default": {
			const inner = def.innerType ?? def.wrapped;
			return inner ? formatZodType(inner) : "unknown";
		}
		default: return "unknown";
	}
}
function zodTypeName(def) {
	if (typeof def.type === "string") return def.type;
	if (typeof def.typeName === "string") return def.typeName;
	return "";
}
function normalizeTypeName(raw) {
	if (raw.startsWith("Zod")) return raw.slice(3).toLowerCase();
	return raw.toLowerCase();
}
function zodToJsonSchema(schema, strict = false) {
	const def = schema._def;
	switch (normalizeTypeName(zodTypeName(def))) {
		case "string": return { type: "string" };
		case "number": return { type: "number" };
		case "boolean": return { type: "boolean" };
		case "literal": {
			const values = def.values;
			return { const: values ? values[0] : def.value };
		}
		case "enum": {
			const entries = def.entries;
			return { enum: (entries ? Object.values(entries) : def.values) ?? [] };
		}
		case "array": {
			const inner = def.element ?? def.type;
			return {
				type: "array",
				items: inner ? zodToJsonSchema(inner, strict) : {}
			};
		}
		case "object": {
			const rawShape = def.shape;
			const shape = typeof rawShape === "function" ? rawShape() : rawShape;
			if (!shape) {
				if (strict) return {
					type: "object",
					properties: {},
					required: [],
					additionalProperties: false
				};
				return { type: "object" };
			}
			const properties = {};
			const required = [];
			for (const [key, value] of Object.entries(shape)) {
				const innerDef = value._def;
				const innerKind = normalizeTypeName(zodTypeName(innerDef));
				const isOptional = innerKind === "optional" || innerKind === "nullable";
				if (strict) {
					required.push(key);
					if (isOptional) properties[key] = { anyOf: [zodToJsonSchema(value, strict), { type: "null" }] };
					else properties[key] = zodToJsonSchema(value, strict);
				} else {
					properties[key] = zodToJsonSchema(value);
					if (!isOptional) required.push(key);
				}
			}
			return {
				type: "object",
				properties,
				required: required.length > 0 ? required : void 0,
				additionalProperties: false
			};
		}
		case "record": {
			const valueType = def.valueType;
			if (strict) return {
				type: "object",
				properties: {},
				required: [],
				additionalProperties: false
			};
			return {
				type: "object",
				additionalProperties: valueType ? zodToJsonSchema(valueType) : true
			};
		}
		case "optional":
		case "nullable": {
			const inner = def.innerType;
			return inner ? zodToJsonSchema(inner, strict) : {};
		}
		case "union": {
			const options = def.options;
			return options ? { anyOf: options.map((o) => zodToJsonSchema(o, strict)) } : {};
		}
		case "any":
		case "unknown":
			if (strict) return {
				type: "object",
				properties: {},
				required: [],
				additionalProperties: false
			};
			return {};
		default: return {};
	}
}
function defineCatalog(schema, catalog) {
	return schema.createCatalog(catalog);
}
object({
	root: string().min(1),
	elements: record(string(), object({
		type: string(),
		props: record(string(), unknown()),
		children: array(string()).optional(),
		slots: record(string(), array(string())).optional(),
		on: record(string(), unknown()).optional(),
		visible: unknown().optional()
	}).strict()),
	state: record(string(), unknown()).optional()
}).strict();
ActionBindingSchema.extend({
	params: record(string(), unknown()).optional(),
	onSuccess: unknown().optional(),
	onError: unknown().optional()
}).strict();
var probability = number().min(0).max(1);
object({
	answers: record(string(), object({
		type: literal("choice"),
		choice: string()
	})),
	providerMetadata: object({ typesafe: object({ confidence: record(string(), probability) }).optional() }).optional(),
	usage: object({ inputTokens: number().int().nonnegative().optional() }).optional()
});
//#endregion
//#region node_modules/.pnpm/@json-render+react@0.21.1_react@19.3.1_zod@4.6.7/node_modules/@json-render/react/dist/chunk-SDI5YI5X.mjs
var schema = defineSchema((s) => ({
	spec: s.object({
		/** Root element key */
		root: s.string(),
		/** Flat map of elements by key */
		elements: s.record(s.object({
			/** Component type from catalog */
			type: s.ref("catalog.components"),
			/** Component props */
			props: s.propsOf("catalog.components"),
			/** Child element keys (flat reference) */
			children: s.array(s.string()),
			slots: {
				...s.record(s.array(s.string())),
				...s.optional()
			},
			/** Visibility condition */
			visible: {
				...s.any(),
				...s.optional()
			},
			/** Repeat children from a state array */
			repeat: {
				...s.any(),
				...s.optional()
			}
		}))
	}),
	catalog: s.object({
		/** Component definitions */
		components: s.map({
			/** Zod schema for component props */
			props: s.zod(),
			/** Slots for this component. Use ['default'] for children, or named slots like ['header', 'footer'] */
			slots: s.array(s.string()),
			/** Description for AI generation hints */
			description: s.string(),
			/** Example prop values used in prompt examples (auto-generated from Zod schema if omitted) */
			example: s.any()
		}),
		/** Action definitions (optional) */
		actions: s.map({
			/** Zod schema for action params */
			params: s.zod(),
			/** Description for AI generation hints */
			description: s.string()
		})
	})
}), {
	builtInActions: [
		{
			name: "setState",
			description: "Update a value in the state model at the given statePath. Params: { statePath: string, value: any }"
		},
		{
			name: "pushState",
			description: "Append an item to an array in state. Params: { statePath: string, value: any, clearStatePath?: string }. Value can contain {\"$state\":\"/path\"} refs and \"$id\" for auto IDs."
		},
		{
			name: "removeState",
			description: "Remove an item from an array in state by index. Params: { statePath: string, index: number }"
		},
		{
			name: "validateForm",
			description: "Validate all registered form fields and write the result to state. Params: { statePath?: string }. Defaults to /formValidation. Result: { valid: boolean, errors: Record<string, string[]> }."
		}
	],
	defaultRules: [
		"CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
		"SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",
		"REQUIRED FIELDS: Every element MUST include a \"children\" array. Leaf elements (text, badges, inputs, images) use an empty array: \"children\": []. Omitting \"children\" fails validation.",
		"NAMED SLOTS: Use \"children\" for the default slot. For other slots declared by the component, use a top-level \"slots\" object that maps each slot name to child element keys, for example {\"slots\":{\"header\":[\"heading\"],\"footer\":[\"actions\"]}}. Never use \"slots.default\". Every referenced key must exist.",
		"FILTERED LISTS: To render only the items matching a field value (kanban columns, tabbed lists, status sections), put \"repeat\" and a \"visible\" condition with $item on the same container element: {\"repeat\": {\"statePath\": \"/tasks\", \"key\": \"id\"}, \"visible\": {\"$item\": \"status\", \"eq\": \"todo\"}} renders one child per matching item. A visible condition object must use exactly one of $state, $item, or $index — never combine them in one object.",
		"CRITICAL: The \"visible\" field goes on the ELEMENT object, NOT inside \"props\". Correct: {\"type\":\"<ComponentName>\",\"props\":{},\"visible\":{\"$state\":\"/tab\",\"eq\":\"home\"},\"children\":[...]}.",
		"CRITICAL: The \"on\" field goes on the ELEMENT object, NOT inside \"props\". Use on.press, on.change, on.submit etc. NEVER put action/actionParams inside props.",
		"When the user asks for a UI that displays data (e.g. blog posts, products, users), ALWAYS include a state field with realistic sample data. The state field is a top-level field on the spec (sibling of root/elements).",
		"When building repeating content backed by a state array (e.g. posts, products, items), use the \"repeat\" field on a container element. Example: { \"type\": \"<ContainerComponent>\", \"props\": {}, \"repeat\": { \"statePath\": \"/posts\", \"key\": \"id\" }, \"children\": [\"post-card\"] }. For a nested list stored on the enclosing item, use \"repeat\": { \"statePath\": { \"$item\": \"comments\" }, \"key\": \"id\" }. The $item statePath form is valid only inside another repeat. Replace <ContainerComponent> with an appropriate component from the AVAILABLE COMPONENTS list. Inside repeated children, use { \"$item\": \"field\" } to read a field from the current item, and { \"$index\": true } for the current array index. For two-way binding to an item field use { \"$bindItem\": \"completed\" }. Do NOT hardcode individual elements for each array item.",
		"Design with visual hierarchy: use container components to group content, heading components for section titles, proper spacing, and status indicators. ONLY use components from the AVAILABLE COMPONENTS list.",
		"For data-rich UIs, use multi-column layout components if available. For forms and single-column content, use vertical layout components. ONLY use components from the AVAILABLE COMPONENTS list.",
		"Always include realistic, professional-looking sample data. For blogs include 3-4 posts with varied titles, authors, dates, categories. For products include names, prices, images. Never leave data empty."
	]
});
//#endregion
//#region node_modules/.pnpm/@json-render+shadcn@0.21.1_@types+react-dom@19.3.0_@types+react@19.3.0__@types+react@19_281deae6187f532a84f90716ff3d102f/node_modules/@json-render/shadcn/dist/chunk-L37EOULD.mjs
var validationCheckSchema = array(object({
	type: string(),
	message: string(),
	args: record(string(), unknown()).optional()
})).nullable();
var validateOnSchema = _enum([
	"change",
	"blur",
	"submit"
]).nullable();
var shadcnComponentDefinitions = {
	Card: {
		props: object({
			title: string().nullable(),
			description: string().nullable(),
			maxWidth: _enum([
				"sm",
				"md",
				"lg",
				"full"
			]).nullable(),
			centered: boolean().nullable(),
			className: string().nullable().describe("Additional CSS classes")
		}),
		slots: ["default"],
		description: "Container card for content sections. Use for forms/content boxes, NOT for page headers.",
		example: {
			title: "Overview",
			description: "Your account summary"
		}
	},
	Stack: {
		props: object({
			direction: _enum(["horizontal", "vertical"]).nullable(),
			gap: _enum([
				"none",
				"sm",
				"md",
				"lg",
				"xl"
			]).nullable(),
			align: _enum([
				"start",
				"center",
				"end",
				"stretch"
			]).nullable(),
			justify: _enum([
				"start",
				"center",
				"end",
				"between",
				"around"
			]).nullable(),
			className: string().nullable().describe("Additional CSS classes")
		}),
		slots: ["default"],
		description: "Flex container for layouts",
		example: {
			direction: "vertical",
			gap: "md"
		}
	},
	Grid: {
		props: object({
			columns: number().nullable(),
			gap: _enum([
				"sm",
				"md",
				"lg",
				"xl"
			]).nullable(),
			className: string().nullable().describe("Additional CSS classes")
		}),
		slots: ["default"],
		description: "Grid layout (1-6 columns)",
		example: {
			columns: 3,
			gap: "md"
		}
	},
	Separator: {
		props: object({ orientation: _enum(["horizontal", "vertical"]).nullable() }),
		description: "Visual separator line"
	},
	Tabs: {
		props: object({
			tabs: array(object({
				label: string(),
				value: string()
			})),
			defaultValue: string().nullable(),
			value: string().nullable()
		}),
		slots: ["default"],
		events: ["change"],
		description: "Tab navigation. Use { $bindState } on value for active tab binding."
	},
	Accordion: {
		props: object({
			items: array(object({
				title: string(),
				content: string()
			})),
			type: _enum(["single", "multiple"]).nullable()
		}),
		description: "Collapsible sections. Items as [{title, content}]. Type 'single' (default) or 'multiple'."
	},
	Collapsible: {
		props: object({
			title: string(),
			defaultOpen: boolean().nullable()
		}),
		slots: ["default"],
		description: "Collapsible section with trigger. Children render inside."
	},
	Dialog: {
		props: object({
			title: string(),
			description: string().nullable(),
			openPath: string()
		}),
		slots: ["default"],
		description: "Modal dialog. Set openPath to a boolean state path. Use setState to toggle."
	},
	Drawer: {
		props: object({
			title: string(),
			description: string().nullable(),
			openPath: string()
		}),
		slots: ["default"],
		description: "Bottom sheet drawer. Set openPath to a boolean state path. Use setState to toggle."
	},
	Carousel: {
		props: object({ items: array(object({
			title: string().nullable(),
			description: string().nullable()
		})) }),
		description: "Horizontally scrollable carousel of cards."
	},
	Table: {
		props: object({
			columns: array(string()),
			rows: array(array(string())),
			caption: string().nullable()
		}),
		description: "Data table. columns: header labels. rows: 2D array of cell strings, e.g. [[\"Alice\",\"admin\"],[\"Bob\",\"user\"]].",
		example: {
			columns: ["Name", "Role"],
			rows: [["Alice", "Admin"], ["Bob", "User"]]
		}
	},
	Heading: {
		props: object({
			text: string(),
			level: _enum([
				"h1",
				"h2",
				"h3",
				"h4"
			]).nullable()
		}),
		description: "Heading text (h1-h4)",
		example: {
			text: "Welcome",
			level: "h1"
		}
	},
	Text: {
		props: object({
			text: string(),
			variant: _enum([
				"body",
				"caption",
				"muted",
				"lead",
				"code"
			]).nullable()
		}),
		description: "Paragraph text",
		example: { text: "Hello, world!" }
	},
	Image: {
		props: object({
			src: string().nullable(),
			alt: string(),
			width: number().nullable(),
			height: number().nullable()
		}),
		description: "Image component. Renders an img tag when src is provided, otherwise a placeholder."
	},
	Avatar: {
		props: object({
			src: string().nullable(),
			name: string(),
			size: _enum([
				"sm",
				"md",
				"lg"
			]).nullable()
		}),
		description: "User avatar with fallback initials",
		example: {
			name: "Jane Doe",
			size: "md"
		}
	},
	Badge: {
		props: object({
			text: string(),
			variant: _enum([
				"default",
				"secondary",
				"destructive",
				"outline"
			]).nullable()
		}),
		description: "Status badge",
		example: {
			text: "Active",
			variant: "default"
		}
	},
	Alert: {
		props: object({
			title: string(),
			message: string().nullable(),
			type: _enum([
				"info",
				"success",
				"warning",
				"error"
			]).nullable()
		}),
		description: "Alert banner",
		example: {
			title: "Note",
			message: "Your changes have been saved.",
			type: "success"
		}
	},
	Progress: {
		props: object({
			value: number(),
			max: number().nullable(),
			label: string().nullable()
		}),
		description: "Progress bar (value 0-100)",
		example: {
			value: 65,
			max: 100,
			label: "Upload progress"
		}
	},
	Skeleton: {
		props: object({
			width: string().nullable(),
			height: string().nullable(),
			rounded: boolean().nullable()
		}),
		description: "Loading placeholder skeleton"
	},
	Spinner: {
		props: object({
			size: _enum([
				"sm",
				"md",
				"lg"
			]).nullable(),
			label: string().nullable()
		}),
		description: "Loading spinner indicator"
	},
	Tooltip: {
		props: object({
			content: string(),
			text: string()
		}),
		description: "Hover tooltip. Shows content on hover over text."
	},
	Popover: {
		props: object({
			trigger: string(),
			content: string()
		}),
		description: "Popover that appears on click of trigger."
	},
	Input: {
		props: object({
			label: string(),
			name: string(),
			type: _enum([
				"text",
				"email",
				"password",
				"number"
			]).nullable(),
			placeholder: string().nullable(),
			value: string().nullable(),
			checks: validationCheckSchema,
			validateOn: validateOnSchema
		}),
		events: [
			"submit",
			"focus",
			"blur"
		],
		description: "Text input field. Use { $bindState } on value for two-way binding. Use checks for validation (e.g. required, email, minLength). validateOn controls timing (default: blur).",
		example: {
			label: "Email",
			name: "email",
			type: "email",
			placeholder: "you@example.com"
		}
	},
	Textarea: {
		props: object({
			label: string(),
			name: string(),
			placeholder: string().nullable(),
			rows: number().nullable(),
			value: string().nullable(),
			checks: validationCheckSchema,
			validateOn: validateOnSchema
		}),
		description: "Multi-line text input. Use { $bindState } on value for binding. Use checks for validation. validateOn controls timing (default: blur)."
	},
	Select: {
		props: object({
			label: string(),
			name: string(),
			options: array(string()),
			placeholder: string().nullable(),
			value: string().nullable(),
			checks: validationCheckSchema,
			validateOn: validateOnSchema
		}),
		events: ["change"],
		description: "Dropdown select input. Use { $bindState } on value for binding. Use checks for validation. validateOn controls timing (default: change)."
	},
	Checkbox: {
		props: object({
			label: string(),
			name: string(),
			checked: boolean().nullable(),
			checks: validationCheckSchema,
			validateOn: validateOnSchema
		}),
		events: ["change"],
		description: "Checkbox input. Use { $bindState } on checked for binding. Use checks for validation. validateOn controls timing (default: change)."
	},
	Radio: {
		props: object({
			label: string(),
			name: string(),
			options: array(string()),
			value: string().nullable(),
			checks: validationCheckSchema,
			validateOn: validateOnSchema
		}),
		events: ["change"],
		description: "Radio button group. Use { $bindState } on value for binding. Use checks for validation. validateOn controls timing (default: change)."
	},
	Switch: {
		props: object({
			label: string(),
			name: string(),
			checked: boolean().nullable(),
			checks: validationCheckSchema,
			validateOn: validateOnSchema
		}),
		events: ["change"],
		description: "Toggle switch. Use { $bindState } on checked for binding. Use checks for validation. validateOn controls timing (default: change)."
	},
	Slider: {
		props: object({
			label: string().nullable(),
			min: number().nullable(),
			max: number().nullable(),
			step: number().nullable(),
			value: number().nullable()
		}),
		events: ["change"],
		description: "Range slider input. Use { $bindState } on value for binding."
	},
	Button: {
		props: object({
			label: string(),
			variant: _enum([
				"primary",
				"secondary",
				"danger"
			]).nullable(),
			disabled: boolean().nullable()
		}),
		events: ["press"],
		description: "Clickable button. Bind on.press for handler.",
		example: {
			label: "Submit",
			variant: "primary"
		}
	},
	Link: {
		props: object({
			label: string(),
			href: string()
		}),
		events: ["press"],
		description: "Anchor link. Bind on.press for click handler."
	},
	DropdownMenu: {
		props: object({
			label: string(),
			items: array(object({
				label: string(),
				value: string()
			})),
			value: string().nullable()
		}),
		events: ["select"],
		description: "Dropdown menu with trigger button and selectable items. Use { $bindState } on value for selected item binding."
	},
	Toggle: {
		props: object({
			label: string(),
			pressed: boolean().nullable(),
			variant: _enum(["default", "outline"]).nullable()
		}),
		events: ["change"],
		description: "Toggle button. Use { $bindState } on pressed for state binding."
	},
	ToggleGroup: {
		props: object({
			items: array(object({
				label: string(),
				value: string()
			})),
			type: _enum(["single", "multiple"]).nullable(),
			value: string().nullable()
		}),
		events: ["change"],
		description: "Group of toggle buttons. Type 'single' (default) or 'multiple'. Use { $bindState } on value."
	},
	ButtonGroup: {
		props: object({
			buttons: array(object({
				label: string(),
				value: string()
			})),
			selected: string().nullable()
		}),
		events: ["change"],
		description: "Segmented button group. Use { $bindState } on selected for selected value."
	},
	Pagination: {
		props: object({
			totalPages: number(),
			page: number().nullable()
		}),
		events: ["change"],
		description: "Page navigation. Use { $bindState } on page for current page number."
	}
};
//#endregion
//#region src/catalog.ts
var note = object({
	line: number().int().positive().describe("The file's line number on that side, as `patch` prints it"),
	side: _enum(["new", "old"]).describe("\"old\" for removed lines, \"new\" for added lines, either for unchanged ones"),
	text: string().describe("Markdown")
});
var catalog = defineCatalog(schema, {
	components: {
		DiffHeader: {
			props: object({
				title: string().describe("Inline Markdown. What the change does, in a few words"),
				summary: string().nullable().describe("Markdown. Why, and what a reviewer should know")
			}),
			description: "Page header: your title and summary over the repo, branch, base, and totals. Use once, first."
		},
		ChangeGroup: {
			props: object({
				title: string().describe("Inline Markdown"),
				summary: string().nullable().describe("Markdown"),
				risk: _enum([
					"low",
					"medium",
					"high"
				]).nullable(),
				paths: array(string()).min(1).describe("Changed file paths, exactly as collect printed them"),
				notes: array(note.extend({ path: string().describe("One of this group's paths") })).nullable(),
				defaultOpen: boolean().nullable().describe("Expand the diffs on load. Default true")
			}),
			slots: ["default"],
			description: "A set of files that change for one reason. Renders the summary, any children, then every file's diff with your notes pinned to lines."
		},
		FileDiff: {
			props: object({
				path: string(),
				note: string().nullable().describe("Markdown shown above the diff"),
				notes: array(note).nullable(),
				defaultOpen: boolean().nullable()
			}),
			description: "One file's diff on its own, outside any ChangeGroup."
		},
		FileList: {
			props: object({
				title: string().nullable(),
				paths: array(string()).nullable().describe("Defaults to every changed file")
			}),
			description: "Compact list of files with status and line counts. Each entry jumps to its diff."
		},
		CommitList: {
			props: object({ title: string().nullable() }),
			description: "The branch's commits since the base."
		},
		Markdown: {
			props: object({ text: string() }),
			description: "A block of Markdown prose."
		},
		Stack: shadcnComponentDefinitions.Stack,
		Grid: shadcnComponentDefinitions.Grid,
		Card: shadcnComponentDefinitions.Card,
		Heading: shadcnComponentDefinitions.Heading,
		Text: shadcnComponentDefinitions.Text,
		Badge: shadcnComponentDefinitions.Badge,
		Alert: shadcnComponentDefinitions.Alert,
		Tabs: shadcnComponentDefinitions.Tabs,
		Collapsible: shadcnComponentDefinitions.Collapsible,
		Separator: shadcnComponentDefinitions.Separator,
		Table: shadcnComponentDefinitions.Table
	},
	actions: {}
});
/** The component types whose props name changed files. */
var PATH_COMPONENTS = [
	"ChangeGroup",
	"FileDiff",
	"FileList"
];
var SYSTEM = "You describe a code change to the person reviewing it. Output a json-render spec; the branch-diff viewer renders it with every file's real diff.";
var OUTPUT_FORMAT = `OUTPUT FORMAT (JSONL, RFC 6902 JSON Patch):
One JSON object per line. Set /root first, then add each element under /elements/<key>:
{"op":"add","path":"/root","value":"page"}
{"op":"add","path":"/elements/page","value":{"type":"Stack","props":{"direction":"vertical","gap":"xl"},"children":["header","core"]}}
{"op":"add","path":"/elements/header","value":{"type":"DiffHeader","props":{"title":"Retry failed uploads","summary":"Uploads that fail with a 5xx now retry twice."},"children":[]}}
{"op":"add","path":"/elements/core","value":{"type":"ChangeGroup","props":{"title":"Retry in the upload client","risk":"medium","summary":"Retries reuse the same request id.","paths":["src/upload.ts"],"notes":[{"path":"src/upload.ts","line":42,"side":"new","text":"No backoff between attempts."}]},"children":[]}}`;
var KEPT_SECTIONS = [
	"AVAILABLE COMPONENTS",
	"VISIBILITY CONDITIONS",
	"DYNAMIC PROPS",
	"RULES"
];
var APP_RULES = /sample data|state patches|"repeat"|FILTERED LISTS|"on" field|data-rich/i;
var SECTION_HEADER = /^[A-Z][A-Z ]+(?: \([^)]*\))?:$/;
var RULES = [
	"Start with one DiffHeader, under a vertical Stack as the root.",
	"Every changed file goes in exactly one ChangeGroup (paths) or FileDiff (path). Rendering fails if a file is missing, unknown, or shown twice.",
	"Group files by why they changed, not by folder. Order groups the way a reviewer should read them, most important first. Lockfiles and generated files go in a last group with defaultOpen false.",
	"Copy paths exactly as collect printed them. Paths must be literal strings, not $state expressions.",
	"Never paste code into the spec. The viewer shows the diffs.",
	"Leave out state unless Tabs or visibility need it, and never add sample data.",
	"Notes are for what a reviewer could miss: behavior changes, risks, missing tests, follow-ups. Don't narrate obvious lines. A note's line is the file's line number on its side, as `patch` prints it: removed lines are old, added lines new, unchanged lines either.",
	"Set risk only when you can say why in the summary.",
	"Keep prose short and plain. No em dashes, no emoji."
];
/** The catalog's prompt, cut down to what a diff page uses, with this skill's rules. */
function specPrompt() {
	const sections = [];
	for (const line of catalog.prompt({ customRules: RULES }).split("\n")) if (SECTION_HEADER.test(line)) sections.push([line]);
	else sections.at(-1)?.push(line);
	const kept = sections.filter(([header]) => KEPT_SECTIONS.some((name) => header.startsWith(name)));
	if (kept.length !== KEPT_SECTIONS.length) throw new Error("json-render's prompt layout changed");
	const isAppRule = (line) => APP_RULES.test(line) && !RULES.some((rule) => line.endsWith(rule));
	const numbered = kept.at(-1).slice(1).filter((line) => /^\d+\. /.test(line) && !isAppRule(line)).map((rule, i) => rule.replace(/^\d+\./, `${i + 1}.`));
	return [
		SYSTEM,
		OUTPUT_FORMAT,
		...kept.slice(0, -1).map((section) => section.join("\n").trimEnd()),
		["RULES:", ...numbered].join("\n")
	].join("\n\n");
}
//#endregion
//#region src/patch.ts
var HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
function* patchLines(patch) {
	let oldLine = 0;
	let newLine = 0;
	let oldLeft = 0;
	let newLeft = 0;
	for (const text of patch.split("\n")) {
		const hunk = HUNK_HEADER.exec(text);
		if (hunk) {
			oldLine = Number(hunk[1]);
			oldLeft = Number(hunk[2] ?? 1);
			newLine = Number(hunk[3]);
			newLeft = Number(hunk[4] ?? 1);
		}
		const kind = text[0];
		if (!hunk && kind === "-" && oldLeft > 0) {
			oldLeft--;
			yield {
				text,
				kind,
				old: oldLine++,
				new: null
			};
		} else if (!hunk && kind === "+" && newLeft > 0) {
			newLeft--;
			yield {
				text,
				kind,
				old: null,
				new: newLine++
			};
		} else if (!hunk && kind === " " && oldLeft > 0 && newLeft > 0) {
			oldLeft--;
			newLeft--;
			yield {
				text,
				kind,
				old: oldLine++,
				new: newLine++
			};
		} else if (kind === "\\") yield {
			text,
			kind,
			old: null,
			new: null
		};
		else yield {
			text,
			kind: null,
			old: null,
			new: null
		};
	}
}
/** Counts added and removed lines in a patch. */
function countPatchLines(patch) {
	let additions = 0;
	let deletions = 0;
	for (const line of patchLines(patch)) if (line.kind === "+") additions++;
	else if (line.kind === "-") deletions++;
	return {
		additions,
		deletions
	};
}
/** Line numbers visible in a file's diff, per side. Context lines count on both. */
function visibleLines(patch) {
	const lines = {
		new: /* @__PURE__ */ new Set(),
		old: /* @__PURE__ */ new Set()
	};
	for (const line of patchLines(patch)) {
		if (line.old !== null) lines.old.add(line.old);
		if (line.new !== null) lines.new.add(line.new);
	}
	return lines;
}
/** The patch with each hunk line prefixed by its old and new line numbers. Headers stay as they are. */
function numberPatch(patch) {
	const lines = [...patchLines(patch)];
	const highest = Math.max(0, ...lines.flatMap((line) => [line.old ?? 0, line.new ?? 0]));
	const width = Math.max(2, String(highest).length) + 2;
	const column = (n) => (n === null ? "" : String(n)).padStart(width);
	return lines.map((line) => line.kind === null ? line.text : `${column(line.old)}${column(line.new)}  │ ${line.text}`).join("\n");
}
var DIFF_FLAGS = [
	"--no-color",
	"--no-ext-diff",
	"--no-textconv",
	"--no-relative",
	"--src-prefix=a/",
	"--dst-prefix=b/",
	"-M"
];
var LOCKFILES = /* @__PURE__ */ new Set([
	"bun.lock",
	"bun.lockb",
	"Cargo.lock",
	"composer.lock",
	"flake.lock",
	"Gemfile.lock",
	"go.sum",
	"package-lock.json",
	"pnpm-lock.yaml",
	"poetry.lock",
	"uv.lock",
	"yarn.lock"
]);
var STATUS_LETTERS = {
	A: "added",
	M: "modified",
	D: "deleted",
	R: "renamed",
	C: "copied",
	T: "type-changed",
	U: "unmerged"
};
var GitError = class extends Error {};
function git(cwd, args, okCodes = [0]) {
	const result = spawnSync("git", [
		"-c",
		"core.quotePath=false",
		...args
	], {
		cwd,
		encoding: "utf8",
		maxBuffer: 1 << 30
	});
	if (result.error) throw result.error;
	if (!okCodes.includes(result.status ?? -1)) throw new GitError(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
	return result.stdout;
}
function tryGit(cwd, args) {
	try {
		return git(cwd, args).trim() || null;
	} catch {
		return null;
	}
}
var nulFields = (output) => output.split("\0").filter((field) => field !== "");
function revParse(cwd, ref) {
	return tryGit(cwd, [
		"rev-parse",
		"--verify",
		"--quiet",
		`${ref}^{commit}`
	]);
}
function resolveBase(cwd, requested) {
	if (requested) {
		const sha = revParse(cwd, requested);
		if (!sha) throw new GitError(`"${requested}" isn't a branch, tag, or commit in this repo`);
		return {
			ref: requested,
			sha,
			source: "argument"
		};
	}
	for (const remote of ["upstream", "origin"]) {
		const ref = tryGit(cwd, [
			"symbolic-ref",
			"--quiet",
			"--short",
			`refs/remotes/${remote}/HEAD`
		]);
		const sha = ref && revParse(cwd, ref);
		if (ref && sha) return {
			ref,
			sha,
			source: "remote-head"
		};
	}
	const names = [
		tryGit(cwd, ["config", "init.defaultBranch"]),
		"main",
		"master",
		"trunk"
	];
	for (const name of names.filter((name) => name !== null)) for (const ref of [`origin/${name}`, name]) {
		const sha = revParse(cwd, ref);
		if (sha) return {
			ref,
			sha,
			source: "default-branch"
		};
	}
	throw new GitError("couldn't find the default branch. pass a base branch or commit");
}
/** Undoes git's C-style quoting of paths with special characters. */
function unquotePath(raw) {
	if (!raw.startsWith("\"")) return raw;
	const escapes = {
		a: 7,
		b: 8,
		f: 12,
		n: 10,
		r: 13,
		t: 9,
		v: 11
	};
	const bytes = [];
	const body = Buffer.from(raw.slice(1, -1), "utf8");
	for (let i = 0; i < body.length; i++) {
		const byte = body[i];
		if (byte !== 92) {
			bytes.push(byte);
			continue;
		}
		const next = String.fromCharCode(body[++i]);
		if (/[0-7]/.test(next)) {
			bytes.push(parseInt(body.subarray(i, i + 3).toString(), 8));
			i += 2;
		} else bytes.push(escapes[next] ?? next.charCodeAt(0));
	}
	return Buffer.from(bytes).toString("utf8");
}
/** The new-side path a `diff --git` chunk belongs to. */
function chunkPath(chunk) {
	const lines = chunk.split("\n");
	for (const line of lines) {
		const target = /^(?:rename|copy) to (.*)$/.exec(line);
		if (target) return unquotePath(target[1]);
		if (line.startsWith("@@") || line.startsWith("Binary files")) break;
	}
	const header = lines[0].slice(11);
	if (header.startsWith("\"")) {
		let end = 1;
		while (header[end] !== "\"") end += header[end] === "\\" ? 2 : 1;
		return unquotePath(header.slice(end + 2)).slice(2);
	}
	return header.slice((header.length + 1) / 2 + 2);
}
/** Splits a multi-file patch by the path each part belongs to. A type change is two parts for one path. */
function splitPatch(patch) {
	const byPath = /* @__PURE__ */ new Map();
	for (const chunk of patch.split(/^(?=diff --git )/m)) {
		if (!chunk.startsWith("diff --git ")) continue;
		const path = chunkPath(chunk);
		byPath.set(path, (byPath.get(path) ?? "") + chunk);
	}
	return byPath;
}
function parseNameStatus(output) {
	const fields = nulFields(output);
	const entries = [];
	for (let i = 0; i < fields.length;) {
		const status = STATUS_LETTERS[fields[i++][0]] ?? "modified";
		const oldPath = status === "renamed" || status === "copied" ? fields[i++] : null;
		entries.push({
			path: fields[i++],
			oldPath,
			status
		});
	}
	return entries;
}
function parseNumstat(output) {
	const stats = /* @__PURE__ */ new Map();
	const fields = output.split("\0");
	for (let i = 0; i < fields.length; i++) {
		const match = /^(-|\d+)\t(-|\d+)\t(.*)$/s.exec(fields[i]);
		if (!match) continue;
		const path = match[3] === "" ? fields[i += 2] : match[3];
		stats.set(path, {
			additions: match[1] === "-" ? 0 : Number(match[1]),
			deletions: match[2] === "-" ? 0 : Number(match[2]),
			binary: match[1] === "-"
		});
	}
	return stats;
}
function generatedPaths(cwd, paths) {
	const generated = new Set(paths.filter((path) => LOCKFILES.has(basename(path))));
	if (paths.length === 0) return generated;
	const fields = spawnSync("git", [
		"check-attr",
		"-z",
		"--stdin",
		"linguist-generated"
	], {
		cwd,
		encoding: "utf8",
		input: paths.join("\0"),
		maxBuffer: 1 << 30
	}).stdout.split("\0");
	for (let i = 0; i + 2 < fields.length; i += 3) if (fields[i + 2] === "set" || fields[i + 2] === "true") generated.add(fields[i]);
	return generated;
}
function untrackedFile(root, path) {
	const base = {
		path,
		oldPath: null,
		status: "added"
	};
	if (lstatSync(join(root, path)).size > 1e6) {
		const contents = readFileSync(join(root, path));
		const binary = contents.subarray(0, 8e3).includes(0);
		const lines = contents.toString("latin1").split("\n").length - (contents.at(-1) === 10 ? 1 : 0);
		return {
			...base,
			additions: binary ? 0 : lines,
			deletions: 0,
			binary,
			patch: null
		};
	}
	const patch = git(root, [
		"diff",
		...DIFF_FLAGS,
		"--no-index",
		"--",
		"/dev/null",
		path
	], [0, 1]);
	const binary = /^Binary files /m.test(patch);
	return {
		...base,
		...countPatchLines(patch),
		binary,
		patch
	};
}
/** The repository's name, the same from any of its worktrees. */
function repoName(root, commonDir) {
	return basename(commonDir) === ".git" ? basename(dirname(commonDir)) : basename(root);
}
/** When the repo last fetched, from FETCH_HEAD's mtime. */
function fetchedAt(commonDir) {
	try {
		return statSync(join(commonDir, "FETCH_HEAD")).mtime.toISOString();
	} catch {
		return null;
	}
}
function collect({ cwd, base: requested, direct = false }) {
	const root = tryGit(cwd, ["rev-parse", "--show-toplevel"]);
	if (!root) throw new GitError(`${cwd} isn't inside a git repository`);
	const headSha = revParse(root, "HEAD");
	if (!headSha) throw new GitError("this repo has no commits yet");
	const base = resolveBase(root, requested);
	const mergeBase = direct ? base.sha : tryGit(root, [
		"merge-base",
		base.sha,
		headSha
	]);
	if (!mergeBase) throw new GitError(`${base.ref} and HEAD share no history. use --direct to compare them anyway`);
	const entries = parseNameStatus(git(root, [
		"diff",
		...DIFF_FLAGS,
		"--name-status",
		"-z",
		mergeBase
	]));
	const stats = parseNumstat(git(root, [
		"diff",
		...DIFF_FLAGS,
		"--numstat",
		"-z",
		mergeBase
	]));
	const patches = splitPatch(git(root, [
		"diff",
		...DIFF_FLAGS,
		mergeBase
	]));
	const changedIn = (args) => new Set(nulFields(git(root, [
		"diff",
		...DIFF_FLAGS,
		"--name-only",
		"-z",
		...args
	])));
	const sourceSets = [
		["committed", changedIn([mergeBase, headSha])],
		["staged", changedIn(["--cached", headSha])],
		["unstaged", changedIn([])]
	];
	const tracked = entries.map((entry) => {
		const stat = stats.get(entry.path) ?? {
			additions: 0,
			deletions: 0,
			binary: false
		};
		const patch = patches.get(entry.path) ?? null;
		const sources = sourceSets.filter(([, paths]) => paths.has(entry.path)).map(([name]) => name);
		return {
			...entry,
			...stat,
			sources,
			patch: patch !== null && patch.length > 1e6 ? null : patch
		};
	});
	const untracked = nulFields(git(root, [
		"ls-files",
		"-z",
		"--others",
		"--exclude-standard"
	])).map((path) => ({
		...untrackedFile(root, path),
		sources: ["untracked"]
	}));
	const all = [...tracked, ...untracked].sort((a, b) => a.path.localeCompare(b.path));
	const generated = generatedPaths(root, all.map((file) => file.path));
	const files = all.map((file) => ({
		...file,
		generated: generated.has(file.path)
	}));
	const commits = nulFields(git(root, [
		"log",
		"-z",
		"--format=%H%x1f%s%x1f%an%x1f%aI",
		`${mergeBase}..${headSha}`
	])).map((record) => {
		const [sha, subject, author, date] = record.split("");
		return {
			sha,
			subject,
			author,
			date
		};
	});
	const commonDir = git(root, [
		"rev-parse",
		"--path-format=absolute",
		"--git-common-dir"
	]).trim();
	const ahead = Number(git(root, [
		"rev-list",
		"--count",
		`${mergeBase}..${base.sha}`
	]));
	const remote = tryGit(root, [
		"rev-parse",
		"--symbolic-full-name",
		base.ref
	])?.startsWith("refs/remotes/") ?? false;
	return {
		version: 1,
		generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		repo: {
			name: repoName(root, commonDir),
			root
		},
		head: {
			branch: tryGit(root, [
				"symbolic-ref",
				"--quiet",
				"--short",
				"HEAD"
			]),
			sha: headSha
		},
		base: {
			...base,
			diffFrom: mergeBase,
			direct,
			ahead,
			remote,
			fetchedAt: fetchedAt(commonDir)
		},
		commits,
		files,
		totals: {
			files: files.length,
			additions: files.reduce((sum, file) => sum + file.additions, 0),
			deletions: files.reduce((sum, file) => sum + file.deletions, 0)
		}
	};
}
//#endregion
//#region node_modules/.pnpm/@pierre+diffs@1.5.2_@shikijs+themes@4.5.0_react-dom@19.3.1_react@19.3.1__react@19.3.1/node_modules/@pierre/diffs/dist/utils/getFiletypeFromFileName.js
var CUSTOM_EXTENSION_TO_FILE_FORMAT = /* @__PURE__ */ new Map();
var EXTENSION_TO_FILE_FORMAT = {
	"1c": "1c",
	abap: "abap",
	as: "actionscript-3",
	ada: "ada",
	adb: "ada",
	ads: "ada",
	adoc: "asciidoc",
	asciidoc: "asciidoc",
	"component.html": "angular-html",
	"component.ts": "angular-ts",
	conf: "nginx",
	htaccess: "apache",
	cls: "tex",
	trigger: "apex",
	apl: "apl",
	applescript: "applescript",
	scpt: "applescript",
	ara: "ara",
	asm: "asm",
	s: "riscv",
	astro: "astro",
	awk: "awk",
	bal: "ballerina",
	sh: "zsh",
	bash: "zsh",
	bat: "cmd",
	cmd: "cmd",
	be: "berry",
	beancount: "beancount",
	bib: "bibtex",
	bicep: "bicep",
	"blade.php": "blade",
	bsl: "bsl",
	c: "c",
	h: "objective-cpp",
	cs: "csharp",
	cpp: "cpp",
	hpp: "cpp",
	cc: "cpp",
	cxx: "cpp",
	hh: "cpp",
	cdc: "cdc",
	cairo: "cairo",
	clar: "clarity",
	clj: "clojure",
	cljs: "clojure",
	cljc: "clojure",
	soy: "soy",
	cmake: "cmake",
	"CMakeLists.txt": "cmake",
	cob: "cobol",
	cbl: "cobol",
	cobol: "cobol",
	CODEOWNERS: "codeowners",
	ql: "ql",
	coffee: "coffeescript",
	lisp: "lisp",
	cl: "lisp",
	lsp: "lisp",
	log: "log",
	v: "verilog",
	cql: "cql",
	cr: "crystal",
	css: "css",
	csv: "csv",
	cue: "cue",
	cypher: "cypher",
	cyp: "cypher",
	d: "d",
	dart: "dart",
	dax: "dax",
	desktop: "desktop",
	diff: "diff",
	patch: "diff",
	Dockerfile: "dockerfile",
	dockerfile: "dockerfile",
	env: "dotenv",
	dm: "dream-maker",
	edge: "edge",
	el: "emacs-lisp",
	ex: "elixir",
	exs: "elixir",
	elm: "elm",
	erb: "erb",
	erl: "erlang",
	hrl: "erlang",
	f: "fortran-fixed-form",
	for: "fortran-fixed-form",
	fs: "fsharp",
	fsi: "fsharp",
	fsx: "fsharp",
	f03: "f03",
	f08: "f08",
	f18: "f18",
	f77: "f77",
	f90: "fortran-free-form",
	f95: "fortran-free-form",
	fnl: "fennel",
	fish: "fish",
	ftl: "ftl",
	tres: "gdresource",
	res: "gdresource",
	gd: "gdscript",
	gdshader: "gdshader",
	gs: "genie",
	feature: "gherkin",
	COMMIT_EDITMSG: "git-commit",
	"git-rebase-todo": "git-rebase",
	gjs: "glimmer-js",
	gleam: "gleam",
	gts: "glimmer-ts",
	glsl: "glsl",
	vert: "glsl",
	frag: "glsl",
	shader: "shaderlab",
	gp: "gnuplot",
	plt: "gnuplot",
	gnuplot: "gnuplot",
	go: "go",
	graphql: "graphql",
	gql: "graphql",
	groovy: "groovy",
	gvy: "groovy",
	hack: "hack",
	haml: "haml",
	hbs: "handlebars",
	handlebars: "handlebars",
	hs: "haskell",
	lhs: "haskell",
	hx: "haxe",
	hcl: "hcl",
	hjson: "hjson",
	hlsl: "hlsl",
	fx: "hlsl",
	html: "html",
	htm: "html",
	http: "http",
	rest: "http",
	hxml: "hxml",
	hy: "hy",
	imba: "imba",
	ini: "ini",
	cfg: "ini",
	jade: "pug",
	pug: "pug",
	java: "java",
	js: "javascript",
	mjs: "javascript",
	cjs: "javascript",
	jinja: "jinja",
	jinja2: "jinja",
	j2: "jinja",
	jison: "jison",
	jl: "julia",
	json: "json",
	json5: "json5",
	jsonc: "jsonc",
	jsonl: "jsonl",
	jsonnet: "jsonnet",
	libsonnet: "jsonnet",
	jssm: "jssm",
	jsx: "jsx",
	kt: "kotlin",
	kts: "kts",
	kql: "kusto",
	tex: "tex",
	ltx: "tex",
	lean: "lean4",
	less: "less",
	liquid: "liquid",
	lit: "lit",
	ll: "llvm",
	logo: "logo",
	lua: "lua",
	luau: "luau",
	Makefile: "makefile",
	mk: "makefile",
	makefile: "makefile",
	md: "markdown",
	markdown: "markdown",
	marko: "marko",
	m: "wolfram",
	mat: "matlab",
	mdc: "mdc",
	mdx: "mdx",
	wiki: "wikitext",
	mediawiki: "wikitext",
	mmd: "mermaid",
	mermaid: "mermaid",
	mips: "mipsasm",
	mojo: "mojo",
	"🔥": "mojo",
	move: "move",
	nar: "narrat",
	nf: "nextflow",
	nim: "nim",
	nims: "nim",
	nimble: "nim",
	nix: "nix",
	nu: "nushell",
	mm: "objective-cpp",
	ml: "ocaml",
	mli: "ocaml",
	mll: "ocaml",
	mly: "ocaml",
	odin: "odin",
	pas: "pascal",
	p: "pascal",
	pl: "prolog",
	pm: "perl",
	t: "perl",
	raku: "raku",
	p6: "raku",
	pl6: "raku",
	php: "php",
	phtml: "php",
	pls: "plsql",
	sql: "sql",
	po: "po",
	polar: "polar",
	pcss: "postcss",
	pot: "pot",
	potx: "potx",
	pq: "powerquery",
	pqm: "powerquery",
	ps1: "powershell",
	psm1: "powershell",
	psd1: "powershell",
	prisma: "prisma",
	pro: "prolog",
	P: "prolog",
	properties: "properties",
	proto: "protobuf",
	pp: "puppet",
	purs: "purescript",
	py: "python",
	pyw: "python",
	pyi: "python",
	BUCK: "python",
	BUILD: "python",
	PACKAGE: "python",
	WORKSPACE: "python",
	Tiltfile: "python",
	bazel: "python",
	bxl: "python",
	bzl: "python",
	bzlmod: "python",
	star: "python",
	sky: "python",
	qml: "qml",
	qmldir: "qmldir",
	qss: "qss",
	r: "r",
	R: "r",
	rkt: "racket",
	rktl: "racket",
	razor: "razor",
	cshtml: "razor",
	rb: "ruby",
	rbw: "ruby",
	reg: "reg",
	regex: "regexp",
	rel: "rel",
	rs: "rust",
	rst: "rst",
	rake: "ruby",
	gemspec: "ruby",
	jbuilder: "ruby",
	builder: "ruby",
	rabl: "ruby",
	arb: "ruby",
	ru: "ruby",
	podspec: "ruby",
	Gemfile: "ruby",
	Rakefile: "ruby",
	Guardfile: "ruby",
	Capfile: "ruby",
	Berksfile: "ruby",
	Brewfile: "ruby",
	Vagrantfile: "ruby",
	Thorfile: "ruby",
	Appraisals: "ruby",
	Dangerfile: "ruby",
	sas: "sas",
	sass: "sass",
	scala: "scala",
	sc: "scala",
	scm: "scheme",
	ss: "scheme",
	sld: "scheme",
	scss: "scss",
	sdbl: "sdbl",
	shadergraph: "shader",
	st: "smalltalk",
	sol: "solidity",
	sparql: "sparql",
	rq: "sparql",
	spl: "splunk",
	config: "ssh-config",
	do: "stata",
	ado: "stata",
	dta: "stata",
	styl: "stylus",
	stylus: "stylus",
	svelte: "svelte",
	swift: "swift",
	sv: "system-verilog",
	svh: "system-verilog",
	service: "systemd",
	socket: "systemd",
	device: "systemd",
	timer: "systemd",
	talon: "talonscript",
	tasl: "tasl",
	tcl: "tcl",
	templ: "templ",
	tf: "tf",
	tfvars: "tfvars",
	toml: "toml",
	ts: "typescript",
	mts: "typescript",
	cts: "typescript",
	tsp: "typespec",
	tsv: "tsv",
	tsx: "tsx",
	ttl: "turtle",
	twig: "twig",
	typ: "typst",
	vv: "v",
	vala: "vala",
	vapi: "vala",
	vb: "vb",
	vbs: "vb",
	bas: "vb",
	vh: "verilog",
	vhd: "vhdl",
	vhdl: "vhdl",
	vim: "vimscript",
	vue: "vue",
	"vine.ts": "vue-vine",
	vy: "vyper",
	wasm: "wasm",
	wat: "wasm",
	wy: "文言",
	wgsl: "wgsl",
	wit: "wit",
	wl: "wolfram",
	nb: "wolfram",
	xml: "xml",
	xsl: "xsl",
	xslt: "xsl",
	yaml: "yaml",
	yml: "yml",
	zs: "zenscript",
	zig: "zig",
	zsh: "zsh",
	sty: "tex"
};
function getFiletypeFromFileName(fileName) {
	const format = matchFiletypeFromName(fileName);
	if (format != null) return format;
	const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
	return baseName === fileName ? "text" : matchFiletypeFromName(baseName) ?? "text";
}
function matchFiletypeFromName(fileName) {
	if (CUSTOM_EXTENSION_TO_FILE_FORMAT.has(fileName)) return CUSTOM_EXTENSION_TO_FILE_FORMAT.get(fileName) ?? "text";
	if (Object.hasOwn(EXTENSION_TO_FILE_FORMAT, fileName)) return EXTENSION_TO_FILE_FORMAT[fileName] ?? null;
	const compoundMatch = fileName.match(/\.([^/\\]+\.[^/\\]+)$/);
	if (compoundMatch != null) {
		if (CUSTOM_EXTENSION_TO_FILE_FORMAT.has(compoundMatch[1])) return CUSTOM_EXTENSION_TO_FILE_FORMAT.get(compoundMatch[1]) ?? "text";
		if (Object.hasOwn(EXTENSION_TO_FILE_FORMAT, compoundMatch[1])) return EXTENSION_TO_FILE_FORMAT[compoundMatch[1]] ?? "text";
	}
	const simpleMatch = fileName.match(/\.([^.]+)$/)?.[1] ?? "";
	if (CUSTOM_EXTENSION_TO_FILE_FORMAT.has(simpleMatch)) return CUSTOM_EXTENSION_TO_FILE_FORMAT.get(simpleMatch) ?? "text";
	return Object.hasOwn(EXTENSION_TO_FILE_FORMAT, simpleMatch) ? EXTENSION_TO_FILE_FORMAT[simpleMatch] ?? "text" : null;
}
//#endregion
//#region src/render.ts
var PAYLOAD_MARKER = "<!--branch-diff-payload-->";
/** A spec that can't be read. Each problem is one line for the agent to fix. */
var SpecError = class extends Error {
	problems;
	constructor(problems) {
		super(problems.join("\n"));
		this.problems = problems;
	}
};
var isFence = (line) => line.trimStart().startsWith("```");
/** Accepts a whole spec as JSON, or the JSONL patch stream `prompt` describes, either one in a code fence. */
function parseSpec(text) {
	const lines = text.split("\n");
	const body = lines.map((line) => isFence(line) ? "" : line).join("\n").trim();
	if (body.startsWith("{") && !body.includes("\n{")) try {
		return JSON.parse(body);
	} catch {}
	const problems = lines.flatMap((line, i) => {
		if (line.trim() === "" || isFence(line)) return [];
		try {
			JSON.parse(line);
			return [];
		} catch {
			return [`spec line ${i + 1} isn't valid JSON`];
		}
	});
	if (problems.length > 0) throw new SpecError(problems);
	return compileSpecStream(body);
}
/** "3-5, 9" for {3, 4, 5, 9}. */
function ranges(lines) {
	const sorted = [...lines].sort((a, b) => a - b);
	const spans = [];
	for (let start = 0, end = 0; start < sorted.length; start = ++end) {
		while (sorted[end + 1] === sorted[end] + 1) end++;
		spans.push(start === end ? `${sorted[start]}` : `${sorted[start]}-${sorted[end]}`);
	}
	return spans.join(", ") || "no lines";
}
function checkNotes(key, notes, files) {
	return notes.flatMap((note) => {
		const file = files.get(note.path);
		if (!file?.patch || file.binary) return [`${key}: note on ${note.path}, which has no text diff to pin it to`];
		const visible = visibleLines(file.patch)[note.side];
		if (visible.has(note.line)) return [];
		return [`${key}: ${note.path} line ${note.line} (${note.side}) isn't in the diff (${note.side} side shows ${ranges(visible)})`];
	});
}
var isExpression = (value) => typeof value === "object" && value !== null && Object.keys(value).some((name) => name.startsWith("$"));
/** "<element>: <prop path>: <message>", leaving out empty parts. */
var problemAt = (parts, message) => [...parts.filter(Boolean), message].join(": ");
/** What's wrong with one element's props. catalog.validate only checks the element types. */
function propProblems(key, element) {
	const schema = catalog.data.components[element.type].props;
	const props = element.props;
	const literalOnly = PATH_COMPONENTS.includes(element.type);
	return (schema.strict().safeParse(props).error?.issues ?? []).filter((issue) => {
		const value = issue.path.reduce((parent, part) => parent?.[part], props);
		return !(value === void 0 && issue.path.length === 1 && schema.shape[String(issue.path[0])]?.safeParse(null).success) && (literalOnly || !isExpression(value));
	}).map((issue) => problemAt([key, issue.path.join(".")], issue.message));
}
/** Everything wrong with a spec for this data. Empty means it renders. */
function checkSpec(spec, data) {
	const parsed = catalog.validate(spec);
	if (!parsed.success) return (parsed.error?.issues ?? []).map(({ path, message }) => path[0] === "elements" ? problemAt([String(path[1]), path.slice(2).join(".")], message) : problemAt([path.join(".")], message));
	const problems = validateSpec(spec, { checkOrphans: true }).issues.map(({ elementKey, message }) => problemAt([elementKey ?? ""], message));
	const propErrors = Object.entries(spec.elements).flatMap(([key, element]) => propProblems(key, element));
	if (propErrors.length > 0) return [...problems, ...propErrors];
	const files = new Map(data.files.map((file) => [file.path, file]));
	const shown = /* @__PURE__ */ new Map();
	const show = (key, path) => {
		if (!files.has(path)) return problems.push(`${key}: ${path} isn't a changed file`);
		const previous = shown.get(path);
		if (previous) return problems.push(`${key}: ${path} is already shown by ${previous}`);
		shown.set(path, key);
	};
	for (const [key, element] of Object.entries(spec.elements)) {
		const props = element.props;
		if (element.type === "ChangeGroup") {
			const paths = props.paths;
			paths.forEach((path) => show(key, path));
			const notes = props.notes ?? [];
			const strays = notes.filter((note) => !paths.includes(note.path));
			problems.push(...strays.map((note) => `${key}: note path ${note.path} isn't in this group`));
			problems.push(...checkNotes(key, notes.filter((note) => !strays.includes(note)), files));
		} else if (element.type === "FileDiff") {
			show(key, props.path);
			const notes = (props.notes ?? []).map((note) => ({
				...note,
				path: props.path
			}));
			problems.push(...checkNotes(key, notes, files));
		} else if (element.type === "FileList" && Array.isArray(props.paths)) {
			for (const path of props.paths) if (!files.has(path)) problems.push(`${key}: ${String(path)} isn't a changed file`);
		}
	}
	const missing = data.files.filter((file) => !shown.has(file.path)).map((file) => file.path);
	if (missing.length > 0) problems.push(`not shown anywhere: ${missing.join(", ")}`);
	return problems;
}
/** The grammars for the languages in this diff. Files in other languages show as plain text. */
function pickGrammars(all, data) {
	const picked = {
		lookup: {},
		grammars: {}
	};
	for (const file of data.files) {
		const language = getFiletypeFromFileName(file.path);
		const names = all.lookup[language];
		if (!names || file.patch === null || file.binary) continue;
		picked.lookup[language] = names;
		for (const name of names) picked.grammars[name] = all.grammars[name];
	}
	return picked;
}
/** Embeds the payload in the viewer page. Escaped so file contents can't close the script tag. */
function renderHtml(viewerHtml, payload) {
	if (!viewerHtml.includes("<!--branch-diff-payload-->")) throw new Error("viewer.html has no payload marker");
	const json = JSON.stringify(payload).replace(/</g, "\\u003c");
	const { head, base } = payload.data;
	const title = `${head.branch ?? head.sha.slice(0, 7)} vs ${base.ref}`.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
	return viewerHtml.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`).replace(PAYLOAD_MARKER, () => `<script type="application/json" id="branch-diff-payload">${json}<\/script>`);
}
//#endregion
//#region src/cli.ts
var USAGE = `usage:
  cli.mjs collect [base] [--direct] [--repo <path>] (--out <data.json> | --out-root <dir>)
  cli.mjs patch --data <data.json> [path...]
  cli.mjs prompt
  cli.mjs render --data <data.json> --spec <spec.jsonl> --out <page.html>`;
var STATUS_CODES = {
	added: "A",
	modified: "M",
	deleted: "D",
	renamed: "R",
	copied: "C",
	"type-changed": "T",
	unmerged: "U"
};
var BASE_SOURCES = {
	argument: "as given",
	"remote-head": "remote default branch",
	"default-branch": "guessed default branch"
};
var short = (sha) => sha.slice(0, 7);
var DAY_MS = 864e5;
/** A problem to print without a stack trace, and the exit code to leave with. */
var CliError = class extends Error {
	exitCode;
	constructor(message, exitCode = 1) {
		super(message);
		this.exitCode = exitCode;
	}
};
/** The folder this diff's files go in: <repo>-<branch>-diff. */
function diffFolder({ repo, head }) {
	return `${repo.name}-${(head.branch ?? short(head.sha)).replaceAll("/", "-")}-diff`;
}
/** Things about the base worth a second look before trusting the diff. */
function baseNotes({ base, generatedAt }) {
	const notes = [];
	if (base.ahead > 0) notes.push(`${base.ref} is ${base.ahead} commits past the merge base`);
	if (base.fetchedAt === null) {
		if (base.remote) notes.push("never fetched");
	} else {
		const days = Math.floor((Date.parse(generatedAt) - Date.parse(base.fetchedAt)) / DAY_MS);
		if (days >= 1) notes.push(`last fetched ${days} ${days === 1 ? "day" : "days"} ago`);
	}
	return notes.map((note) => `note: ${note}`);
}
function summarize(data) {
	const { repo, head, base, totals } = data;
	const from = base.direct ? "the base itself" : `merge base ${short(base.diffFrom)}`;
	const lines = [
		`${repo.name}: ${head.branch ?? "detached HEAD"} (${short(head.sha)}) vs ${base.ref} (${short(base.sha)}, ${BASE_SOURCES[base.source]})`,
		`diff from ${from}: ${data.commits.length} commits, ${totals.files} files, +${totals.additions} -${totals.deletions}`,
		...baseNotes(data)
	];
	if (data.commits.length > 0) lines.push("", "commits:");
	for (const commit of data.commits) lines.push(`  ${short(commit.sha)} ${commit.subject}`);
	if (data.files.length > 0) lines.push("", "files:");
	for (const file of data.files) {
		const path = file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path;
		const flags = [
			file.sources.join(","),
			file.generated && "generated",
			file.binary && "binary",
			file.patch === null && "too large to show"
		].filter(Boolean);
		lines.push(`  ${STATUS_CODES[file.status]} ${path} +${file.additions} -${file.deletions} [${flags.join("; ")}]`);
	}
	lines.push("", `folder: ${diffFolder(data)}`);
	return lines.join("\n");
}
function read(path) {
	try {
		return readFileSync(path, "utf8");
	} catch {
		throw new CliError(`can't read ${path}`);
	}
}
function readData(path) {
	try {
		return JSON.parse(read(path));
	} catch (error) {
		throw error instanceof SyntaxError ? new CliError(`${path} isn't valid JSON`) : error;
	}
}
var needsFixing = (problems) => new CliError(`the spec needs fixing:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
function write(path, contents) {
	mkdirSync(dirname(resolve(path)), { recursive: true });
	writeFileSync(path, contents);
}
function parse(args) {
	try {
		return parseArgs({
			args,
			allowPositionals: true,
			options: {
				data: { type: "string" },
				direct: { type: "boolean" },
				out: { type: "string" },
				"out-root": { type: "string" },
				repo: { type: "string" },
				spec: { type: "string" }
			}
		});
	} catch (error) {
		throw new CliError(`${error.message}\n${USAGE}`, 2);
	}
}
function run(argv) {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(USAGE);
		return 0;
	}
	const [command, ...rest] = argv;
	const { values, positionals } = parse(rest);
	const outRoot = values["out-root"];
	if (command === "collect" && values.out === void 0 !== (outRoot === void 0)) {
		const data = collect({
			cwd: values.repo ?? process.cwd(),
			base: positionals[0],
			direct: values.direct
		});
		const out = values.out ?? join(outRoot, diffFolder(data), "data.json");
		write(out, JSON.stringify(data));
		console.log(`${summarize(data)}\nwrote ${resolve(out)}`);
		return 0;
	}
	if (command === "patch" && values.data) {
		const { files } = readData(values.data);
		const unknown = positionals.filter((path) => !files.some((file) => file.path === path));
		if (unknown.length > 0) throw new CliError(unknown.map((path) => `${path} isn't a changed file`).join("\n"));
		for (const file of files) {
			if (positionals.length > 0 && !positionals.includes(file.path)) continue;
			console.log(file.patch === null ? `(${file.path}: too large to show)` : numberPatch(file.patch));
		}
		return 0;
	}
	if (command === "prompt") {
		console.log(specPrompt());
		return 0;
	}
	if (command === "render" && values.data && values.spec && values.out) {
		const data = readData(values.data);
		let spec;
		try {
			spec = parseSpec(read(values.spec));
		} catch (error) {
			throw error instanceof SpecError ? needsFixing(error.problems) : error;
		}
		const problems = checkSpec(spec, data);
		if (problems.length > 0) throw needsFixing(problems);
		const viewer = readFileSync(new URL("./viewer.html", import.meta.url), "utf8");
		const grammars = JSON.parse(readFileSync(new URL("./grammars.json", import.meta.url), "utf8"));
		write(values.out, renderHtml(viewer, {
			data,
			spec,
			grammars: pickGrammars(grammars, data)
		}));
		console.log(`wrote ${resolve(values.out)}`);
		return 0;
	}
	console.error(USAGE);
	return 2;
}
/** Runs a command and returns its exit code. Problems the user can fix print as plain messages. */
function main(argv) {
	try {
		return run(argv);
	} catch (error) {
		if (!(error instanceof CliError || error instanceof GitError)) throw error;
		console.error(error.message);
		return error instanceof CliError ? error.exitCode : 1;
	}
}
//#endregion
//#region src/bin.ts
process.exitCode = main(process.argv.slice(2));
//#endregion
export {};
