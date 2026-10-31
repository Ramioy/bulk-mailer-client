/** Spanish texts for the backend's codes. Unknown codes show as they are, so nothing is hidden. */

const label = (table: Readonly<Record<string, string>>) => (code: string | undefined) => (code === undefined ? '' : (table[code] ?? code));

export const batchStateLabel = label({
  OPEN: 'Abierto',
  RUNNING: 'En ejecución',
  COMPLETED: 'Completado',
  STOPPED: 'Detenido',
});

export const receiptStateLabel = label({
  PENDING: 'Pendiente',
  INVALID: 'Inválido',
  SENDING: 'Enviando',
  SENT: 'Enviado',
  FAILED: 'Fallido',
  UNCERTAIN: 'Incierto',
  REMOVED: 'Retirado',
});

export const deliveryStateLabel = label({
  UNCONFIRMED: 'Sin confirmar',
  SOFT_BOUNCE: 'Rebote temporal',
  ACCEPTED: 'Aceptado',
  HARD_BOUNCE: 'Rebote permanente',
  COMPLAINT: 'Queja',
  PROCESS_FAILED: 'Falla de procesamiento',
});

export const errorTypeLabel = label({
  INVALID_NAME: 'Nombre inválido',
  UNKNOWN_CONCEPT: 'Concepto desconocido',
  NAME_TOO_LONG: 'Nombre demasiado largo',
  ATTACHMENT_TOO_LARGE: 'Adjunto demasiado grande',
  NOT_A_PDF: 'No es un PDF',
  PDF_ENCRYPTED: 'PDF cifrado',
  PDF_ACTIVE_CONTENT: 'PDF con contenido activo',
  PDF_INCREMENTAL_UPDATE: 'PDF con revisiones incrementales',
  MALICIOUS_FILE: 'Archivo malicioso',
  CONTRACT_NOT_FOUND: 'Contrato no encontrado',
  CONTRACT_INACTIVE: 'Contrato inactivo',
  CONTRACT_WITHOUT_EMAIL: 'Contrato sin correo',
  EMAIL_SUPPRESSED: 'Correo suprimido',
  SOURCE_UNAVAILABLE: 'Fuente de contratos no disponible',
  RECIPIENT_CHANGED: 'El destinatario cambió',
  FILE_MODIFIED: 'El archivo cambió',
  FILE_NOT_AVAILABLE: 'Archivo no disponible',
  PROVIDER_REJECTED: 'Rechazado por el proveedor',
  PROVIDER_UNAVAILABLE: 'Proveedor no disponible',
  NOT_FOUND_AT_PROVIDER: 'No encontrado en el proveedor',
  INTERNAL_ERROR: 'Error interno',
  DUPLICATE_CONFLICT: 'Conflicto de duplicado',
});

export const stopReasonLabel = label({
  PROVIDER_ACCOUNT: 'Cuenta del proveedor',
  PROVIDER_UNAVAILABLE: 'Proveedor no disponible',
  PROVIDER_UNKNOWN_ERROR: 'Error desconocido del proveedor',
  SOURCE_UNAVAILABLE: 'Fuente de contratos no disponible',
  INTERNAL_ERROR: 'Error interno',
  INTERRUPTED: 'Interrumpido',
});

export const ALERT_TYPES = [
  'BATCH_STOPPED',
  'MALICIOUS_FILE',
  'HARD_BOUNCE',
  'COMPLAINT',
  'WEBHOOKS_NOT_RECEIVED',
  'PROVIDER_UNKNOWN_ERROR',
  'PROCESS_FAILED',
  'DUPLICATE_CONFLICT',
  'COPY_BOUNCED',
  'LATE_SEND_EVIDENCE',
  'DUPLICATE_SEND_DETECTED',
  'OUTBOX_EVENT_DEAD',
  'FILE_PURGE_FAILED',
  'UNCERTAIN_UNRESOLVED',
  'WEBHOOK_UNPARSED',
] as const;

