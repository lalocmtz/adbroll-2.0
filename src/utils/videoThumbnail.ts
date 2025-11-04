/**
 * Genera un thumbnail de un archivo de video usando Canvas API
 * Este proceso se ejecuta en el navegador del cliente
 */
export async function generateVideoThumbnail(
  videoFile: File,
  seekTo: number = 1.0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Crear elemento de video temporal
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('No se pudo obtener contexto 2D del canvas'));
      return;
    }

    // Crear URL temporal del video
    const videoURL = URL.createObjectURL(videoFile);
    video.src = videoURL;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    // Configurar ancho del thumbnail (480px de ancho, altura proporcional)
    const thumbnailWidth = 480;

    video.addEventListener('loadedmetadata', () => {
      // Buscar el frame deseado (por defecto 1 segundo)
      video.currentTime = Math.min(seekTo, video.duration);
    });

    video.addEventListener('seeked', () => {
      try {
        // Calcular altura proporcional
        const aspectRatio = video.videoHeight / video.videoWidth;
        const thumbnailHeight = Math.round(thumbnailWidth * aspectRatio);

        // Configurar canvas con las dimensiones calculadas
        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;

        // Dibujar el frame actual del video en el canvas
        context.drawImage(video, 0, 0, thumbnailWidth, thumbnailHeight);

        // Convertir canvas a blob (imagen JPEG con calidad 85%)
        canvas.toBlob(
          (blob) => {
            // Limpiar recursos
            URL.revokeObjectURL(videoURL);
            video.remove();
            canvas.remove();

            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('No se pudo generar el thumbnail'));
            }
          },
          'image/jpeg',
          0.85
        );
      } catch (error) {
        URL.revokeObjectURL(videoURL);
        video.remove();
        canvas.remove();
        reject(error);
      }
    });

    video.addEventListener('error', (e) => {
      URL.revokeObjectURL(videoURL);
      video.remove();
      canvas.remove();
      reject(new Error(`Error al cargar el video: ${e.message || 'Desconocido'}`));
    });
  });
}

/**
 * Obtiene la duración de un video en segundos
 */
export async function getVideoDuration(videoFile: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const videoURL = URL.createObjectURL(videoFile);
    
    video.src = videoURL;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => {
      const duration = Math.round(video.duration);
      URL.revokeObjectURL(videoURL);
      video.remove();
      resolve(duration);
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(videoURL);
      video.remove();
      reject(new Error('No se pudo cargar el video'));
    });
  });
}
