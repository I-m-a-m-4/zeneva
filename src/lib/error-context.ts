/**
 * Tenant identity for errors that are handled outside React's render tree
 * (window errors, unhandled rejections). The authenticated shell owns the
 * values; the root-level catcher reads them so an async crash is attributed to
 * the right user and business no matter which route is on screen.
 */
interface ErrorContext {
  userId?: string;
  businessId?: string;
}

let current: ErrorContext = {};

export const setErrorContext = (context: ErrorContext) => {
  current = context;
};

export const getErrorContext = (): ErrorContext => current;
