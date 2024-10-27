// CONFIGURACIÓN PRINCIPAL DEL JUEGO UTILIZANDO PHASER
const configuracion = {
    type: Phaser.AUTO, // Tipo de renderizado (AUTO, CANVAS, WEBGL)
    width: 800,         // ANcho y alto del juego
    height: 600,       
    backgroundColor: '#2c3e50', // Color de fondo del juego
    physics: {
        default: 'arcade', // Tipo de física por defecto
        arcade: {
            debug: false // Desactivar la visualización de depuración
        }
    },
    scene: {
        preload: precargar, // precargar assets
        create: crear,      //crear los objetos del juego
        update: actualizar   // tick
    }
};

// Inicialización del juego con la configuración definida
const juego = new Phaser.Game(configuracion);

// VARIABLES GLOBALES DEL JUEGO
let camino;                  // Objeto que representa el camino de los enemigos
let enemigos = [];           // Lista de enemigos activos en el juego
let torres = [];             // Lista de torres colocadas por el jugador
let balas = [];              // Lista de balas disparadas por las torres
let dinero = 100;            // Dinero inicial del jugador
let vidas = 5;               // Vidas iniciales del jugador

let numeroOleada = 0;        // Número de la oleada actual
let enemigosPorOleada = 5;   // Número inicial de enemigos por oleada
let saludBaseEnemigo = 3;    // Salud base de los enemigos, incrementa por oleada
const velocidadBala = 550;   // Velocidad de las balas disparadas por las torres
const costoTorre = 70;       // Costo inicial para colocar una torre
const costoMejora = 50;      // Costo para mejorar una torre

const umbralColocacionTorre = 30; // Distancia mínima desde el camino para permitir la colocación de torres

/**
 * METODO PRELOAD: CARGA LOS ASSETS NECESARIOS ANTES DE QUE EL JUEGO COMIENCE.
 */
function precargar() {
    // CARGAR IMAGENES PARA ENEMIGOS, TORRES Y BALAS
    this.load.image('enemigo', 'https://labs.phaser.io/assets/sprites/enemy-bullet.png');
    this.load.image('ovniEnemigo', 'https://labs.phaser.io/assets/sprites/ufo.png');
    this.load.image('torre', 'assets/image/torre.png');
    this.load.image('bala', 'https://labs.phaser.io/assets/sprites/bullet.png');
}

/**
 * METODO CREAR: CONFIGURA LOS OBJETOS Y ELEMENTOS DEL JUEGO UNA VEZ CARGADOS LOS ASSETS.
 */
function crear() {
    // Crear el camino que seguiran los enemigos
    camino = this.add.path(50, 50);
    camino.lineTo(350, 50);
    camino.lineTo(350, 150);
    camino.lineTo(40, 150);
    camino.lineTo(40, 300);
    camino.lineTo(600, 300);
    camino.lineTo(700, 300);
    camino.lineTo(700, 550);
    camino.lineTo(50, 550);

    // Dibujar el camino para referencia visual
    const graficos = this.add.graphics();
    graficos.lineStyle(3, 0xf1c40f, 0.8); // Estilo de línea: (grosor, color, opacidad)
    camino.draw(graficos); // Dibujar el camino sobre los gráficos

    // HUD para mostrar DINERO, VIDAS y NÚMERO DE OLEADA
    this.textoDinero = this.add.text(10, 10, `Dinero: ${dinero}`, { fontSize: '16px', fill: '#FFF' });
    this.textoVidas = this.add.text(10, 30, `Vidas: ${vidas}`, { fontSize: '16px', fill: '#FFF' });
    this.textoOleada = this.add.text(10, 50, `Oleada: ${numeroOleada}`, { fontSize: '16px', fill: '#FFF' });

    // CONFIGURAR EL EVENTO DE CLIC PARA COLOCAR O MEJORAR TORRES
    this.input.on('pointerdown', (puntero) => {
        // Buscar si se hizo clic cerca de una torre existente
        const torreClicada = torres.find(torre => Phaser.Math.Distance.Between(torre.x, torre.y, puntero.x, puntero.y) < 20);

        if (torreClicada && dinero >= costoMejora) {
            // Si se hizo clic en una torre y hay suficiente dinero, MEJORAR LA TORRE
            mejorarTorre(torreClicada);
            dinero -= costoMejora;
            this.textoDinero.setText(`Dinero: ${dinero}`);
        } else if (!torreClicada && dinero >= costoTorre && esPosicionValidaParaTorre(puntero.x, puntero.y)) {
            // Si NO se hizo clic en una torre y hay suficiente dinero, intentar colocar una nueva torre
            colocarTorre(puntero.x, puntero.y, this);
            dinero -= costoTorre;
            this.textoDinero.setText(`Dinero: ${dinero}`);
        }
    });

    // Iniciar la primera oleada de enemigos
    iniciarOleada(this);
}

