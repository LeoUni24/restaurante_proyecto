// Configuración de la API
const API_URL = "https://restaurante-api-bz1t.onrender.com/api";
const token = localStorage.getItem("token");

// Variable global para guardar los datos cargados
let inventarioCache = [];

// ------------------------------
// INICIALIZACIÓN SEGURA
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 Iniciando sistema de inventario (Strapi v5)...");
    cargarInventario();
});

// ------------------------------
// 1. Cargar datos desde Strapi
// ------------------------------
async function cargarInventario() {
    try {
        console.log(`📡 Consultando: ${API_URL}/inventarios`);
        
        const res = await fetch(`${API_URL}/inventarios?pagination[pageSize]=100`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error Strapi (${res.status}): ${errorText}`);
        }

        const json = await res.json();
        console.log("📦 Datos recibidos:", json);

        // Guardamos los datos. En v5 vienen directos en json.data
        inventarioCache = json.data || [];
        mostrarInventario(inventarioCache);

    } catch (err) {
        console.error("❌ Error cargando inventario:", err);
        alert("Error al cargar datos. Revisa la consola.");
    }
}

// ------------------------------
// 2. Mostrar datos en la tabla (Adaptado a Strapi v5)
// ------------------------------
function mostrarInventario(datos) {
    const tbody = document.getElementById("tablaInventario");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (!datos || datos.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6'>No hay productos registrados.</td></tr>";
        return;
    }

    datos.forEach(item => {
        // En Strapi v5, usamos 'documentId' para editar/borrar. 
        // El 'id' numérico solo sirve para visualización interna si quieres.
        const idParaAcciones = item.documentId; 

        // En tu JSON v5, los datos están directos, NO en 'attributes'
        const nombre = item.nombreIngrediente || "Sin nombre";
        const cantidad = item.cantidad || 0;
        const unidad = item.unidad || "-";
        const precio = item.precioUnitario || 0;

        const tr = document.createElement("tr");

        // IMPORTANTE: Pasamos el idParaAcciones entre comillas simples '' porque es texto
        tr.innerHTML = `
            <td>${nombre}</td>
            <td>${cantidad}</td>
            <td>${unidad}</td>
            <td>$${precio}</td>
            <td class="action-btn" onclick="editarProducto('${idParaAcciones}')">✏️</td>
            <td class="action-btn" onclick="eliminarProducto('${idParaAcciones}')">🗑️</td>
        `;

        tbody.appendChild(tr);
    });
}

// ------------------------------
// 3. Agregar nuevo producto
// ------------------------------
async function agregarProducto() {
    const nombreIngrediente = prompt("Nombre del ingrediente:");
    if (!nombreIngrediente) return; 

    const cantidad = parseFloat(prompt("Cantidad:"));
    const unidad = prompt("Unidad (ej: kg, litros, unidad):"); 
    const precioUnitario = parseFloat(prompt("Precio Unitario:"));

    if (isNaN(cantidad) || !unidad || isNaN(precioUnitario)) {
        alert("Datos inválidos.");
        return;
    }

    const nuevoProducto = {
        nombreIngrediente,
        cantidad,
        unidad,
        precioUnitario
    };

    try {
        const res = await fetch(`${API_URL}/inventarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ data: nuevoProducto })
        });

        if (!res.ok) throw new Error(await res.text());

        alert("✅ Agregado correctamente.");
        cargarInventario(); 

    } catch (err) {
        console.error(err);
        alert("Error al guardar. Revisa que la unidad sea válida.");
    }
}

// ------------------------------
// 4. Editar producto (Usando documentId)
// ------------------------------
async function editarProducto(documentId) {
    console.log("📝 Editando Document ID:", documentId);

    // Buscar en caché usando documentId
    const item = inventarioCache.find(p => p.documentId === documentId);

    if (!item) {
        alert("Error: No se encuentran los datos en memoria.");
        return;
    }

    const nuevoNombre = prompt("Nuevo nombre:", item.nombreIngrediente);
    const nuevaCantidad = parseFloat(prompt("Nueva cantidad:", item.cantidad));
    const nuevaUnidad = prompt("Nueva unidad:", item.unidad);
    const nuevoPrecio = parseFloat(prompt("Nuevo precio:", item.precioUnitario));

    if (!nuevoNombre || isNaN(nuevaCantidad) || !nuevaUnidad || isNaN(nuevoPrecio)) {
        alert("Datos inválidos.");
        return;
    }

    const datosActualizados = {
        nombreIngrediente: nuevoNombre,
        cantidad: nuevaCantidad,
        unidad: nuevaUnidad,
        precioUnitario: nuevoPrecio
    };

    try {
        // En Strapi v5, la URL para editar usa el documentId
        const res = await fetch(`${API_URL}/inventarios/${documentId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ data: datosActualizados })
        });

        if (!res.ok) throw new Error(await res.text());

        alert("✅ Actualizado correctamente.");
        cargarInventario();

    } catch (err) {
        console.error(err);
        alert("Error al actualizar el producto.");
    }
}

// ------------------------------
// 5. Eliminar producto (Usando documentId)
// ------------------------------
async function eliminarProducto(documentId) {
    console.log("🗑️ Intentando eliminar Document ID:", documentId);

    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

    try {
        const res = await fetch(`${API_URL}/inventarios/${documentId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const error = await res.text();
            if(res.status === 404) alert("Error 404: Strapi no encuentra ese Document ID.");
            else alert(`Error ${res.status}: ${error}`);
            return;
        }

        alert("🗑️ Eliminado correctamente.");
        cargarInventario();

    } catch (err) {
        console.error(err);
        alert("Error al eliminar.");
    }
}