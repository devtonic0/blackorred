'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { truncateAddress } from '@/utils/format';
import Avatar from './Avatar';
import Card from './Card';
import LiveChat from './social/LiveChat';
import WinnersTicker from './social/WinnersTicker';
import BetConfirmationModal from './BetConfirmationModal';
import Toast from './ui/Toast';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface GameBoardProps {
  gameStyle: 'cards' | 'roulette';
}

interface PlayerStats {
  name: string;
  walletAddress?: string;
  avatarColor: string;
  score: number;
  selectedColor: 'black' | 'red' | null;
  wins: number;
  streak: number;
  totalBets: number;
  winRate: number;
  currentBet: number;
  balance: number;
  team: 'BLACK' | 'RED' | null;
}

interface PlayerCardProps {
  player: PlayerStats;
  side: 'left' | 'right';
  onColorSelect: (color: 'black' | 'red') => void;
  isHouse?: boolean;
  houseState?: any;
  handleDraw?: () => void;
  isDrawing?: boolean;
  setPlayer: (player: PlayerStats) => void;
  setIsConfirmationOpen: (isOpen: boolean) => void;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  betHistory: Array<{
    amount: number;
    result: 'win' | 'loss';
    balance: number;
    timestamp: number;
    color: 'black' | 'red';
  }>;
  selectedDeck: string;
  className?: string;
  setShowHistoryModal: (show: boolean) => void;
  lastResults: ('black' | 'red')[];
}

