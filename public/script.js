const socket = io();

// Elementos DOM - Pantallas
const screenHome = document.getElementById('screen-home');
const screenLobby = document.getElementById('screen-lobby');
const screenGame = document.getElementById('screen-game');

// Elementos DOM - Inputs y Botones
const usernameInput = document.getElementById('username');
const roomCodeInput = document.getElementById('room-code-input');
const btnCreate = document.getElementById('btn-create-room');
const btnJoin = document.getElementById('btn-join-room');
const btnStart = document.getElementById('btn-start-game');
const btnNewGame = document.getElementById('btn-new-game');

// Elementos DOM - Lobby & Juego
const displayRoomCode = document.getElementById('display-room-code');
const playersList = document.getElementById('players-list');
const waitingText = document.querySelector('.waiting-text');
const gameCategory = document.getElementById('game-category');
const viewInnocent = document.getElementById('view-innocent');
const viewImpostor = document.getElementById('view-impostor');
const secretWordEl = document.getElementById('secret-word');
const toastEl = document.getElementById('toast');

// Estado local
let myRoomCode = '';
let isHost = false;

// --- FUNCIONES DE UI ---

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

function updatePlayersList(players) {
    playersList.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.innerHTML = `
            ${p.name}
            ${p.isHost ? '<i class="ph-duotone ph-crown"></i>' : ''}
        `;
        playersList.appendChild(li);
    });

    // Actualizar controles si soy host
    if (isHost && players.length >= 3) {
        btnStart.classList.remove('hidden');
        waitingText.classList.add('hidden');
    } else {
        btnStart.classList.add('hidden');
        if(!isHost) waitingText.textContent = "Esperando al host...";
        else waitingText.textContent = "Se necesitan 3 jugadores mínimo...";
        waitingText.classList.remove('hidden');
    }
}

// --- EVENT LISTENERS ---

btnCreate.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (!name) return showToast('Escribe tu nombre');
    socket.emit('createRoom', name);
});

btnJoin.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!name) return showToast('Escribe tu nombre');
    if (code.length !== 4) return showToast('Código inválido');
    socket.emit('joinRoom', { playerName: name, roomCode: code });
});

btnStart.addEventListener('click', () => {
    if(isHost) socket.emit('startGame', myRoomCode);
});

btnNewGame.addEventListener('click', () => {
    if(isHost) socket.emit('resetGame', myRoomCode);
});

// --- SOCKET EVENTS ---

socket.on('roomCreated', (data) => {
    myRoomCode = data.roomCode;
    isHost = true;
    displayRoomCode.textContent = myRoomCode;
    showScreen(screenLobby);
});

socket.on('roomJoined', (data) => {
    myRoomCode = data.roomCode;
    isHost = data.isHost;
    displayRoomCode.textContent = myRoomCode;
    showScreen(screenLobby);
});

socket.on('updatePlayerList', (players) => {
    updatePlayersList(players);
});

socket.on('error', (msg) => {
    showToast(msg);
});

socket.on('gameStarted', ({ isImpostor, category, secretWord }) => {
    gameCategory.textContent = category;
    
    if (isImpostor) {
        viewImpostor.classList.remove('hidden');
        viewInnocent.classList.add('hidden');
    } else {
        viewImpostor.classList.add('hidden');
        viewInnocent.classList.remove('hidden');
        secretWordEl.textContent = secretWord;
    }

    // Mostrar botón de reinicio solo al host
    if(isHost) btnNewGame.classList.remove('hidden');
    else btnNewGame.classList.add('hidden');

    showScreen(screenGame);
});

socket.on('returnToLobby', () => {
    showScreen(screenLobby);
});

socket.on('youAreHost', () => {
    isHost = true;
    showToast('Ahora eres el anfitrión');
    // Forzar actualización visual si estamos en lobby
    if(screenLobby.classList.contains('active')) {
       // El servidor mandará updatePlayerList automáticamente
    }
});