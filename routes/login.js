var express = require('express');
var router = express.Router();
const { login } = require('../controllers/login');

router.post('/', async function(req, res, next) {
  let token = await login(req.body)
     if(token){
         return res.json(token)
     }
     
     res.status(400).end()
});

module.exports = router;