import React, { useState } from 'react';

export default function StartScreen({ onStart }) {
  const [isFading, setIsFading] = useState(false);

  const handleStart = () => {
    setIsFading(true); // 페이드 아웃 애니메이션 시작
    // 애니메이션 지속 시간(0.5초)이 지난 후 App 컴포넌트의 onStart를 호출하여 완전히 화면에서 제거합니다.
    setTimeout(() => {
      onStart();
    }, 500);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      backgroundColor: 'rgba(255, 255, 255, 0.7)', // 반투명 배경
      backdropFilter: 'blur(4px)', // 배경 블러 효과
      opacity: isFading ? 0 : 1, // 페이드 아웃 상태에 따른 투명도 조절
      transition: 'opacity 0.5s ease-in-out', // 0.5초 동안 부드럽게 투명도 변경
      pointerEvents: isFading ? 'none' : 'auto' // 페이드 아웃되는 동안 추가 클릭 방지
    }}>
      <button
        onClick={handleStart}
        style={{
          padding: '20px 48px',
          fontSize: '24px',
          fontWeight: 'bold',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s ease, background-color 0.2s ease'
        }}
      >
        시작하기
      </button>
    </div>
  );
}