class Schedule {
constructor({ vendedor_id, dia_semana, hora_inicio, hora_fin }) {
this.vendedor_id = vendedor_id;
this.dia_semana = dia_semana;
this.hora_inicio = hora_inicio;
this.hora_fin = hora_fin;
}


static fromRow(row) {
return new Schedule({
vendedor_id: row.vendedor_id,
dia_semana: row.dia_semana,
hora_inicio: row.hora_inicio.slice(0, 5), // formatea "HH:mm:ss" → "HH:mm"
hora_fin: row.hora_fin.slice(0, 5),
});
}
}


module.exports = Schedule;