import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";

// ===== CONFIGURAÇÃO DE ESTILOS POR PONTUAÇÃO =====
const getBackgroundClass = (score) => {
  const level = Math.min(Math.floor(score / 500), 7);
  const classes = [
    'bg-gradient-to-b from-sky-300 via-sky-200 to-green-300',
    'bg-gradient-to-b from-sky-400 via-sky-300 to-green-400',
    'bg-gradient-to-b from-sky-500 via-sky-400 to-green-500',
    'bg-gradient-to-b from-slate-500 via-slate-600 to-green-600',
    'bg-gradient-to-b from-slate-600 via-slate-700 to-green-700',
    'bg-gradient-to-b from-slate-700 via-slate-800 to-green-800',
    'bg-gradient-to-b from-slate-800 via-slate-900 to-green-900',
    'bg-gradient-to-b from-gray-900 via-black to-black',
  ];
  return classes[level];
};

const getGroundClass = (score) => {
  if (score >= 5500) {
    return 'bg-white'; // ❄️ Neve
  }
  const level = Math.min(Math.floor(score / 500), 7);
  const classes = [
    'bg-gradient-to-t from-green-800 via-green-600 to-green-500',
    'bg-gradient-to-t from-green-800 via-green-600 to-green-500',
    'bg-gradient-to-t from-green-800 via-green-700 to-green-600',
    'bg-gradient-to-t from-green-900 via-green-800 to-green-700',
    'bg-gradient-to-t from-green-900 via-green-800 to-green-700',
    'bg-gradient-to-t from-gray-900 via-green-900 to-green-800',
    'bg-gradient-to-t from-black via-gray-900 to-green-900',
    'bg-gradient-to-t from-black via-black to-gray-900',
  ];
  return classes[level];
};

