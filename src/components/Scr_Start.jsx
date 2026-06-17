import React, { useState } from 'react';

export default function Scr_Start({ onStart }) {
  const [isFading, setIsFading] = useState(false);

  const handleStart = () => {
    setIsFading(true); // 페이드 아웃 애니메이션 시작
  };

  const handleTransitionEnd = () => {
    // 페이드 아웃 애니메이션이 끝났을 때만 onStart를 호출합니다.
    if (isFading) {
      onStart();
    }
  };

  return (
    <div 
      onTransitionEnd={handleTransitionEnd}
      style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      backgroundColor: 'rgba(255, 255, 255, 1)', // 불투명 배경
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