
let authToken = null;

function setToken(token) {
  authToken = token;
}

function getToken() {
  return authToken;
}

module.exports = { setToken, getToken };