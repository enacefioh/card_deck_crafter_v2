# Especificación Técnica - SRS-014: Galería Multimedia Virtual

Este documento describe la estructura y diseño propuesto para la gestión y reutilización de recursos visuales mediante una galería multimedia virtual a nivel de proyecto.

## 1. Objetivos
- Proveer una base de datos/galería local de imágenes cargadas en el proyecto para evitar subidas duplicadas del mismo archivo.
- Permitir al usuario seleccionar imágenes ya existentes en el proyecto al configurar capas de imagen (tanto estáticas como dinámicas).
- Empaquetar y exportar únicamente los recursos multimedia utilizados en el archivo de proyecto `.cdc2`.

## 2. Flujo de Trabajo Propuesto
- **Carga de Imagen**: Al subir una imagen desde el dispositivo, el recurso se almacena en la galería del proyecto asignándole un identificador único (ej: `media_1234.png`).
- **Selector de Imagen**: Al editar una capa de imagen (en pestaña Diseño o Contenido), se presentan dos opciones:
  1. "Subir desde el dispositivo"
  2. "Seleccionar de la Galería del Proyecto" (desplegando una cuadrícula de miniaturas de imágenes ya cargadas).

## 3. Empaquetado e Integración (.cdc2t y .cdc2)
- Al exportar una plantilla `.cdc2t`: Los recursos estáticos referenciados se extraen de la galería y se empaquetan en una subcarpeta `assets/` del archivo de la plantilla.
- Al guardar el proyecto `.cdc2`: La galería completa (o los archivos referenciados en uso) se guardan en la carpeta `assets/` del ZIP de proyecto.

---

## 4. Casos de Uso (Estructura Vacía para Completar)
*(Para ser desarrollado por el usuario)*
- **Caso de Uso 1**: Cargar imagen reutilizando un asset de la galería.
- **Caso de Uso 2**: Limpieza de galería (eliminar recursos no utilizados).
