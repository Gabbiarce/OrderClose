const axios = require('axios');
const { getToken } = require('./token');
const { apiUrl } = require('./urls');

let ordenId;

function setOrden(number){
  ordenId = number;
}

async function checkRedirect(){
  let checkRedirectUrl =`/AR/order/${ordenId}/check-redirect`;
  let estado;

  await axios.get(apiUrl + checkRedirectUrl,{
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  })
  .then(response => {
    estado = response.status
  })
  .catch(error => {
    if (error.response) {
        estado = error.response.status
    } else if (error.request) {
        console.log("No se recibio respuesta del servidor");
    } else {
        console.log("Error al configurar la solicitud: ", error.message);
    }
});
  return estado
}

async function order(){
    let orderUrl =`/AR/order/${ordenId}`;
    let orden
    await axios.get(apiUrl + orderUrl,{
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  })
  .then(response => {
      orden = response.data
  })
  .catch(error => {
  });
  return orden
}

async function search(){
  const searchUrl ='/AR/locality/search';
  let localidad
  body = {
    "enabled": true
  }
await axios.post(apiUrl + searchUrl, body,{
  headers: {
    'Authorization': `Bearer ${getToken()}`,
  },
})
.then(response => {
    localidad = response.data
})
.catch(error => {
});

return localidad
}

async function availability(orden, localidad){
    const availabilityUrl ='/AR/appointment/availability';
    let disponibilidad = null;

    if(localidad.length > 0){
        body = {
            "locationId": localidad[0].id,
            "orderId": orden
        }
        await axios.post(apiUrl + availabilityUrl, body,{
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          },
        })
        .then(response => {
              disponibilidad = response.data
        })
        .catch(error => {
        });
    }
  return disponibilidad
}

async function appointment(disponibilidad, localidad){
    let appointmentUrl =`/AR/appointment/${ordenId}`;
    let date = searchDate(disponibilidad)

    if(date){
        const timeSlotDisponible = date.timeSlots.find(slot => slot.available);
      
        body = {
            "date": date.date,
            "locationId": localidad[0].id,
            "observation": "",
            "timeSlotId": timeSlotDisponible.timeSlotId,
            "operationCategory": ""
        }
        await axios.post(apiUrl + appointmentUrl, body,{
          headers: {
        'Authorization': `Bearer ${getToken()}`,
        },
        })
        .then(response => {
        date = response.data
        })
        .catch(error => {
        });
    }
    
    return date
}

function searchDate(disponibilidad) {
    let date = null;
  
    if (disponibilidad) {
      const disponibilidadArray = disponibilidad.data;
      const fechasDisponibles = disponibilidadArray.filter(fecha =>
        fecha.timeSlots.some(slot => slot.available)
      );
      fechasDisponibles.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (fechasDisponibles.length > 0) {
        date = fechasDisponibles[0];
      }
    }
    return date;
}

async function close(motivos, NIM) {
    let closeUrl = `/AR/order/${ordenId}/close`;
    let motivo = identificarMotivo(motivos.data, NIM)
    let mensaje = "";

    body = {
        "reasonId": motivo
    }

    await axios.post(apiUrl + closeUrl, body,{
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    })
    .catch(error => {
      mensaje = error.response.data.error.message;
    });
    return mensaje
}

async function motive() {
    const motiveUrl = '/AR/reasons/filter/crm';
    let motivo;
    body = {
        "businessType": "IF/TF",
        "enabled": true,
        "operationType": "VIBAJ",
        "orderState": "A",
        "reasonType": "C",
    }
      
    await axios.post(apiUrl + motiveUrl, body,{
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    })
    .then(response => {
        motivo = response.data
    })
    .catch(error => {
    });
    return motivo
}

async function contact(orden){
  let clientNumber = orden.clientDetails.clientId
  let nim = orden.clientDetails.serviceNumber
  let contactUrl = `/AR/client/${clientNumber}/service/${nim}/contact`;

  body = {
    "contactName": "prueba",
    "contactType": "SITE",
    "emailAddress": "prueba@prueba.com.ar",
    "telephoneNumber": "12345678",
    "telephoneType": "FIJO",
    "whatsappNotifications": false
  }
    
  await axios.post(apiUrl + contactUrl, body,{
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  })
  .catch(error => {
  });
}

function identificarMotivo(motivos, NIM){
    let nameCierre
    if(NIM[0] === "0"){
      nameCierre = "Liberación MDU No Exitosa"
    }else{
      nameCierre = "Retiro STB no Libera Pasiva"
    }
    motivos = motivos.filter(item => item.name === nameCierre);
    return motivos[0].id
}

module.exports = {
  checkRedirect,
  order,
  availability,
  appointment,
  close,
  motive,
  setOrden,
  contact,
  search
}