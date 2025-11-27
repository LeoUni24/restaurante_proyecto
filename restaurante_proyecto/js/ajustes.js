const API_URL = "https://restaurante-api-bz1t.onrender.com/api";
const token = localStorage.getItem("token");

// Variable para guardar los datos del usuario activo
let currentUser = null;

// =============================
// INICIALIZACIÓN
// =============================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Cargar preferencia de modo oscuro (si existe)
    if (localStorage.getItem("darkmode") === "1") {
        document.body.classList.add("dark-mode");
    }

    // 2. Cargar datos del usuario desde el servidor
    cargarDatosUsuario();
});

// =================================================
// 1. OBTENER DATOS DE "ME" (Perfil propio)
// =================================================
async function cargarDatosUsuario() {
    if (!token) {
        alert("No hay sesión activa.");
        location.href = "../index.html";
        return;
    }

    try {
        console.log("📡 Solicitando perfil de usuario...");

        // Endpoint nativo de Strapi para ver mis propios datos
        const res = await fetch(`${API_URL}/users/me`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            console.error("Token inválido o expirado");
            localStorage.removeItem("token");
            location.href = "../index.html";
            return;
        }

        const data = await res.json();
        currentUser = data; // Guardamos en memoria global
        
        console.log("✅ Datos cargados:", currentUser);

        // Mostrar en HTML
        // Strapi nativo usa 'username' y 'email'. 
        // Si añadiste campos custom como 'nombre' o 'rol', intentamos leerlos también.
        document.getElementById("nombreUsuarioAjustes").innerText = data.nombre || data.username;
        document.getElementById("usuarioUsuarioAjustes").innerText = data.username;
        document.getElementById("emailUsuarioAjustes").innerText = data.email;
        // Si el rol no viene directo en /users/me (a veces requiere ?populate=role), mostramos un valor por defecto
        document.getElementById("rolUsuarioAjustes").innerText = data.rol || "Usuario (Rol no visible)";

    } catch (error) {
        console.error("Error cargando perfil:", error);
        document.getElementById("nombreUsuarioAjustes").innerText = "Error";
    }
}

// =================================================
// 2. ACTUALIZAR CONTRASEÑA
// =================================================
async function actualizarContrasena() {
    const passActual = document.getElementById("passActual").value;
    const passNueva = document.getElementById("passNueva").value;
    const passRepetir = document.getElementById("passRepetir").value;

    // A. Validaciones básicas
    if (!passActual || !passNueva || !passRepetir) {
        alert("Por favor completa todos los campos.");
        return;
    }

    if (passNueva.length < 6) {
        alert("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
    }

    if (passNueva !== passRepetir) {
        alert("Las contraseñas nuevas no coinciden.");
        return;
    }

    // B. VALIDAR CONTRASEÑA ACTUAL
    // TRUCO DE SEGURIDAD:
    // Strapi no permite leer la contraseña actual para compararla.
    // Lo que hacemos es intentar un "Login silencioso" con la contraseña actual.
    // Si el login funciona, la contraseña es correcta.
    try {
        console.log("🔐 Verificando contraseña actual...");
        
        const verifyRes = await fetch(`${API_URL}/auth/local`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: currentUser.email || currentUser.username, 
                password: passActual
            })
        });

        if (!verifyRes.ok) {
            alert("⛔ La contraseña actual es INCORRECTA.");
            return; // Detenemos aquí si no coincide
        }
        
        console.log("✅ Verificación exitosa.");

    } catch (error) {
        console.error(error);
        alert("Error de conexión al verificar contraseña.");
        return;
    }

    // C. GUARDAR NUEVA CONTRASEÑA
    try {
        console.log("💾 Guardando nueva contraseña...");
        
        // Endpoint nativo para actualizar usuario: /api/users/:id
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

        alert("✅ ¡Contraseña actualizada con éxito!");
        
        // Limpiamos los campos
        document.getElementById("passActual").value = "";
        document.getElementById("passNueva").value = "";
        document.getElementById("passRepetir").value = "";

    } catch (error) {
        console.error("Error al actualizar:", error);
        alert("Error al guardar: " + error.message);
    }
}

// =================================================
// 3. MODO OSCURO (Funcionalidad básica)
// =================================================
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const estado = document.body.classList.contains("dark-mode") ? "1" : "0";
    localStorage.setItem("darkmode", estado);
}