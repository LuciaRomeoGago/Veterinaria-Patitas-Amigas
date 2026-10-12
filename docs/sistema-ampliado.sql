-- Tablas nuevas para la versión web. Se suman a las de TPPOO/Sql/Sistema.sql
-- (Cliente, Mascota, Producto, Inventario, Veterinaria, Veterinario), que no cambian
-- salvo por las columnas nuevas de Mascota, Producto e Inventario.

ALTER TABLE Mascota
    ADD COLUMN especie ENUM('perro', 'gato') NOT NULL DEFAULT 'perro',
    ADD COLUMN peso DECIMAL(5,2) NULL;

-- Celular para los avisos por WhatsApp, y si los quiere recibir.
ALTER TABLE Cliente
    ADD COLUMN telefono VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN whatsapp BOOLEAN NOT NULL DEFAULT TRUE;

-- El equipo: veterinarios y recepción. Recepción no ve la historia clínica completa ni el resumen.
ALTER TABLE Veterinario
    ADD COLUMN rol ENUM('veterinario', 'recepcion') NOT NULL DEFAULT 'veterinario';

-- minimo: con esa cantidad o menos, aviso de poco stock.
-- duraDias: para lo que se termina (alimento, arena), sugiere "pedir otra vez".
ALTER TABLE Producto
    ADD COLUMN minimo INT NOT NULL DEFAULT 5,
    ADD COLUMN duraDias INT NULL;

-- Cada compra con su fecha (resumen del mes) y cómo se paga.
ALTER TABLE Inventario
    ADD COLUMN fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
    ADD COLUMN pago ENUM('mercadopago', 'al_retirar') NOT NULL DEFAULT 'al_retirar',
    ADD COLUMN cobrada BOOLEAN NOT NULL DEFAULT FALSE;

-- Peso a lo largo del tiempo: una fila por pesaje.
CREATE TABLE Pesaje (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    fecha DATE NOT NULL,
    kg DECIMAL(5,2) NOT NULL,
    UNIQUE (mascotaId, fecha),
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE
);

CREATE TABLE Vacuna (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    aplicada DATE NOT NULL,
    proxima DATE NOT NULL,
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE
);

-- Historia clínica por partes: alergias, medicación, enfermedades y lo que le hizo bien o mal.
-- vigente: la medicación sigue en curso o la enfermedad sigue activa.
CREATE TABLE RegistroClinico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    tipo ENUM('alergia', 'medicacion', 'enfermedad', 'bien', 'mal') NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    detalle VARCHAR(255),
    desde DATE,
    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    -- Solo medicación: plan de tomas que el dueño sigue en la app.
    cadaHoras INT NULL,
    dias INT NULL,
    primeraToma DATETIME NULL,
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE,
    INDEX (mascotaId, tipo)
);

-- Cada toma que el dueño marca como dada.
CREATE TABLE TomaDada (
    registroId INT NOT NULL,
    cuando DATETIME NOT NULL,
    PRIMARY KEY (registroId, cuando),
    FOREIGN KEY (registroId) REFERENCES RegistroClinico(id) ON DELETE CASCADE
);

-- Estudios y fotos de la historia clínica: el archivo va a un almacenamiento aparte.
CREATE TABLE Adjunto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('imagen', 'pdf') NOT NULL,
    fecha DATE NOT NULL,
    nota VARCHAR(255),
    url VARCHAR(255) NOT NULL,
    subidoPor INT NOT NULL,
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE,
    FOREIGN KEY (subidoPor) REFERENCES Veterinario(id)
);

-- Historial de cambios de la ficha: quién hizo qué y cuándo (no se edita ni se borra).
CREATE TABLE CambioFicha (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    cuando DATETIME NOT NULL,
    por VARCHAR(100) NOT NULL,
    texto VARCHAR(255) NOT NULL,
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE,
    INDEX (mascotaId, cuando)
);

