function validarSesion() {
    const usuario = localStorage.getItem("usuarioLogueado");

    if (!usuario) {
        location.href = "../login.html";
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    location.href = "../login.html";
}
