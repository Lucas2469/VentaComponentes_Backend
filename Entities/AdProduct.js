class AdProduct {
  constructor({ id, nombre, apellido, creditos_disponibles, estado, tipo_usuario }) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.creditos_disponibles = Number(creditos_disponibles);
    this.estado = estado;
    this.tipo_usuario = tipo_usuario;
  }
  estaActivo() { return this.estado === 'activo'; }
  tieneCreditosParaPublicar(cantidad) { return this.creditos_disponibles >= cantidad; }
  descontarCreditos(cantidad) {
    if (this.creditos_disponibles >= cantidad) {
      this.creditos_disponibles -= cantidad;
      return true;
    }
    return false;
  }
}
module.exports = AdProduct;