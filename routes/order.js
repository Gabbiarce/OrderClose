var express = require('express');
var router = express.Router();
const { checkRedirect, order, availability, appointment, close, motive, contact, search} = require('../controllers/order');

router.get('/', async function(req, res, next) {
  let check = await checkRedirect();
     if(check){
         let orden = await order();
         if(orden){
            return res.json(orden)
         }
         res.status(400).end()
     }else{
        return res.status(404).end();
     }
});

router.post('/agendar', async function(req, res, next) {
    let orden = await order()
    let contacto = orden.clientDetails.contacts
    if(!contacto){
        await contact(orden)
    }
    let localidad = await search()
    localidad = localidad.data.filter(item => item.name === orden.clientDetails.address.city);
    let disponibilidad = await availability(orden.workOrderDetails.workOrderNumber, localidad);
    if(disponibilidad){
        let date = await appointment(disponibilidad, localidad)
        if(date){
            return res.json(date)
        }
        res.status(400).end()
    }else{
        res.status(404).end()
    }
});

router.post('/cerrar', async function(req, res, next) {
    let motivo = await motive()
    if(motivo){
        await close(motivo);
        return res.json("Orden cerrada exitosamente.");
    }
    res.status(400).end()
});

module.exports = router;