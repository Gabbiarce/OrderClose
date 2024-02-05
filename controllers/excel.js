const XLSX = require('xlsx');
const fs = require('fs');

let excel;
let workbook;
let url;

function setExcel(urlExcel) {
    if(urlExcel){
        url = urlExcel
        workbook = XLSX.readFile(url);
        const sheet_name = workbook.SheetNames[0];
        excel = workbook.Sheets[sheet_name];
    }
    return excel
}

function cantidadDeOT(){
    let nombreColumna = 'OT'
    let letraColumna = devolverColumna(nombreColumna)
    let celdas = 0;

    if (letraColumna) {
        celdas = Object.keys(excel).filter(celda => {
            let columna = celda.startsWith(letraColumna);
            let esFila2oSuperior = parseInt(celda.substring(1)) >= 2;
            return columna && esFila2oSuperior && excel[celda].v !== undefined;
        });
    }else {
        console.log('No se encontró la columna con '+nombreColumna+' en la fila 1.');
    }

    return celdas.length
}

function primeraOtVacia(){
    let nombreColumna = 'DESCRIPCION'
    let letraColumna = devolverColumna(nombreColumna)
    let fila = 1;
    let seEncontroCeldaVacia = false;

    if (letraColumna) {
        console.log();
        while (fila <= cantidadDeOT() && !seEncontroCeldaVacia) {
            fila++;
            let celda = letraColumna + fila;
            if (excel[celda] == null || excel[celda].v == null) {
                seEncontroCeldaVacia = true;
            }
        }
    }else {
        console.log('No se encontró la columna con '+nombreColumna+' en la fila 1.');
    }
    return fila
}

function devolverColumna(name){
    let letraColumna = null;
    let columna
    if (excel && typeof excel === 'object') {
        columna = Object.keys(excel).find(celda => excel[celda].v === name && /^[A-Z]1$/.test(celda));
        if(columna){
            letraColumna = columna.substring(0, 1);
        }
      } else {
        console.error('La variable excel no está definida o no es un objeto válido.');
      }
    //let columna = Object.keys(excel).find(celda => excel[celda].v === name && /^[A-Z]1$/.test(celda));
    return letraColumna
}

function modificarExcel(fila, estado, descripcion){
    const columnaEstado = devolverColumna('ESTADO');
    const columnaDescripcion = devolverColumna('DESCRIPCION');
    XLSX.utils.sheet_add_aoa(excel, [[estado]], { origin: `${columnaEstado}${fila}` });
    XLSX.utils.sheet_add_aoa(excel, [[descripcion]], { origin: `${columnaDescripcion}${fila}` });
    guardarExcel()
}

function modificarExcel(fila, estado, descripcion, error){
    const columnaEstado = devolverColumna('ESTADO');
    const columnaDescripcion = devolverColumna('DESCRIPCION');
    const columnaError = devolverColumna('ERROR');
    XLSX.utils.sheet_add_aoa(excel, [[estado]], { origin: `${columnaEstado}${fila}` });
    XLSX.utils.sheet_add_aoa(excel, [[descripcion]], { origin: `${columnaDescripcion}${fila}` });
    XLSX.utils.sheet_add_aoa(excel, [[error]], { origin: `${columnaError}${fila}` });
    guardarExcel()
}

function guardarExcel() {
    fs.writeFileSync(url, XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }));
}

module.exports = {
setExcel, 
cantidadDeOT, 
primeraOtVacia, 
devolverColumna, 
modificarExcel, 
guardarExcel,
};