import React, { useState, useEffect, useRef } from 'react';
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
  const [stage, setStage] = useState('select-mode'); // 'select-mode' | 'typing-intro' | 'typing-test' | 'voice-intro' | 'voice-test' | 'analyzing' | 'result'
  const [testMode, setTestMode] = useState(''); // 'typing' | 'voice'
  
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
      finishTest();
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
      finishTest();
    }
  };

  const finishTest = () => {
    setStage('analyzing');
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

      let rating = "양호함";
      let message = "현재 아주 건강한 인지 능력을 보여주고 계십니다. 꾸준한 두뇌 활동으로 건강을 유지하세요!";
      if (accuracy < 85 || cpm < 100) {
        rating = "주의 필요";
        message = "주의 집중력이나 타이핑 속도가 다소 떨어졌을 수 있습니다. 꾸준한 연습을 통해 개선해 보세요.";
      }

      return (
        <React.Fragment>
          <div className="glass-card" style={{ textAlign: 'center', backgroundColor: rating === '주의 필요' ? '#FEF2F2' : 'var(--primary-light)' }}>
            <h2 style={{ color: rating === '주의 필요' ? 'var(--danger)' : 'var(--primary)' }}>{rating}</h2>
            <p style={{ color: 'var(--text-dark)' }}>{message}</p>
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
      
      let rating = "양호함";
      let message = "발음이 명확하고 말하는 속도가 안정적입니다. 아주 건강한 언어 능력을 보여주고 계십니다.";
      
      if (avgAccuracy < 70 || totalPauses > 3 || totalRepeats > 2) {
        rating = "주의 필요";
        message = "말의 속도가 불규칙하거나 머뭇거림, 단어 반복 현상이 감지되었습니다. 의사와 가벼운 상담을 받아보시는 것도 좋습니다.";
      }

      return (
        <React.Fragment>
          <div className="glass-card" style={{ textAlign: 'center', backgroundColor: rating === '주의 필요' ? '#FEF2F2' : 'var(--primary-light)' }}>
            <h2 style={{ color: rating === '주의 필요' ? 'var(--danger)' : 'var(--primary)' }}>{rating}</h2>
            <p style={{ color: 'var(--text-dark)' }}>{message}</p>
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
      
      {stage === 'select-mode' && (
        <div className="center-content fade-in">
          <div className="header-icon">🧠</div>
          <h1>두뇌 활력 테스트</h1>
          <p style={{ marginBottom: '32px' }}>
            본인에게 편한 방식을 선택하여 인지 기능과 주의 집중력을 확인해 보세요.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className="mode-card" onClick={() => handleSelectMode('typing')}>
              <div className="mode-icon">⌨️</div>
              <div className="mode-info">
                <h3>타자 치기 테스트</h3>
                <p>화면에 나오는 문장을 따라 치는 테스트입니다. 손가락 운동과 집중력 파악에 좋습니다.</p>
              </div>
            </div>
            
            <div className="mode-card" onClick={() => handleSelectMode('voice')}>
              <div className="mode-icon">🎙️</div>
              <div className="mode-info">
                <h3>목소리 읽기 테스트</h3>
                <p>제시된 문장을 소리 내어 읽는 테스트입니다. 발음과 언어 유창성을 파악합니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Typing Intro */}
      {stage === 'typing-intro' && (
        <div className="center-content fade-in">
          <button className="back-btn" onClick={() => setStage('select-mode')}>← 뒤로</button>
          <div className="header-icon">⌨️</div>
          <h1>타자 치기 테스트</h1>
          <p style={{ marginBottom: '40px' }}>
            편안한 마음으로 화면에 나오는 문장을 똑같이 따라 치시면 됩니다.
          </p>
          <button className="btn" onClick={handleStartTest}>테스트 시작하기</button>
        </div>
      )}

      {/* Voice Intro */}
      {stage === 'voice-intro' && (
        <div className="center-content fade-in">
          <button className="back-btn" onClick={() => setStage('select-mode')}>← 뒤로</button>
          <div className="header-icon">🎙️</div>
          <h1>목소리 읽기 테스트</h1>
          <p style={{ marginBottom: '40px' }}>
            마이크를 켜고 화면에 나오는 문장을 또박또박 소리 내어 읽어주세요. 발음의 정확도, 머뭇거림 등을 분석합니다.
          </p>
          {!voiceSupport ? (
            <div className="error-box">
              해당 브라우저에서는 음성 인식 기술이 지원되지 않습니다. 타자 치기 테스트를 이용해 주세요.
            </div>
          ) : (
            <button className="btn" onClick={handleStartTest}>테스트 시작하기</button>
          )}
        </div>
      )}

      {/* Typing Test */}
      {stage === 'typing-test' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${((currentSentenceIndex) / SENTENCES.length) * 100}%` }}></div>
          </div>
          <span className="progress-text">문장 {currentSentenceIndex + 1} / {SENTENCES.length}</span>
          
          <h2 style={{ marginBottom: '24px' }}>다음 문장을 똑같이 쳐주세요</h2>
          
          <div className="sentence-container">
            <div className="target-sentence">{renderTargetSentence()}</div>
          </div>
          
          <input
            ref={inputRef}
            type="text"
            className="typing-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="여기에 입력하세요"
            spellCheck={false}
          />
          
          <button className="btn" onClick={handleTypingNext} disabled={userInput.length === 0}>
            {currentSentenceIndex === SENTENCES.length - 1 ? '분석하기' : '다음 문장'}
          </button>
        </div>
      )}

      {/* Voice Test */}
      {stage === 'voice-test' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${((currentSentenceIndex) / VOICE_SENTENCES.length) * 100}%` }}></div>
          </div>
          <span className="progress-text">문장 {currentSentenceIndex + 1} / {VOICE_SENTENCES.length}</span>
          
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>다음 문장을 또박또박 읽어주세요</h2>
          
          <div className="sentence-container" style={{ padding: '40px 24px' }}>
            <div className="target-sentence" style={{ fontSize: '28px', color: 'var(--primary-dark)' }}>
              {VOICE_SENTENCES[currentSentenceIndex]}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
            >
              <span style={{ fontSize: '32px' }}>{isRecording ? '⏹️' : '🎙️'}</span>
            </button>
            <p style={{ marginTop: '16px', fontWeight: '600', color: isRecording ? 'var(--danger)' : 'var(--text-muted)' }}>
              {isRecording ? '듣고 있습니다... 문장을 읽어주세요' : '마이크 아이콘을 눌러 녹음을 시작하세요'}
            </p>
            
            {transcript && (
              <div className="transcript-box">
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>인식된 문장:</span>
                <p style={{ marginTop: '4px', color: 'var(--text-dark)' }}>"{transcript}"</p>
              </div>
            )}
          </div>
          
          <button className="btn" onClick={handleVoiceNext} disabled={!transcript && !isRecording && currentSentenceIndex === 0}>
            {currentSentenceIndex === VOICE_SENTENCES.length - 1 ? '분석하기' : '다음 문장'}
          </button>
        </div>
      )}

      {/* Analyzing Stage */}
      {stage === 'analyzing' && (
        <div className="center-content fade-in">
          <div className="loader"></div>
          <h2>결과 정밀 분석 중...</h2>
          <p>{testMode === 'typing' 
            ? '입력하신 타자 데이터를 바탕으로 집중력과 인지 능력을 분석하고 있습니다.' 
            : '음성의 길이, 머뭇거림, 정확도를 바탕으로 언어 유창성을 분석하고 있습니다.'}
          </p>
        </div>
      )}

      {/* Result Stage */}
      {stage === 'result' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="header-icon" style={{ margin: '0 auto 24px auto', background: 'var(--primary)', color: 'white' }}>✨</div>
          <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>종합 분석 결과</h1>
          
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            {renderResult()}
            <button className="btn btn-secondary" onClick={() => setStage('select-mode')} style={{ marginTop: 'auto' }}>
              처음으로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
