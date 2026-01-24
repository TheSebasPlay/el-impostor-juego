const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// --- BASE DE DATOS DE PALABRAS ---
const CATEGORIES = {
    "Animales": ["Elefante", "Jirafa", "Pingüino", "Delfín", "León", "Canguro", "Koala", "Ornitorrinco", "Camaleón", "Panda", "Tiburón", "Águila", "Murciélago", "Pulpo", "Lobo", "Oso Polar", "Hámster", "Serpiente", "Loro", "Castor"],
    "Países": ["Japón", "Brasil", "Egipto", "Canadá", "Australia", "Italia", "México", "Rusia", "India", "Francia", "Alemania", "Argentina", "Perú", "China", "España", "Grecia", "Turquía", "Tailandia", "Sudáfrica", "Noruega"],
    "Comida": ["Pizza", "Sushi", "Hamburguesa", "Tacos", "Paella", "Helado", "Chocolate", "Espagueti", "Ensalada", "Curry", "Ceviche", "Croissant", "Arepa", "Ramen", "Lasagna", "Burrito", "Pancakes", "Donas", "Empanada", "Queso"],
    "Profesiones": ["Médico", "Bombero", "Astronauta", "Profesor", "Policía", "Chef", "Programador", "Abogado", "Piloto", "Arquitecto", "Músico", "Electricista", "Dentista", "Veterinario", "Carpintero", "Fotógrafo", "Científico", "Actor", "Periodista", "Mecánico"],
    "Objetos de Casa": ["Sofá", "Refrigerador", "Microondas", "Lámpara", "Espejo", "Cama", "Televisor", "Licuadora", "Mesa", "Silla", "Reloj", "Almohada", "Cortina", "Escoba", "Toalla", "Sartén", "Plancha", "Ventilador", "Maceta", "Llave"],
    "Películas/Géneros": ["Terror", "Comedia", "Ciencia Ficción", "Acción", "Romance", "Titanic", "Star Wars", "Harry Potter", "El Padrino", "Avatar", "Jurassic Park", "El Rey León", "Matrix", "Avengers", "Frozen", "Shrek", "Batman", "Coco", "Joker", "Rocky"],
    "Deportes": ["Fútbol", "Baloncesto", "Tenis", "Natación", "Voleibol", "Béisbol", "Golf", "Boxeo", "Rugby", "Atletismo", "Ciclismo", "Surf", "Esgrima", "Karate", "Hockey", "Esquí", "Gimnasia", "Padel", "Escalada", "Automovilismo"],
    "Instrumentos": ["Guitarra", "Piano", "Batería", "Violín", "Flauta", "Saxofón", "Trompeta", "Arpa", "Ukelele", "Bajo", "Acordeón", "Clarinete", "Maracas", "Xilófono", "Oboe", "Trombón", "Gaita", "Cello", "Banjo", "Teclado"],
    "Marcas": ["Apple", "Nike", "Coca-Cola", "Samsung", "McDonalds", "Disney", "Amazon", "Tesla", "Adidas", "Google", "Netflix", "Lego", "Starbucks", "IKEA", "Toyota", "Sony", "Pepsi", "Microsoft", "Gucci", "Spotify"],
    "Personajes Históricos": ["Einstein", "Napoleón", "Cleopatra", "Shakespeare", "Da Vinci", "Mozart", "Picasso", "Frida Kahlo", "Gandhi", "Mandela", "Colón", "Newton", "Beethoven", "Darwin", "Marie Curie", "Lincoln", "Elvis", "Marilyn Monroe", "Chaplin", "Armstrong"]
};

// --- ESTADO DEL JUEGO ---
const rooms = {};

// Generar código de sala aleatorio (4 letras)
function generateRoomCode() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

io.on('connection', (socket) => {
    
    // CREAR SALA
    socket.on('createRoom', (playerName) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [{ id: socket.id, name: playerName, isHost: true }],
            gameStarted: false,
            impostorId: null,
            category: null,
            secretWord: null
        };
        
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, isHost: true });
        io.to(roomCode).emit('updatePlayerList', rooms[roomCode].players);
    });

    // UNIRSE A SALA
    socket.on('joinRoom', ({ playerName, roomCode }) => {
        const room = rooms[roomCode.toUpperCase()];
        
        if (!room) {
            socket.emit('error', 'La sala no existe.');
            return;
        }
        if (room.gameStarted) {
            socket.emit('error', 'La partida ya ha comenzado.');
            return;
        }
        if (room.players.some(p => p.name === playerName)) {
            socket.emit('error', 'Ese nombre ya está en uso en esta sala.');
            return;
        }

        room.players.push({ id: socket.id, name: playerName, isHost: false });
        socket.join(roomCode.toUpperCase());
        
        socket.emit('roomJoined', { roomCode: roomCode.toUpperCase(), isHost: false });
        io.to(roomCode.toUpperCase()).emit('updatePlayerList', room.players);
    });

    // INICIAR PARTIDA
    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;

        // Lógica de juego
        const playerIds = room.players.map(p => p.id);
        if (playerIds.length < 3) {
            socket.emit('error', 'Se necesitan al menos 3 jugadores.');
            return;
        }

        // Elegir Impostor
        room.impostorId = playerIds[Math.floor(Math.random() * playerIds.length)];
        
        // Elegir Palabra
        const categories = Object.keys(CATEGORIES);
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const words = CATEGORIES[randomCat];
        const randomWord = words[Math.floor(Math.random() * words.length)];

        room.category = randomCat;
        room.secretWord = randomWord;
        room.gameStarted = true;

        // Enviar roles a cada jugador
        room.players.forEach(player => {
            const isImpostor = player.id === room.impostorId;
            io.to(player.id).emit('gameStarted', {
                isImpostor,
                category: room.category,
                secretWord: isImpostor ? null : room.secretWord
            });
        });
    });

    // REINICIAR PARTIDA (Volver al Lobby)
    socket.on('resetGame', (roomCode) => {
        const room = rooms[roomCode];
        if(room) {
            room.gameStarted = false;
            room.impostorId = null;
            room.category = null;
            room.secretWord = null;
            io.to(roomCode).emit('returnToLobby');
        }
    });

    // DESCONEXIÓN
    socket.on('disconnect', () => {
        for (const code in rooms) {
            const room = rooms[code];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const wasHost = room.players[playerIndex].isHost;
                room.players.splice(playerIndex, 1);

                if (room.players.length === 0) {
                    delete rooms[code];
                } else {
                    // Si el host se fue, asignar nuevo host al siguiente jugador
                    if (wasHost) {
                        room.players[0].isHost = true;
                        io.to(room.players[0].id).emit('youAreHost');
                    }
                    io.to(code).emit('updatePlayerList', room.players);
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));