/**
 * METODO ACTUALIZAR: SE EJECUTA EN CADA FRAME DEL JUEGO PARA ACTUALIZAR EL ESTADO DE LOS OBJETOS.
 */
function actualizar() {
    // Actualizar la posición de cada enemigo en el camino
    enemigos.forEach(enemigo => {
        if (enemigo.active) {
            const punto = camino.getPoint(enemigo.progreso); // Obtener el punto actual en el camino
            enemigo.setPosition(punto.x, punto.y); // Actualizar posición del enemigo
            enemigo.progreso += enemigo.velocidad; // Incrementar el progreso del enemigo en el camino

            // Verificar si el enemigo ha llegado al final del camino
            if (enemigo.progreso >= 1) {
                enemigo.destroy(); // Eliminar el enemigo del juego
                enemigos = enemigos.filter(e => e !== enemigo); // Remover el enemigo de la lista
                vidas--; // Reducir las vidas del jugador
                this.textoVidas.setText(`Vidas: ${vidas}`); // Actualizar el HUD

                // Verificar si el jugador se ha quedado sin vidas
                if (vidas <= 0) {
                    this.scene.pause(); // Pausar el juego
                    this.add.text(300, 250, '¡JUEGO TERMINADO!', { fontSize: '32px', fill: '#FFF' });
                }
            }
        }
    });

    // Actualizar el texto de DINERO en el HUD
    this.textoDinero.setText(`Dinero: ${dinero}`);

    // Manejar el disparo de las TORRES
    torres.forEach(torre => {
        if (torre.tiempoParaDisparar <= 0) {
            dispararBala(torre, this); // Disparar una bala desde la torre
            torre.tiempoParaDisparar = torre.retrasoDisparo; // Reiniciar el temporizador de disparo
        } else {
            torre.tiempoParaDisparar--; // Decrementar el temporizador de disparo
        }
    });

    // Actualizar la posición de las BALAS y verificar si deben ser destruidas
    balas.forEach(bala => {
        if (bala.active && bala.objetivo && bala.objetivo.active) {
            this.physics.moveTo(bala, bala.objetivo.x, bala.objetivo.y, velocidadBala); // Mover la bala hacia el objetivo
        } else {
            bala.destroy(); // Destruir la bala si no tiene objetivo activo
        }
    });

    // Iniciar una nueva oleada si no quedan enemigos activos
    if (enemigos.length === 0) {
        iniciarOleada(this);
    }
}

/**
 * FUNCION PARA VERIFICAR SI LA POSICION ELEGIDA PARA COLOCAR UNA TORRE ESTA LEJOS DEL CAMINO.
 * @param {number} x - Coordenada x de la posicion clicada.
 * @param {number} y - Coordenada y de la posicion clicada.
 * @returns {boolean} - Retorna TRUE si la posicion es valida para colocar una torre.
 */
function esPosicionValidaParaTorre(x, y) {
    const puntosCamino = camino.getPoints(50); // Obtener puntos del camino para verificar distancia
    // Verificar que cada punto del camino este a una distancia mayor que el umbral establecido
    return puntosCamino.every(punto => Phaser.Math.Distance.Between(x, y, punto.x, punto.y) > umbralColocacionTorre);
}

/**
 * FUNCION PARA INICIAR UNA NUEVA OLEADA DE ENEMIGOS.
 * @param {Phaser.Scene} escena - La escena actual del juego.
 */
function iniciarOleada(escena) {
    numeroOleada++; // Incrementar el numero de oleada
    escena.textoOleada.setText(`Oleada: ${numeroOleada}`); // Actualizar el HUD

    enemigosPorOleada += 2;      // Incrementar el numero de enemigos por oleada
    saludBaseEnemigo += 1;       // Incrementar la salud base de los enemigos

    // Generar los enemigos de la oleada con un retardo para no aparecer todos al mismo tiempo
    for (let i = 0; i < enemigosPorOleada; i++) {
        escena.time.addEvent({
            delay: i * 500, // Retardo en milisegundos
            callback: () => generarEnemigo(escena),
            loop: false
        });
    }
}

