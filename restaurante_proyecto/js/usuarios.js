// Configuración de la API
// NOTA: Si usas la colección por defecto de Strapi, cambia esto a "/users".
// Si creaste una colección propia llamada "Usuario", déjalo en "/usuarios".
const API_URL = "http://localhost:1337/api";
const ENDPOINT = "/usuarios"; 

const token = localStorage.getItem("token");

// INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 Gestión de Usuarios cargada.");
    cargarUsuarios();
});

// Variable para caché (útil para editar)
let usuariosCache = [];

// ------------------------------
// 1. Cargar Usuarios
// ------------------------------
async function cargarUsuarios() {
    try {
        console.log(`📡 Consultando: ${API_URL}${ENDPOINT}`);

        const res = await fetch(`${API_URL}${ENDPOINT}?pagination[pageSize]=100`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(await res.text());

        const json = await res.json();
        usuariosCache = json.data || []; // Strapi v5: datos directos en .data

        console.log("📦 Usuarios recibidos:", usuariosCache);
        mostrarUsuarios(usuariosCache);

    } catch (err) {
        console.error(err);
        alert("Error al cargar la lista de usuarios.");
    }
}

// ------------------------------
// 2. Mostrar en Tabla
// ------------------------------
function mostrarUsuarios(lista) {
    const tbody = document.getElementById("tablaUsuarios");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (lista.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6'>No hay usuarios registrados.</td></tr>";
        return;
    }

    lista.forEach(u => {
        // En Strapi v5 los datos vienen planos
        const nombre = u.nombre || "—";
        const usuario = u.usuario || "—";
        const rol = u.rol || "Sin rol";
        const activo = u.activo ? "🟢" : "🔴"; // Visual para el booleano
        const docId = u.documentId; // Necesario para editar/borrar

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${nombre} <small>(${activo})</small></td>
            <td>${usuario}</td>
            <td>${rol}</td>
            <td class="action-btn" onclick="editarUsuario('${docId}')">✏️</td>
            <td class="action-btn" onclick="eliminarUsuario('${docId}')">🗑️</td>
        `;

        tbody.appendChild(tr);
    });
}

// ------------------------------
// 3. Nuevo Usuario (POST)
// ------------------------------
async function nuevoUsuario() {
    // A. Pedir datos
    const nombre = prompt("Nombre completo del empleado:");
    if (!nombre) return;

    const usuario = prompt("Nombre de usuario (para login):");
    const contrasena = prompt("Contraseña:");
    const rol = prompt("Rol (ej: administrador, cajero, mesero, cocina):");

    // B. Validación simple
    if (!usuario || !contrasena || !rol) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    // C. Objeto para Strapi
    const nuevoData = {
        nombre: nombre,
        usuario: usuario,
        contrasena: contrasena, 
        rol: rol,
        activo: true // Por defecto lo creamos activo
    };

    try {
        const res = await fetch(`${API_URL}${ENDPOINT}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ data: nuevoData })
        });

        if (!res.ok) throw new Error(await res.text());

        alert("✅ Usuario creado exitosamente.");
        cargarUsuarios();

    } catch (err) {
        console.error(err);
        alert("Error al crear usuario. Revisa que el rol sea válido.");
    }
}

// ------------------------------
// 4. Editar Usuario (PUT)
// ------------------------------
async function editarUsuario(docId) {
    // Buscar datos actuales para mostrarlos en el prompt
    const userActual = usuariosCache.find(u => u.documentId === docId);
    if (!userActual) { alert("Error: No encuentro los datos en memoria."); return; }

    // 1. Pedir Nombre
    const nuevoNombre = prompt("Nombre:", userActual.nombre);
    if (!nuevoNombre) return; // Cancelar

    // 2. Pedir Usuario
    const nuevoUsuario = prompt("Usuario:", userActual.usuario);
    
    // 3. Pedir Rol
    const nuevoRol = prompt("Rol (ej: administrador, cajero...):", userActual.rol);

    // 4. Pedir Contraseña (OPCIONAL)
    const nuevaPass = prompt("Nueva Contraseña (déjalo VACÍO para no cambiarla):");

    // 5. Pedir Estado (Activo/Inactivo)
    const esActivo = confirm("¿El usuario está ACTIVO?\nAceptar = Sí\nCancelar = No (Desactivar)");

    // Construimos el objeto a enviar
    const datosActualizar = {
        nombre: nuevoNombre,
        usuario: nuevoUsuario,
        rol: nuevoRol,
        activo: esActivo
    };

    // Lógica especial: Solo enviamos contraseña si el usuario escribió algo
    if (nuevaPass && nuevaPass.trim() !== "") {
        datosActualizar.contrasena = nuevaPass;
    }

    try {
        const res = await fetch(`${API_URL}${ENDPOINT}/${docId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ data: datosActualizar })
        });

        if (!res.ok) throw new Error(await res.text());

        alert("✅ Usuario actualizado.");
        cargarUsuarios();

    } catch (err) {
        console.error(err);
        alert("Error al editar usuario.");
    }
}

// ------------------------------
// 5. Eliminar Usuario (DELETE)
// ------------------------------
async function eliminarUsuario(docId) {
    if (!confirm("¿Seguro que deseas eliminar este usuario permanentemente?")) return;

    try {
        const res = await fetch(`${API_URL}${ENDPOINT}/${docId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(await res.text());

        alert("🗑️ Usuario eliminado.");
        cargarUsuarios();

    } catch (err) {
        console.error(err);
        alert("Error al eliminar usuario.");
    }
}