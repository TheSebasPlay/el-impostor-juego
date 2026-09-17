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
"Personas del colegio": [
    "Antonella Hassinger",
    "Sofia Rosell",
    "Kiara Grandez",
    "Domenica Santos",
    "Renata Diezcanceco",
    "Luana de la Toree",
    "Isabella Ruiz",
    "Micaela Levano",
    "Rafaella Urraca",
    "Doña Pepa",
    "Valentina Espino",
    "Romina Valencia",
    "Iara Pacheco",
    "Catalina Mosquera",
    "Andrea Alvarado",
    "Alejandra Haya",
    "Valery Yanac",
    "Luvidka",
    "Adriana Conchucos",
    "Rafaella Madueño",
    "Ditolvi",
    "Pucutay",
    "Steve",
    "Mario",
    "Carillo",
    "Asier",
    "Fabiano",
    "Mamani",
    "Thiago Loo"
],

    "Profesor del colegio": [
        "Eric Luque",
        "Silvia Angles",
        "Alejandro Ruiz",
        "Coquis",
        "Amesquita",
        "Juan Pablo Avalos",
        "Jorge Castro",
        "Cabanillas",
        "Oscco",
        "Ivan Arcaya"
    ],

    "Animales": [
        "León",
        "Elefante",
        "Delfín",
        "Pingüino",
        "Canguro",
        "Águila",
        "Tiburón",
        "Panda",
        "Gato",
        "Lobo",
        "Tigre",
        "Jirafa",
        "Cebra",
        "Gorila",
        "Cocodrilo",
        "Serpiente",
        "Tortuga",
        "Koala",
        "Oso polar",
        "Zorro",
        "Conejo",
        "Caballo",
        "Vaca",
        "Cerdo",
        "Gallina",
        "Pato",
        "Búho",
        "Flamenco",
        "Rinoceronte",
        "Hipopótamo",
        "Mono",
        "Pavo",
        "Camello",
        "Pingüino emperador",
        "Orca",
        "Medusa",
        "Pulpo",
        "Cangrejo",
        "Mariposa",
        "Abeja"
    ],

    "Comida": [
        "Pizza",
        "Sushi",
        "Hamburguesa",
        "Tacos",
        "Pasta",
        "Ceviche",
        "Helado",
        "Pollo a la Brasa",
        "Lasagna",
        "Arroz chaufa",
        "Lomo saltado",
        "Anticuchos",
        "Salchipapa",
        "Hot dog",
        "Papas fritas",
        "Enchiladas",
        "Burrito",
        "Nachos",
        "Ramen",
        "Pad Thai",
        "Pollo frito",
        "Alitas BBQ",
        "Macarrones con queso",
        "Panqueques",
        "Waffles",
        "Donas",
        "Brownie",
        "Cheesecake",
        "Torta de chocolate",
        "Empanada",
        "Tequeños",
        "Causa",
        "Papa rellena",
        "Ají de gallina",
        "Arroz con pollo",
        "Tallarines verdes",
        "Churros",
        "Croissant",
        "Picarones"
    ],

    "Marcas": [
        "Apple",
        "Nike",
        "Adidas",
        "Coca-Cola",
        "Samsung",
        "Disney",
        "Tesla",
        "Google",
        "Netflix",
        "Amazon",
        "Microsoft",
        "Sony",
        "PlayStation",
        "Xbox",
        "Nintendo",
        "Puma",
        "Porsche",
        "Ferrari",
        "Mercedes-Benz",
        "BMW",
        "Toyota",
        "Honda",
        "Ford",
        "McDonald's",
        "KFC",
        "Starbucks",
        "Pepsi",
        "Red Bull",
        "Lego",
        "Gucci",
        "Louis Vuitton",
        "Prada",
        "Zara",
        "H&M",
        "Vans",
        "Converse",
        "New Balance",
        "YouTube",
        "Spotify",
        "TikTok"
    ],

    "Cantantes Urbanos": [
        "Bad Bunny",
        "Karol G",
        "J Balvin",
        "Daddy Yankee",
        "Rauw Alejandro",
        "Feid",
        "Ozuna",
        "Anuel AA",
        "Bizarrap",
        "Myke Towers",
        "Arcángel",
        "Eladio Carrión",
        "Mora",
        "De La Ghetto",
        "Ñengo Flow",
        "Wisin",
        "Yandel",
        "Don Omar",
        "Nicky Jam",
        "Cosculluela",
        "Sech",
        "Dalex",
        "Lunay",
        "Justin Quiles",
        "Bryant Myers",
        "Lyanno",
        "Jhayco",
        "Ryan Castro",
        "Blessd",
        "Kris R",
        "Young Miko",
        "Tokischa",
        "Villano Antillano",
        "Cazzu",
        "Duki",
        "Trueno",
        "Tiago PZK",
        "Emilia",
        "Nicki Nicole",
        "María Becerra"
    ]
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
        if (playerIds.length < 2) {
            socket.emit('error', 'Se necesitan al menos 2 jugadores.');
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

