const axios = require('axios');
const { setToken } = require('./token');
const { apiUrl, authenticateUrl, authorizeUrl } = require('./urls');

async function login(usuario){
  let status
  let token

  let body = {
    "password": usuario.password,
    "userName": usuario.username
  }

  await axios.post(apiUrl + authenticateUrl, body)
  .then(response => {
      status = response.status
      token = response.data.jwtToken;
    return axios.get(apiUrl + authorizeUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  })
  .then(response => {
      token = response.data.jwtToken;
  })
  .catch(error => {
    if(error.response){
      status = error.response.status
    }
  });

  setToken(token);
  return status
}

module.exports = {
  login,
}