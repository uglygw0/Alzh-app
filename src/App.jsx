import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import './index.css';

const SENTENCES = [
  "오늘 날씨는 아주 맑고 화창합니다.",
  "건강을 위해 매일 가벼운 산책을 합니다.",
  "가족들과 함께 맛있는 저녁 식사를 했습니다.",
  "나는 지금 내 기억력을 확인해 보고 있습니다."
];

const VOICE_SENTENCES = [
  "오늘은 날씨가 참 좋습니다.",
  "나는 매일 아침 일찍 일어납니다.",
  "저녁에는 가족들과 밥을 먹습니다."
];

const FORTUNES = [
  "오늘은 반가운 소식을 듣게 될 기분 좋은 하루입니다.",
  "생각지도 않은 산책 길에 기분 좋은 일이 생길 수 있습니다.",
  "가까운 지인이나 가족과 연락을 나누면 큰 평안이 찾아옵니다.",
  "마음 속의 걱정거리들이 눈 녹듯 속 시원하게 사라질 것입니다.",
  "건강운이 아주 좋습니다. 든든한 식사 한 끼 챙겨 드세요.",
  "오랜만에 반가운 얼굴을 보거나 웃음꽃 피는 소식을 듣게 됩니다.",
  "마음이 넉넉해지니 하루 종일 입가에 미소가 번지는 날입니다."
];

const CARD_LEVELS = [
  ['🌞', '🌙', '⭐', '🌳'],
  ['🌞', '🌙', '⭐', '🌳', '🍎', '🐶'],
  ['🌞', '🌙', '⭐', '🌳', '🍎', '🐶', '🚗', '🎈']
];

const SEQ_LEVELS = [
  "6 3 8",
  "나무 사과 자동차",
  "2 7 1 9",
  "바다 구름 자전거 피아노",
  "4 9 2 8 5"
];

// 간단한 문자열 비교 함수 (정확도 계산용)
function calculateAccuracy(target, input) {
  if (!input) return 0;
  let matches = 0;
  const targetChars = target.replace(/\s+/g, '').split('');
  const inputChars = input.replace(/\s+/g, '').split('');

  const minLen = Math.min(targetChars.length, inputChars.length);
  for (let i = 0; i < minLen; i++) {
    if (targetChars[i] === inputChars[i]) matches++;
  }
  return Math.max(0, Math.min(100, (matches / targetChars.length) * 100));
}

