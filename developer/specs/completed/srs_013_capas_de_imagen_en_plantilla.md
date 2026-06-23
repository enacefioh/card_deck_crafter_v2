# Especificación Técnica - SRS-013: Capas de Imagen en Plantilla

Este documento sirve como referencia futura para la implementación de capas de imágenes en el motor de plantillas y en el editor interactivo de composición de cartas.

## 1. Objetivos
- Permitir la colocación de recursos visuales en la carta (ej. marcos, bordes, iconos, ilustraciones de personajes).
- Proveer modos de ajuste (cover, contain, stretch) e interpolación de recursos en tiempo de impresión.


## 2. Modelo de Datos Propuesto
```typescript
export interface CapaImage extends CapaBase {
  tipo: "image";
  src: string;               // Ruta de la imagen por defecto de la plantilla (vía asset:// o ruta relativa), o vacía ("") si no tiene
  modoAjuste: "cover" | "contain" | "stretch";
  tinteColor: string | null; // Filtro/tinte de color (blend mode o CSS filter)
}
```

## 3. Interfaz de Edición y Comportamiento de Herencia
- Al añadir una capa de tipo "Imagen":
  - **Previsualización de Capa Vacía**: Si la capa no tiene una imagen asociada, se renderiza en pantalla un recuadro gris neutro con un icono de imagen (🖼️) y su tamaño proporcional en el centro.
  - **Pestaña Diseño (Diseño General de Plantilla)**:
    - *Selector de Origen*: Permite subir una imagen desde el dispositivo para establecerla como **imagen por defecto** de la plantilla, o pulsar **"Quitar imagen"** para dejarla vacía (recuadro gris).
    - *Ajustes de Maquetación*: Posición ($x$, $y$), tamaño ($ancho$, $alto$) y modo de ajuste (`cover`, `contain`, `stretch`).
  - **Pestaña Contenido (Valores de la Carta Individual)**:
    - *Anulación/Override por Carta*: Permite al usuario subir una imagen específica para esa carta. Si se sube una imagen, se almacena en las anulaciones de la carta (`capasOverrides[capaId].src`), sustituyendo la imagen por defecto de la plantilla.
    - *Quitar Imagen*: Si se ha subido una anulación, el usuario puede eliminarla para que la carta vuelva a heredar la imagen por defecto de la plantilla (o el recuadro gris si estaba vacío).


## 4. Casos de uso:
  ### 1. Agregar imágen a carta
	- Actor: usuario del editor
	- Precondiciones: El usuario está editando una carta en su proyecto.
	- Flujo principal: 
		1. El usuario pulsa sobre añadir elemento a la carta
		2. El sistema muestra el popup con los elementos disponibles
		3. El usuario selecciona imagen y pulsa aceptar
		4. El sistema añade una imagen vacía al centro de la carta con formato cuadrado del 30% del ancho de la carta
		5. El usuario pulsa sobre la imagen o sobre el título de la imagen el la columna izquierda
		6. El sistema muestra las opciones de contenido de la carta que incluye una zona donde arrastrar un archivo de imágen o abrir el menú del navegador para seleccionar imagen.
		7. El usuario carga una imagen desde su dispositivo.
		8. El sistema sube la imagen al servidor y la renderiza en la carta en la parte central del editor.
		9. El usuario cambia a la pestaña de diseño
		10. El sistema muestra las opciones de diseño de la imagen (posición, tamaño, relleno)
		11. El usuario modifica las propiedades a su gusto
		12. El sistema renderiza a tiempo real cada vez que el usuario modifica una propiedad la imagen sobre la carta central.
		13. El usuario pulsa sobre guardar cambios.
		14. El sistema cierra el popup y actualiza la carta en el documento del proyecto
	- Excepciones:
		1. El usuario sube un archivo que no es una imagen => El sistema muestra un mensaje de error y no cambia nada.
	- Postcondiciones:
		El recurso subido queda almacenado en el servidor (Crearemos una spec posterior para reciclar estos elementos cuando no se utilicen y para reutilizarlos durante la misma sesión)

  ### 2. Crear una plantilla con imágenes
	- Actor: usuario del editor
	- Precondiciones: El usuario está editando una carta en su proyecto.
	- Flujo principal: 
		1. El usuario pulsa sobre añadir elemento a la carta
		2. El sistema muestra el popup con los elementos disponibles
		3. El usuario selecciona imagen y pulsa aceptar
		4. El sistema añade una imagen vacía al centro de la carta con formato cuadrado del 30% del ancho de la carta
		5. El usuario pulsa sobre la imagen o sobre el título de la imagen el la columna izquierda
		6. El sistema muestra las opciones de contenido de la carta que incluye una zona donde arrastrar un archivo de imágen o abrir el menú del navegador para seleccionar imagen.
		7. El usuario carga una imagen desde su dispositivo.
		8. El sistema sube la imagen al servidor y la renderiza en la carta en la parte central del editor.
		9. El usuario cambia a la pestaña de diseño
		10. El sistema muestra las opciones de diseño de la imagen (posición, tamaño, relleno)
		11. El usuario modifica las propiedades a su gusto
		12. El sistema renderiza a tiempo real cada vez que el usuario modifica una propiedad la imagen sobre la carta central.
		13. El usuario pulsa sobre exportar plantilla.
		14. El sistema empaqueta dentro de la plantilla los recursos de imagen utilizados y lanza la descarga del archivo .cdc2t
	- Excepciones:
		1. El usuario sube un archivo que no es una imagen => El sistema muestra un mensaje de error y no cambia nada.
	- Postcondiciones:
		El archivo descargado contiene todo lo necesario para importar la plantilla de la carta incluyendo las imágenes en ella.
		
  ### 3. Importar una plantilla con imágenes
	- Actor: usuario del editor
	- Precondiciones: El usuario tiene una plantilla guardada anteriormente en su dispositivo
	- Flujo principal: 
		1. El usuario pulsa en archivo > importar Plantilla .cdc2t
		2. El sistema abre el dialogo de seleccionar archivo
		3. El usuario selecciona su archivo .cdc2t y aceptar
		4. El sistema lee el archivo, importa las imágenes incluidas a la carpeta correspondiente en el servidor y añade la plantilla a la lista de plantillas importadas.
	- Excepciones:
		El usuario selecciona o importa un archivo con un formato no válido o corrupto => El sistema muestra un mensaje de error y no hace nada más.
	- Postcondiciones:
		La plantilla de la carta queda disponible en la sección de plantillas importadas.
		Al guardar el proyecto como archivo .cdc2 la plantilla y sus imágenes se exportan junto con ella.
		Al añadir una plantilla importada de esta manera, las imágenes se visualizan correctamente.
		