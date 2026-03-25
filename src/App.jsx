import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
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

  // Admin States
  const [adminPassword, setAdminPassword] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Member States
  const [loggedInMember, setLoggedInMember] = useState(null);
  const [memberLoginId, setMemberLoginId] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [isMemberDownloading, setIsMemberDownloading] = useState(false);

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
      if (levelIndex === 0) {
        setStartTime(Date.now());
      }
    }, 3000);
  };

  // Voice Test States
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceSupport, setVoiceSupport] = useState(true);

  // Refs
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

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
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
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
          const nextLevel = cardLevel + 1;
          setCardLevel(nextLevel);
          setupCardLevel(nextLevel);
        }, 1500);
      } else {
        setTimeout(() => {
          const endTime = Date.now();
          const timeTaken = Math.max(1, ((endTime - startTime) / 1000) - 6);

          const newResults = [{ attempts: cardAttempts, timeTaken }];
          setResults(newResults);
          finishTest(newResults);
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

  const handleMemberDownloadCSV = async () => {
    setIsMemberDownloading(true);
    try {
      const { data, error } = await supabase.from('member_test_results').select('*').eq('member_id', loggedInMember);
      if (error) throw error;

      if (!data || data.length === 0) {
        alert("아직 누적된 내 검사 데이터가 없습니다.");
        setIsMemberDownloading(false);
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [];
      csvRows.push(headers.join(','));

      for (const row of data) {
        const values = headers.map(header => {
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
      link.setAttribute("download", `my_test_results_${loggedInMember}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsMemberDownloading(false);
    }
  };

  // Admin Handlers
  const handleAdminClick = () => {
    setStage('admin-login');
    setAdminPassword('');
  };

  const handleAdminSubmit = () => {
    if (adminPassword.toLowerCase() === 'ideas6') {
      setStage('admin');
    } else {
      alert("비밀번호가 일치하지 않습니다.");
      setAdminPassword('');
    }
  };

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.from('test_results').select('*');
      if (error) throw error;

      if (!data || data.length === 0) {
        alert("아직 누적된 데이터가 없습니다.");
        setIsDownloading(false);
        return;
      }

      // 1. 헤더 추출
      const headers = Object.keys(data[0]);
      const csvRows = [];

      csvRows.push(headers.join(',')); // 헤더 행 추가

      // 2. 데이터 추출 및 CSV 형식 변환
      for (const row of data) {
        const values = headers.map(header => {
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

      // 우회전 시 엑셀에서 한글이 깨지지 않게 BOM(FEFF) 추가
      const csvContent = "\uFEFF" + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `test_results_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

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
    } else {
      setStartTime(Date.now());
    }
  };

  const handleSeqSubmit = () => {
    const target = SEQ_LEVELS[seqLevel].replace(/\s/g, '');
    const user = seqInput.replace(/\s/g, '');

    setSeqAttempts(prev => prev + 1);

    if (target === user) {
      setSeqInput('');
      const next = seqLevel + 1;
      if (next < SEQ_LEVELS.length) {
        setSeqLevel(next);
        setShowingInitial(true);
        setTimeout(() => setShowingInitial(false), 3000);
      } else {
        const timeTaken = Math.max(1, ((Date.now() - startTime) / 1000) - ((SEQ_LEVELS.length - 1) * 3));
        const newResults = [{ attempts: seqAttempts + 1, errors: seqErrors, timeTaken }];
        setResults(newResults);
        finishTest(newResults);
      }
    } else {
      setSeqErrors(prev => prev + 1);
      alert("순서가 틀리거나 글자가 빠졌습니다. 편안하게 다시 입력해보세요!");
    }
  };

  const handleSeqSkip = () => {
    setSeqAttempts(prev => prev + 1);
    setSeqErrors(prev => prev + 2); // 스킵 시 기본 패널티(오답 2회 처리)

    setSeqInput('');
    const next = seqLevel + 1;
    if (next < SEQ_LEVELS.length) {
      setSeqLevel(next);
      setShowingInitial(true);
      setTimeout(() => setShowingInitial(false), 3000);
    } else {
      const timeTaken = Math.max(1, ((Date.now() - startTime) / 1000) - ((SEQ_LEVELS.length - 1) * 3));
      const newResults = [{ attempts: seqAttempts + 1, errors: seqErrors + 2, timeTaken }];
      setResults(newResults);
      finishTest(newResults);
    }
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
    } else {
      finishTest(newResults);
    }
  };

  // 음성 테스트 로직
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
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

    const unexpectedPauses = Math.max(0, Math.floor(timeTaken / 3) - 1); // 3초당 1번 이상의 멈춤이 있으면 감점 요인으로 시뮬레이션
    const wordRepetitions = (transcript.match(/(\b\w+\b)(?=.*\b\1\b)/gi) || []).length; // 단순 중복 단어 잡기 시뮬레이션

    const newResults = [...results, {
      target: targetSentence,
      input: transcript,
      timeTaken,
      accuracy,
      unexpectedPauses,
      wordRepetitions,
      length: targetSentence.length
    }];
    setResults(newResults);

    if (currentSentenceIndex < VOICE_SENTENCES.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      setTranscript('');
      setStartTime(null);
    } else {
      finishTest(newResults);
    }
  };

  const handleCardClick = (id) => {
    if (isInteractionDisabled || showingInitial) return;
    if (matchedCards.includes(id) || flippedCards.includes(id)) return;

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

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

    // DB 저장 시작
    try {
      if (testMode === 'typing') {
        let totalErrors = 0;
        let totalLength = 0;
        let totalTime = 0;
        finalResults.forEach(r => {
          totalErrors += r.errorCount;
          totalLength += r.length;
          totalTime += r.timeTaken;
        });
        const accuracy = Math.max(0, 100 - (totalErrors / totalLength) * 100);
        const estimatedStrokes = totalLength * 2.5;
        const timeInMinutes = Math.max(0.1, totalTime / 60);
        const cpm = Math.round(estimatedStrokes / timeInMinutes);

        // 어르신 기준으로 120타를 100점 만점으로 계산
        const speedScore = Math.min(100, (cpm / 120) * 100);
        // 정확도 70%, 타건 속도 30%를 반영하여 0~100점 사이의 세밀한 종합 점수 산출
        let comprehensiveScore = Math.round((accuracy * 0.7) + (speedScore * 0.3));

        // 타자 검사 (기준점: 난이도 1.0)
        let normalizedTime = totalTime * 1.0;
        let normalizedScore = Math.min(100, comprehensiveScore);
        const dbRating = normalizedScore.toString();

        const commonData = {
          test_type: 'typing',
          birth_year: parseInt(birthYear, 10) || null,
          score: parseFloat(normalizedScore.toFixed(1)),
          time_taken: parseFloat(normalizedTime.toFixed(1)),
          rating: dbRating,
          raw_time: parseFloat(totalTime.toFixed(1)),
          raw_errors: totalErrors,
          details: { estimatedStrokes, cpm, accuracy: parseFloat(accuracy.toFixed(1)) }
        };
        await supabase.from('test_results').insert([commonData]);
        if (loggedInMember) await supabase.from('member_test_results').insert([{ ...commonData, member_id: loggedInMember }]);
      } else if (testMode === 'voice') {
        let totalTime = 0;
        let totalAccuracy = 0;
        let totalPauses = 0;
        let totalRepeats = 0;
        finalResults.forEach(r => {
          totalTime += r.timeTaken;
          totalAccuracy += r.accuracy;
          totalPauses += r.unexpectedPauses;
          totalRepeats += r.wordRepetitions;
        });
        const avgAccuracy = totalAccuracy / finalResults.length;

        // 정확도를 기본으로 두고, 머뭇거림(1회당 -5점)과 단어 반복(1회당 -5점)을 감점 요인으로 계산
        let comprehensiveScore = Math.round(avgAccuracy - (totalPauses * 5) - (totalRepeats * 5));

        // 음성 검사 (기준점: 난이도 1.0)
        let normalizedTime = totalTime * 1.0;
        let normalizedScore = Math.max(0, Math.min(100, comprehensiveScore));
        const dbRating = normalizedScore.toString();

        const commonData = {
          test_type: 'voice',
          birth_year: parseInt(birthYear, 10) || null,
          score: parseFloat(normalizedScore.toFixed(1)),
          time_taken: parseFloat(normalizedTime.toFixed(1)),
          rating: dbRating,
          raw_time: parseFloat(totalTime.toFixed(1)),
          raw_errors: totalPauses + totalRepeats,
          details: { unexpectedPauses: totalPauses, wordRepetitions: totalRepeats, accuracy: parseFloat(avgAccuracy.toFixed(1)) }
        };
        await supabase.from('test_results').insert([commonData]);
        if (loggedInMember) await supabase.from('member_test_results').insert([{ ...commonData, member_id: loggedInMember }]);
      } else if (testMode === 'card') {
        const result = finalResults[0];
        const timeTaken = result.timeTaken;
        const attempts = result.attempts;
        const errors = Math.max(0, attempts - 18);

        let score = 100;
        score -= errors * 5;
        if (timeTaken > 60) {
          score -= (timeTaken - 60) * 0.5;
        }

        // 카드 뒤집기 검사 (매우 어려운 난이도: 시간 보정 x0.35, 점수 추가 보정)
        let normalizedTime = timeTaken * 0.35;
        let normalizedScore = Math.max(0, Math.min(100, Math.round(score + 10))); // 난이도를 감안하여 점수 +10 보정
        const dbRating = normalizedScore.toString();

        const commonData = {
          test_type: 'card',
          birth_year: parseInt(birthYear, 10) || null,
          score: parseFloat(normalizedScore.toFixed(1)),
          time_taken: parseFloat(normalizedTime.toFixed(1)),
          rating: dbRating,
          raw_time: parseFloat(timeTaken.toFixed(1)),
          raw_errors: errors,
          details: { attempts }
        };
        await supabase.from('test_results').insert([commonData]);
        if (loggedInMember) await supabase.from('member_test_results').insert([{ ...commonData, member_id: loggedInMember }]);
      } else if (testMode === 'sequence') {
        const result = finalResults[0];
        const errors = result.errors;
        const timeTaken = Math.max(0, result.timeTaken);

        let score = 100;
        score -= errors * 10;
        if (timeTaken > 30) score -= (timeTaken - 30) * 1;

        // 순서 기억 검사 (어려운 난이도: 시간 보정 x0.5, 점수 추가 보정)
        let normalizedTime = timeTaken * 0.5;
        let normalizedScore = Math.max(0, Math.min(100, Math.round(score + 5))); // 난이도를 감안하여 점수 +5 보정
        const dbRating = normalizedScore.toString();

        const commonData = {
          test_type: 'sequence',
          birth_year: parseInt(birthYear, 10) || null,
          score: parseFloat(normalizedScore.toFixed(1)),
          time_taken: parseFloat(normalizedTime.toFixed(1)),
          rating: dbRating,
          raw_time: parseFloat(timeTaken.toFixed(1)),
          raw_errors: errors,
          details: { attempts: result.attempts }
        };
        await supabase.from('test_results').insert([commonData]);
        if (loggedInMember) await supabase.from('member_test_results').insert([{ ...commonData, member_id: loggedInMember }]);
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
        <div className="solid-card" style={{ textAlign: 'center', backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '40px', fontWeight: '800' }}>고생하셨습니다!!</h2>
          <p style={{ color: 'var(--text-dark)', marginTop: '20px', fontSize: '18px' }}>
            검사를 무사히 마치셨습니다. 꾸준한 두뇌 활동으로 늘 건강을 유지하세요!<br/>
            (검사 결과는 안전하게 서버에 저장되었습니다.)
          </p>
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
      {/* 큰글씨 모드 토글 버튼 */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
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
          {isLargeText ? '🔍 일반 모드' : '🔎 큰글씨 모드'}
        </button>
      </div>

      {stage === 'home' && (
        <div className="center-content fade-in">
          <div className="header-icon" style={{ fontSize: '60px', width: '100px', height: '100px', background: '#FFF8E1', color: '#FFC107', borderColor: '#FFC107' }}>🍀</div>
          <h1 style={{ fontSize: '38px', marginBottom: '10px' }}>기억력 튼튼 검사</h1>
          <p style={{ fontSize: '22px', marginBottom: '30px' }}>검사하시기 전, 재미로 오늘의 운세를 확인해 보세요!</p>

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
                  <button className="btn" onClick={handleMemberDownloadCSV} disabled={isMemberDownloading} style={{ fontSize: '18px', padding: '15px 20px', backgroundColor: '#4CAF50' }}>
                    {isMemberDownloading ? '가져오는 중...' : '다운로드 (엑셀) 📥'}
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

            <button className="btn" onClick={() => setStage('select-mode')} style={{ padding: '30px 20px', fontSize: '32px', width: '100%' }}>
              검사 체험하기 👉
            </button>

            <button
              onClick={handleAdminClick}
              style={{ marginTop: '25px', background: 'transparent', border: 'none', color: '#aaaaaa', fontSize: '14px', cursor: 'pointer', outline: 'none', padding: '10px' }}
            >
              관리자 모드
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
              <h2>관리자 메뉴</h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '30px', fontSize: '18px' }}>접근 권한을 위해 비밀번호를 입력해주세요.</p>
              <input
                type="password"
                className="typing-input"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="비밀번호"
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
          <div style={{ width: '100%' }}>
            <button className="back-btn" onClick={() => setStage('home')}>← 처음으로</button>
          </div>
          <div className="center-content" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="solid-card" style={{ maxWidth: '450px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
              <div className="header-icon" style={{ fontSize: '50px', width: '80px', height: '80px', background: '#E3F2FD', color: '#1976D2', borderColor: '#1976D2' }}>📊</div>
              <h2>데이터 관리실</h2>
              <p style={{ color: 'var(--text-dark)', marginBottom: '40px', fontSize: '20px' }}>
                현재까지 Supabase DB에 누적된 어르신들의 <strong>모든 검사 데이터</strong>를 엑셀(CSV) 파일 형식으로 즉시 다운로드하실 수 있습니다.
              </p>
              <button className="btn" onClick={handleDownloadCSV} disabled={isDownloading}>
                {isDownloading ? '데이터 생성 중...' : '결과 다운로드 (CSV) 📥'}
              </button>
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
            <h1>기억력 튼튼 테스트</h1>
            <p style={{ marginBottom: '40px', fontSize: '24px' }}>
              원하시는 검사 방식을 화면에서 <strong>크게</strong> 눌러주세요.
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

          <h2 style={{ marginBottom: '20px', textAlign: 'center', fontSize: '32px' }}>네모 안의 글자를 읽어주세요</h2>

          <div className="sentence-container" style={{ padding: '40px 24px' }}>
            <div className="target-sentence" style={{ fontSize: '36px', color: 'var(--primary-dark)' }}>
              {VOICE_SENTENCES[currentSentenceIndex]}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <button
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
            >
              <span>{isRecording ? '⏹️' : '🎙️'}</span>
            </button>
            <p style={{ marginTop: '20px', fontWeight: '800', fontSize: '24px', color: isRecording ? 'var(--danger)' : 'var(--text-muted)', textAlign: 'center', wordBreak: 'keep-all' }}>
              {isRecording ? '듣고 있습니다...\n말씀을 시작해 주세요' : '마이크 모양을 누르면\n녹음이 시작됩니다'}
            </p>

            {transcript && (
              <div className="transcript-box">
                <span style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: 'bold' }}>내가 읽은 글자:</span>
                <p style={{ marginTop: '8px', color: 'var(--text-dark)', fontSize: '26px' }}><strong>"{transcript}"</strong></p>
              </div>
            )}
          </div>

          <button className="btn" onClick={handleVoiceNext} disabled={!transcript && !isRecording && currentSentenceIndex === 0}>
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
                onChange={(e) => setSeqInput(e.target.value)}
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
          <h2 style={{ fontSize: '36px', marginBottom: '30px' }}>확인 중입니다...</h2>
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
          <h1 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '40px' }}>종합 확인 결과</h1>

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