/**
 * FUNCION PARA COLOCAR UNA TORRE EN LA POSICION ESPECIFICADA.
 * @param {number} x - Coordenada x donde se colocara la torre.
 * @param {number} y - Coordenada y donde se colocara la torre.
 * @param {Phaser.Scene} escena - La escena actual del juego.
 */
function colocarTorre(x, y, escena) {
    const torre = escena.add.sprite(x, y, 'torre'); // Crear la torre en la posicion
    torre.rango = 150;               // DEFINIR EL RANGO DE DETECCION DE LA TORRE
    torre.retrasoDisparo = 50;       // Retraso entre disparos en frames
    torre.tiempoParaDisparar = 0;    // Temporizador inicial para disparar
    torre.nivel = 1;                 // Nivel inicial de la torre
    torres.push(torre);              // Añadir la torre a la lista de torres
}

/**
 * FUNCION PARA MEJORAR UNA TORRE EXISTENTE.
 * @param {Phaser.GameObjects.Sprite} torre - La torre a mejorar.
 */
function mejorarTorre(torre) {
    torre.nivel += 1;                        // Incrementar el nivel de la torre
    torre.rango += 20;                       // Aumentar el rango de deteccion
    torre.retrasoDisparo = Math.max(20, torre.retrasoDisparo - 10); // Reducir el retraso entre disparos, minimo 20

    // Mostrar en la consola los detalles de la MEJORA
    console.log(`Torre mejorada a nivel ${torre.nivel}: rango = ${torre.rango}, disparo cada ${torre.retrasoDisparo} ms`);
}

/**
 * FUNCION PARA GENERAR UN NUEVO ENEMIGO Y AÑADIRLO AL JUEGO.
 * @param {Phaser.Scene} escena - La escena actual del juego.
 */
function generarEnemigo(escena) {
    const tipoEnemigo = Phaser.Math.Between(0, 1); // Decidir aleatoriamente el tipo de enemigo
    let enemigo;

    if (tipoEnemigo === 0) {
        // Enemigo basico
        enemigo = escena.add.sprite(0, 0, 'enemigo');
        enemigo.salud = saludBaseEnemigo;    // Asignar salud base
        enemigo.velocidad = 0.0003;          // Asignar velocidad constante
    } else {
        // Enemigo tipo OVNI
        enemigo = escena.add.sprite(0, 0, 'ovniEnemigo');
        enemigo.salud = Math.max(1, saludBaseEnemigo - 1); // Menos salud pero al menos 1
        enemigo.velocidad = 0.0005;          // Mayor velocidad
    }

    enemigo.progreso = 0; // Inicializar el progreso del enemigo en el camino
    escena.physics.add.existing(enemigo); // Añadir física al enemigo
    enemigos.push(enemigo); // Añadir el enemigo a la lista de enemigos
}

/**
 * FUNCION PARA DISPARAR UNA BALA DESDE UNA TORRE HACIA UN ENEMIGO.
 * @param {Phaser.GameObjects.Sprite} torre - La torre que disparará la bala.
 * @param {Phaser.Scene} escena - La escena actual del juego.
 */
function dispararBala(torre, escena) {
    // Buscar el primer enemigo dentro del rango de la torre
    const enemigo = enemigos.find(e => e.active && Phaser.Math.Distance.Between(torre.x, torre.y, e.x, e.y) < torre.rango);
    
    if (enemigo) {
        const bala = escena.physics.add.sprite(torre.x, torre.y, 'bala'); // Crear la bala en la posicion de la torre
        bala.objetivo = enemigo; // Asignar el objetivo de la bala
        balas.push(bala);        // Añadir la bala a la lista de balas

        // Detectar colision entre la bala y el enemigo
        escena.physics.add.overlap(bala, enemigo, (b, e) => {
            e.salud -= 1;  // Reducir la salud del enemigo
            b.destroy();   // Destruir la bala

            // Verificar si el enemigo ha sido destruido
            if (e.salud <= 0) {
                e.destroy(); // Eliminar el enemigo del juego
                enemigos = enemigos.filter(en => en !== e); // Remover el enemigo de la lista
                dinero += 10; // Incrementar el dinero del jugador
                escena.textoDinero.setText(`Dinero: ${dinero}`); // Actualizar el HUD
            }
        });
    }
}
