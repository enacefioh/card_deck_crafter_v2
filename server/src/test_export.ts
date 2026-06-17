import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExport() {
  console.log("Creando archivo .cdc2 de prueba...");
  
  const zip = new AdmZip();
  
  const proyectoPrueba = {
    version: "2.0.0",
    meta: {
      nombre: "Test baraja",
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    },
    canvasConfig: {
      tipo: "A4",
      anchoMm: 210,
      altoMm: 297,
      orientacion: "vertical",
      margenTopMm: 10,
      margenBottomMm: 10,
      margenLeftMm: 10,
      margenRightMm: 10,
      lineasCorteContinuas: true,
      marcasCorteEsquinas: true
    },
    cardConfig: {
      anchoMm: 63.5,
      altoMm: 88.9,
      espaciadoXMm: 2,
      espaciadoYMm: 2,
      sangradoMm: 2,
      bordeCorteMm: 0.5,
      bordeCorteColor: "#ff0000"
    },
    modoTraseras: "ninguno",
    imagenTraseraComun: null,
    cards: [
      {
        id: "carta-1",
        nombre: "Carta de Prueba 1",
        imagenFrontal: null,
        imagenTrasera: null,
        cantidad: 2
      }
    ]
  };

  zip.addFile("project.json", Buffer.from(JSON.stringify(proyectoPrueba, null, 2)), "UTF-8");
  zip.addFile("assets/", Buffer.alloc(0));

  const zipBuffer = zip.toBuffer();
  console.log("ZIP generado. Tamaño:", zipBuffer.length, "bytes");

  const formData = new FormData();
  const zipBlob = new Blob([zipBuffer], { type: "application/zip" });
  formData.append("archivoProyecto", zipBlob, "test.cdc2");

  console.log("Enviando petición a http://localhost:3000/api/exportar/pdf...");
  try {
    const response = await fetch("http://localhost:3000/api/exportar/pdf", {
      method: "POST",
      body: formData
    });

    console.log("Status de la respuesta:", response.status);
    console.log("Headers:");
    response.headers.forEach((val, key) => {
      console.log(`  ${key}: ${val}`);
    });

    const bodyBuffer = await response.arrayBuffer();
    const bodyBytes = new Uint8Array(bodyBuffer);
    
    console.log("Primeros 100 bytes recibidos:", bodyBytes.slice(0, 100));

    const previewText = new TextDecoder().decode(bodyBytes.slice(0, 200));
    console.log("Vista previa de texto del body:\n", previewText);

    if (previewText.startsWith("%PDF")) {
      console.log("✅ Éxito: La respuesta comienza con la firma de PDF (%PDF).");
      const outPath = path.join(__dirname, "../temp_test_output.pdf");
      fs.writeFileSync(outPath, Buffer.from(bodyBuffer));
      console.log("PDF guardado en:", outPath);
    } else {
      console.error("❌ Error: La respuesta NO es un PDF válido.");
    }

  } catch (error) {
    console.error("Error al realizar la petición:", error);
  }
}

testExport();
