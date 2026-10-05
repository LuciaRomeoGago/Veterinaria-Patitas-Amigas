-- Tablas nuevas para la versión web. Se suman a las de TPPOO/Sql/Sistema.sql
-- (Cliente, Mascota, Producto, Inventario, Veterinaria, Veterinario), que no cambian
-- salvo por las dos columnas nuevas de Mascota.

ALTER TABLE Mascota
    ADD COLUMN especie ENUM('perro', 'gato') NOT NULL DEFAULT 'perro',
    ADD COLUMN peso DECIMAL(5,2) NULL;

CREATE TABLE Vacuna (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    aplicada DATE NOT NULL,
    proxima DATE NOT NULL,
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE
);

-- Alergias y medicación
CREATE TABLE Indicacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascotaId INT(11) NOT NULL,
    tipo ENUM('alergia', 'medicacion') NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    detalle VARCHAR(255),
    FOREIGN KEY (mascotaId) REFERENCES Mascota(id) ON DELETE CASCADE
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
    motivo ENUM('Control', 'Vacuna', 'Consulta') NOT NULL,
    estado ENUM('pendiente', 'confirmado', 'atendido', 'cancelado') NOT NULL DEFAULT 'pendiente',
    UNIQUE (veterinarioId, fecha, hora), -- un horario no se puede dar dos veces
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
