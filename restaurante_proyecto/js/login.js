const API_URL = "http://localhost:1337/api";

// YA NO NECESITAMOS TOKEN MAESTRO NI STATIC_TOKEN
// El sistema nativo de Strapi maneja su propia seguridad.

async function login() {
    const usuarioInput = document.getElementById("usuario").value.trim();
    const passwordInput = document.getElementById("contrasena").value.trim();

    if (!usuarioInput || !passwordInput) {
        alert("Por favor ingrese usuario y contraseña");
        return;
    }

    try {
        console.log("🔐 Conectando con sistema nativo de Strapi...");

        // Usamos el endpoint oficial de autenticación de Strapi
        const res = await fetch(`${API_URL}/auth/local`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                identifier: usuarioInput, // Strapi acepta email o username aquí
                password: passwordInput
            })
        });

        const data = await res.json();

        // VALIDACIÓN DE ERRORES
        if (!res.ok) {
            console.error("Error Login:", data);
            
            if (res.status === 400) {
                alert("❌ Usuario o contraseña incorrectos.");
            } else if (res.status === 403) {
                alert("❌ Acceso prohibido. El usuario puede estar bloqueado o no confirmado.");
            } else {
                alert(`Error del servidor (${res.status}): ${data.error ? data.error.message : "Desconocido"}`);
            }
            return;
        }

        // LOGIN EXITOSO
        console.log("✅ Login correcto:", data.user.username);

        // 1. Guardamos el JWT real que nos dio Strapi
        localStorage.setItem("token", data.jwt);

        // 2. Guardamos los datos del usuario para usarlos en el Dashboard
        // Nota: Mapeamos los campos nativos a los que tu app espera
        const usuarioParaApp = {
            documentId: data.user.documentId || data.user.id, // v5 usa documentId, v4 usa id
            id: data.user.id,
            nombre: data.user.nombre || data.user.username, // Si no agregaste campo 'nombre', usamos el username
            usuario: data.user.username,
            email: data.user.email,
            rol: data.user.rol || "Usuario" // Si agregaste el campo 'rol' al User type
        };

        localStorage.setItem("usuarioLogueado", JSON.stringify(usuarioParaApp));

        // 3. Redireccionar
        window.location.href = "./pages/dashboard.html";

    } catch (error) {
        console.error("Error crítico:", error);
        alert("No se pudo conectar con Strapi. Verifica que el servidor esté encendido en puerto 1337.");
    }
}