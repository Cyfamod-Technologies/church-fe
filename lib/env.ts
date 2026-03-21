const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(
  /\/+$/,
  "",
);

export const appEnv = {
  backendUrl,
  apiUrl: `${backendUrl}/api`,
};