-- Plantillas de consulta (completan el formulario de Atender).
CREATE TABLE Plantilla (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    detalle TEXT NOT NULL,
    diagnostico VARCHAR(100),
    medicamento VARCHAR(100),
    dosis VARCHAR(255)
);

-- Reemplaza al campo de texto historialMedico: una fila por visita
CREATE TABLE EntradaHistorial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    fecha DATE NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    detalle TEXT,
    veterinarioId INT NULL,
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE,
    FOREIGN KEY (veterinarioId) REFERENCES Veterinario(id) ON DELETE SET NULL
);

CREATE TABLE Turno (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    veterinarioId INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    -- Cada motivo dura distinto (Control y Vacuna 30 min, Consulta 1 h, Cirugía 2 h):
    -- que no se pisen dos turnos del mismo veterinario lo controla la app.
    motivo ENUM('Control', 'Vacuna', 'Consulta', 'Cirugía') NOT NULL,
    estado ENUM('pendiente', 'en_espera', 'en_consulta', 'atendido') NOT NULL DEFAULT 'pendiente',
    llegada TIME NULL,          -- sala de espera
    sena DECIMAL(10,2) NULL,    -- seña pagada al pedirlo desde la app
    UNIQUE (veterinarioId, fecha, hora),
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE,
    FOREIGN KEY (veterinarioId) REFERENCES Veterinario(id)
);

CREATE TABLE Recordatorio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clienteId INT(11) NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    fecha DATE NULL,             -- aviso con fecha (vacuna, desparasitación)
    frecuencia VARCHAR(50) NULL, -- o periódico ("Cada 30 días")
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (clienteId) REFERENCES Cliente(id) ON DELETE CASCADE
);

-- Horarios en que no se dan turnos. Sin desde/hasta, es todo el día.
CREATE TABLE Bloqueo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    desde TIME NULL,
    hasta TIME NULL,
    motivo VARCHAR(100) NOT NULL,
    veterinarioId INT NULL, -- sin veterinario, vale para todos
    INDEX (fecha),
    FOREIGN KEY (veterinarioId) REFERENCES Veterinario(id) ON DELETE CASCADE
);

-- Lista de espera: quería un día que estaba lleno; se le avisa por WhatsApp si se libera lugar.
CREATE TABLE Espera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clienteId INT(11) NOT NULL,
    mascotaId INT(11) NOT NULL,
    motivo ENUM('Control', 'Vacuna', 'Consulta', 'Cirugía') NOT NULL,
    fecha DATE NOT NULL,
    veterinarioId INT NULL, -- sin veterinario, le sirve cualquiera
    avisado DATETIME NULL,
    UNIQUE (mascotaId, fecha),
    FOREIGN KEY (clienteId) REFERENCES Cliente(id) ON DELETE CASCADE,
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE
);

-- Movimientos de stock: entradas del proveedor (con vencimiento del lote), ventas y ajustes.
CREATE TABLE MovimientoStock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productoId INT NOT NULL,
    fecha DATE NOT NULL,
    cantidad INT NOT NULL, -- positivo entra, negativo sale
    tipo ENUM('entrada', 'venta', 'ajuste') NOT NULL,
    detalle VARCHAR(255),
    vence DATE NULL,
    por VARCHAR(100) NOT NULL,
    FOREIGN KEY (productoId) REFERENCES Producto(id) ON DELETE CASCADE,
    INDEX (productoId, fecha)
);

-- Caja del día: cobros de consultas, ventas, señas, gastos y el fondo.
CREATE TABLE MovimientoCaja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    tipo ENUM('consulta', 'venta', 'sena', 'fondo', 'ingreso', 'egreso') NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    medio ENUM('Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Mercado Pago') NOT NULL,
    por VARCHAR(100) NOT NULL,
    INDEX (fecha)
);

CREATE TABLE CierreCaja (
    fecha DATE PRIMARY KEY,
    hora TIME NOT NULL,
    esperado DECIMAL(10,2) NOT NULL,
    contado DECIMAL(10,2) NOT NULL,
    por VARCHAR(100) NOT NULL
);
