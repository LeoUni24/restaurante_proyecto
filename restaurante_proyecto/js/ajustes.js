const API_URL = "https://restaurante-api-bz1t.onrender.com/api";
const token = localStorage.getItem("token");

// Variable global
let currentUser = null;

// =============================
// INICIALIZACIÓN
// =============================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Modo oscuro
    if (localStorage.getItem("darkmode") === "1") {
        document.body.classList.add("dark-mode");
    }

    // 2. Cargar datos
    cargarDatosUsuario();
});

// =============================
// 1. CARGAR DATOS
// =============================
async function cargarDatosUsuario() {
    if (!token) {
        alert("Sesión expirada.");
        location.href = "../index.html";
        return;
    }

    try {
        console.log("📡 Cargando perfil...");

        // Pedimos datos + el rol (populate=role)
        const res = await fetch(`${API_URL}/users/me?populate=role`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("Token vencido");
            localStorage.removeItem("token");
            location.href = "../index.html";
            return;
        }

        const data = await res.json();
        currentUser = data; 
        console.log("✅ Datos:", currentUser);

        // --- RENDERIZADO (Solo los campos que existen en tu HTML) ---
        
        // 1. Nombre (Si no tienes campo 'nombre' en Strapi, usa username)
        document.getElementById("nombreUsuarioAjustes").innerText = data.nombre || data.username;
        
        // 2. Usuario
        document.getElementById("usuarioUsuarioAjustes").innerText = data.username;
        
        // 3. Rol (Manejo defensivo por si role es null)
        let rolNombre = "Estándar";
        if (data.role && data.role.name) {
            rolNombre = data.role.name;
        } else if (data.rol) { 
            // Por si creaste un campo manual llamado 'rol'
            rolNombre = data.rol;
        }
        document.getElementById("rolUsuarioAjustes").innerText = rolNombre;

    } catch (error) {
        console.error("Error en perfil:", error);
        document.getElementById("nombreUsuarioAjustes").innerText = "Error de carga";
    }
}

// =============================
// 2. ACTUALIZAR CONTRASEÑA
// =============================
async function actualizarContrasena() {
    const passActual = document.getElementById("passActual").value;
    const passNueva = document.getElementById("passNueva").value;
    const passRepetir = document.getElementById("passRepetir").value;

    // A. Validaciones
    if (!passActual || !passNueva || !passRepetir) {
        alert("Completa todos los campos.");
        return;
    }
    if (passNueva.length < 6) {
        alert("Mínimo 6 caracteres.");
        return;
    }
    if (passNueva !== passRepetir) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    if (!currentUser || !currentUser.id) {
        alert("Error: No se ha cargado el ID del usuario. Recarga la página.");
        return;
    }

    // B. Verificar contraseña actual (Mini-login)
    try {
        const verifyRes = await fetch(`${API_URL}/auth/local`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: currentUser.email || currentUser.username,
                password: passActual
            })
        });

        if (!verifyRes.ok) {
            alert("⛔ Contraseña actual incorrecta.");
            return;
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión.");
        return;
    }

    // C. Guardar nueva contraseña (Endpoint Correcto: /users/:id)
    try {
        console.log(`💾 Guardando en /users/${currentUser.id}...`);

        // Usamos el ID numérico del usuario actual
        const updateRes = await fetch(`${API_URL}/users/${currentUser.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                password: passNueva
            })
        });

        if (!updateRes.ok) {
            const errorData = await updateRes.json();
            throw new Error(errorData.error ? errorData.error.message : "Error desconocido");
        }

        alert("✅ Contraseña cambiada con éxito.");
        
        // Limpiar
        document.getElementById("passActual").value = "";
        document.getElementById("passNueva").value = "";
        document.getElementById("passRepetir").value = "";

    } catch (err) {
        console.error(err);
        if (err.message.includes("Forbidden")) {
            alert("Error de permisos: Tu rol 'Authenticated' en Strapi necesita permiso 'update' en 'Users-permissions -> User'.");
        } else {
            alert("No se pudo guardar: " + err.message);
        }
    }
}

