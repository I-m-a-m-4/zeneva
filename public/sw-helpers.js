/**
 * Polyfill for service worker to fix ReferenceError: _async_to_generator is not defined
 * This happens when the service worker is transpiled by tools like esbuild/babel
 * without injecting the necessary helper functions.
 */

// Helper implementation
function createAsyncHelper() {
    return function(fn) {
        return function() {
            var self = this, args = arguments;
            return new Promise(function(resolve, reject) {
                var gen = fn.apply(self, args);
                function _next(value) { step("next", value); }
                function _throw(err) { step("throw", err); }
                function step(key, arg) {
                    try {
                        var info = gen[key](arg);
                        var value = info.value;
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    if (info.done) {
                        resolve(value);
                    } else {
                        Promise.resolve(value).then(_next, _throw);
                    }
                }
                step("next");
            });
        };
    };
}

// Snake case version (reported in error)
if (typeof _async_to_generator === 'undefined') {
    self._async_to_generator = createAsyncHelper();
}

// Camel case version (standard Babel)
if (typeof _asyncToGenerator === 'undefined') {
    if (typeof _async_to_generator !== 'undefined') {
        self._asyncToGenerator = self._async_to_generator;
    } else {
        self._asyncToGenerator = createAsyncHelper();
    }
}

// Regenerator runtime alias
if (typeof _regeneratorRuntime === 'undefined' && typeof regeneratorRuntime !== 'undefined') {
    self._regeneratorRuntime = regeneratorRuntime;
}
