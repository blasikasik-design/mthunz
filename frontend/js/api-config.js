window.API_BASE_URL = 'https://nthuzi.onrender.com';
window.apiUrl = function(path) {
  return new URL(path, window.API_BASE_URL).toString();
};