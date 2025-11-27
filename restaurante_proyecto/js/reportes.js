// Configuración de la API
const API_URL = "https://restaurante-api-bz1t.onrender.com/api";
const token = localStorage.getItem("token");

// ======================================
// 1. Cargar datos desde Strapi
// ======================================
async function cargarDatos() {
    try {
        console.log("📡 Cargando datos para reportes...");

        // 1. VENTAS (con relación populate para ver nombres de productos)
        const ventasRes = await fetch(`${API_URL}/ventas?pagination[pageSize]=1000&populate=*`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        // 2. INVENTARIO
        const inventRes = await fetch(`${API_URL}/inventarios?pagination[pageSize]=1000`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // 3. USUARIOS (Ajusta endpoint si usas /users o /usuarios)
        const usuariosRes = await fetch(`${API_URL}/usuarios?pagination[pageSize]=1000`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const ventasJson = await ventasRes.json();
        const inventJson = await inventRes.json();
        const usuariosJson = await usuariosRes.json();

        // Normalizamos los datos de VENTA para que sean fáciles de usar
        const ventasLimpias = (ventasJson.data || []).map(v => {
            // Intentamos obtener el nombre del producto de la relación
            const prod = v.producto || v.inventario || {};
            return {
                id: v.documentId,
                producto: prod.nombreIngrediente || "Producto Borrado",
                cantidad: v.cantidad || 0,
                total: v.total || 0,
                fecha: v.fecha // Mantenemos formato ISO para filtrar luego
            };
        });

        // Normalizamos INVENTARIO
        const inventarioLimpio = (inventJson.data || []).map(i => ({
            nombre: i.nombreIngrediente,
            cantidad: i.cantidad,
            unidad: i.unidad
        }));

        // Normalizamos USUARIOS
        const usuariosLimpios = (usuariosJson.data || []).map(u => ({
            nombre: u.nombre,
            usuario: u.usuario,
            rol: u.rol
        }));

        return {
            ventas: ventasLimpias,
            inventario: inventarioLimpio,
            usuarios: usuariosLimpios
        };

    } catch (error) {
        console.error("Error cargando datos:", error);
        alert("Error al cargar datos de Strapi. Revisa la consola.");
        return { ventas: [], inventario: [], usuarios: [] };
    }
}

// ======================================
// 2. Utilidades de Fechas
// ======================================

function formatearFecha(isoString) {
    if (!isoString) return "-";
    const fecha = new Date(isoString);
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function esHoy(fechaStr) {
    if (!fechaStr) return false;
    const hoy = new Date();
    const f = new Date(fechaStr);
    return (
        f.getDate() === hoy.getDate() &&
        f.getMonth() === hoy.getMonth() &&
        f.getFullYear() === hoy.getFullYear()
    );
}

function esEstaSemana(fechaStr) {
    if (!fechaStr) return false;
    const hoy = new Date();
    const f = new Date(fechaStr);
    
    // Calcular inicio de semana (Domingo)
    const primerDia = new Date(hoy);
    primerDia.setDate(hoy.getDate() - hoy.getDay());
    primerDia.setHours(0,0,0,0);
    
    // Calcular fin de semana (Sábado)
    const ultimoDia = new Date(primerDia);
    ultimoDia.setDate(primerDia.getDate() + 6);
    ultimoDia.setHours(23,59,59,999);

    return f >= primerDia && f <= ultimoDia;
}

function esEsteMes(fechaStr) {
    if (!fechaStr) return false;
    const hoy = new Date();
    const f = new Date(fechaStr);
    return (
        f.getMonth() === hoy.getMonth() &&
        f.getFullYear() === hoy.getFullYear()
    );
}

// ======================================
// 3. Renderizado (DOM)
// ======================================

const contenedor = document.getElementById("contenedorReporte");
const canvas = document.getElementById("grafico");
const ctx = canvas.getContext("2d");

function limpiarVista() {
    contenedor.innerHTML = "";
    canvas.style.display = "none";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function renderizarTabla(columnas, filas) {
    let html = `<div style="overflow-x:auto;"><table><thead><tr>`;
    
    columnas.forEach(col => html += `<th>${col}</th>`);
    html += `</tr></thead><tbody>`;

    if (filas.length === 0) {
        html += `<tr><td colspan="${columnas.length}" style="text-align:center;">No hay datos disponibles.</td></tr>`;
    } else {
        filas.forEach(fila => {
            html += `<tr>`;
            fila.forEach(celda => html += `<td>${celda}</td>`);
            html += `</tr>`;
        });
    }

    html += `</tbody></table></div>`;
    contenedor.innerHTML += html;
}

function renderStats(stats) {
    contenedor.innerHTML += `
        <div style="display:flex; gap:20px; margin-bottom:20px; flex-wrap:wrap;">
            <div style="background:#e3f2fd; padding:15px; border-radius:8px; flex:1;">
                <p style="margin:0; font-size:0.9em; color:#555;">Total Vendido</p>
                <h2 style="margin:5px 0; color:#1976d2;">$${stats.total.toFixed(2)}</h2>
            </div>
            <div style="background:#e8f5e9; padding:15px; border-radius:8px; flex:1;">
                <p style="margin:0; font-size:0.9em; color:#555;">Cantidad Ventas</p>
                <h2 style="margin:5px 0; color:#388e3c;">${stats.cantidad}</h2>
            </div>
            <div style="background:#fff3e0; padding:15px; border-radius:8px; flex:1;">
                <p style="margin:0; font-size:0.9em; color:#555;">Ticket Promedio</p>
                <h2 style="margin:5px 0; color:#f57c00;">$${stats.promedio.toFixed(2)}</h2>
            </div>
        </div>
    `;
}

// ======================================
// 4. Gráfico Manual (Canvas)
// ======================================
function renderGrafico(datos) {
    canvas.style.display = "block";
    
    // Ajustar resolución del canvas para nitidez
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (datos.length === 0) return;

    // Configuración
    const padding = 40;
    const barWidth = 30;
    const gap = 20;
    const maxVal = Math.max(...datos.map(d => d.total)) || 1;
    
    // Eje Y (Línea)
    ctx.beginPath();
    ctx.moveTo(padding, 10);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - 10, height - padding);
    ctx.stroke();

    // Dibujar Barras
    datos.forEach((d, i) => {
        // Calcular altura proporcional
        // Altura disponible = height - (2 * padding)
        const barHeight = (d.total / maxVal) * (height - (2 * padding));
        
        const x = padding + 10 + (i * (barWidth + gap));
        const y = (height - padding) - barHeight;

        // Si se sale del ancho, dejar de dibujar
        if (x + barWidth > width) return;

        // Barra
        ctx.fillStyle = "#3498db";
        ctx.fillRect(x, y, barWidth, barHeight);

        // Texto Valor
        ctx.fillStyle = "#000";
        ctx.font = "10px Arial";
        ctx.fillText("$" + Math.round(d.total), x, y - 5);

        // Texto Fecha (Eje X)
        const label = formatearFecha(d.fecha);
        ctx.fillText(label, x, height - padding + 15);
    });
}

// ======================================
// 5. Funciones de Reportes
// ======================================

async function reporteHoy() {
    limpiarVista();
    const data = await cargarDatos();
    const ventas = data.ventas.filter(v => esHoy(v.fecha));

    contenedor.innerHTML = `<h2>📅 Ventas de Hoy</h2>`;
    mostrarReporteVentas(ventas);
}

async function reporteSemanal() {
    limpiarVista();
    const data = await cargarDatos();
    const ventas = data.ventas.filter(v => esEstaSemana(v.fecha));

    contenedor.innerHTML = `<h2>📅 Esta Semana</h2>`;
    mostrarReporteVentas(ventas);
}

async function reporteMensual() {
    limpiarVista();
    const data = await cargarDatos();
    const ventas = data.ventas.filter(v => esEsteMes(v.fecha));

    contenedor.innerHTML = `<h2>📅 Este Mes</h2>`;
    mostrarReporteVentas(ventas);
}

// Función auxiliar para no repetir código en los reportes de ventas
function mostrarReporteVentas(ventasFiltradas) {
    if (ventasFiltradas.length === 0) {
        contenedor.innerHTML += "<p>No se encontraron registros para este periodo.</p>";
        return;
    }

    const total = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
    const promedio = total / ventasFiltradas.length;

    renderStats({ total, cantidad: ventasFiltradas.length, promedio });

    // Tabla
    renderizarTabla(
        ["Fecha", "Producto", "Cant.", "Total"],
        ventasFiltradas.map(v => [
            formatearFecha(v.fecha),
            v.producto,
            v.cantidad,
            `$${v.total.toFixed(2)}`
        ])
    );

    // Gráfico (Limitado a las últimas 10 ventas para que quepan)
    renderGrafico(ventasFiltradas.slice(-10));
}

async function reporteInventario() {
    limpiarVista();
    const data = await cargarDatos();

    contenedor.innerHTML = `<h2>📦 Inventario Actual</h2>`;

    renderizarTabla(
        ["Ingrediente", "Cantidad", "Unidad"],
        data.inventario.map(i => [i.nombre, i.cantidad, i.unidad])
    );
}

async function reporteUsuarios() {
    limpiarVista();
    const data = await cargarDatos();

    contenedor.innerHTML = `<h2>👥 Usuarios del Sistema</h2>`;

    renderizarTabla(
        ["Nombre", "Usuario", "Rol"],
        data.usuarios.map(u => [u.nombre, u.usuario, u.rol])
    );
}