export default function GameBoard({ gameStyle }: GameBoardProps) {
  const [selectedDeck, setSelectedDeck] = useState('single');
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResults, setLastResults] = useState<('black' | 'red')[]>([]);
  const [currentCard, setCurrentCard] = useState<'black' | 'red' | null>(null);
  const [isCardRevealed, setIsCardRevealed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [randomSeed, setRandomSeed] = useState(0.5);
  const [isLoading, setIsLoading] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [currentTaunt, setCurrentTaunt] = useState('');
  const [lastResult, setLastResult] = useState<{
    winner: 'player' | 'house';
    amount: number;
    color: 'black' | 'red';
  } | null>(null);
  const [deckCount, setDeckCount] = useState(1);
  const [currentDeck, setCurrentDeck] = useState<Array<{color: 'black' | 'red', suit: string, value: string}>>([]);
  const [remainingBlack, setRemainingBlack] = useState(26);
  const [remainingRed, setRemainingRed] = useState(26);
  const [showGameStats, setShowGameStats] = useState(false);
  const [bettingHistory, setBettingHistory] = useState<Array<{
    amount: number;
    result: 'win' | 'loss';
    balance: number;
    timestamp: number;
    color: 'black' | 'red';
  }>>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentSuit, setCurrentSuit] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<'black' | 'red' | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [remainingAutoBets, setRemainingAutoBets] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    type: 'win' | 'loss';
    amount: number;
    isVisible: boolean;
  }>({
    message: '',
    type: 'win',
    amount: 0,
    isVisible: false
  });
  
  const [player, setPlayer] = useState<PlayerStats>({
    name: 'Player',
    walletAddress: '0x1234...5678',
    avatarColor: '#4f46e5',
    score: 0,
    selectedColor: null,
    wins: 12,
    streak: 3,
    totalBets: 24,
    winRate: 50,
    currentBet: 0,
    balance: 10,
    team: null
  });

  const [house, setHouse] = useState<PlayerStats>({
    name: 'House',
    walletAddress: '0xHouse...Bank',
    avatarColor: '#1a1a1a',
    score: 0,
    selectedColor: null,
    wins: 8,
    streak: 1,
    totalBets: 24,
    winRate: 33.33,
    currentBet: 0,
    balance: 1000000,
    team: null
  });

  useEffect(() => {
    setRandomSeed(Math.random());
  }, []);

  useEffect(() => {
    // Initialize any browser-specific state here
    const initialHouseStats = {
      totalGamesPlayed: Math.floor(Math.random() * 2000),
      dailyVolume: (Math.random() * 10000).toFixed(2),
      // ... other random initial values
    };
    
    // Update state here
  }, []);

  useEffect(() => {
    // Initialize client-side state
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (remainingBlack === 0 || remainingRed === 0) {
      // Reset deck
      setRemainingBlack(26);
      setRemainingRed(26);
    }
  }, [remainingBlack, remainingRed]);

  const initializeDeck = useCallback(() => {
    const newDeck: Array<{color: 'black' | 'red', suit: string, value: string}> = [];
    const suits = {
      black: ['♠', '♣'],
      red: ['♥', '♦']
    };
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Create deck(s) based on deckCount
    for (let d = 0; d < deckCount; d++) {
      for (const color of ['black', 'red'] as const) {
        for (const suit of suits[color]) {
          for (const value of values) {
            newDeck.push({ color, suit, value });
          }
        }
      }
    }

    // Shuffle deck
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    setCurrentDeck(newDeck);
    setRemainingBlack(26 * deckCount);
    setRemainingRed(26 * deckCount);
  }, [deckCount]);

  const handleDeckSelect = (deck: string) => {
    setSelectedDeck(deck);
    const deckMap = { single: 1, double: 2, triple: 3 };
    //@ts-ignore
    setDeckCount(deckMap[deck]);
  };

  useEffect(() => {
    initializeDeck();
  }, [deckCount, initializeDeck]);

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  const handleColorSelect = (color: 'black' | 'red') => {
    // Player selection with their team
    const playerTeam = color.toUpperCase() as 'BLACK' | 'RED';
    setPlayer(prev => ({ 
      ...prev, 
      selectedColor: color,
      team: playerTeam
    }));

    // House gets opposite color and opposite team
    const oppositeColor = color === 'black' ? 'red' : 'black';
    const oppositeTeam = oppositeColor.toUpperCase() as 'BLACK' | 'RED';
    
    setHouse(prev => ({ 
      ...prev, 
      selectedColor: oppositeColor,
      team: oppositeTeam  // This ensures house gets opposite team
    }));
  };

  const calculateOdds = (color: 'black' | 'red') => {
    const total = remainingBlack + remainingRed;
    const remaining = color === 'black' ? remainingBlack : remainingRed;
    return ((remaining / total) * 100).toFixed(1);
  };

  const handleDraw = async () => {
    if (!betAmount || !player.selectedColor) return;
    
    // Place bet
    setPlayer(prev => ({
      ...prev,
      currentBet: betAmount,
      balance: prev.balance - betAmount
    }));

    setIsDrawing(true);
    setIsCardRevealed(false);
    setShowGameStats(false);

    // Draw card from deck
    const drawnCard = currentDeck[0];
    const newDeck = [...currentDeck.slice(1)];
    setCurrentDeck(newDeck);

    // Update remaining cards
    if (drawnCard.color === 'black') {
      setRemainingBlack(prev => prev - 1);
    } else {
      setRemainingRed(prev => prev - 1);
    }

    const suits = {
      black: ['♠', '♣'],
      red: ['♥', '♦']
    };
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Generate random suit and value
    const suit = suits[drawnCard.color][Math.floor(Math.random() * suits[drawnCard.color].length)];
    const value = values[Math.floor(Math.random() * values.length)];
    setCurrentSuit(suit);
    setCurrentValue(value);

    setCurrentCard(drawnCard.color);
    
    // Game flow with proper timing
    setTimeout(() => {
      setIsCardRevealed(true);
      setIsDrawing(false);
      
      const isPlayerWinner = player.selectedColor === drawnCard.color;
      const betAmount = player.currentBet;
      const newBalance = isPlayerWinner ? 
        player.balance + betAmount : 
        player.balance - betAmount;

      // Update betting history
      setBettingHistory(prev => [{
        amount: betAmount,
        result: isPlayerWinner ? 'win' : 'loss',
        balance: newBalance,
        timestamp: Date.now(),
        color: drawnCard.color
      }, ...prev]);

      // Delay updating the results until after card reveal animation
      setTimeout(() => {
        // Update results
        setLastResults(prev => [drawnCard.color, ...prev].slice(0, 10));
        setShowGameStats(false); // This will now just hide the animation for the new game
        
        // Set result data for modal
        setLastResult({
          winner: isPlayerWinner ? 'player' : 'house',
          amount: betAmount,
          color: drawnCard.color
        });

        // Update player stats
        updatePlayerStats(isPlayerWinner, betAmount, newBalance);

        // Set random taunt
        setRandomTaunt();

        // Show result as toast instead of modal
        const isWin = Math.random() > 0.5; // Your win logic here
        setToast({
          message: isWin ? 'You Won!' : 'Better luck next time!',
          type: isWin ? 'win' : 'loss',
          amount: betAmount,
          isVisible: true
        });

        // Auto-hide toast after 3 seconds
        setTimeout(() => {
          setToast(prev => ({ ...prev, isVisible: false }));
        }, 3000);
      }, 600);
    }, 1000);
  };

  // Helper functions for cleaner code
  const updatePlayerStats = (isWinner: boolean, betAmount: number, newBalance: number) => {
    setPlayer(prev => ({
      ...prev,
      wins: isWinner ? prev.wins + 1 : prev.wins,
      streak: isWinner ? prev.streak + 1 : 0,
      totalBets: prev.totalBets + 1,
      winRate: Math.round((prev.wins + (isWinner ? 1 : 0)) / (prev.totalBets + 1) * 100),
      balance: newBalance,
      currentBet: 0 // Reset bet after game
    }));
  };

  const setRandomTaunt = () => {

    const HOUSE_TAUNTS = [
      'Better luck next time! 😈',
      'House always wins! 🎰',
      'Thanks for the SOL! 💰',
      'Want to try again? 😏',
      'Easy money! 🤑',
      'Another one bites the dust! 💫',
    ];
    setCurrentTaunt(HOUSE_TAUNTS[Math.floor(Math.random() * HOUSE_TAUNTS.length)]);
  };

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    // Add spinning animation and logic here
    setTimeout(() => {
      setIsSpinning(false);
      const result = Math.random() > 0.5 ? 'black' : 'red';
      //@ts-ignore
      setLastResults(prev => [result, ...prev].slice(0, 10));
    }, 3000);
  };

  const ResultModal = () => {
    return (
      <AnimatePresence>
        {showResultModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center'
            onClick={() => setShowResultModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className='bg-gradient-to-b from-zinc-900/95 to-black/95 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full mx-4'
              onClick={e => e.stopPropagation()}
            >
              {/* Result Header */}
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className={`text-center mb-6 ${
                  lastResult?.winner === 'player' 
                    ? 'text-emerald-500' 
                    : 'text-red-500'
                }`}
              >
                <motion.h2
                  className='text-4xl font-bold mb-2'
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  {lastResult?.winner === 'player' ? (
                    <span className='bg-gradient-to-r from-emerald-500 to-emerald-300 bg-clip-text text-transparent'>
                      You Won! 🎉
                    </span>
                  ) : (
                    <span className='bg-gradient-to-r from-red-500 to-red-300 bg-clip-text text-transparent'>
                      House Wins
                    </span>
                  )}
                </motion.h2>
              </motion.div>

              {/* Bet Details */}
              <div className='space-y-4 mb-6'>
                <div className='bg-white/5 rounded-2xl p-4'>
                  <p className='text-white/60 text-sm mb-1'>Bet Amount:</p>
                  <p className='text-2xl font-bold text-white'>{lastResult?.amount} SOL</p>
                </div>

                <motion.div
                  className='bg-white/5 rounded-2xl p-4'
                  animate={{ 
                    boxShadow: lastResult?.winner === 'player' 
                      ? ['0 0 0 rgba(16, 185, 129, 0)', '0 0 30px rgba(16, 185, 129, 0.3)', '0 0 0 rgba(16, 185, 129, 0)']
                      : ['0 0 0 rgba(239, 68, 68, 0)', '0 0 30px rgba(239, 68, 68, 0.3)', '0 0 0 rgba(239, 68, 68, 0)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <p className='text-white/60 text-sm mb-1'>Payout:</p>
                  <p className={`text-2xl font-bold ${
                    lastResult?.winner === 'player' ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {lastResult?.winner === 'player' ? '+' : '-'}{lastResult?.amount} SOL
                  </p>
                  <p className='text-white/40 text-xs mt-1'>
                    (Initial: {lastResult?.amount} SOL + Win: {lastResult?.winner === 'player' ? lastResult?.amount : 0} SOL)
                  </p>
                </motion.div>

                <div className='bg-white/5 rounded-2xl p-4'>
                  <p className='text-white/60 text-sm mb-1'>Winning Color:</p>
                  <div className='flex items-center gap-2'>
                    {lastResult?.color === 'black' ? '⚫' : '🔴'}
                    <span className='text-xl font-bold text-white capitalize'>
                      {lastResult?.color}
                    </span>
                  </div>
                </div>
              </div>

              {/* Taunt Message */}
              <div className='text-center mb-6'>
                <motion.p
                  className='text-white/80 italic'
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Want to try again? 😏
                </motion.p>
              </div>

              {/* New Balance */}
              <div className='bg-gradient-to-r from-white/10 to-white/5 rounded-2xl p-4 mb-6'>
                <p className='text-white/60 text-sm mb-1'>New Balance:</p>
                <p className='text-2xl font-bold text-white'>{player.balance} SOL</p>
              </div>

              {/* Play Again Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowResultModal(false)}
                className='w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl text-white font-bold shadow-lg transition-all'
              >
                Play Again
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const HistoryModal = () => {
    return (
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center'
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className='bg-gradient-to-b from-zinc-900/95 to-black/95 p-6 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full mx-4'
            >
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-bold text-white'>Betting History</h2>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className='text-white/60 hover:text-white'
                >
                  ✕
                </button>
              </div>

              <div className='space-y-2 max-h-[60vh] overflow-y-auto pr-2'>
                {bettingHistory.map((bet, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      bet.result === 'win'
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        bet.color === 'black' ? 'bg-black' : 'bg-red-600'
                      }`}>
                        {bet.color === 'black' ? '♠' : '♥'}
                      </div>
                      <div>
                        <div className='text-sm font-medium text-white'>
                          {bet.amount} SOL
                        </div>
                        <div className='text-xs text-white/60'>
                          {new Date(bet.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${
                      bet.result === 'win' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {bet.result === 'win' ? '+' : '-'}{bet.amount}
                    </span>
                  </div>
                ))}

                {bettingHistory.length === 0 && (
                  <div className='text-center text-white/60 py-8'>
                    No bets placed yet
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Add this floating suits background component
  const FloatingSuits = () => {
    return (
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        {/* Top left spade */}
        <motion.div
          className='absolute -top-20 -left-20 text-white/30 text-[300px] transform -rotate-12 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]'
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            rotate: [-12, -8, -12],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          ♠
        </motion.div>

        {/* Bottom right heart */}
        <motion.div
          className='absolute -bottom-20 -right-20 text-red-500/30 text-[300px] transform rotate-12 drop-shadow-[0_0_15px_rgba(255,0,0,0.2)]'
          animate={{
            y: [20, -20, 20],
            x: [10, -10, 10],
            rotate: [12, 8, 12],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          ♥
        </motion.div>

        {/* Top right club */}
        <motion.div
          className='absolute -top-20 -right-20 text-white/30 text-[300px] transform rotate-45 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]'
          animate={{
            y: [-15, 15, -15],
            x: [10, -10, 10],
            rotate: [45, 40, 45],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          ♣
        </motion.div>

        {/* Bottom left diamond */}
        <motion.div
          className='absolute -bottom-20 -left-20 text-red-500/30 text-[300px] transform -rotate-45 drop-shadow-[0_0_15px_rgba(255,0,0,0.2)]'
          animate={{
            y: [15, -15, 15],
            x: [-10, 10, -10],
            rotate: [-45, -40, -45],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ♦
        </motion.div>
      </div>
    );
  };

  const handleBetConfirm = async (multiplier: number = 1, isAutoBet: boolean = false) => {
    const finalAmount = betAmount * multiplier;
    
    if (isAutoBet && remainingAutoBets > 0) {
      setIsAutoBetting(true);
      setRemainingAutoBets(remainingAutoBets);
      // Start auto-betting sequence
      await startAutoBettingSequence(finalAmount, remainingAutoBets);
    } else {
      // Single bet
      setPlayer(prev => ({
        ...prev,
        currentBet: finalAmount,
        balance: prev.balance - finalAmount
      }));
      
      // Trigger the draw
      handleDraw();
    }
    
    setIsConfirmationOpen(false);
  };

  const startAutoBettingSequence = async (amount: number, rounds: number) => {
    for (let i = 0; i < rounds; i++) {
      if (!isAutoBetting) break; // Allow stopping auto-bet
      
      await placeBet(amount);
      setRemainingAutoBets(prev => prev - 1);
      
      // Wait for result and next round
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    setIsAutoBetting(false);
  };

  const placeBet = async (amount: number) => {
    // Your existing bet logic here
    console.log(`Placing bet: ${amount} SOL on ${selectedColor}`);
  };

  const stopAutoBet = () => {
    setIsAutoBetting(false);
    setRemainingAutoBets(0);
  };

  const handlePlaceBet = () => {
    if (!betAmount || betAmount <= 0) return;
    
    setPlayer(prev => ({
      ...prev,
      currentBet: betAmount,
      balance: prev.balance - betAmount
    }));
    
    // Trigger the draw if color is selected
    if (player.selectedColor && handleDraw) {
      handleDraw();
    }
  };

  return (
    <div className='w-full max-w-7xl mx-auto h-[calc(100vh-12rem)] relative flex flex-col mt-6'>
      <FloatingSuits />
      <ResultModal />
      <HistoryModal />
      <div className='bg-white/5 backdrop-blur-lg rounded-3xl px-8 py-6 shadow-2xl border border-white/10 flex-1 relative'>
        {/* Joker Dealer */}
        <motion.div
          className='absolute left-1/2 -translate-x-1/2 w-64 h-64 z-30 -top-6'
          style={{ 
            filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))',
            transformOrigin: 'center bottom'
          }}
          animate={{ 
            y: [0, -8, 0],
            rotate: [-1, 1, -1],
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <motion.img
            src='/dealer-joker.png'
            alt='Dealer'
            className='w-full h-full object-contain'
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05, rotate: -5 }}
          />
        </motion.div>

        <div className='flex gap-2 items-stretch h-full'>
          {/* Player Card */}
          <PlayerCard 
            player={player} 
            side='left' 
            className='w-72'
            onColorSelect={handleColorSelect} 
            handleDraw={handleDraw} 
            isDrawing={isDrawing}
            setPlayer={setPlayer}
            setIsConfirmationOpen={setIsConfirmationOpen}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            betHistory={bettingHistory}
            selectedDeck={selectedDeck}
            setShowHistoryModal={setShowHistoryModal}
            lastResults={lastResults}
          />
          
          {/* Center Game Area */}
          <div className='flex-1 flex flex-col items-center justify-center'>
            {gameStyle === 'cards' ? (
              <div className='relative w-full h-[calc(100%-3rem)] flex items-center justify-center'>
                {/* Card Display Container */}
                <div className='relative flex flex-col items-center justify-center'>
                  {/* Card Display - Increased sizing */}
                  <div className='bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-xl'>
                    <div className='relative'>
                      {currentCard ? (
                        <Card
                          color={currentCard}
                          isRevealed={isCardRevealed}
                          isDrawing={isDrawing}
                          suit={currentSuit}
                          value={currentValue}
                          deckCount={deckCount}
                        />
                      ) : (
                        // Increased placeholder dimensions
                        <div className='w-[280px] h-[380px] flex items-center justify-center relative overflow-hidden'>
                          {/* Animated background - increased size */}
                          <motion.div
                            className='absolute inset-0 bg-gradient-to-br from-white/5 to-transparent'
                            animate={{
                              background: [
                                'linear-gradient(to bottom right, rgba(255,255,255,0.05), transparent)',
                                'linear-gradient(to bottom right, rgba(255,255,255,0.1), transparent)',
                                'linear-gradient(to bottom right, rgba(255,255,255,0.05), transparent)'
                              ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          
                          {/* Floating cards animation - increased size */}
                          <div className='absolute inset-0'>
                            <motion.div
                              className='absolute'
                              animate={{
                                y: [-15, 15, -15],
                                x: [-8, 8, -8],
                                rotate: [5, -5, 5],
                              }}
                              transition={{ duration: 4, repeat: Infinity }}
                            >
                              <span className='text-6xl opacity-20'>♠️</span>
                            </motion.div>
                            <motion.div
                              className='absolute right-0'
                              animate={{
                                y: [15, -15, 15],
                                x: [8, -8, 8],
                                rotate: [-5, 5, -5],
                              }}
                              transition={{ duration: 4, repeat: Infinity }}
                            >
                              <span className='text-6xl opacity-20'>♥️</span>
                            </motion.div>
                          </div>

                          {/* Center text - increased size */}
                          <div className='text-center text-white/60'>
                            <motion.p
                              animate={{ opacity: [0.4, 0.8, 0.4] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className='text-xl font-medium'
                            >
                              Select a color to begin
                            </motion.p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deck Controls */}
                  <div className='mt-8 flex gap-2 w-[250px] mx-auto'>
                    {['Single', 'Double', 'Triple'].map((deck) => (
                      <motion.button
                        key={deck}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeckSelect(deck.toLowerCase())}
                        className={`flex-1 py-2 rounded-xl font-medium text-sm transition-all ${
                          selectedDeck === deck.toLowerCase()
                            ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-lg shadow-black/20'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {deck}
                      </motion.button>
                    ))}
                  </div>

                  {/* Title and Stats only - remove History button */}
                  <div className='mt-6 flex flex-col items-center gap-4'>
                    {/* Enhanced Player vs House Title */}
                    <div className='flex flex-col items-center gap-3'>
                      <h2 className='text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent tracking-tight'>
                        Player vs House
                      </h2>
                      
                      {/* Results Display */}
                      <div className='flex items-center gap-3'>
                        {/* Single container for results/no results */}
                        <motion.div
                          className='flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm'
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {lastResults.length > 0 ? (
                            // Show the results
                            <div className='flex gap-2'>
                              {lastResults.slice(0, 4).map((result, index) => (
                                <motion.div
                                  key={index}
                                  className={`w-5 h-5 rounded-lg ${
                                    result === 'black' 
                                      ? 'bg-black ring-1 ring-white/20' 
                                      : 'bg-red-600 ring-1 ring-white/20'
                                  }`}
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ 
                                    delay: index * 0.1,
                                    type: 'spring',
                                    stiffness: 200,
                                    damping: 15
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            // Show 'No results yet'
                            <span className='text-white/60 font-medium'>
                              No results yet
                            </span>
                          )}
                        </motion.div>
                      </div>

                      {/* Results History Dots - can be removed or kept as additional visual */}
                      <div className='flex gap-1.5 mt-1'>
                        {[...Array(5)].map((_, index) => (
                          <motion.div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              lastResults[index] === 'black' 
                                ? 'bg-black' 
                                : lastResults[index] === 'red'
                                ? 'bg-red-600'
                                : 'bg-white/10'
                            }`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* House Card */}
          <PlayerCard 
            player={house}
            side='right'
            onColorSelect={() => {}}
            isHouse={true}
            houseState={house}
            setPlayer={setHouse}
            setIsConfirmationOpen={setIsConfirmationOpen}
            betAmount={0}
            setBetAmount={() => {}}
            betHistory={[]}
            selectedDeck={selectedDeck}
            setShowHistoryModal={setShowHistoryModal}
            lastResults={lastResults}
          />
        </div>
      </div>

      {/* Social Features */}
      <LiveChat />
      <WinnersTicker />

      {/* Bet Confirmation Modal */}
      <BetConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleBetConfirm}
        amount={betAmount}
        selectedColor={selectedColor}
      />

      {/* Add Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        amount={toast.amount}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}

// Enhanced StatCard Component with better visuals
const StatCard = ({ label, value }: { label: string, value: string | number }) => (
  <motion.div 
    className='bg-gradient-to-br from-white/10 to-white/5 rounded-lg p-1.5 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all cursor-pointer group'
    whileHover={{ scale: 1.02 }}
  >
    <div className='flex items-center justify-between'>
      <p className='text-white/60 text-xs font-medium'>{label}</p>
      <motion.p 
        className='text-sm font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent'
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {value}
      </motion.p>
    </div>
  </motion.div>
);

// Add BetHistory component
const BetHistory = ({ history }: { history: Array<{ amount: number, color: 'black' | 'red', result?: 'win' | 'loss' }> }) => (
  <div className='py-2'>
    <h4 className='text-white/60 text-xs font-medium mb-2'>Bet History</h4>
    <div className='space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10'>
      {history.map((bet, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center justify-between p-1.5 rounded-lg ${
            bet.result === 'win' 
              ? 'bg-green-500/10 border border-green-500/20' 
              : bet.result === 'loss'
              ? 'bg-red-500/10 border border-red-500/20'
              : 'bg-white/5 border border-white/10'
          }`}
        >
          <div className='flex items-center gap-2'>
            <span className='text-sm'>{bet.color === 'black' ? '⚫' : '🔴'}</span>
            <span className='text-xs font-medium text-white'>{bet.amount} SOL</span>
          </div>
          {bet.result && (
            <span className={`text-xs font-medium ${
              bet.result === 'win' ? 'text-green-400' : 'text-red-400'
            }`}>
              {bet.result === 'win' ? '+' + (bet.amount * 2) : '-' + bet.amount} SOL
            </span>
          )}
        </motion.div>
      ))}
    </div>
  </div>
);

// Updated PlayerCard Component with color selection
const PlayerCard = ({ 
  player, 
  side, 
  onColorSelect,
  isHouse = false,
  houseState,
  handleDraw,
  isDrawing,
  setPlayer,
  setIsConfirmationOpen,
  betAmount,
  setBetAmount,
  betHistory,
  selectedDeck,
  className,
  setShowHistoryModal,
  lastResults
}: PlayerCardProps) => {
  const HOUSE_TAUNTS = useMemo(() =>[
    'Better luck next time! 😈',
    'House always wins! 🎰',
    'Thanks for the SOL! 💰',
    'Want to try again? 😏',
    'Easy money! 🤑',
    'Another one bites the dust! 💫',
    'Your SOL is my SOL now! ✨',
    'Don&apos;t give up yet! 🎲',
    'Fortune favors the house! 🏦',
    'Keep them coming! 🌟'
  ], []);;

  const [dailyVolume] = useState((Math.random() * 10000).toFixed(2));
  const [currentTaunt, setCurrentTaunt] = useState(HOUSE_TAUNTS[0]);

  useEffect(() => {
    // Update taunt after component mounts
    setCurrentTaunt(HOUSE_TAUNTS[Math.floor(Math.random() * HOUSE_TAUNTS.length)]);
  }, [HOUSE_TAUNTS]);

  const handleBetChange = (value: number) => {
    // Round to 3 decimal places
    const roundedValue = Math.round(value * 1000) / 1000;
    const validValue = Math.max(0, Math.min(roundedValue, player.balance));
    if (!isNaN(validValue)) {
      setBetAmount(validValue);
      //@ts-ignore
      setPlayer(prev => ({ 
        ...prev, 
        currentBet: validValue 
      }));
    }
  };

  // Add handlePlaceBet inside PlayerCard component
  const handlePlaceBet = () => {
    if (!betAmount || betAmount <= 0) return;
    //@ts-ignore
    setPlayer(prev => ({
      ...prev,
      currentBet: betAmount,
      balance: prev.balance - betAmount
    }));
    
    // Trigger the draw if color is selected
    if (player.selectedColor && handleDraw) {
      handleDraw();
    }
  };

  // Add this at the top of PlayerCard component
  const houseStats = {
    totalGamesPlayed: 1234,
    houseEdge: '2.5%',
    maxPayout: '1000 SOL',
    activeGames: 8
  };

  return (
    <motion.div 
      className={`w-72 ${className}`}
      initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className='h-full bg-gradient-to-b from-white/10 to-transparent rounded-2xl p-1.5 backdrop-blur-sm border border-white/10'>
        <div className='flex flex-col h-full'>
          {/* Player Header */}
          <div className='flex items-center gap-3 pb-2 border-b border-white/10'>
            <motion.div 
              className='relative group'
              whileHover={{ scale: 1.05 }}
            >
              <Avatar 
                type={isHouse ? 'house' : 'player'}
                color={player.avatarColor}
                size={42}
                className='group-hover:opacity-90'
              />
            </motion.div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-bold text-white truncate bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent'>
                  {player.name}
                </h3>
                {player.walletAddress && (
                  <span className={`text-xs truncate font-mono ${
                    isHouse ? 'text-red-400/80' : 'text-white/60'
                  }`}>
                    ({truncateAddress(player.walletAddress)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Add margin after header if it's the house card */}
          {isHouse && <div className='h-2' />}

          {isHouse ? (
            // House Side Content
            <div className='flex flex-col h-full space-y-2'>
              {/* House Stats Grid */}
              <div className='grid grid-cols-2 gap-1.5'>
                <div className='col-span-2 p-2 bg-white/5 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <span className='text-white/60 text-xs'>Total Volume</span>
                      <h4 className='text-lg font-bold text-white'>1.2M SOL</h4>
                    </div>
                    <div className='h-6 w-6 bg-emerald-500/20 rounded-lg flex items-center justify-center'>
                      📈
                    </div>
                  </div>
                </div>
                
                <div className='p-2 bg-white/5 rounded-lg'>
                  <span className='text-white/60 text-xs'>House Edge</span>
                  <h4 className='text-base font-bold text-white'>2.5%</h4>
                </div>
                
                <div className='p-2 bg-white/5 rounded-lg'>
                  <span className='text-white/60 text-xs'>Paid Out</span>
                  <h4 className='text-base font-bold text-white'>892K SOL</h4>
                </div>
              </div>

              {/* Mini Chart */}
              <div className='h-16 bg-white/5 rounded-lg p-2'>
                <div className='text-xs text-white/60 mb-1'>Win Rate Trend</div>
                <Line
                  data={{
                    labels: ['', '', '', '', '', ''],
                    datasets: [{
                      data: [51, 52, 50, 53, 51, 52],
                      borderColor: '#10B981',
                      tension: 0.4,
                      borderWidth: 2,
                      pointRadius: 0,
                      fill: true,
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    }]
                  }}
                  options={{
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { display: false },
                      y: { display: false, min: 45, max: 55 }
                    },
                    maintainAspectRatio: false,
                  }}
                />
              </div>

              {/* Recent Activity */}
              <div className='space-y-1'>
                <h4 className='text-white/60 text-xs'>Recent Activity</h4>
                <div className='space-y-1 max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10'>
                  {lastResults.slice(0, 3).map((result, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-between p-2.5 bg-white/5 rounded-lg'
                    >
                      <div className='flex items-center gap-2'>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          result === 'black' ? 'bg-black/40' : 'bg-red-600/40'
                        }`}>
                          {result === 'black' ? '♠️' : '♥️'}
                        </div>
                        <div>
                          <div className='text-sm font-medium text-white'>
                            {result === 'black' ? 'Black' : 'Red'}
                          </div>
                          <div className='text-xs text-white/60'>
                            {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        result === player.selectedColor ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {result === player.selectedColor ? 'Win' : 'Loss'}
                      </span>
                    </div>
                  ))}

                  {lastResults.length === 0 && (
                    <div className='text-center text-white/60 py-4'>
                      No games played yet
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Stats */}
              <div className='grid grid-cols-2 gap-1.5'>
                <div className='p-2 bg-white/5 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <span className='text-white/60 text-xs'>Volume</span>
                    <span className='text-xs text-emerald-400'>↑12%</span>
                  </div>
                  <h4 className='text-base font-bold text-white'>52.8K</h4>
                </div>
                <div className='p-2 bg-white/5 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <span className='text-white/60 text-xs'>Win Rate</span>
                    <span className='text-xs text-red-400'>↓0.8%</span>
                  </div>
                  <h4 className='text-base font-bold text-white'>51.2%</h4>
                </div>
              </div>

              {/* Active Games */}
              <div className='p-2 bg-white/5 rounded-lg'>
                <div className='flex items-center justify-between'>
                  <span className='text-white/60 text-xs'>Active Games</span>
                  <div className='flex items-center gap-1'>
                    <span className='text-emerald-400 text-xs'>•Live</span>
                    <span className='text-base font-bold text-white'>8</span>
                  </div>
                </div>
              </div>

              {/* Team Display for House */}
              {isHouse && player.team && (
                <div className={`mt-auto px-3 py-2 rounded-xl text-center font-medium text-lg ${
                  player.team === 'BLACK' 
                    ? 'bg-red-600 text-white shadow-lg'  // If house has BLACK, show RED styling
                    : 'bg-black text-white shadow-lg'    // If house has RED, show BLACK styling
                }`}>
                  TEAM {player.team === 'BLACK' ? 'RED' : 'BLACK'}
                </div>
              )}

              {/* Team Display for Player */}
              {!isHouse && player.team && (
                <div className={`mt-auto px-3 py-2 rounded-xl text-center font-medium text-lg ${
                  player.team === 'BLACK' 
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-red-600 text-white shadow-lg'
                }`}>
                  TEAM {player.team}
                </div>
              )}
            </div>
          ) : (
            // Player Side Content
            <div className='flex flex-col h-full'>
              {/* Betting Controls */}
              <div className='space-y-2'>
                {/* Balance Display */}
                <div className='flex items-center justify-between'>
                  <span className='text-white/60 text-xs'>Balance:</span>
                  <span className='text-white text-sm font-medium'>{player.balance} SOL</span>
                </div>

                {/* Amount Controls with Settings */}
                <div className='flex items-center gap-2'>
                  {/* Settings Button */}
                  <button
                    className='p-2 bg-black/40 hover:bg-black/60 rounded-lg transition-all'
                    onClick={() => setIsConfirmationOpen(true)}
                  >
                    <svg 
                      xmlns='http://www.w3.org/2000/svg' 
                      className='h-5 w-5 text-white/80' 
                      viewBox='0 0 20 20' 
                      fill='currentColor'
                    >
                      <path 
                        fillRule='evenodd' 
                        d='M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z' 
                        clipRule='evenodd' 
                      />
                    </svg>
                  </button>

                  {/* Amount Input */}
                  <div className='flex-1 flex gap-2'>
                    <input
                      type='number'
                      value={betAmount}
                      onChange={(e) => handleBetChange(Number(e.target.value))}
                      className='w-full bg-black/20 rounded-lg px-3 py-2 text-white text-center text-lg'
                      step='0.1'
                    />
                    <div className='flex flex-col gap-1'>
                      <button 
                        className='h-6 bg-black/40 hover:bg-black/60 rounded-md text-white text-sm font-bold'
                        onClick={() => handleBetChange(Math.min(player.balance, betAmount + 0.1))}
                      >
                        +
                      </button>
                      <button 
                        className='h-6 bg-black/40 hover:bg-black/60 rounded-md text-white text-sm font-bold'
                        onClick={() => handleBetChange(Math.max(0, betAmount - 0.1))}
                      >
                        −
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Bet Amounts */}
                <div className='grid grid-cols-4 gap-1.5'>
                  <button
                    onClick={() => handleBetChange(0.1)}
                    className='px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/90 text-sm font-medium transition-all'
                  >
                    0.1 SOL
                  </button>
                  <button
                    onClick={() => handleBetChange(0.5)}
                    className='px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/90 text-sm font-medium transition-all'
                  >
                    0.5 SOL
                  </button>
                  <button
                    onClick={() => handleBetChange(1)}
                    className='px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/90 text-sm font-medium transition-all'
                  >
                    1 SOL
                  </button>
                  <button
                    onClick={() => handleBetChange(2)}
                    className='px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/90 text-sm font-medium transition-all'
                  >
                    2 SOL
                  </button>
                </div>

                {/* Color Selection - Enhanced styling for more prominence */}
                <div className='grid grid-cols-2 gap-2'>
                  <button
                    onClick={() => onColorSelect('black')}
                    className={`px-4 py-4 rounded-lg font-medium text-lg transition-all transform hover:scale-105 ${
                      player.team === 'BLACK' 
                        ? 'bg-black text-white shadow-xl ring-2 ring-white/20' 
                        : 'bg-black/80 text-white/90 hover:bg-black hover:shadow-lg hover:ring-2 hover:ring-white/10'
                    }`}
                  >
                    Black
                  </button>
                  <button
                    onClick={() => onColorSelect('red')}
                    className={`px-4 py-4 rounded-lg font-medium text-lg transition-all transform hover:scale-105 ${
                      player.team === 'RED' 
                        ? 'bg-red-600 text-white shadow-xl ring-2 ring-white/20' 
                        : 'bg-red-600/80 text-white/90 hover:bg-red-600 hover:shadow-lg hover:ring-2 hover:ring-white/10'
                    }`}
                  >
                    Red
                  </button>
                </div>

                {/* Place Bet Button - Enhanced styling */}
                <button
                  className='w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium text-lg transition-all shadow-xl ring-2 ring-emerald-500/50 hover:ring-emerald-500/80 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:ring-0 disabled:shadow-none'
                  onClick={handlePlaceBet}
                  disabled={!betAmount || betAmount <= 0 || !player.selectedColor}
                >
                  Place Bet
                </button>
              </div>

              {/* Stats Grid */}
              <div className='grid grid-cols-2 gap-0.5 mt-1.5'>
                <StatCard label='Wins' value={player.wins} />
                <StatCard label='Win Rate' value={`${player.winRate}%`} />
                <StatCard label='Streak' value={player.streak} />
                <StatCard label='Total Bets' value={player.totalBets} />
              </div>

              {/* Betting History Button */}
              {!isHouse && (
                <motion.button
                  className='mt-2 w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg backdrop-blur-sm text-white/80 text-sm font-medium transition-all flex items-center justify-between'
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowHistoryModal(true)}
                >
                  <div className='flex items-center gap-2'>
                    <span>📊</span>
                    Betting History
                  </div>
                  {betHistory && betHistory.length > 0 && (
                    <span className='text-emerald-400'>
                      +{betHistory[0].amount} SOL
                    </span>
                  )}
                </motion.button>
              )}

              {/* Team Display */}
              {!isHouse && player.team && (
                <div className={`mt-auto px-3 py-2 rounded-xl text-center font-medium text-lg ${
                  player.team === 'BLACK' 
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-red-600 text-white shadow-lg'
                }`}>
                  TEAM {player.team}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};