const readline = require('readline');
const prompt = require('prompt-sync')();
const fs = require('fs').promises;
const xlsx = require('xlsx');
const { cantidadDeOT, primeraOtVacia, devolverColumna, modificarExcel, crearExcel} = require('./controllers/excel');
const { login } = require('./controllers/login');
const { checkRedirect, order, availability, appointment, close, motive, setOrden, contact, search} = require('./controllers/order');

const logRojo = '\x1b[31m%s\x1b[0m'
const logVerde = '\x1b[32m%s\x1b[0m'

let user;
let excel
let estado

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

run()

async function getUser() {
    const data = await fs.readFile('user.txt', 'utf8');
    const user = JSON.parse(data);
    return user;
}

async function run(){
    try {
        if(!user){
            user = await getUser()
            estado = await login(user)
        }
        excel = await cargarExcel()
        //Trae primer OT que tenga la celda descripcion vacia.
        let fila = primeraOtVacia();
        cantOT = cantidadDeOT()
        if(cantOT === 0){
            console.log(logRojo,'No hay OT para recorrer.\n');
            await validarInput(await continuar())
            return;
        }
        //Ciclamos todo el excel, en caso de tener inconveniente con la sesion salimos del ciclo.
        while (fila <= cantOT + 1 && estado === 200) {
            let descripcionCelda = excel[devolverColumna('DESCRIPCION') + fila];
            if (descripcionCelda == null || descripcionCelda.v == null) {
                estado = await cierre(excel[devolverColumna('OT') + fila].v, fila, estado);
            }
            fila++;
        }
    if(estado !== 200){
        console.log(logRojo,'Se corto el ciclo por error al logearse.\n');
    }else{
        console.log(logVerde, 'Excel completado.');
    }
    await validarInput(await continuar())
    }catch (error) {
        console.error("Error:", error.message,"\n");
        await validarInput(await continuar())
    }
}

async function cargarExcel() {
    try {
        const data = await fs.readFile('rutaExcel.txt', 'utf8');
        let urlExcel = data.replace(/\\/g, '\\\\')
        xlsx.readFile(urlExcel);
        let excel = crearExcel(urlExcel);
        console.log(logVerde,'Datos del archivo Excel cargados correctamente.\n');
        return excel
    } catch (error) {
        console.error(logRojo,'Error al cargar el archivo Excel:', error.message,'\n');
    }
}

async function continuar() {
    return new Promise((resolve) => {
        console.log("\n*** ¿Desea continuar? ***"
                    ,"\n1 - Para continuar"
                    ,"\n2 - Salir"
        );
        rl.question("", (input) => {
            if (!input.trim()) {
                console.log(logRojo,'Por favor, ingrese un numero valido.\n');
                resolve(continuar());
            }else if(input === '1' || input === '2'){
                resolve(input);
            }else{
                console.log(logRojo,'Por favor, ingrese 1 o 2.\n');
                resolve(continuar());
            }
            
        });
    });
}

async function validarInput(input){
    if(input === '1'){
        run();
    }else{
        rl.close();
    }
}

async function devolverEstado(){
    let orden = await order()
    let estado = null;
    if(orden){
        estado = orden.workOrderDetails.status
    }
    return estado
}

function devolverLocalidad(localidades, direccion){
    //Filtra entre todas las localidades la que tiene el mismo nombre que el partido.

    let localidad = localidades.data.filter(item => item.name.includes(direccion.department));
    if(localidad.length == 0){
        //Filtra entre todas las localidades la que tiene el mismo nombre que la localidad.
        localidad = localidades.data.filter(item => item.name.includes(direccion.city));
        if(localidad.length == 0){
            localidad = localidades.data
        }
    }
    return localidad
}

async function cierre(ordenNumber, fila, estado){
    if(estado === 200){
        //Seteamos la orden que vamos a trabajar.
        setOrden(ordenNumber)
        //Funcion que verifica si la orden existe.
        let check = await checkRedirect()
        //Si la funcion devuelve 200 es por que la orden existe.
        if(check === 200){
            //Retorna el objeto que contiene todos los datos del cliente.
            let ordenDetails = await order()
            //Retorna el estado que tiene esa orden.
            let localidadExcel = ordenDetails.clientDetails.address.city
            let partidoExcel = ordenDetails.clientDetails.address.department
            let status = await devolverEstado()
            //Verificamos si el estado de la orden esta Finalizada.
            if(status !== 'F'){
                let contacto = ordenDetails.clientDetails.contacts
                //Verifico si el cliente tiene contactos, al no tenerlo le tengo que asignar uno.
                if(contacto.length === 0){
                    await contact(ordenDetails)
                }
                //Retorna todas las localidades.
                let localidad = await search()
                //Busca entre todas las localidades y guardamos la que coincide con la direccion del cliente.
                localidad = devolverLocalidad(localidad, ordenDetails.clientDetails.address)
                //Retorna si hay cupo de disponibilidad para esa localidad.
                let disponibilidad = await availability(ordenNumber, localidad)
                //Verificamos si hay disponibilidad.
                if(disponibilidad){
                    //Retorna el cupo mas lejano disponible.
                    let date = await appointment(disponibilidad, localidad)
                    if(date){
                        //Retorna todos los motivos de cierres.
                        let motivos = await motive()
                        if(motivos){
                            let text;
                            let mostrarText;
                            //Cerramos la orden
                            let error = await close(motivos)
                            let status = await devolverEstado()
                            //Retornamos nuevamente el estado de la orden y verificamos si esta en 'F'.
                            if(status !== 'F'){
                                text = "No se pudo cerrar la orden"
                                mostrarText = text
                            }else{
                                text = "OK"
                                mostrarText = "La OT se cerro correctamente"
                            }
                            modificarExcel(fila,status,text,error,localidadExcel,partidoExcel)
                            console.log(mostrarText,ordenNumber);
                        }
                    }else{
                        let status = await devolverEstado()
                        const text = "No se pudo agendar la orden"
                        modificarExcel(fila,status,text,'',localidadExcel,partidoExcel)
                        console.log(text,ordenNumber);
                    }
                }else{
                    let status = await devolverEstado()
                    const text = "Error al traer la disponibilidad"
                    modificarExcel(fila,status,text,'',localidadExcel,partidoExcel)
                    console.log(text,ordenNumber);
                }
            }else{
                let status = await devolverEstado()
                const text = "La orden ya esta cerrada"
                modificarExcel(fila,status,text,'',localidadExcel,partidoExcel)
                console.log(text,ordenNumber);
            }
        }else{
            let text;
            //Si la funcion devuelve 404 la orden no existe
            if(check === 404){
                text = "La orden no existe"
            }else{
                //Si funcion no devuelve ninguno de esos estados es por que se corto la conexion.
                text = "Hubo un error, verificar conexion."
                //Intentamos conectarnos nuevamente
                estado = await login(user)
            }
            modificarExcel(fila,'',text,'','')
            console.log(text,ordenNumber);
        }
    }else{
        const text = "Error al logearse"
        modificarExcel(fila,'',text,'','')
        console.log(text,ordenNumber);
    }

    return estado
}