/**
 * Turns any thrown error into one short sentence a cashier can read.
 * - Native module rejections arrive as
 *   "Call to function 'ThermalPrinter.x' has been rejected.\n→ Caused by: <real message>"
 * - API errors carry the server's text in response.data.message
 */
export function friendlyError(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const apiMessage = err?.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage.trim();

  if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
    return 'The request took too long. Check your internet and try again.';
  }
  if (err?.message === 'Network Error') {
    return 'No internet connection. Please check your network.';
  }

  let message = String(err?.message || '').trim();
  const caused = message.split(/Caused by:/i);
  if (caused.length > 1) message = caused[caused.length - 1];
  message = message
    .replace(/^Call to function '.*?' has been rejected\.?/i, '')
    .replace(/^[\s→:.-]+/, '')
    .replace(/^[\w.]+Exception:\s*/, '')
    .trim();

  return message || fallback;
}
