// Configuración de la API
const API_URL = "http://localhost:1337/api";
const token = localStorage.getItem("token");

// ---------------------------------------------------------
// 🔴 CONFIGURACIÓN CRÍTICA: Nombre del campo de relación
// ---------------------------------------------------------
// Si Strapi te dio error "Invalid key producto", es que el campo
// se llama diferente. Prueba con: "inventario", "inventarios" o "ingrediente".
const NOMBRE_RELACION = "inventario"; 
// ---------------------------------------------------------

// INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 Ventas cargado. Usando relación:", NOMBRE_RELACION);
    cargarVentas();
});

// ------------------------------
// 1. Cargar Ventas
// ------------------------------
async function cargarVentas() {
    try {
        const res = await fetch(`${API_URL}/ventas?pagination[pageSize]=100&populate=*`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Error conectando con Strapi");

        const json = await res.json();
        const ventas = json.data || [];
        
        console.log("📦 Ventas recibidas:", ventas);

        // --- DIAGNÓSTICO DE NOMBRES ---
        if (ventas.length > 0) {
            console.group("🕵️‍♂️ PISTAS DE NOMBRES EN STRAPI:");
            console.log("Las llaves disponibles en una venta son:", Object.keys(ventas[0]));
            console.log(`¿Existe el campo '${NOMBRE_RELACION}'?`, ventas[0][NOMBRE_RELACION] !== undefined ? "✅ SÍ" : "❌ NO");
            console.groupEnd();
        }
        // -------------------------------

        mostrarVentas(ventas);

    } catch (err) {
        console.error(err);
        alert("Error al cargar ventas.");
    }
}

// ------------------------------
// 2. Mostrar en Tabla
// ------------------------------
function mostrarVentas(ventas) {
    const tbody = document.getElementById("tablaVentas");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (ventas.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6'>No hay ventas registradas.</td></tr>";
        return;
    }

    ventas.reverse().forEach(v => {
        const cantidad = v.cantidad || 0;
        const total = v.total || 0;
        const fecha = v.fecha ? v.fecha.substring(0, 10) : "—";
        const docId = v.documentId;

        // ACCEDEMOS USANDO LA VARIABLE DE CONFIGURACIÓN
        const dataRelacion = v[NOMBRE_RELACION]; 
        
        let nombreMostrar = "⚠️ Sin Producto";
        
        if (dataRelacion && dataRelacion.nombreIngrediente) {
            nombreMostrar = dataRelacion.nombreIngrediente;
        } else if (dataRelacion === null) {
            nombreMostrar = "🚫 No vinculado";
        } else {
            // Si entra aquí, es que el nombre de la variable NOMBRE_RELACION está mal
            // o Strapi no devolvió los datos (falta populate)
            nombreMostrar = "❓ Error Nombre Campo";
        }

        const fila = `
            <tr>
                <td><strong>${nombreMostrar}</strong></td>
                <td>${cantidad}</td>
                <td>$${total}</td>
                <td>${fecha}</td>
                <td class="action-btn" onclick="eliminarVenta('${docId}')">🗑️</td>
            </tr>
        `;
        tbody.innerHTML += fila;
    });
}

// ------------------------------
// 3. Nueva Venta
// ------------------------------
async function nuevaVenta() {
    // A. Cargar inventario
    let inventario = [];
    try {
        const res = await fetch(`${API_URL}/inventarios?pagination[pageSize]=100`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await res.json();
        inventario = json.data || [];
    } catch (e) {
        alert("Error leyendo inventario.");
        return;
    }

    if (inventario.length === 0) {
        alert("Inventario vacío.");
        return;
    }

    // B. Elegir
    let menu = "Escribe el NÚMERO del producto:\n\n";
    inventario.forEach((item, index) => {
        menu += `${index + 1}. ${item.nombreIngrediente} ($${item.precioUnitario})\n`;
    });

    const seleccion = prompt(menu);
    if (!seleccion) return;

    const productoElegido = inventario[parseInt(seleccion) - 1];
    if (!productoElegido) { alert("Inválido"); return; }

    // C. Cantidad
    const cantInput = prompt(`Vender: ${productoElegido.nombreIngrediente}\nPrecio: $${productoElegido.precioUnitario}\n\nCantidad:`);
    const cantidad = parseFloat(cantInput);
    if (isNaN(cantidad) || cantidad <= 0) { alert("Cantidad mala"); return; }

    const totalVenta = cantidad * productoElegido.precioUnitario;

    if (!confirm(`Total: $${totalVenta}. ¿Guardar?`)) return;

    // D. Construir objeto (USANDO EL NOMBRE DINÁMICO)
    const nuevaVentaData = {
        fecha: new Date().toISOString(),
        cantidad: cantidad,
        total: totalVenta,
        estado: "completada"
    };

    // AQUI ES DONDE OCURRIA EL ERROR "Invalid Key"
    // Ahora usamos la variable correcta como llave del objeto
    nuevaVentaData[NOMBRE_RELACION] = productoElegido.documentId;

    console.log("Enviando JSON:", nuevaVentaData);

    try {
        const res = await fetch(`${API_URL}/ventas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ data: nuevaVentaData })
        });

        if (!res.ok) {
            const errorTxt = await res.json();
            console.error("Detalle Error Strapi:", errorTxt);
            
            // Mensaje amigable si vuelve a fallar la llave
            if (errorTxt.error && errorTxt.error.message.includes("Invalid key")) {
                alert(`¡ERROR DE NOMBRE! El campo '${NOMBRE_RELACION}' no existe en Strapi.\nRevisa la variable NOMBRE_RELACION al inicio del archivo JS.`);
            } else {
                alert("Error: " + JSON.stringify(errorTxt.error.message));
            }
            return;
        }

        alert("✅ Venta Guardada.");
        cargarVentas();

    } catch (err) {
        console.error(err);
        alert("Error de conexión.");
    }
}

// ------------------------------
// 4. Eliminar
// ------------------------------
async function eliminarVenta(docId) {
    if (!confirm("¿Borrar?")) return;
    try {
        const res = await fetch(`${API_URL}/ventas/${docId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            alert("🗑️ Borrado.");
            cargarVentas();
        } else {
            alert("Error al borrar.");
        }
    } catch (e) { console.error(e); }
}