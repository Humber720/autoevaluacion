// ----------------------
// ELEMENTOS Y VARIABLES
// ----------------------
const sendFormBtn = document.getElementById('btnEnviar');
const spinner = document.createElement('span');

spinner.style.cssText = `
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 3px solid #ccc;
  border-top-color: #2980b9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 10px;
  vertical-align: middle;
`;
spinner.style.display = 'none';
sendFormBtn.parentNode.insertBefore(spinner, sendFormBtn.nextSibling);

let datosEnviados = {};

const urlSheetBest = "https://api.sheetbest.com/sheets/a0d833dc-39c4-455d-90d2-842ed1937e36";

// ----------------------
// ENVIAR FORMULARIO CON VALIDACIÓN CI DUPLICADA
// ----------------------
document.getElementById("formulario").addEventListener("submit", async function(event) {
  event.preventDefault();

  spinner.style.display = 'inline-block';
  sendFormBtn.disabled = true;

  const ci = document.getElementById("ci").value.trim();

  // -- VALIDACIÓN CI DUPLICADA --
  try {
    const res = await fetch(urlSheetBest);
    const data = await res.json();

    // Extraer las cédulas registradas
    const cedulasRegistradas = data.map(item => item.ci);

    if (cedulasRegistradas.includes(ci)) {
      spinner.style.display = 'none';
      sendFormBtn.disabled = false;
      alert("❌ Esta cédula de identidad ya está registrada.");
      return; // Salir, no enviar
    }
  } catch (error) {
    console.error('Error validando cédula duplicada:', error);
    // Puedes decidir permitir o no enviar si falla la validación
    spinner.style.display = 'none';
    sendFormBtn.disabled = false;
    alert("❌ No se pudo validar la cédula, intenta de nuevo.");
    return;
  }

  // Si no está repetida, continuar con el envío:
  const apellidoPaterno = document.getElementById("apellidoPaterno").value.trim();
  const apellidoMaterno = document.getElementById("apellidoMaterno").value.trim();
  const nombres = document.getElementById("nombres").value.trim();
  const curso = document.getElementById("curso").value;

  const p1 = parseFloat(document.querySelector('input[name="p1"]:checked')?.value || 0);
  const p2 = parseFloat(document.querySelector('input[name="p2"]:checked')?.value || 0);
  const p3 = parseFloat(document.querySelector('input[name="p3"]:checked')?.value || 0);
  const p4 = parseFloat(document.querySelector('input[name="p4"]:checked')?.value || 0);
  const p5 = parseFloat(document.querySelector('input[name="p5"]:checked')?.value || 0);

  const puntaje = p1 + p2 + p3 + p4 + p5;

  datosEnviados = {
    ci,
    apellidoPaterno,
    apellidoMaterno,
    nombres,
    curso,
    p1, p2, p3, p4, p5,
    puntaje
  };

  fetch(urlSheetBest, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datosEnviados)
  })
  .then(res => res.json())
  .then(() => {
    spinner.style.display = 'none';
    sendFormBtn.disabled = false;

    document.getElementById("modal-mensaje").textContent = `✅ ${nombres}, tu puntaje es: ${puntaje} / 5`;
    document.getElementById("puntaje-valor").textContent = puntaje;
    document.getElementById("modal").style.display = "flex";

    document.getElementById("descargarPDF").style.display = "inline-block";
  })
  .catch(err => {
    spinner.style.display = 'none';
    sendFormBtn.disabled = false;
    alert("❌ Error al enviar datos.");
    console.error(err);
  });
});

// ----------------------
// MODAL
// ----------------------
document.getElementById('cerrar-modal').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('descargarPDF').addEventListener('click', () => {
  generarPDF();
  document.getElementById('modal').style.display = 'none';
});

// ----------------------
// GENERAR PDF
// ----------------------
function generarPDF() {
  if (!datosEnviados.nombres) {
    alert('No hay datos para generar PDF.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // ----------------------
  // ENCABEZADO
  // ----------------------
  doc.setFontSize(16);
  doc.text('AUTOEVALUACIÓN ESTUDIANTIL', 105, 15, { align: 'center' });

  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-ES');
  const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  doc.setFontSize(10);
  doc.text(`Curso: ${datosEnviados.curso}`, 14, 22);

  const pageWidth = doc.internal.pageSize.getWidth();
  const textoDerecha = `Fecha: ${fecha}   Hora: ${hora}`;
  const textWidth = doc.getTextWidth(textoDerecha);
  doc.text(textoDerecha, pageWidth - textWidth - 14, 22);

  // ----------------------
  // DATOS DEL ESTUDIANTE
  // ----------------------
  const data = [
    ['Cédula', datosEnviados.ci],
    ['Nombre', `${datosEnviados.nombres} ${datosEnviados.apellidoPaterno} ${datosEnviados.apellidoMaterno}`],
    ['Curso', datosEnviados.curso],
    ['Puntaje', `${datosEnviados.puntaje} / 5`]
  ];

  doc.autoTable({
    head: [['Campo', 'Datos']],
    body: data,
    startY: 30,
    styles: { fontSize: 10 }
  });

  // ----------------------
  // PREGUNTAS Y RESPUESTAS
  // ----------------------
  const preguntas = [
    ['1. Asisto puntualmente a las clases de música:', datosEnviados.p1],
    ['2. Soy responsable en la entrega de tareas y materiales:', datosEnviados.p2],
    ['3. Manifiesto respeto hacia los(as) compañeros(as) y maestros en todas las clases:', datosEnviados.p3],
    ['4. Demuestro interés por aprender los contenidos del área de Educación Musical:', datosEnviados.p4],
    ['5. Participo activamente en actividades grupales e individuales propuestas en la clase interpretación instrumental, exposiciones y danzas:', datosEnviados.p5],
  ];

  doc.autoTable({
    head: [['Pregunta', 'Respuesta']],
    body: preguntas,
    startY: doc.lastAutoTable.finalY + 10,
    styles: { fontSize: 10 }
  });

  // ----------------------
  // FIRMA
  // ----------------------
  let finalY = doc.lastAutoTable.finalY + 15;
  doc.text('Firma del estudiante: ____________________________', 14, finalY);

  // ----------------------
  // DESCARGA
  // ----------------------
  doc.save(`autoevaluacion_${datosEnviados.ci}.pdf`);
}

// ----------------------
// ANIMACIÓN SPINNER
// ----------------------
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}`;
document.head.appendChild(style);
