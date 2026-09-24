import axios from "axios";
import Cookies from "js-cookie";


const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Where the app should land when both tokens are dead.
const LOGGED_OUT_REDIRECT = "/register";


const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";

const cookieOptions = {
  secure: window.location.protocol === "https:",
  sameSite: "strict",
};

export function getAccessToken() {
  console.log(" Access Token",Cookies.get(ACCESS_TOKEN_COOKIE));
  return Cookies.get(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken() {
  console.log("Refresh Token",Cookies.get(REFRESH_TOKEN_COOKIE))
  return Cookies.get(REFRESH_TOKEN_COOKIE);
}

export function setTokens({ accessToken, refreshToken }) {

  console.log("========== SET TOKENS ==========");
  console.log("accessToken received:", accessToken);
  console.log("refreshToken received:", refreshToken);

  if (accessToken) {
    Cookies.set("accessToken", accessToken, {
      ...cookieOptions,
      expires: 1 / 96,
    });
  }

  if (refreshToken) {
    Cookies.set("refreshToken", refreshToken, {
      ...cookieOptions,
      expires: 7,
    });
  }

  console.log("access cookie after set:", Cookies.get("accessToken"));
  console.log("refresh cookie after set:", Cookies.get("refreshToken"));
  console.log("================================");
}



export function clearTokens() {
  Cookies.remove(ACCESS_TOKEN_COOKIE);
  Cookies.remove(REFRESH_TOKEN_COOKIE);
}

// ---- main instance ---------------------------------------------------------

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

const refreshClient = axios.create({ baseURL: BASE_URL });

// ---- request interceptor: attach access token ------------------------------

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- response interceptor: refresh-on-401, with a queue --------------------

let isRefreshing = false;
let pendingQueue = []; // { resolve, reject } for requests waiting on refresh

function resolveQueue(error, newAccessToken = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newAccessToken);
  });
  pendingQueue = [];
}

function redirectToSignup() {
  clearTokens();
  // Full reload clears any in-memory app/user state along with the tokens.
  if (window.location.pathname !== LOGGED_OUT_REDIRECT) {
    window.location.href = LOGGED_OUT_REDIRECT;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Not a 401, or we've already retried this request once — give up.
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      redirectToSignup();
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request until it's done.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((newAccessToken) => {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await refreshClient.post("/auth/refresh", {
        refreshToken,
      });

  
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken ?? refreshToken;

      setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
      resolveQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh token is expired/invalid too — nothing left to try.
      resolveQueue(refreshError);
      redirectToSignup();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const { data } = await refreshClient.post("/users/refreshToken", {
    
    refreshToken,
  });
  console.log("Access token refreshed")
  const newAccessToken = data.data.accessToken;      
  const newRefreshToken = data.data.refreshToken ?? refreshToken;

  setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  return newAccessToken;
}


export async function login({ email, password }) {
  
  const { data } = await refreshClient.post("/users/login", { email, password });

  console.log("Sucessfully logged in",data);

  setTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
  return data; 
}

export async function register({ fullName, state, city,username, email, password }) {
  const { data } = await refreshClient.post("/users/register", {
    fullName,
    state, 
    city,
    username,
    email,
    password,
  });

  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.user;
}

export async function logout() {
  console.log("Clicked on logout");
  try {
    
    await api.post("/users/logout"); 
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 409) {
      console.log(`Logout call failed with ${status}, redirecting to login anyway`);
    } else {
      console.error("Logout request failed:", error);
    }
  } finally {
    clearTokens();
    window.location.href = "/login";
  }
}