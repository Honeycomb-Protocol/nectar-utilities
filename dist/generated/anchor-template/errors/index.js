"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorFromName = exports.errorFromCode = exports.OverflowError = void 0;
const createErrorFromCodeLookup = new Map();
const createErrorFromNameLookup = new Map();
class OverflowError extends Error {
    constructor() {
        super('Opertaion overflowed');
        this.code = 0x1770;
        this.name = 'Overflow';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, OverflowError);
        }
    }
}
exports.OverflowError = OverflowError;
createErrorFromCodeLookup.set(0x1770, () => new OverflowError());
createErrorFromNameLookup.set('Overflow', () => new OverflowError());
function errorFromCode(code) {
    const createError = createErrorFromCodeLookup.get(code);
    return createError != null ? createError() : null;
}
exports.errorFromCode = errorFromCode;
function errorFromName(name) {
    const createError = createErrorFromNameLookup.get(name);
    return createError != null ? createError() : null;
}
exports.errorFromName = errorFromName;
//# sourceMappingURL=index.js.map