export const alertTypeLabel = label({
  BATCH_STOPPED: 'Lote detenido',
  MALICIOUS_FILE: 'Archivo malicioso',
  HARD_BOUNCE: 'Rebote permanente',
  COMPLAINT: 'Queja',
  WEBHOOKS_NOT_RECEIVED: 'Webhooks no recibidos',
  PROVIDER_UNKNOWN_ERROR: 'Error desconocido del proveedor',
  PROCESS_FAILED: 'Falla de procesamiento',
  DUPLICATE_CONFLICT: 'Conflicto de duplicado',
  COPY_BOUNCED: 'Rebote de la copia de archivo',
  LATE_SEND_EVIDENCE: 'Evidencia tardía de envío',
  DUPLICATE_SEND_DETECTED: 'Envío duplicado detectado',
  OUTBOX_EVENT_DEAD: 'Evento interno sin entregar',
  FILE_PURGE_FAILED: 'No se pudo borrar un archivo',
  UNCERTAIN_UNRESOLVED: 'Envío incierto sin resolver',
  WEBHOOK_UNPARSED: 'Webhook ilegible',
});

export const uploadOutcomeLabel = label({
  REGISTERED: 'Registrado',
  DUPLICATE: 'Duplicado (ya estaba)',
  DUPLICATE_CONFLICT: 'Conflicto de duplicado',
  REJECTED: 'Rechazado',
});

/** Text of a backend refusal code shown to the operator. */
export const apiErrorLabel = label({
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos',
  UNKNOWN_USER: 'Usuario o contraseña incorrectos',
  WRONG_PASSWORD: 'Usuario o contraseña incorrectos',
  TOO_MANY_REQUESTS: 'Demasiados intentos; espera un minuto',
  SESSION_EXPIRED: 'La sesión terminó; vuelve a iniciar sesión',
  NETWORK_ERROR: 'No se pudo conectar con el servidor',
  PERIOD_NOT_OPERABLE: 'Solo se opera el periodo actual o el anterior',
  EXECUTION_IN_PROGRESS: 'Hay una ejecución en curso',
  EXECUTION_NOT_RUNNING: 'La ejecución ya terminó',
  EXECUTION_STILL_ACTIVE: 'La ejecución sigue avanzando; espera o fuerza la detención',
  MANIFEST_CHANGED: 'El lote cambió desde la versión revisada',
  NOTHING_TO_SEND: 'No hay soportes listos para enviar',
  BATCH_NOT_FOUND: 'El lote no existe',
  BATCH_NOT_EXECUTABLE: 'El lote no se puede ejecutar en su estado actual',
  ARCHIVE_COPY_NOT_CONFIGURED: 'La copia de archivo no está configurada en el servidor',
  UPLOAD_TOO_LARGE: 'La carga supera el límite permitido; divide los archivos en varias cargas',
  NO_FILES: 'No se seleccionó ningún archivo',
  NOTE_REQUIRED: 'La nota es obligatoria',
  BUSINESS_CONFIRMATION_REQUIRED: 'Falta la confirmación del negocio',
  PROVIDER_REMOVAL_NOT_CONFIRMED: 'Falta confirmar que se quitó en la consola del proveedor',
  ADDRESS_NOT_SUPPRESSED: 'La dirección no está suprimida',
  CONCEPT_ALREADY_EXISTS: 'El concepto ya existe',
  INVALID_CONCEPT_KEY: 'Clave de concepto inválida',
  INVALID_CONCEPT_SUBJECT: 'Asunto de concepto inválido',
  ALERT_ALREADY_ACKNOWLEDGED: 'La alerta ya fue reconocida',
  RECEIPT_NOT_REMOVABLE: 'El soporte no se puede retirar',
  RECEIPT_NOT_RESENDABLE: 'El soporte no se puede reenviar',
  RECEIPT_NOT_UNCERTAIN: 'El soporte no está incierto',
  INVALID_REQUEST: 'Solicitud inválida',
});
