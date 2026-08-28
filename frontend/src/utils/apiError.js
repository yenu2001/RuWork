const SAFE_FALLBACKS = {
  400: "Please review the information and try again.",
  401: "The email or password you entered is incorrect.",
  403: "You do not have access to complete this action.",
  409: "This request conflicts with an existing account.",
  429: "Please wait before trying again.",
  500: "RuWork could not complete the request. Please try again.",
  503: "This service is temporarily unavailable. Please try again shortly."
};

export function getApiError(error, fallback = "We could not complete that request. Please try again.") {
  if (!error?.response) {
    if (!error?.isAxiosError && typeof error?.message === "string") {
      return {
        message: error.message,
        code: "CLIENT_RESPONSE_ERROR",
        status: 0
      };
    }
    return {
      message: "We could not connect to RuWork. Check your connection and ensure the API is running.",
      code: "NETWORK_ERROR",
      status: 0
    };
  }

  const status = error.response.status;
  const data = error.response.data;
  return {
    message: typeof data?.error === "string" ? data.error : SAFE_FALLBACKS[status] || fallback,
    code: typeof data?.code === "string" ? data.code : "REQUEST_FAILED",
    status,
    retryAfterSeconds: Number(data?.retryAfterSeconds || error.response.headers?.["retry-after"]) || 0
  };
}
