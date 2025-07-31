import { jwtDecode } from 'jwt-decode';

// Token management
export const setToken = (token) => {
  localStorage.setItem('beatspace_token', token);
};

export const getToken = () => {
  return localStorage.getItem('beatspace_token');
};

export const removeToken = () => {
  localStorage.removeItem('beatspace_token');
  localStorage.removeItem('beatspace_user');
};

// User management
export const setUser = (user) => {
  localStorage.setItem('beatspace_user', JSON.stringify(user));
};

export const getUser = () => {
  const user = localStorage.getItem('beatspace_user');
  return user ? JSON.parse(user) : null;
};

// Token validation
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch (error) {
    return false;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  return token && isTokenValid(token);
};

// Get user role
export const getUserRole = () => {
  const user = getUser();
  return user ? user.role : null;
};

// Check if user has specific role
export const hasRole = (role) => {
  const userRole = getUserRole();
  return userRole === role;
};

// Logout function
export const logout = () => {
  removeToken();
  window.location.href = '/';
};

// API headers with authorization
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
};