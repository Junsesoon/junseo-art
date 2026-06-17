import React, { useState } from 'react';

export default function Scr_CharacterSelect({ onSelect }) {
  const [isFading, setIsFading] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const handleSelect = (character) => {
    setSelectedCharacter(character);
    setIsFading(true);
  };

  const handleTransitionEnd = () => {
    if (isFading && selectedCharacter) {
      onSelect(selectedCharacter);
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
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(8px)',
      opacity: isFading ? 0 : 1,
      transition: 'opacity 0.5s ease-in-out',
      pointerEvents: isFading ? 'none' : 'auto'
    }}>
      <h1 style={{ marginBottom: '40px', color: '#333', fontSize: '36px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>캐릭터 선택</h1>
      
      <div style={{ display: 'flex', gap: '30px' }}>
        {/* 쥬디 캐릭터 선택 카드 */}
        <div 
          onClick={() => handleSelect('judy')}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-10px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(255, 128, 171, 0.4), 0 0 15px rgba(255, 128, 171, 0.6)'; e.currentTarget.style.border = '3px solid #FF80AB'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.border = '3px solid transparent'; }}
          style={{ width: '220px', height: '320px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease', border: '3px solid transparent' }}
        >
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>🐰</div>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>쥬디(Judy)</h2>
          <p style={{ color: '#666', marginTop: '12px', fontWeight: 'bold' }}>토끼 캐릭터</p>
        </div>

        {/* 닉 캐릭터 선택 카드 */}
        <div 
          onClick={() => handleSelect('nick')}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-10px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(255, 152, 0, 0.3)'; e.currentTarget.style.border = '3px solid #FF9800'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.border = '3px solid transparent'; }}
          style={{ width: '220px', height: '320px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease', border: '3px solid transparent' }}
        >
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>🦊</div>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>닉(Nick)</h2>
          <p style={{ color: '#666', marginTop: '12px', fontWeight: 'bold' }}>여우 캐릭터</p>
        </div>

        {/* 람보르기니 선택 카드 (현재 UI만 구현됨) */}
        <div 
          onClick={() => handleSelect('lambo')}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-10px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(33, 150, 243, 0.4), 0 0 15px rgba(33, 150, 243, 0.6)'; e.currentTarget.style.border = '3px solid #2196F3'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.border = '3px solid transparent'; }}
          style={{ width: '220px', height: '320px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease', border: '3px solid transparent' }}
        >
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>🛣️</div>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>람보르기니</h2>
          <p style={{ color: '#666', marginTop: '12px', fontWeight: 'bold' }}>스포츠카</p>
        </div>
      </div>
    </div>
  );
}