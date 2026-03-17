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
    setStartTime(Date.now());
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

        let dbRating = "100"; // "건강합니다" 대신 100 저장 (엑셀 한글 깨짐 방지)
        if (accuracy < 85 || cpm < 100) dbRating = "50"; // "주의가 필요합니다" 대신 50 저장

        await supabase.from('test_results').insert([
          {
            test_type: 'typing',
            birth_year: parseInt(birthYear, 10) || null,
            score: parseFloat(accuracy.toFixed(1)),
            time_taken: parseFloat(totalTime.toFixed(1)),
            rating: dbRating
          }
        ]);
      } else {
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
        
        let dbRating = "100"; // 엑셀 깨짐을 막기 위해 숫자로 저장
        if (avgAccuracy < 70 || totalPauses > 3 || totalRepeats > 2) {
          dbRating = "50";
        }

        await supabase.from('test_results').insert([
          {
            test_type: 'voice',
            birth_year: parseInt(birthYear, 10) || null,
            score: parseFloat(avgAccuracy.toFixed(1)),
            time_taken: parseFloat(totalTime.toFixed(1)),
            rating: dbRating
          }
        ]);
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
    if (testMode === 'typing') {
      let totalErrors = 0;
      let totalLength = 0;
      let totalTime = 0;

      results.forEach(r => {
        totalErrors += r.errorCount;
        totalLength += r.length;
        totalTime += r.timeTaken;
      });

      const accuracy = Math.max(0, 100 - (totalErrors / totalLength) * 100).toFixed(1);
      const estimatedStrokes = totalLength * 2.5; 
      const timeInMinutes = Math.max(0.1, totalTime / 60);
      const cpm = Math.round(estimatedStrokes / timeInMinutes);

      let rating = "건강합니다";
      let message = "현재 아주 건강한 인지 능력을 보여주고 계십니다. 꾸준한 두뇌 활동으로 늘 건강을 유지하세요!";
      if (accuracy < 85 || cpm < 100) {
        rating = "주의가 필요합니다";
        message = "집중력이나 속도가 다소 떨어졌을 수 있습니다. 편안한 마음으로 화면을 보고 다시 한번 연습해 보세요.";
      }

      return (
        <React.Fragment>
          <div className="solid-card" style={{ textAlign: 'center', backgroundColor: rating === '주의가 필요합니다' ? '#FFEBEE' : 'var(--primary-light)', borderColor: rating === '주의가 필요합니다' ? 'var(--danger)' : 'var(--primary)' }}>
            <h2 style={{ color: rating === '주의가 필요합니다' ? 'var(--danger)' : 'var(--primary)', fontSize: '40px', fontWeight: '800' }}>{rating}</h2>
            <p style={{ color: 'var(--text-dark)', marginTop: '20px' }}>{message}</p>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{accuracy}%</div>
              <div className="stat-label">정확도</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{cpm}</div>
              <div className="stat-label">타수 (분당)</div>
            </div>
            <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
              <div className="stat-value" style={{ fontSize: '24px' }}>{totalTime.toFixed(1)}초</div>
              <div className="stat-label">총 소요 시간</div>
            </div>
          </div>
        </React.Fragment>
      );
    } else {
      // Voice Results
      let totalTime = 0;
      let totalAccuracy = 0;
      let totalPauses = 0;
      let totalRepeats = 0;

      results.forEach(r => {
        totalTime += r.timeTaken;
        totalAccuracy += r.accuracy;
        totalPauses += r.unexpectedPauses;
        totalRepeats += r.wordRepetitions;
      });

      const avgAccuracy = (totalAccuracy / results.length).toFixed(1);
      
      let rating = "건강합니다";
      let message = "발음이 명확하고 말하는 속도가 안정적입니다. 아주 건강한 언어 능력을 보여주고 계십니다.";
      
      if (avgAccuracy < 70 || totalPauses > 3 || totalRepeats > 2) {
        rating = "주의가 필요합니다";
        message = "말씀 중간에 멈춤이나 반복이 감지되었습니다. 주변의 가족이나 전문가와 가벼운 대화를 나누어보시는 것도 큰 도움이 됩니다.";
      }

      return (
        <React.Fragment>
          <div className="solid-card" style={{ textAlign: 'center', backgroundColor: rating === '주의가 필요합니다' ? '#FFEBEE' : 'var(--primary-light)', borderColor: rating === '주의가 필요합니다' ? 'var(--danger)' : 'var(--primary)' }}>
            <h2 style={{ color: rating === '주의가 필요합니다' ? 'var(--danger)' : 'var(--primary)', fontSize: '40px', fontWeight: '800' }}>{rating}</h2>
            <p style={{ color: 'var(--text-dark)', marginTop: '20px' }}>{message}</p>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{avgAccuracy}%</div>
              <div className="stat-label">발음 정확도</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalTime.toFixed(1)}s</div>
              <div className="stat-label">발화 소요 시간</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-value">{totalPauses}회</div>
              <div className="stat-label">머뭇거림/지연</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-value">{totalRepeats}회</div>
              <div className="stat-label">단어 반복 및 어눌함</div>
            </div>
          </div>
        </React.Fragment>
      );
    }
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
    <div className="app-container fade-in">
      
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
              {Array.from({ length: 60 }, (_, i) => 1930 + i).map(year => (
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
          
          <button className="btn" onClick={() => setStage('select-mode')} style={{ padding: '30px 20px', fontSize: '32px' }}>
            검사 체험하기 👉
          </button>
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
                안내 문구를 보시고 똑같이 <br/>키보드로 쳐주시면 됩니다.<br/><br/>
                천천히, 편안하게<br/>진행해 보세요.
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
                마이크에 대고<br/>화면에 나오는 글자를<br/>소리 내어 또박또박 읽어주세요.
              </p>
            </div>
            {!voiceSupport ? (
              <div className="error-box">
                해당 기기에서는 마이크 기능을 쓸 수 없습니다.<br/><br/>[처음으로] 버튼을 눌러 [글씨 직접 치기]를 이용해 주세요.
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

      {/* Analyzing Stage */}
      {stage === 'analyzing' && (
        <div className="center-content fade-in">
          <div className="loader"></div>
          <h2 style={{ fontSize: '36px', marginBottom: '30px' }}>확인 중입니다...</h2>
          <div className="solid-card">
            <p style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--primary-dark)', margin: 0 }}>
              {testMode === 'typing' 
                ? '입력하신 글자를 바탕으로 확인하고 있습니다. 잠시만 기다려주세요.' 
                : '녹음된 목소리를 바탕으로 확인하고 있습니다. 잠시만 기다려주세요.'}
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
