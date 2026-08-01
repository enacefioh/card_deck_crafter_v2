# Reglas de Comportamiento del Agente - Card Deck Crafter v2

- **Flujo de Trabajo y Verificación de Tickets / Specs**:
  - Una vez completado el código de un ticket o spec, el agente debe mostrar el resumen del trabajo realizado y sus conclusiones.
  - No se debe marcar ningún spec o ticket como completado ni moverlo a la carpeta `completed/` hasta que el usuario indique que ha realizado las pruebas manuales correspondientes y dé su confirmación explícita.
  - Tras realizar cualquier modificación en el backend (o paquetes compartidos), el agente debe detener de manera explícita y completa todos los procesos y servicios/servidores activos (tanto backend como frontend) y volver a arrancarlos desde cero antes de avisar al usuario para que pueda probar.
  - En el logo superior izquierdo ("Card Deck Crafter v2"), se mostrará la versión actual bajo el formato `v2.<YYMMDD>.<n_commit_sesion>` (ej. `v2.260708.1`), actualizándola en el código para cada commit de la sesión.
  - Una vez el usuario haya hecho todas las comprobaciones y confirme su aprobación, se realizará el commit correspondiente y se marcará el spec o ticket como completado.
  - El `git push` a GitHub y la retrospectiva final se realizarán al concluir la sesión cuando el usuario lo indique explícitamente.

- **Retrospectiva Profesional al Finalizar la Sesión**:
  - Al finalizar cada sesión de trabajo (cuando el usuario indique que desea terminar la sesión), el agente debe realizar una retrospectiva detallada actuando con el rol de Desarrollador Profesional Senior / Tech Lead / Jefe de Equipo.
  - Esta retrospectiva debe analizar:
    1. Cómo el usuario puede mejorar en su comunicación, estructuración de requerimientos y aplicación de protocolos, señalando constructivamente las correcciones necesarias para entornos laborales profesionales en equipos reales.
    2. Evaluación técnica de arquitectura y simplificación del código: qué hubiese cambiado el agente para simplificar el proyecto, si hubiese sido conveniente dividir una spec en varias partes acotadas, o si algún ticket por su alcance técnico debería haber sido redactado como una spec (o viceversa).

- **Gestión de Specs Extensas**:
  - Si una especificación técnica (spec) es demasiado extensa o compleja, el agente debe analizarla detenidamente y proponer dividirla en partes o sub-especificaciones más acotadas para facilitar su implementación, revisión y verificación incremental.

- **Confirmación de Commit / Push y Lista de Pendientes**:
  - Antes de realizar cualquier commit o push, el agente debe obtener la autorización explícita del usuario tras comprobar el funcionamiento manualmente.
  - Después de cada commit o al inicio de la sesión, el agente debe mostrar una lista con las especificaciones (specs) y tickets pendientes en el proyecto.
