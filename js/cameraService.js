/**
 * EvalScan - Servicio de Cámara y Adquisición de Imágenes (cameraService.js)
 * Gestión de la cámara web/móvil, linterna (torch), conmutación de cámaras,
 * captura en alta resolución y carga de archivos locales.
 */

export class CameraService {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.currentDeviceId = null;
    this.availableDevices = [];
    this.hasTorch = false;
    this.torchEnabled = false;
  }

  /**
   * Comprueba si el navegador soporta acceso a medios
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Obtiene la lista de cámaras de video disponibles
   */
  async getVideoDevices() {
    if (!CameraService.isSupported()) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter((d) => d.kind === 'videoinput');
      return this.availableDevices;
    } catch (err) {
      console.warn('Error al enumerar dispositivos de video:', err);
      return [];
    }
  }

  /**
   * Inicia el stream de la cámara sobre un elemento <video>
   */
  async startCamera(videoElement, deviceId = null) {
    if (!CameraService.isSupported()) {
      throw new Error('Su navegador no soporta el acceso directo a la cámara. Puede utilizar la opción de importar archivo de imagen.');
    }

    this.stopCamera();
    this.videoElement = videoElement;

    const constraints = {
      audio: false,
      video: {
        width: { ideal: 1920, min: 1024 },
        height: { ideal: 1080, min: 720 },
        facingMode: deviceId ? undefined : { ideal: 'environment' },
        deviceId: deviceId ? { exact: deviceId } : undefined
      }
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;

      // Esperar a que el video esté listo y comience a reproducirse
      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play()
            .then(resolve)
            .catch(reject);
        };
        setTimeout(() => resolve(), 3000); // Salva de tiempo
      });

      // Detectar soporte para linterna (torch)
      const track = this.stream.getVideoTracks()[0];
      if (track) {
        this.currentDeviceId = track.getSettings()?.deviceId || deviceId;
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        this.hasTorch = !!capabilities.torch;
      }

      await this.getVideoDevices();
      return { success: true, hasTorch: this.hasTorch, devices: this.availableDevices };
    } catch (err) {
      console.error('Error al iniciar la cámara:', err);
      let errorMsg = 'No se pudo iniciar la cámara.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Permiso denegado para acceder a la cámara. Por favor autorice el acceso en su navegador o importe una foto.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No se detectó ninguna cámara disponible en el dispositivo.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'La cámara está siendo utilizada por otra aplicación.';
      }
      throw new Error(errorMsg);
    }
  }

  /**
   * Conmuta la linterna/flash del dispositivo si está soportada
   */
  async toggleTorch() {
    if (!this.stream || !this.hasTorch) return false;
    const track = this.stream.getVideoTracks()[0];
    if (!track || !track.applyConstraints) return false;

    try {
      this.torchEnabled = !this.torchEnabled;
      await track.applyConstraints({
        advanced: [{ torch: this.torchEnabled }]
      });
      return this.torchEnabled;
    } catch (err) {
      console.warn('Error al activar linterna:', err);
      this.torchEnabled = false;
      return false;
    }
  }

  /**
   * Captura el frame actual del video a un objeto HTMLCanvasElement en resolución completa
   */
  captureFrame() {
    if (!this.videoElement || !this.stream) {
      throw new Error('La cámara no está activa para capturar fotogramas.');
    }

    const canvas = document.createElement('canvas');
    const vw = this.videoElement.videoWidth || 1280;
    const vh = this.videoElement.videoHeight || 720;
    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0, vw, vh);

    return canvas;
  }

  /**
   * Detiene el flujo de la cámara y libera el hardware
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Omitir si ya estaba detenida
        }
      });
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.torchEnabled = false;
    this.hasTorch = false;
  }

  /**
   * Carga una imagen local desde un File object hacia un HTMLCanvasElement
   */
  static loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('El archivo seleccionado no es una imagen válida (JPG, PNG, WebP).'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas);
        };
        img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo desde el dispositivo.'));
      reader.readAsDataURL(file);
    });
  }
}
