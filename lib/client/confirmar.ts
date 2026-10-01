/** Pide confirmar una acción destructiva escribiendo el nombre de quién la hace (no es
 * una contraseña, solo texto libre) — para la auditoría, ya que el acceso admin es
 * compartido. Devuelve el nombre recortado, o null si se canceló o se dejó vacío. */
export function confirmarConNombre(mensaje: string): string | null {
  const nombre = window.prompt(`${mensaje}\n\nEscribí tu nombre para confirmar:`);
  if (!nombre || !nombre.trim()) return null;
  return nombre.trim();
}
