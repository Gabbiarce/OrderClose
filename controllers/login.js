const axios = require('axios');
const { setToken } = require('./token');
const { apiUrl, authenticateUrl, authorizeUrl } = require('./urls');

async function login(body){
  let data
  let token

  await axios.post(apiUrl + authenticateUrl, body)
  .then(response => {
      data = response
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
  });

  setToken(token);
  return data
}

module.exports = {
  login,
}