export default function ParkourGame() {
  const navigate = useNavigate();

  // ===== ESTADOS DO JOGO =====
  const [playerX] = useState(5); // Posição fixa em %
  const [isJumping, setIsJumping] = useState(false);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0); // ✅ Lógica interna
  const [displayScore, setDisplayScore] = useState(0); // ✅ SÓ PARA EXIBIÇÃO
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showGameOverVideo, setShowGameOverVideo] = useState(false);

  // ===== REFERÊNCIAS =====
  const lastFrameTimeRef = useRef(performance.now());
  const gameSpeedRef = useRef(8);
  const gameLoopRef = useRef(null);
  const rainIntervalRef = useRef(null);
  const snowIntervalRef = useRef(null);
  const lightningIntervalRef = useRef(null);
  const spacePressedRef = useRef(false);

  // Obstacles ref
  const obstaclesRef = useRef([]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);

  // Score ref
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Animação dos zumbis
  const zombieFrameMapRef = useRef(new Map());
  const ZOMBIE_FRAME_INTERVAL = 150;

  // Animação do Tyler
  const [tylerFrame, setTylerFrame] = useState(0);
  const tylerFrameTimeRef = useRef(performance.now());
  const TYLER_FRAME_INTERVAL = 150;

  // Efeitos
  const [lightningFlash, setLightningFlash] = useState(0);
  const [lightningPosition, setLightningPosition] = useState(50);
  const [moonY, setMoonY] = useState(window.innerHeight);
  const [sunY, setSunY] = useState(window.innerHeight); // ✅ Sol começa na mesma altura da lua
  const [flashScreen, setFlashScreen] = useState(false);

  // Áudios
  const jumpSoundRef = useRef(null);
  const gameOverSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const thunderSoundRef = useRef(null);
  const rainSoundRef = useRef(null);
  const snowSoundRef = useRef(null);

  // Vídeo
  const videoRef = useRef(null);

  // ===== INICIALIZAÇÃO =====
  useLayoutEffect(() => {
    setMoonY(window.innerHeight);
    setSunY(window.innerHeight); // ✅ Sol começa na mesma altura que a lua
  }, []);

  // ===== REINICIAR JOGO =====
  const resetGame = useCallback(() => {
    setGameOver(false);
    setGameStarted(false);
    setScore(0);
    setDisplayScore(0);
    setObstacles([]);
    obstaclesRef.current = [];
    setIsJumping(false);
    zombieFrameMapRef.current.clear();
    setShowGameOverVideo(false);
    setTylerFrame(0);
    tylerFrameTimeRef.current = performance.now();
    setMoonY(window.innerHeight);
    setSunY(window.innerHeight);

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = null;

    if (rainIntervalRef.current) clearInterval(rainIntervalRef.current);
    if (snowIntervalRef.current) clearInterval(snowIntervalRef.current);
    if (lightningIntervalRef.current) clearInterval(lightningIntervalRef.current);

    lastFrameTimeRef.current = performance.now();
    gameSpeedRef.current = 8;
    scoreRef.current = 0;
    spacePressedRef.current = false;

    const music = backgroundMusicRef.current;
    if (music) {
      music.pause();
      music.currentTime = 0;
    }
  }, []);

  // ===== PULO CONTÍNUO COM ESPAÇO PRESSIONADO =====
  const startJump = useCallback(() => {
    if (isJumping || gameOver) return;

    if (!gameStarted) {
      setGameStarted(true);
      const music = backgroundMusicRef.current;
      if (music) {
        music.currentTime = 0;
        music.play().catch(e => console.log("Áudio bloqueado:", e));
      }
    }

    setIsJumping(true);
    jumpSoundRef.current?.play().catch(() => {});
    setTimeout(() => setIsJumping(false), 400);
  }, [isJumping, gameOver, gameStarted]);

  const handleKeyDown = useCallback((e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!spacePressedRef.current) {
        spacePressedRef.current = true;
        startJump();
        const interval = setInterval(() => {
          if (!spacePressedRef.current || gameOver || isJumping) {
            clearInterval(interval);
            return;
          }
          startJump();
        }, 500); // Intervalo entre pulos ao segurar
        spacePressedRef.current = interval;
      }
    }
  }, [startJump, isJumping, gameOver]);

  const handleKeyUp = useCallback((e) => {
    if (e.code === "Space") {
      if (typeof spacePressedRef.current === 'number') {
        clearInterval(spacePressedRef.current);
      }
      spacePressedRef.current = false;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleTouch = () => !gameOver && startJump();

  // ===== LOOP PRINCIPAL DO JOGO =====
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const playerPixelX = (playerX / 100) * window.innerWidth;

    const loop = (currentTime) => {
      if (!gameStarted || gameOver) return;

      const delta = Math.min((currentTime - lastFrameTimeRef.current) / 16.67, 2);
      lastFrameTimeRef.current = currentTime;

      gameSpeedRef.current = 4 + Math.floor(scoreRef.current / 600) * 0.5;

      const prev = obstaclesRef.current;
      const updated = [];
      let pointsToAdd = 0;

      for (let obs of prev) {
        const newX = obs.x - gameSpeedRef.current * delta;

        // Animação zumbi
        const frameData = zombieFrameMapRef.current.get(obs.id) || { frame: 0, time: currentTime };
        if (currentTime - frameData.time >= ZOMBIE_FRAME_INTERVAL) {
          const nextFrame = (frameData.frame + 1) % 5;
          zombieFrameMapRef.current.set(obs.id, { frame: nextFrame, time: currentTime });
        }

        // Pontuação
        let scored = obs.scored;
        if (!scored && obs.x > playerPixelX && newX <= playerPixelX) {
          scored = true;
          pointsToAdd += 20;
        }

        // Colisão
        const playerLeft = playerPixelX + 10;
        const playerRight = playerLeft + 40;
        const playerBottom = isJumping ? 210 : 124;
        const playerTop = playerBottom + 56;

        const zombieLeft = newX + 14;
        const zombieRight = newX + 25;
        const zombieBottom = 128;
        const zombieTop = zombieBottom + 56;

        const collidesX = playerRight > zombieLeft && playerLeft < zombieRight;
        const collidesY = playerBottom < zombieTop && playerTop > zombieBottom;

        if (collidesX && collidesY) {
          setGameOver(true);
          if (gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current);
            gameLoopRef.current = null;
          }
          backgroundMusicRef.current?.pause();
          gameOverSoundRef.current?.play().catch(() => {});
          setTimeout(() => {
            setShowGameOverVideo(true);
            setObstacles([]);
            obstaclesRef.current = [];
          }, 1000);
          return;
        }

        if (newX > -100) {
          updated.push({ ...obs, x: newX, scored });
        } else {
          zombieFrameMapRef.current.delete(obs.id);
        }
      }

      // Spawn de novo zumbi
      if (updated.length === 0 || updated[updated.length - 1].x < window.innerWidth - 300) {
        const last = updated[updated.length - 1];
        const spacing = 300 + Math.random() * 500;
        const x = last ? last.x + spacing : window.innerWidth;
        const id = Date.now() + Math.random();
        const newZombie = { id, x, scored: false };
        zombieFrameMapRef.current.set(id, { frame: 0, time: currentTime });
        updated.push(newZombie);
      }

      // Atualiza obstáculos
      obstaclesRef.current = updated;
      setObstacles(updated);

      // Atualiza scores
      if (pointsToAdd > 0) {
        setScore(prev => {
          const newScore = prev + pointsToAdd;
          scoreRef.current = newScore;
          return newScore;
        });
        setDisplayScore(prev => prev + pointsToAdd);
      }

      // Animação do Tyler
      if (!isJumping) {
        if (currentTime - tylerFrameTimeRef.current >= TYLER_FRAME_INTERVAL) {
          setTylerFrame(prev => (prev + 1) % 4);
          tylerFrameTimeRef.current = currentTime;
        }
      }

      // ✅ Animação do Sol — desce 100px até 2000
      if (scoreRef.current <= 2000) {
        const progress = scoreRef.current / 2000;
        setSunY(window.innerHeight - progress * 100);
      }

      // ✅ Animação da Lua — só começa aos 3000
      if (scoreRef.current >= 3000) {
        let y;
        if (scoreRef.current <= 4000) {
          y = window.innerHeight; // escondida no topo
        } else {
          const progress = Math.min((scoreRef.current - 4000) / 1000, 1);
          y = window.innerHeight - progress * 100; // desce 100px
        }
        setMoonY(y);
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStarted, gameOver, playerX, isJumping]);

  // ===== EFEITOS DINÂMICOS =====

  // ⚡ Raio: 2500 a 3500
  useEffect(() => {
    if (score >= 2500 && score <= 3500 && gameStarted && !gameOver) {
      const trigger = () => {
        setLightningPosition(10 + Math.random() * 70);
        setLightningFlash(1);
        setTimeout(() => setLightningFlash(2), 150);
        setTimeout(() => setLightningFlash(0), 300);
        thunderSoundRef.current?.play().catch(() => {});
        setFlashScreen(true);
        setTimeout(() => setFlashScreen(false), 100);
      };
      trigger();
      lightningIntervalRef.current = setInterval(trigger, 2000);
      return () => clearInterval(lightningIntervalRef.current);
    }
  }, [score, gameStarted, gameOver]);

  // 🌧️ Chuva: 3000 até 4500
  useEffect(() => {
    if (score >= 3000 && score < 4500 && gameStarted && !gameOver) {
      if (!rainSoundRef.current?.paused) return;
      rainSoundRef.current?.play().catch(() => {});
      const interval = setInterval(() => {
        const container = document.getElementById('rain-container');
        if (!container) return;
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.cssText = `
          position: absolute; top: -10px; left: ${Math.random() * 100}vw;
          width: 1.5px; height: 18px; background: rgba(200,200,255,0.7);
          box-shadow: 0 0 8px rgba(200,200,255,0.5); pointer-events: none;
          animation: fall ${0.8 + Math.random() * 0.4}s linear;
        `;
        container.appendChild(drop);
        setTimeout(() => drop.remove(), 1000);
      }, 60);
      return () => {
        clearInterval(interval);
        rainSoundRef.current?.pause();
      };
    }
  }, [score, gameStarted, gameOver]);

  // ❄️ Neve: a partir de 5000
  useEffect(() => {
    if (score >= 5000 && gameStarted && !gameOver) {
      const interval = setInterval(() => {
        const container = document.getElementById('snow-container');
        if (!container) return;
        const flake = document.createElement('div');
        flake.className = 'snow-flake';
        flake.style.cssText = `
          position: absolute; top: -10px; left: ${Math.random() * 100}vw;
          width: ${3 + Math.random() * 4}px; height: ${3 + Math.random() * 4}px;
          background: white; border-radius: 50%; pointer-events: none;
          animation: fall ${3 + Math.random() * 2}s linear forwards;
          opacity: ${0.6 + Math.random() * 0.4};
        `;
        container.appendChild(flake);
        setTimeout(() => flake.remove(), 5000);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [score, gameStarted, gameOver]);

  // ✅ Calcula a posição do marcador na barra de progresso (0 a 100%)
  const progressPercent = Math.min((score / 10000) * 100, 100);

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${getBackgroundClass(score)}`}
      onClick={handleTouch}
      onTouchStart={handleTouch}
    >
      <style jsx>{`
        @keyframes moveLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-100vw); } }
        @keyframes fall {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>

      {/* ☀️ Sol */}
      {score <= 2000 && (
        <img
          src="/img/sol.png"
          alt="Sol"
          style={{
            position: 'absolute',
            width: '25vw',
            height: '25vw',
            right: '5%',
            top: `${sunY}px`,
            transition: 'top 0.5s ease-out',
            zIndex: 10,
            filter: 'brightness(1.3) drop-shadow(0 0 15px rgba(255,200,0,0.8))',
          }}
        />
      )}

      {/* 🌙 Lua */}
      {score >= 3000 && (
        <img
          src="/img/lua.png"
          alt="Lua"
          style={{
            position: 'absolute',
            width: '25vw',
            height: '25vw',
            left: '5%',
            top: `${moonY}px`,
            transition: 'top 1s linear',
            zIndex: 10,
            filter: 'brightness(1.2) drop-shadow(0 0 10px yellow)',
            opacity: score >= 3000 && score < 3500 ? (score - 3000) / 500 : 1, // fade-in suave
          }}
        />
      )}

      {/* ⚡ Raio */}
      {score >= 2500 && score <= 3500 && lightningFlash > 0 && (
        <img
          src="/img/raioz.png"
          alt="Raio"
          style={{
            position: 'absolute',
            left: `${lightningPosition}%`,
            top: '100px',
            width: '180px',
            height: '540px',
            transform: 'translateX(-50%)',
            opacity: lightningFlash === 1 ? 0.9 : 0.7,
            filter: 'drop-shadow(0 0 20px yellow)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Clarão */}
      {flashScreen && (
        <div className="fixed inset-0 bg-white opacity-50 z-50 pointer-events-none"></div>
      )}

      {/* 🌧️ Chuva */}
      <div id="rain-container" className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}></div>

      {/* ❄️ Neve */}
      <div id="snow-container" className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}></div>

      {/* Nuvens */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-80"
            style={{
              top: 200,
              left: `${20 + i * 25}%`,
              width: 100,
              height: 40,
              animation: `moveLeft ${15 + i * 5}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Chão */}
      <div className={`absolute bottom-0 w-full h-32 ${getGroundClass(score)}`} style={{ zIndex: 20 }}></div>

      {/* Título */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 z-50">
        <img
          src="/img/logo.png"
          alt="Logo"
          className="h-10 sm:h-12 object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            console.warn("Logo não encontrada: /img/logo.png");
          }}
        />
        <span className="text-white text-xl sm:text-2xl font-bold drop-shadow-lg">Ghrong</span>
      </div>

      {/* Barra de Progresso */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md z-50">
        <div className="w-full h-4 bg-gray-800/50 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
          <div
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${progressPercent}%` }}
          >
            <img
              src="/img/1.png"
              alt="Progresso"
              className="w-6 h-6 sm:w-8 sm:h-8"
              onError={(e) => {
                e.target.style.display = 'none';
                console.warn("Marcador 1.png não encontrado");
              }}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-white mt-1">
          <span>0</span>
          <span>10.000</span>
        </div>
      </div>

      {/* Placar */}
      <div className="absolute top-24 left-4 text-white text-xl font-bold bg-black/30 px-3 py-1 rounded-lg z-50">
        🎯 {displayScore}
      </div>

      {/* Jogador */}
      <div
        className="absolute z-30 transition-all duration-500 ease-out"
        style={{
          left: `${playerX}%`,
          bottom: `${isJumping ? 210 : 124}px`,
        }}
      >
        <AnimatedTyler />
      </div>

      {/* Linha de Pontuação (debug invisível) */}
      <div
        style={{
          position: 'absolute',
          left: `${playerX}%`,
          bottom: '128px',
          width: '2px',
          height: '100px',
          backgroundColor: 'lime',
          opacity: 0,
          zIndex: 25,
          transform: 'translateX(-50%)',
        }}
      />

      {/* Zumbis */}
      {obstacles.map((obs) => (
        <AnimatedZombie key={obs.id} id={obs.id} x={obs.x} />
      ))}

      {/* Tela Inicial */}
      {!gameStarted && !gameOver && (
        <div
          className="absolute inset-0 bg-black/40 flex items-center justify-center z-40 cursor-pointer"
          onClick={startJump}
        >
          <div className="bg-white/90 p-6 rounded-xl text-center backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-gray-800">🎮 Comece a Jogar!</h2>
            <p className="text-gray-600 mt-2">Segure ESPAÇO para pular continuamente</p>
            <div className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-full font-bold inline-block hover:scale-105 transition-transform">
              Iniciar
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {showGameOverVideo && (
        <div className="absolute inset-0 z-50">
          <video
            ref={videoRef}
            src="/videos/gameover.mp4"
            autoPlay
            muted={false}
            loop={false}
            className="w-full h-full object-cover"
            onEnded={() => {
              if (videoRef.current) {
                videoRef.current.pause();
              }
            }}
          />
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-6">
            <div className="bg-white/90 px-8 py-4 rounded-2xl text-center backdrop-blur-sm max-w-xs shadow-2xl">
              <h2 className="text-3xl font-bold text-gray-800">Fim de Jogo!</h2>
              <p className="text-gray-700 mt-2">Sua pontuação:</p>
              <p className="text-4xl font-extrabold text-blue-600 mt-1">🎯 {displayScore}</p>
            </div>

            <button
              onClick={resetGame}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white text-xl font-bold rounded-full shadow-2xl hover:scale-105 transition-transform transform-gpu"
            >
              🎮 Jogar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Instrução Mobile */}
      <div className="sm:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-70 z-50">
        Toque para pular!
      </div>

      {/* Áudios */}
      <audio ref={jumpSoundRef} src="/img/som_pulo.mp3" preload="auto" />
      <audio ref={gameOverSoundRef} src="/img/som_morte.mp3" preload="auto" />
      <audio ref={backgroundMusicRef} src="/img/musica_fundo.mp3" preload="auto" loop />
      <audio ref={thunderSoundRef} src="/img/raio.mp3" preload="auto" />
      <audio ref={rainSoundRef} src="/img/chuva.mp3" preload="auto" loop />
      {/* <audio ref={snowSoundRef} src="/img/neve.mp3" preload="auto" loop /> */}
    </div>
  );

  // ===== COMPONENTE ZUMBI =====
  function AnimatedZombie({ id, x }) {
    const frameData = zombieFrameMapRef.current.get(id) || { frame: 0 };
    const isRed = score >= 1500;
    const prefix = isRed ? 'zombie_vermelho' : 'zombie';
    const src = `/${prefix}/${prefix}${frameData.frame + 1}.png`;

    return (
      <div
        style={{ left: `${x}px`, bottom: '128px', width: '48px', height: '56px', position: 'absolute' }}
        className="z-30"
        key={id}
      >
        <img
          src={src}
          alt="Zumbi"
          className="w-full h-full object-contain"
          onError={(e) => e.target.style.display = 'none'}
        />
      </div>
    );
  }

  // ===== COMPONENTE TYLER ANIMADO =====
  function AnimatedTyler() {
    const frame = isJumping ? 0 : tylerFrame;
    const src = `/img/tyler/${frame + 1}.png`;
    return (
      <img
        src={src}
        alt="Tyler"
        className="w-12 h-16 object-contain"
        onError={(e) => {
          console.warn("Tyler frame não encontrado, usando fallback:", src);
          e.target.src = "/img/tyler.png";
        }}
      />
    );
  }
}