function App() {
  const [stage, setStage] = useState('home');
  const [testMode, setTestMode] = useState('');
  const [isLargeText, setIsLargeText] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);

  const [birthYear, setBirthYear] = useState('');
  const [fortune, setFortune] = useState('');

  const handleShowFortune = (e) => {
    const year = e.target.value;
    setBirthYear(year);
    if (year) {
      const randomIdx = Math.floor(Math.random() * FORTUNES.length);
      setFortune(FORTUNES[randomIdx]);
    } else {
      setFortune('');
    }
  };

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [results, setResults] = useState([]);

  // Card Game States
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [cardAttempts, setCardAttempts] = useState(0);
  const [isInteractionDisabled, setIsInteractionDisabled] = useState(false);
  const [showingInitial, setShowingInitial] = useState(false);
  const [cardLevel, setCardLevel] = useState(0);

  // Sequence Game States
  const [seqLevel, setSeqLevel] = useState(0);
  const [seqInput, setSeqInput] = useState('');
  const [seqAttempts, setSeqAttempts] = useState(0);
  const [seqErrors, setSeqErrors] = useState(0);
  const [seqFirstKeyTime, setSeqFirstKeyTime] = useState(null);

  // Additional Granular Metrics States
  const [typingMetrics, setTypingMetrics] = useState({
    keystrokeTimes: [],
    backspaceCount: 0,
    initialDelay: 0
  });

  const [cardMetrics, setCardMetrics] = useState({
    seenCards: new Set(),
    revisitCount: 0,
    flipTimestamps: [],
    decisionTimes: []
  });

  // Admin States
  const [adminPassword, setAdminPassword] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [isAdminStatLoading, setIsAdminStatLoading] = useState(false);
  const [analysisPeriod, setAnalysisPeriod] = useState('week'); // 'day', 'week', 'month'
  const [memberList, setMemberList] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');

  // Member States
  const [loggedInMember, setLoggedInMember] = useState(null);
  const [memberLoginId, setMemberLoginId] = useState('');
  const [memberPassword, setMemberPassword] = useState('');


  const setupCardLevel = (levelIndex) => {
    const images = CARD_LEVELS[levelIndex];
    const deck = [...images, ...images]
      .sort(() => Math.random() - 0.5)
      .map((img, index) => ({ id: index, img }));
    setCards(deck);
    setFlippedCards([]);
    setMatchedCards([]);
    setShowingInitial(true);
    setIsInteractionDisabled(true);

    setTimeout(() => {
      setShowingInitial(false);
      setIsInteractionDisabled(false);
      setStartTime(Date.now()); // 레벨 시작 시각 설정
    }, 3000);
  };

  // Voice Test States
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceSupport, setVoiceSupport] = useState(true);
  
  // New granular voice variables
  const [pitchData, setPitchData] = useState([]);
  const [clarityScores, setClarityScores] = useState([]);
  const [hesitationEvents, setHesitationEvents] = useState(0);
  const [voiceShowingInitial, setVoiceShowingInitial] = useState(false);
  const [lastSpeechTime, setLastSpeechTime] = useState(0);

  // Refs
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const pitchIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    // Check Speech Recognition Support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // 계속 듣기
        recognitionRef.current.interimResults = true; // 중간 결과도 가져오기
        recognitionRef.current.lang = 'ko-KR'; // 한국어 인식

        recognitionRef.current.onresult = (event) => {
          let currentTranscript = '';
          let currentConfidence = 0;
          let resultsCount = 0;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
            currentConfidence += event.results[i][0].confidence;
            resultsCount++;
          }
          
          setTranscript(currentTranscript);
          if (resultsCount > 0) {
            const avgConf = currentConfidence / resultsCount;
            setClarityScores(prev => [...prev, avgConf]);
          }

          // Hesitation detection: check time since last result
          const now = Date.now();
          if (lastSpeechTime > 0 && (now - lastSpeechTime) > 1500) {
            setHesitationEvents(prev => prev + 1);
          }
          setLastSpeechTime(now);
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          if (event.error === 'not-allowed') {
            alert('마이크 권한이 거부되었습니다. 마이크 권한을 허용해주세요.');
            setIsRecording(false);
          }
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } else {
        setVoiceSupport(false);
      }
    }
  }, []);

  useEffect(() => {
    if (stage === 'typing-test' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [stage, currentSentenceIndex]);

  useEffect(() => {
    if (testMode === 'card' && stage === 'card-test' && cards.length > 0 && matchedCards.length === cards.length && !showingInitial) {
      if (cardLevel < 2) {
        setTimeout(() => {
          const endTime = Date.now();
          const levelTime = Math.max(0.1, (endTime - startTime) / 1000);
          const nextLevel = cardLevel + 1;

          setResults(prev => [...prev, { level: cardLevel, timeTaken: levelTime, attempts: cardAttempts }]);
          setCardLevel(nextLevel);
          setCardAttempts(0); // 다음 레벨을 위해 초기화
          setupCardLevel(nextLevel);
          // startTime은 setupCardLevel 내부의 setTimeout에서 재설정됨 (cardLevel > 0일때는 즉시 시작되거나 보정 필요)
        }, 1500);
      } else {
        setTimeout(() => {
          const endTime = Date.now();
          const levelTime = Math.max(0.1, (endTime - startTime) / 1000);
          const finalResults = [...results, { level: cardLevel, timeTaken: levelTime, attempts: cardAttempts }];
          setResults(finalResults);
          finishTest(finalResults);
        }, 1500);
      }
    }
  }, [matchedCards, stage, testMode, showingInitial, cards.length, cardLevel]);

  // Member Handlers
  const handleMemberSubmit = () => {
    if (memberLoginId.trim() === 'uglygw0' && memberPassword === '1234') {
      setLoggedInMember(memberLoginId.trim());
      setStage('home');
      setMemberLoginId('');
      setMemberPassword('');
    } else {
      alert("아이디 또는 비밀번호가 잘못되었습니다.");
    }
  };



  // Admin Handlers
  const handleAdminClick = () => {
    setStage('admin-login');
    setAdminPassword('');
  };

  const fetchMemberList = async () => {
    try {
      const { data, error } = await supabase.from('member_test_results').select('member_id');
      if (error) throw error;
      const uniqueIds = Array.from(new Set(data.map(item => item.member_id))).filter(Boolean);
      setMemberList(uniqueIds);
      if (uniqueIds.includes('uglygw0')) {
        setSelectedMember('uglygw0');
      } else if (uniqueIds.length > 0) {
        setSelectedMember(uniqueIds[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminSubmit = () => {
    if (adminPassword.toLowerCase() === 'ideas6') {
      setStage('admin');
      fetchMemberList();
    } else {
      alert("비밀번호가 일치하지 않습니다.");
      setAdminPassword('');
    }
  };

  const handleDownloadOptimizedCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    // 1. 모든 헤더 추출
    const allHeaders = Object.keys(data[0]);

    // 2. 모든 행에서 데이터가 하나도 없는 컬럼(헤더) 제외 (용량 최적화)
    const activeHeaders = allHeaders.filter(header => {
      return data.some(row => {
        const val = row[header];
        return val !== null && val !== undefined && val !== '' && (Array.isArray(val) ? val.length > 0 : true) && (typeof val === 'object' && !Array.isArray(val) ? Object.keys(val).length > 0 : true);
      });
    });

    const csvRows = [];
    csvRows.push(activeHeaders.join(','));

    for (const row of data) {
      const values = activeHeaders.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
          const stringVal = JSON.stringify(val).replace(/"/g, '""');
          return `"${stringVal}"`;
        }
        if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
          return `"${val}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.from('test_results').select('*');
      if (error) throw error;
      handleDownloadOptimizedCSV(data, `test_results_all_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error(err);
      alert("데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSelectedMemberResults = async () => {
    if (!selectedMember) {
      alert("다운로드할 회원을 선택해주세요.");
      return;
    }
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.from('member_test_results').select('*').eq('member_id', selectedMember);
      if (error) throw error;
      if (!data || data.length === 0) {
        alert("해당 회원의 데이터가 없습니다.");
        return;
      }
      handleDownloadOptimizedCSV(data, `test_results_${selectedMember}_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error(err);
      alert("데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const fetchAdminStats = async () => {
    setIsAdminStatLoading(true);
    try {
      let query = supabase.from('test_results').select('*');

      // 회원 로그인 상태면 내 데이터만 가저오기
      if (loggedInMember) {
        query = supabase.from('member_test_results').select('*').eq('member_id', loggedInMember);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAdminStats(data || []);
      setStage('admin-analysis');
    } catch (err) {
      console.error(err);
      alert("통계 데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsAdminStatLoading(false);
    }
  };

  // 날짜별 추이 데이터 가공
  const trendData = useMemo(() => {
    if (!adminStats || adminStats.length === 0) return [];

    // 날짜별로 그룹화하여 평균 점수 계산
    const groups = {};
    adminStats.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = { date, score: 0, count: 0 };
      groups[date].score += item.score;
      groups[date].count += 1;
    });

    return Object.values(groups).map(g => ({
      date: g.date,
      score: Math.round(g.score / g.count)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [adminStats]);

  // 기간별 비교 통계 (전일/전주/전월)
  const comparisonStats = useMemo(() => {
    if (!adminStats || adminStats.length === 0) return null;

    const now = new Date();
    let periodMs, baseDate, prevBaseDate;

    if (analysisPeriod === 'day') {
      periodMs = 24 * 60 * 60 * 1000;
    } else if (analysisPeriod === 'month') {
      periodMs = 30 * 24 * 60 * 60 * 1000;
    } else {
      periodMs = 7 * 24 * 60 * 60 * 1000; // default week
    }

    baseDate = new Date(now.getTime() - periodMs);
    prevBaseDate = new Date(now.getTime() - (periodMs * 2));

    const currentItems = adminStats.filter(item => new Date(item.created_at) >= baseDate);
    const previousItems = adminStats.filter(item => {
      const d = new Date(item.created_at);
      return d >= prevBaseDate && d < baseDate;
    });

    const calcAvg = (items, key) => items.length === 0 ? 0 : items.reduce((sum, item) => sum + (item[key] || 0), 0) / items.length;

    const currentErrors = calcAvg(currentItems, 'raw_errors');
    const previousErrors = calcAvg(previousItems, 'raw_errors');
    const currentTime = calcAvg(currentItems, 'raw_time');
    const previousTime = calcAvg(previousItems, 'raw_time');

    return {
      errors: {
        this: currentErrors.toFixed(1),
        last: previousErrors.toFixed(1),
        diff: (currentErrors - previousErrors).toFixed(1)
      },
      time: {
        this: currentTime.toFixed(1),
        last: previousTime.toFixed(1),
        diff: (currentTime - previousTime).toFixed(1)
      }
    };
  }, [adminStats, analysisPeriod]);

  // 분석 데이터 가공
  const chartData = useMemo(() => {
    if (!adminStats || adminStats.length === 0) return [];

    const types = {
      typing: { name: '글씨 치기', totalScore: 0, count: 0 },
      voice: { name: '목소리 읽기', totalScore: 0, count: 0 },
      card: { name: '그림 짝맞추기', totalScore: 0, count: 0 },
      sequence: { name: '순서 기억', totalScore: 0, count: 0 },
    };

    adminStats.forEach(item => {
      if (types[item.test_type]) {
        types[item.test_type].totalScore += item.score;
        types[item.test_type].count += 1;
      }
    });

    return Object.keys(types).map(key => ({
      name: types[key].name,
      average: types[key].count > 0 ? Math.round(types[key].totalScore / types[key].count) : 0,
      count: types[key].count
    }));
  }, [adminStats]);

  const testDistributionData = useMemo(() => {
    if (!adminStats || adminStats.length === 0) return [];

    const counts = {
      typing: 0,
      voice: 0,
      card: 0,
      sequence: 0,
    };

    adminStats.forEach(item => {
      if (counts[item.test_type] !== undefined) {
        counts[item.test_type]++;
      }
    });

    const COLORS = ['#FF8042', '#0088FE', '#00C49F', '#FFBB28'];
    const names = { typing: '글씨 치기', voice: '목소리 읽기', card: '그림 짝맞추기', sequence: '순서 기억' };

    return Object.keys(counts).map((key, index) => ({
      name: names[key],
      value: counts[key],
      color: COLORS[index]
    }));
  }, [adminStats]);

  // 공통 핸들러
  const handleSelectMode = (mode) => {
    setTestMode(mode);
    setStage(`${mode}-intro`);
  };

  const handleStartTest = () => {
    setStage(`${testMode}-test`);
    setCurrentSentenceIndex(0);
    setUserInput('');
    setTranscript('');
    setResults([]);
    
    // Reset granular metrics
    setTypingMetrics({ keystrokeTimes: [], backspaceCount: 0, initialDelay: 0 });
    setCardMetrics({ seenCards: new Set(), revisitCount: 0, flipTimestamps: [], decisionTimes: [] });
    setSeqFirstKeyTime(null);

    if (testMode === 'card') {
      setCardLevel(0);
      setCardAttempts(0);
      setupCardLevel(0);
    } else if (testMode === 'sequence') {
      setSeqLevel(0);
      setSeqAttempts(0);
      setSeqErrors(0);
      setSeqInput('');
      setShowingInitial(true);
      setTimeout(() => {
        setShowingInitial(false);
        setStartTime(Date.now());
      }, 3000);
    } else if (testMode === 'voice') {
      setVoiceShowingInitial(true);
      setTimeout(() => {
        setVoiceShowingInitial(false);
        setStartTime(Date.now());
      }, 2000);
    } else {
      setStartTime(Date.now());
    }
  };

  const handleSeqSubmit = () => {
    const target = SEQ_LEVELS[seqLevel].replace(/\s/g, '');
    const user = seqInput.replace(/\s/g, '');

    setSeqAttempts(prev => prev + 1);

    if (target === user) {
      const endTime = Date.now();
      const levelTime = Math.max(0.1, (endTime - startTime) / 1000);
      const levelResult = { level: seqLevel, attempts: seqAttempts + 1, errors: seqErrors, timeTaken: levelTime };

      if (seqLevel === SEQ_LEVELS.length - 1) {
        const finalResults = [...results, levelResult];
        setResults(finalResults);
        finishTest(finalResults);
      } else {
        setResults(prev => [...prev, levelResult]);
        setSeqInput('');
        setSeqAttempts(0);
        setSeqErrors(0);
        const next = seqLevel + 1;
        setSeqLevel(next);
        setShowingInitial(true);
        setTimeout(() => {
          setShowingInitial(false);
          setStartTime(Date.now());
        }, 3000);
      }
    } else {
      setSeqErrors(prev => prev + 1);
      alert("순서가 틀리거나 글자가 빠졌습니다. 편안하게 다시 입력해보세요!");
    }
  };

  const handleSeqSkip = () => {
    const endTime = Date.now();
    const levelTime = Math.max(0.1, (endTime - startTime) / 1000);
    const levelResult = { level: seqLevel, attempts: seqAttempts, errors: seqErrors + 2, timeTaken: levelTime };

    if (seqLevel === SEQ_LEVELS.length - 1) {
      const finalResults = [...results, levelResult];
      setResults(finalResults);
      finishTest(finalResults);
    } else {
      setResults(prev => [...prev, levelResult]);
      setSeqInput('');
      setSeqAttempts(0);
      setSeqErrors(0);
      const next = seqLevel + 1;
      setSeqLevel(next);
      setShowingInitial(true);
      setTimeout(() => {
        setShowingInitial(false);
        setStartTime(Date.now());
      }, 3000);
    }
  };

  // --- 지표 계산 함수들 ---
  const getConsistency = (normalizedTimes) => {
    if (normalizedTimes.length < 2) return 100;
    const mean = normalizedTimes.reduce((a, b) => a + b, 0) / normalizedTimes.length;
    const variance = normalizedTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / normalizedTimes.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / (mean || 1);
    const score = Math.max(0, 100 - (cv * 100));
    return parseFloat(score.toFixed(1));
  };

  const getLearningEffect = (normalizedTimes) => {
    if (normalizedTimes.length < 2) return 0;
    const initial = normalizedTimes[0];
    const final = normalizedTimes[normalizedTimes.length - 1];
    const effect = ((initial - final) / (initial || 1)) * 100;
    return parseFloat(effect.toFixed(1));
  };

  // 타이핑 테스트 로직
  const handleTypingNext = () => {
    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;
    const targetSentence = SENTENCES[currentSentenceIndex];

    let errorCount = 0;
    const maxLen = Math.max(targetSentence.length, userInput.length);
    for (let i = 0; i < maxLen; i++) {
      if (targetSentence[i] !== userInput[i]) errorCount++;
    }

    const newResults = [...results, {
      target: targetSentence,
      input: userInput,
      timeTaken,
      errorCount,
      length: targetSentence.length
    }];
    setResults(newResults);

    if (currentSentenceIndex < SENTENCES.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      setUserInput('');
      setStartTime(Date.now());
      setTypingMetrics({ keystrokeTimes: [], backspaceCount: 0, initialDelay: 0 });
    } else {
      finishTest(newResults);
    }
  };

  const handleTypingKeyDown = (e) => {
    const now = Date.now();
    
    // Initial delay
    if (userInput.length === 0 && typingMetrics.initialDelay === 0) {
      setTypingMetrics(prev => ({ ...prev, initialDelay: (now - startTime) / 1000 }));
    }

    // Backspace count
    if (e.key === 'Backspace') {
      setTypingMetrics(prev => ({ ...prev, backspaceCount: prev.backspaceCount + 1 }));
    }

    // Keystroke intervals
    setTypingMetrics(prev => ({ ...prev, keystrokeTimes: [...prev.keystrokeTimes, now] }));
  };

  // 간단한 피치 검출 알고리즘 (Autocorrelation)
  const detectPitch = (buffer, sampleRate) => {
    let SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return null; // 소리가 너무 작으면 무시

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }
    
    let buf = buffer.slice(r1, r2);
    SIZE = buf.length;
    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;
    return sampleRate / T0;
  };

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const buffer = new Float32Array(analyser.fftSize);
      
      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#4CAF50';
        ctx.beginPath();
        
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * canvas.height / 2;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          
          x += sliceWidth;
        }
        
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        rafRef.current = requestAnimationFrame(draw);
      };
      
      draw();

      pitchIntervalRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        const pitch = detectPitch(buffer, audioCtx.sampleRate);
        if (pitch && pitch > 50 && pitch < 500) { // 일반적인 목소리 범위
          setPitchData(prev => [...prev, pitch]);
        }
      }, 100); // 100ms마다 피치 측정
    } catch (err) {
      console.error("Audio analysis failed", err);
    }
  };

  const stopAudioAnalysis = () => {
    if (pitchIntervalRef.current) clearInterval(pitchIntervalRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // 음성 테스트 로직
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current.stop();
      stopAudioAnalysis();
      setIsRecording(false);
    } else {
      setTranscript('');
      setPitchData([]);
      setClarityScores([]);
      setHesitationEvents(0);
      setLastSpeechTime(Date.now());
      
      recognitionRef.current.start();
      startAudioAnalysis();
      setIsRecording(true);
      if (!startTime) setStartTime(Date.now());
    }
  };

  const handleVoiceNext = () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;
    const targetSentence = VOICE_SENTENCES[currentSentenceIndex];

    const accuracy = calculateAccuracy(targetSentence, transcript);

    // Stuttering detection: repeated words or syllables
    const words = transcript.split(' ');
    let stutterCount = 0;
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] === words[i+1] && words[i].length > 0) stutterCount++;
    }

    // Filler words detection
    const fillers = ['음', '어', '아', '그', '이제'];
    let fillerCount = 0;
    fillers.forEach(f => {
      const regex = new RegExp(f, 'g');
      const matches = transcript.match(regex);
      if (matches) fillerCount += matches.length;
    });

    // Pitch variance calculation
    let pitchVariance = 0;
    if (pitchData.length > 1) {
      const mean = pitchData.reduce((a, b) => a + b, 0) / pitchData.length;
      pitchVariance = Math.sqrt(pitchData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pitchData.length);
    }

    // Average clarity (confidence)
    const avgClarity = clarityScores.length > 0 
      ? (clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length) * 100 
      : 0;

    const newResults = [...results, {
      target: targetSentence,
      input: transcript,
      timeTaken,
      accuracy,
      unexpectedPauses: hesitationEvents,
      wordRepetitions: stutterCount + fillerCount,
      pitchVariance,
      avgClarity,
      length: targetSentence.length
    }];
    setResults(newResults);

    if (currentSentenceIndex < VOICE_SENTENCES.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      setTranscript('');
      setStartTime(null);
      setVoiceShowingInitial(true);
      setTimeout(() => {
        setVoiceShowingInitial(false);
        setStartTime(Date.now());
      }, 2000);
    } else {
      finishTest(newResults);
    }
  };

  const handleCardClick = (id) => {
    if (isInteractionDisabled || showingInitial) return;
    if (matchedCards.includes(id) || flippedCards.includes(id)) return;

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    // Granular Card Metrics
    const now = Date.now();
    setCardMetrics(prev => {
      const isRevisit = prev.seenCards.has(id) && !matchedCards.includes(id);
      const newSeen = new Set(prev.seenCards);
      newSeen.add(id);
      
      const newDecisionTimes = prev.flipTimestamps.length > 0 
        ? [...prev.decisionTimes, (now - prev.flipTimestamps[prev.flipTimestamps.length - 1]) / 1000]
        : prev.decisionTimes;

      return {
        seenCards: newSeen,
        revisitCount: isRevisit ? prev.revisitCount + 1 : prev.revisitCount,
        flipTimestamps: [...prev.flipTimestamps, now],
        decisionTimes: newDecisionTimes
      };
    });

    if (newFlipped.length === 2) {
      setIsInteractionDisabled(true);
      setCardAttempts(prev => prev + 1);

      const match1 = cards.find(c => c.id === newFlipped[0]);
      const match2 = cards.find(c => c.id === newFlipped[1]);

      if (match1.img === match2.img) {
        setMatchedCards(prev => [...prev, match1.id, match2.id]);
        setFlippedCards([]);
        setIsInteractionDisabled(false);
      } else {
        setTimeout(() => {
          setFlippedCards([]);
          setIsInteractionDisabled(false);
        }, 1000);
      }
    }
  };

  const finishTest = async (finalResults) => {
    setStage('analyzing');

    try {
      if (testMode === 'typing') {
        let totalErrors = 0;
        let totalLength = 0;
        let totalTime = 0;
        const normalizedTimes = finalResults.map(r => r.timeTaken / (r.length || 1));

        finalResults.forEach(r => {
          totalErrors += r.errorCount;
          totalLength += r.length;
          totalTime += r.timeTaken;
        });

        const accuracy = Math.max(0, 100 - (totalErrors / totalLength) * 100);
        const estimatedStrokes = totalLength * 2.5;
        const timeInMinutes = Math.max(0.1, totalTime / 60);
        const cpm = Math.round(estimatedStrokes / timeInMinutes);

        // IKI (Inter-Keystroke Interval) Variance
        let ikiVariance = 0;
        const times = typingMetrics.keystrokeTimes;
        if (times.length > 1) {
          const intervals = [];
          for (let i = 1; i < times.length; i++) intervals.push(times[i] - times[i-1]);
          const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          ikiVariance = Math.sqrt(intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length);
        }

        const speedScore = Math.min(100, (cpm / 120) * 100);
        let comprehensiveScore = Math.round((accuracy * 0.7) + (speedScore * 0.3));

        const normalizedScore = Math.min(100, comprehensiveScore);
        const consistency = getConsistency(normalizedTimes);
        const learningEffect = getLearningEffect(normalizedTimes);

        const commonData = {
          test_type: 'typing',
          birth_year: parseInt(birthYear, 10) || null,
          score: parseFloat(normalizedScore.toFixed(1)),
          time_taken: parseFloat(totalTime.toFixed(1)),
          rating: normalizedScore.toString(),
          raw_time: parseFloat(totalTime.toFixed(1)),
          raw_errors: totalErrors,
          consistency: consistency,
          learning_effect: learningEffect,
          details: { 
            estimatedStrokes, 
            cpm, 
            accuracy: parseFloat(accuracy.toFixed(1)),
            iki_variance: parseFloat(ikiVariance.toFixed(2)),
            backspace_count: typingMetrics.backspaceCount,
            initial_delay: parseFloat(typingMetrics.initialDelay.toFixed(2))
          }
        };
        await supabase.from('test_results').insert([commonData]);

        if (loggedInMember) {
          await supabase.from('member_test_results').insert([{ ...commonData, member_id: loggedInMember }]);
        }
      } else if (testMode === 'voice') {
        let totalTime = 0;
        let totalAccuracy = 0;
        let totalPauses = 0;
        let totalRepeats = 0;
        const normalizedTimes = finalResults.map(r => r.timeTaken / (r.length || 1));

        finalResults.forEach(r => {
          totalTime += r.timeTaken;
          totalAccuracy += r.accuracy;
          totalPauses += r.unexpectedPauses;
          totalRepeats += r.wordRepetitions;
        });

        const avgAccuracy = totalAccuracy / finalResults.length;
        const avgPitchVariance = finalResults.reduce((sum, r) => sum + (r.pitchVariance || 0), 0) / finalResults.length;
        const avgClarity = finalResults.reduce((sum, r) => sum + (r.avgClarity || 0), 0) / finalResults.length;

        let comprehensiveScore = Math.round(avgAccuracy - (totalPauses * 3) - (totalRepeats * 2));
        if (avgPitchVariance < 10) comprehensiveScore -= 5; // 너무 단조로운 목소리 감점
        if (avgClarity < 70) comprehensiveScore -= 5; // 낮은 선명도 감점

        const normalizedScore = Math.max(0, Math.min(100, comprehensiveScore));
        const consistency = getConsistency(normalizedTimes);
        const learningEffect = getLearningEffect(normalizedTimes);

        const commonData = {
          test_type: 'voice',
          birth_year: parseInt(birthYear, 10) || null,
          score: parseFloat(normalizedScore.toFixed(1)),
          time_taken: parseFloat(totalTime.toFixed(1)),
          rating: normalizedScore.toString(),
          raw_time: parseFloat(totalTime.toFixed(1)),
          raw_errors: totalPauses + totalRepeats,
          consistency: consistency,
          learning_effect: learningEffect,
          details: { 
            unexpectedPauses: totalPauses, 
            wordRepetitions: totalRepeats, 
            accuracy: parseFloat(avgAccuracy.toFixed(1)),
            pitch_variance: parseFloat(avgPitchVariance.toFixed(2)),
            clarity_score: parseFloat(avgClarity.toFixed(1)),
            hesitation_count: totalPauses
          }
        };
        await supabase.from('test_results').insert([commonData]);

        if (loggedInMember) {
          await supabase.from('member_test_results').insert([{ ...commonData, member_id: loggedInMember }]);
        }
      } else if (testMode === 'card') {
        let totalTime = 0;
        let totalAttempts = 0;
        const cardCounts = [8, 12, 16];
        const normalizedTimes = finalResults.map((r, i) => r.timeTaken / cardCounts[i]);

        finalResults.forEach(r => {
          totalTime += r.timeTaken;
          totalAttempts += r.attempts;
        });

        const totalErrors = Math.max(0, totalAttempts - 18);
        let score = 100 - (totalErrors * 5);
        if (totalTime > 60) score -= (totalTime - 60) * 0.5;

        const avgDecisionTime = cardMetrics.decisionTimes.length > 0
          ? cardMetrics.decisionTimes.reduce((a, b) => a + b, 0) / cardMetrics.decisionTimes.length
          : 0;

        const normalizedScore = Math.max(0, Math.min(100, Math.round(score + 10)));
        const consistency = getConsistency(normalizedTimes);
        const learningEffect = getLearningEffect(normalizedTimes);

        const commonData = {
          test_type: 'card',
          birth_year: parseInt(birthYear, 10) || null,
          score: parseFloat(normalizedScore.toFixed(1)),
          time_taken: parseFloat((totalTime * 0.35).toFixed(1)),
          rating: normalizedScore.toString(),
          raw_time: parseFloat(totalTime.toFixed(1)),
          raw_errors: totalErrors,
          consistency: consistency,
          learning_effect: learningEffect,
          details: { 
            attempts: totalAttempts,
            revisit_count: cardMetrics.revisitCount,
            avg_decision_time: parseFloat(avgDecisionTime.toFixed(2))
          }
        };
        await supabase.from('test_results').insert([commonData]);

        if (loggedInMember) {
          await supabase.from('member_test_results').insert([{ ...commonData, member_id: loggedInMember }]);
        }
      } else if (testMode === 'sequence') {
        let totalTime = 0;
        let totalErrors = 0;
        const itemCounts = SEQ_LEVELS.map(s => s.replace(/\s/g, '').length);
        const normalizedTimes = finalResults.map((r, i) => r.timeTaken / itemCounts[i]);

        finalResults.forEach(r => {
          totalTime += r.timeTaken;
          totalErrors += r.errors;
        });

        let score = 100 - (totalErrors * 10);
        if (totalTime > 30) score -= (totalTime - 30) * 1;

        const normalizedScore = Math.max(0, Math.min(100, Math.round(score + 5)));
        const consistency = getConsistency(normalizedTimes);
        const learningEffect = getLearningEffect(normalizedTimes);

        const commonData = {
          test_type: 'sequence',
          birth_year: parseInt(birthYear, 10) || null,
          score: parseFloat(normalizedScore.toFixed(1)),
          time_taken: parseFloat((totalTime * 0.5).toFixed(1)),
          rating: normalizedScore.toString(),
          raw_time: parseFloat(totalTime.toFixed(1)),
          raw_errors: totalErrors,
          consistency: consistency,
          learning_effect: learningEffect,
          details: { 
            attempts: finalResults.reduce((sum, r) => sum + r.attempts, 0),
            first_char_delay: seqFirstKeyTime ? parseFloat(((seqFirstKeyTime - startTime) / 1000).toFixed(2)) : 0
          }
        };
        await supabase.from('test_results').insert([commonData]);

        if (loggedInMember) {
          await supabase.from('member_test_results').insert([{ ...commonData, member_id: loggedInMember }]);
        }
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }

    setTimeout(() => {
      setStage('result');
    }, 2500);
  };

  // 결과 계산 뷰
  const renderResult = () => {
    return (
      <React.Fragment>
        <div className="solid-card" style={{ textAlign: 'center', backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)', borderWidth: '4px' }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '40px', fontWeight: '800' }}>고생하셨습니다!! ✨</h2>
          <p style={{ color: 'var(--text-dark)', marginTop: '20px', fontSize: '22px', fontWeight: '700' }}>
            오늘의 두뇌 활성 활동을 무사히 마치셨습니다.<br />
            꾸준한 활동은 건강한 일상을 지키는 가장 큰 힘이 됩니다.<br />
            앞으로도 즐겁게 참여해 보세요!
          </p>
          <div style={{ marginTop: '25px', fontSize: '16px', color: '#888', fontWeight: '600' }}>
            * 분석된 활동 패턴 리포트는 안전하게 기록되어<br />
            삼성화재 건강 케어 서비스의 기초 자료로 활용됩니다.
          </div>
        </div>
      </React.Fragment>
    );
  };

  const renderTargetSentence = () => {
    const target = SENTENCES[currentSentenceIndex];
    return target.split('').map((char, index) => {
      let className = "char";
      if (index < userInput.length) {
        if (target[index] === userInput[index]) className += " correct";
        else className += " incorrect";
      }
      return <span key={index} className={className}>{char}</span>;
    });
  };

  return (
    <div className={`app-container fade-in ${isLargeText ? 'large-text-mode' : ''}`}>
      {/* 상단 고정 헤더 영역 (버튼 및 기본 정보) */}
      <div style={{
        position: 'sticky',
        top: 0,
        right: 0,
        left: 0,
        padding: '15px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        borderBottom: '1px solid #eee'
      }}>
        <button
          onClick={() => setIsLargeText(!isLargeText)}
          style={{
            padding: '10px 16px',
            borderRadius: '20px',
            border: '3px solid var(--primary)',
            background: isLargeText ? 'var(--primary)' : 'white',
            color: isLargeText ? 'white' : 'var(--primary)',
            fontWeight: '800',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isLargeText ? '🔍 일반' : '🔎 큰글씨'}
        </button>
      </div>

      {stage === 'home' && (
        <div className="center-content fade-in">
          <div className="header-icon" style={{ fontSize: '60px', width: '100px', height: '100px', background: '#FFF8E1', color: '#FFC107', borderColor: '#FFC107' }}>🍀</div>
          <h1 style={{ fontSize: '38px', marginBottom: '10px' }}>두뇌 활성 케어 매니저</h1>
          <p style={{ fontSize: '22px', marginBottom: '30px' }}>오늘의 활동을 시작하기 전, 재미로 운세를 확인해 보세요!</p>

          <div className="solid-card" style={{ width: '100%', marginBottom: '30px', padding: '30px 20px' }}>
            <h2 style={{ fontSize: '26px', marginBottom: '20px' }}>어르신의 태어난 연도를 고르세요</h2>
            <select
              className="large-select"
              value={birthYear}
              onChange={handleShowFortune}
            >
              <option value="">-- 연도를 누르세요 --</option>
              {Array.from({ length: 2026 - 1920 + 1 }, (_, i) => 1920 + i).map(year => (
                <option key={year} value={year}>{year}년생</option>
              ))}
            </select>

            {fortune && (
              <div className="fortune-box fade-in">
                <p style={{ color: '#D84315', fontSize: '26px', fontWeight: '800', margin: '0' }}>
                  {fortune}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {loggedInMember ? (
              <div className="solid-card" style={{ width: '100%', marginBottom: '20px', padding: '20px', textAlign: 'center', backgroundColor: '#e8f5e9', borderColor: '#4CAF50' }}>
                <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 15px 0', color: '#2E7D32' }}>👤 {loggedInMember}님 환영합니다!</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn" onClick={fetchAdminStats} disabled={isAdminStatLoading} style={{ fontSize: '18px', padding: '15px 20px', backgroundColor: '#4CAF50' }}>
                    {isAdminStatLoading ? '가져오는 중...' : '나의 분석 리포트 확인 📈'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setLoggedInMember(null)} style={{ fontSize: '18px', padding: '15px 20px' }}>
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', textAlign: 'right', marginBottom: '10px' }}>
                <button
                  onClick={() => setStage('member-login')}
                  style={{ background: '#1976D2', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                  👤 회원 로그인
                </button>
              </div>
            )}

            <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f5f5f5', padding: '15px', borderRadius: '12px' }}>
              <input
                type="checkbox"
                id="agree"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                style={{ width: '25px', height: '25px', cursor: 'pointer' }}
              />
              <label htmlFor="agree" style={{ fontSize: '18px', cursor: 'pointer', fontWeight: '600' }}>
                [필수] 데이터 활용 및 삼성화재 API 연동 동의
              </label>
            </div>

            <button
              className="btn"
              onClick={() => {
                if (!isAgreed) {
                  alert("서비스 이용을 위해 데이터 활용에 동의해주세요.");
                  return;
                }
                setStage('select-mode');
              }}
              style={{ padding: '30px 20px', fontSize: '32px', width: '100%' }}
            >
              활동 시작하기 👉
            </button>

            <button
              onClick={handleAdminClick}
              style={{ marginTop: '25px', background: 'transparent', border: 'none', color: '#aaaaaa', fontSize: '14px', cursor: 'pointer', outline: 'none', padding: '10px' }}
            >
              시스템 관리자
            </button>
          </div>
        </div>
      )}

      {/* Member Login Stage */}
      {stage === 'member-login' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ width: '100%' }}>
            <button className="back-btn" onClick={() => setStage('home')}>← 이전 화면</button>
          </div>
          <div className="center-content" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="solid-card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
              <h2>회원 로그인</h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '30px', fontSize: '18px' }}>사용하시는 아이디와 비밀번호를 입력해주세요.</p>
              <input
                type="text"
                className="typing-input"
                value={memberLoginId}
                onChange={(e) => setMemberLoginId(e.target.value)}
                placeholder="아이디"
                style={{ textAlign: 'center', marginBottom: '15px' }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMemberSubmit(); }}
              />
              <input
                type="password"
                className="typing-input"
                value={memberPassword}
                onChange={(e) => setMemberPassword(e.target.value)}
                placeholder="비밀번호"
                style={{ textAlign: 'center', marginBottom: '20px' }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMemberSubmit(); }}
              />
              <button className="btn" onClick={handleMemberSubmit}>로그인</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Stage */}
      {stage === 'admin-login' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ width: '100%' }}>
            <button className="back-btn" onClick={() => setStage('home')}>← 이전 화면</button>
          </div>
          <div className="center-content" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="solid-card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
              <h2>시스템 관리 메인</h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '30px', fontSize: '18px' }}>데이터 접근을 위해 관리자 인증 키를 입력해주세요.</p>
              <input
                type="password"
                className="typing-input"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="인증 키 입력"
                style={{ textAlign: 'center', marginBottom: '20px', letterSpacing: '4px' }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdminSubmit(); }}
              />
              <button className="btn" onClick={handleAdminSubmit}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Dashboard */}
      {stage === 'admin' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <button 
              className="back-btn" 
              onClick={() => setStage('home')}
              style={{ padding: '12px 20px', backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary-dark)', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
            >
              🏠 처음 화면으로
            </button>
            <h1 style={{ margin: '0 0 0 20px', fontSize: '28px', flex: 1 }}>시스템 관리자 모드</h1>
          </div>

          <div className="center-content" style={{ flex: 1, justifyContent: 'flex-start', paddingTop: '20px' }}>
            <div className="solid-card" style={{ maxWidth: '550px', width: '100%', margin: '0 auto', textAlign: 'center', backgroundColor: 'white', border: '5px solid var(--primary)' }}>
              <div className="header-icon" style={{ fontSize: '50px', width: '80px', height: '80px', background: '#E3F2FD', color: '#1976D2', borderColor: '#1976D2', margin: '0 auto 20px auto' }}>🛡️</div>
              <h2 style={{ fontSize: '32px', color: 'var(--primary-dark)' }}>데이터 분석 및 다운로드</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '35px', fontSize: '18px' }}>
                안전하게 관리되는 활동 데이터를 확인하고<br />필요한 리포트를 추출할 수 있습니다.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 전체 다운로드 섹션 */}
                <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '16px', border: '2px solid #dee2e6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontWeight: '800', fontSize: '18px', color: '#444' }}>📊 전체 데이터 관리</span>
                    <span style={{ backgroundColor: '#e9ecef', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>All Users</span>
                  </div>
                  <button className="btn" onClick={handleDownloadCSV} disabled={isDownloading} style={{ margin: 0, width: '100%', padding: '15px', fontSize: '20px' }}>
                    {isDownloading ? '준비 중...' : '전체 결과 통합 다운로드 (CSV) 📥'}
                  </button>
                </div>

                {/* 회원 선택 다운로드 섹션 */}
                <div style={{ backgroundColor: '#E8F5E9', padding: '20px', borderRadius: '16px', border: '3px solid #4CAF50' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontWeight: '800', fontSize: '18px', color: '#2E7D32' }}>👤 회원별 개별 관리</span>
                    {selectedMember && (
                      <span style={{ backgroundColor: '#4CAF50', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '900', animation: 'pulse-success 2s infinite' }}>
                        선택됨: {selectedMember}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                    <select 
                      className="large-select" 
                      style={{ 
                        margin: 0, 
                        flex: 1, 
                        height: '64px', 
                        fontSize: '22px', 
                        padding: '0 15px', 
                        backgroundColor: 'white',
                        border: selectedMember ? '4px solid #4CAF50' : '4px solid #ccc'
                      }}
                      value={selectedMember}
                      onChange={(e) => setSelectedMember(e.target.value)}
                    >
                      <option value="">-- 회원 아이디 선택 --</option>
                      {memberList.map(mid => (
                        <option key={mid} value={mid}>{mid}</option>
                      ))}
                    </select>
                    <button 
                      className="btn" 
                      onClick={handleDownloadSelectedMemberResults} 
                      disabled={isDownloading || !selectedMember} 
                      style={{ 
                        margin: 0, 
                        backgroundColor: selectedMember ? '#2E7D32' : '#ccc', 
                        padding: '0 25px', 
                        fontSize: '20px', 
                        whiteSpace: 'nowrap',
                        boxShadow: selectedMember ? '0 4px 10px rgba(46, 125, 50, 0.3)' : 'none'
                      }}
                    >
                      다운로드 📥
                    </button>
                  </div>
                  {selectedMember === 'uglygw0' && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#1B5E20', fontWeight: '800' }}>
                      ✨ 등록된 uglygw0 회원의 데이터를 추출할 수 있습니다.
                    </p>
                  )}
                </div>

                {/* 분석 리포트 섹션 */}
                <button 
                  className="btn" 
                  onClick={fetchAdminStats} 
                  disabled={isAdminStatLoading} 
                  style={{ backgroundColor: '#673AB7', width: '100%', margin: '10px 0 0 0', padding: '20px' }}
                >
                  {isAdminStatLoading ? '데이터 집계 중...' : '전체 활동 정밀 분석 대시보드 열기 📈'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Analysis Stage */}
      {stage === 'admin-analysis' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '40px' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button className="back-btn" onClick={() => setStage(loggedInMember ? 'home' : 'admin')}>← 뒤로 가기</button>
            <h2 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '30px' }}>📊 {loggedInMember ? '나의 ' : ''}데이터 분석</h2>
          </div>

          {/* 기간 선택 탭 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#F0F0F0', padding: '6px', borderRadius: '14px', width: 'fit-content' }}>
            {['day', 'week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => setAnalysisPeriod(p)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backgroundColor: analysisPeriod === p ? 'white' : 'transparent',
                  color: analysisPeriod === p ? 'var(--primary)' : '#666',
                  boxShadow: analysisPeriod === p ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {p === 'day' ? '전일 대비' : p === 'week' ? '전주 대비' : '전월 대비'}
              </button>
            ))}
          </div>

          <div className="analysis-grid">
            {/* 요약 카드 */}
            <div className="analysis-card">
              <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: 'var(--text-muted)' }}>{loggedInMember ? '나의 기록' : '누적 기록'}</h3>
              <p style={{ fontSize: '42px', fontWeight: '900', margin: 0, color: 'var(--primary)' }}>
                {adminStats?.length || 0} <span style={{ fontSize: '20px', fontWeight: '700' }}>회</span>
              </p>
            </div>
            {comparisonStats && (
              <React.Fragment>
                <div className="analysis-card" style={{ borderColor: parseFloat(comparisonStats.errors.diff) <= 0 ? (parseFloat(comparisonStats.errors.diff) === 0 ? 'var(--primary-light)' : 'var(--success)') : 'var(--danger)' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: 'var(--text-muted)' }}>{analysisPeriod === 'day' ? '전일' : analysisPeriod === 'week' ? '전주' : '전월'} 대비 입력 보정</h3>
                  <p style={{ fontSize: '30px', fontWeight: '900', margin: '5px 0', color: parseFloat(comparisonStats.errors.diff) <= 0 ? (parseFloat(comparisonStats.errors.diff) === 0 ? 'var(--primary)' : 'var(--success)') : 'var(--danger)' }}>
                    {comparisonStats.errors.diff > 0 ? `+${comparisonStats.errors.diff}` : comparisonStats.errors.diff} <span style={{ fontSize: '18px' }}>개</span>
                  </p>
                  <span style={{ fontSize: '14px', color: '#888' }}>이전 평균: {comparisonStats.errors.last}개</span>
                </div>
                <div className="analysis-card" style={{ borderColor: parseFloat(comparisonStats.time.diff) <= 0 ? (parseFloat(comparisonStats.time.diff) === 0 ? 'var(--primary-light)' : 'var(--success)') : 'var(--danger)' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: 'var(--text-muted)' }}>{analysisPeriod === 'day' ? '전일' : analysisPeriod === 'week' ? '전주' : '전월'} 대비 시간</h3>
                  <p style={{ fontSize: '30px', fontWeight: '900', margin: '5px 0', color: parseFloat(comparisonStats.time.diff) <= 0 ? (parseFloat(comparisonStats.time.diff) === 0 ? 'var(--primary)' : 'var(--success)') : 'var(--danger)' }}>
                    {comparisonStats.time.diff > 0 ? `+${comparisonStats.time.diff}` : comparisonStats.time.diff} <span style={{ fontSize: '18px' }}>초</span>
                  </p>
                  <span style={{ fontSize: '14px', color: '#888' }}>이전 평균: {comparisonStats.time.last}초</span>
                </div>
              </React.Fragment>
            )}
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* 날짜별 점수 추이 차트 */}
            <div className="analysis-card" style={{ padding: '30px 20px', minHeight: '420px', textAlign: 'center', gridColumn: '1 / -1' }}>
              <h3 style={{ marginBottom: '24px', fontWeight: '800' }}>📈 {loggedInMember ? '나의 ' : ''}날짜별 평균 점수 추이</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE" />
                    <XAxis dataKey="date" fontSize={12} tick={{ fontWeight: '600' }} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p style={{ marginTop: '10px', fontSize: '16px', color: '#666' }}>※ 매일 기록을 남기면 그래프의 변화를 더 정확하게 볼 수 있습니다.</p>
            </div>

            {/* 평균 점수 차트 */}
            <div className="analysis-card" style={{ padding: '30px 20px', minHeight: '420px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '24px', fontWeight: '800' }}>💡 종목별 평균 성취도</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE" />
                    <XAxis dataKey="name" fontSize={14} tick={{ fontWeight: '800' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 110]} axisLine={false} tickLine={false} hide />
                    <RechartsTooltip cursor={{ fill: '#F5F5F5' }} />
                    <Bar dataKey="average" fill="var(--primary)" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 18, fontWeight: 'bold', fill: 'var(--primary)', offset: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 참여 비율 차트 */}
            <div className="analysis-card" style={{ padding: '30px 20px', minHeight: '420px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '10px', fontWeight: '800' }}>📈 활동 참여 분포</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={testDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {testDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>📜 최근 활동 기록 <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#888' }}>(최근 10개 내역)</span></h3>
            <div className="analysis-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>활동 항목</th>
                    <th>활력 점수</th>
                    <th>소요 시간</th>
                    <th>출생 연도</th>
                  </tr>
                </thead>
                <tbody>
                  {adminStats?.slice(-10).reverse().map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.test_type === 'typing' ? '⌨️ 글씨 직접 치기' : item.test_type === 'voice' ? '🎙️ 목소리로 읽기' : item.test_type === 'card' ? '🃏 그림 짝맞추기' : '🔢 순서 기억 게임'}</td>
                      <td><span style={{ color: 'var(--primary)', fontWeight: '800' }}>{item.score}</span>점</td>
                      <td>{item.time_taken}초</td>
                      <td>{item.birth_year ? `${item.birth_year}년생` : '미입력'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {stage === 'select-mode' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ width: '100%' }}>
            <button className="back-btn" onClick={() => setStage('home')}>← 이전 화면</button>
          </div>
          <div className="center-content" style={{ flex: 1, justifyContent: 'flex-start', paddingTop: '10px' }}>
            <div className="header-icon">🧠</div>
            <h1>두뇌 활성 체크 활동</h1>
            <p style={{ marginBottom: '40px', fontSize: '24px' }}>
              오늘 진행하실 <strong>두뇌 활동</strong>을 눌러주세요.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
              <div className="mode-card" onClick={() => handleSelectMode('typing')}>
                <div className="mode-icon">⌨️</div>
                <div className="mode-info">
                  <h3>글씨 직접 치기</h3>
                  <p>화면에 나오는 글자를 키보드로 따라 칩니다.</p>
                </div>
              </div>

              <div className="mode-card" onClick={() => handleSelectMode('voice')}>
                <div className="mode-icon">🎙️</div>
                <div className="mode-info">
                  <h3>목소리로 읽기</h3>
                  <p>화면에 나오는 글자를 소리내어 또박또박 읽습니다.</p>
                </div>
              </div>

              <div className="mode-card" onClick={() => handleSelectMode('card')}>
                <div className="mode-icon">🃏</div>
                <div className="mode-info">
                  <h3>그림 짝맞추기</h3>
                  <p>카드 그림의 위치를 외우고 같은 짝을 맞춥니다.</p>
                </div>
              </div>

              <div className="mode-card" onClick={() => handleSelectMode('sequence')}>
                <div className="mode-icon">🔢</div>
                <div className="mode-info">
                  <h3>순서 기억 게임</h3>
                  <p>몇 가지 항목을 보고 올바른 순서대로 입력합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Typing Intro */}
      {stage === 'typing-intro' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ width: '100%' }}>
            <button className="back-btn" onClick={() => setStage('select-mode')}>← 이전 화면</button>
          </div>
          <div className="center-content" style={{ flex: 1, justifyContent: 'flex-start', paddingTop: '10px' }}>
            <div className="header-icon">⌨️</div>
            <h1>글씨 직접 치기</h1>
            <div className="solid-card" style={{ marginBottom: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                안내 문구를 보시고 똑같이 <br />키보드로 쳐주시면 됩니다.<br /><br />
                천천히, 편안하게<br />진행해 보세요.
              </p>
            </div>
            <button className="btn" onClick={handleStartTest}>시작하기</button>
          </div>
        </div>
      )}

      {/* Voice Intro */}
      {stage === 'voice-intro' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ width: '100%' }}>
            <button className="back-btn" onClick={() => setStage('select-mode')}>← 이전 화면</button>
          </div>
          <div className="center-content" style={{ flex: 1, justifyContent: 'flex-start', paddingTop: '10px' }}>
            <div className="header-icon">🎙️</div>
            <h1>목소리로 읽기</h1>
            <div className="solid-card" style={{ marginBottom: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                마이크에 대고<br />화면에 나오는 글자를<br />소리 내어 또박또박 읽어주세요.
              </p>
            </div>
            {!voiceSupport ? (
              <div className="error-box">
                해당 기기에서는 마이크 기능을 쓸 수 없습니다.<br /><br />[처음으로] 버튼을 눌러 [글씨 직접 치기]를 이용해 주세요.
              </div>
            ) : (
              <button className="btn" onClick={handleStartTest}>시작하기</button>
            )}
          </div>
        </div>
      )}

      {/* Typing Test */}
      {stage === 'typing-test' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${((currentSentenceIndex) / SENTENCES.length) * 100}%` }}></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span className="progress-text">현재 단계 : {currentSentenceIndex + 1} / {SENTENCES.length}</span>
          </div>

          <h2 style={{ marginBottom: '30px', textAlign: 'center', fontSize: '32px' }}>네모 안의 글자를 따라 쳐주세요</h2>

          <div className="sentence-container">
            <div className="target-sentence">{renderTargetSentence()}</div>
          </div>

          <input
            ref={inputRef}
            type="text"
            className="typing-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleTypingKeyDown}
            placeholder="이곳을 눌러 글을 써주세요"
            spellCheck={false}
          />

          <button className="btn" onClick={handleTypingNext} disabled={userInput.length === 0}>
            {currentSentenceIndex === SENTENCES.length - 1 ? '완료하기' : '다 쳤습니다 (다음으로)'}
          </button>
        </div>
      )}

      {/* Voice Test */}
      {stage === 'voice-test' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${((currentSentenceIndex) / VOICE_SENTENCES.length) * 100}%` }}></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span className="progress-text">현재 단계 : {currentSentenceIndex + 1} / {VOICE_SENTENCES.length}</span>
          </div>

          <h2 style={{ marginBottom: '20px', textAlign: 'center', fontSize: '32px' }}>문장을 기억해서 말씀해 주세요</h2>

          <div className="sentence-container" style={{ padding: '40px 24px', minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="target-sentence" style={{ fontSize: '36px', color: 'var(--primary-dark)' }}>
              {voiceShowingInitial ? (
                VOICE_SENTENCES[currentSentenceIndex]
              ) : (
                <div style={{ fontSize: '60px', color: '#DDDDDD' }}>❓</div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {isRecording && (
              <canvas 
                ref={canvasRef} 
                width="300" 
                height="100" 
                style={{ 
                  position: 'absolute', 
                  top: '-40px', 
                  borderRadius: '10px',
                  opacity: 0.6
                }} 
              />
            )}
            <button
              className={`mic-btn ${isRecording ? 'recording' : ''} ${voiceShowingInitial ? 'disabled' : ''}`}
              onClick={toggleRecording}
              disabled={voiceShowingInitial}
            >
              <span>{isRecording ? '⏹️' : '🎙️'}</span>
            </button>
            <p style={{ marginTop: '20px', fontWeight: '800', fontSize: '24px', color: isRecording ? 'var(--danger)' : 'var(--text-muted)', textAlign: 'center', wordBreak: 'keep-all' }}>
              {voiceShowingInitial 
                ? '문장을 잘 기억해 주세요...' 
                : isRecording 
                  ? '듣고 있습니다...\n기억하신 문장을 말씀해 주세요' 
                  : '마이크 모양을 누르고\n기억하신 문장을 말씀해 주세요'}
            </p>

            {transcript && (
              <div className="transcript-box">
                <span style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: 'bold' }}>내가 읽은 글자:</span>
                <p style={{ marginTop: '8px', color: 'var(--text-dark)', fontSize: '26px' }}><strong>"{transcript}"</strong></p>
              </div>
            )}
          </div>

          <button className="btn" onClick={handleVoiceNext} disabled={voiceShowingInitial || (!transcript && !isRecording && currentSentenceIndex === 0)}>
            {currentSentenceIndex === VOICE_SENTENCES.length - 1 ? '완료하기' : '다 읽었습니다 (다음으로)'}
          </button>
        </div>
      )}

      {/* Card Intro */}
      {stage === 'card-intro' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ width: '100%' }}>
            <button className="back-btn" onClick={() => setStage('select-mode')}>← 이전 화면</button>
          </div>
          <div className="center-content" style={{ flex: 1, justifyContent: 'flex-start', paddingTop: '10px' }}>
            <div className="header-icon">🃏</div>
            <h1>그림 짝맞추기 게임</h1>
            <div className="solid-card" style={{ marginBottom: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                처음 3초 동안 그림이 나옵니다.<br />
                그림의 위치를 잘 기억해 두었다가<br />
                같은 그림 짝을 찾아주시면 됩니다.<br />
                <br />
                총 3단계로 갈수록 카드가 많아집니다!
              </p>
            </div>
            <button className="btn" onClick={handleStartTest}>시작하기</button>
          </div>
        </div>
      )}

      {/* Card Test */}
      {stage === 'card-test' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', overflowY: 'auto' }}>
          <div style={{ width: '100%' }}>
            <h2 style={{ marginBottom: '10px', textAlign: 'center', fontSize: '32px' }}>
              {showingInitial ? '그림의 위치를 기억하세요!' : '같은 그림의 짝을 찾아주세요'}
            </h2>
            <div style={{ marginBottom: '20px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '22px', textAlign: 'center' }}>
              현재 단계: {cardLevel + 1} / 3
            </div>
          </div>

          <div className="card-grid">
            {cards.map(card => {
              const isFlipped = showingInitial || flippedCards.includes(card.id) || matchedCards.includes(card.id);
              const isMatched = matchedCards.includes(card.id);

              return (
                <div
                  key={card.id}
                  className={`game-card ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''}`}
                  onClick={() => handleCardClick(card.id)}
                >
                  <div className="game-card-inner">
                    <div className="game-card-front">
                      <span>❓</span>
                    </div>
                    <div className="game-card-back">
                      <span>{card.img}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ margin: '30px 0', textAlign: 'center', width: '100%' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
              시도: {cardAttempts}회
            </p>
          </div>
        </div>
      )}

      {/* Sequence Intro */}
      {stage === 'sequence-intro' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ width: '100%' }}>
            <button className="back-btn" onClick={() => setStage('select-mode')}>← 이전 화면</button>
          </div>
          <div className="center-content" style={{ flex: 1, justifyContent: 'flex-start', paddingTop: '10px' }}>
            <div className="header-icon">🔢</div>
            <h1>순서 기억 게임</h1>
            <div className="solid-card" style={{ marginBottom: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                화면에 3초 동안 숫자나 단어가 지나갑니다.<br />
                사라진 뒤, 쓰여있던 <strong>순서대로 똑같이</strong><br />
                키보드로 직접 입력해주시면 됩니다.
              </p>
            </div>
            <button className="btn" onClick={handleStartTest}>시작하기</button>
          </div>
        </div>
      )}

      {/* Sequence Test */}
      {stage === 'sequence-test' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${((seqLevel) / SEQ_LEVELS.length) * 100}%` }}></div>
          </div>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ marginBottom: '10px', fontSize: '32px' }}>
              {showingInitial ? '제시된 순서를 기억하세요!' : '기억나는 순서대로 편하게 적어주세요'}
            </h2>
            <span className="progress-text">현재 단계 : {seqLevel + 1} / {SEQ_LEVELS.length}</span>
          </div>

          <div className="sentence-container" style={{ width: '100%', padding: '60px 30px', margin: '40px 0', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {showingInitial ? (
              <div className="target-sentence" style={{ fontSize: '48px', color: 'var(--primary-dark)', letterSpacing: '4px' }}>
                {SEQ_LEVELS[seqLevel]}
              </div>
            ) : (
              <div style={{ fontSize: '80px', color: '#DDDDDD' }}>❓</div>
            )}
          </div>

          {!showingInitial && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
              <input
                type="text"
                className="typing-input"
                style={{ marginBottom: '15px' }}
                value={seqInput}
                onChange={(e) => {
                  if (!seqFirstKeyTime) setSeqFirstKeyTime(Date.now());
                  setSeqInput(e.target.value);
                }}
                placeholder="이곳을 눌러 정답을 쓰세요"
                spellCheck={false}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && seqInput.length > 0) handleSeqSubmit();
                }}
              />
              <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                <button className="btn btn-secondary" onClick={handleSeqSkip} style={{ marginTop: 0, flex: 1, backgroundColor: '#f0f0f0', color: '#666', border: '3px solid #ccc' }}>
                  모르겠음
                </button>
                <button className="btn" onClick={handleSeqSubmit} disabled={seqInput.length === 0} style={{ marginTop: 0, flex: 1 }}>
                  {seqLevel === SEQ_LEVELS.length - 1 ? '마치기' : '제출하기'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analyzing Stage */}
      {stage === 'analyzing' && (
        <div className="center-content fade-in">
          <div className="loader"></div>
          <h2 style={{ fontSize: '36px', marginBottom: '30px' }}>두뇌 패턴 분석 중...</h2>
          <div className="solid-card">
            <p style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--primary-dark)', margin: 0 }}>
              {testMode === 'typing'
                ? '입력하신 글자를 바탕으로 확인하고 있습니다. 잠시만 기다려주세요.'
                : testMode === 'voice'
                  ? '녹음된 목소리를 바탕으로 확인하고 있습니다. 잠시만 기다려주세요.'
                  : '게임 결과를 바탕으로 확인하고 있습니다. 잠시만 기다려주세요.'}
            </p>
          </div>
        </div>
      )}

      {/* Result Stage */}
      {stage === 'result' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="header-icon" style={{ margin: '0 auto 24px auto', background: 'var(--primary)', color: 'white' }}>✨</div>
          <h1 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '40px' }}>오늘의 두뇌 활력 리포트</h1>

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            {renderResult()}
            <button className="btn btn-secondary" onClick={() => setStage('select-mode')} style={{ marginTop: '40px' }}>
              처음 화면으로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
