/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppView, UILanguage, Room } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './components/views/HomeView';
import { SpeakerStudioView } from './components/views/SpeakerStudioView';
import { ListenerView } from './components/views/ListenerView';
import { ProjectorView } from './components/views/ProjectorView';
import { DirectMicView } from './components/views/DirectMicView';
import { DeviceGuideView } from './components/views/DeviceGuideView';
import { roomSync } from './services/roomSyncService';
import { UI_TRANSLATIONS } from './i18n/translations';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [uiLang, setUiLang] = useState<UILanguage>('it');
  const [currentRoom, setCurrentRoom] = useState<Room>({
    id: 'CULTOLIVE',
    name: 'Servizio di Culto in Diretta',
    hostSourceLang: 'it',
    targetLanguages: ['en', 'es', 'ro', 'uk', 'fr'],
    createdAt: Date.now(),
    isBroadcasting: false,
    audienceCount: 1,
    churchPresetEnabled: true,
    customGlossary: ['Amen', 'Alleluia', 'Pastore', 'Grazia'],
  });

  // Parse URL query params and saved preferences on startup
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('voxlumina_ui_lang') as UILanguage;
      if (savedLang) {
        setUiLang(savedLang);
      }
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const viewParam = params.get('view') as AppView;
    const langParam = params.get('lang') as UILanguage;

    if (langParam) {
      setUiLang(langParam);
    }

    if (roomParam) {
      const existing = roomSync.getLocalRoom(roomParam.toUpperCase());
      const label = UI_TRANSLATIONS[uiLang]?.roomLabel || 'Room';
      const active = existing || {
        ...currentRoom,
        id: roomParam.toUpperCase(),
        name: `${label} ${roomParam.toUpperCase()}`,
      };
      setCurrentRoom(active);

      if (viewParam === 'projector') {
        setCurrentView('projector');
      } else {
        setCurrentView('listener');
      }
    } else if (viewParam) {
      setCurrentView(viewParam);
    }
  }, [uiLang]);

  const handleLangChange = (lang: UILanguage) => {
    setUiLang(lang);
    try {
      localStorage.setItem('voxlumina_ui_lang', lang);
    } catch {}
  };

  const handleGoLive = (customId?: string, customName?: string) => {
    if (customId && customId.trim()) {
      const cleanId = customId.trim().toUpperCase();
      const existing = roomSync.getLocalRoom(cleanId);
      const targetRoom = existing || {
        ...currentRoom,
        id: cleanId,
        name: customName || `Culto ${cleanId}`,
      };
      setCurrentRoom(targetRoom);
      roomSync.saveRoomToLocal(targetRoom);
    } else {
      roomSync.saveRoomToLocal(currentRoom);
    }
    setCurrentView('studio');
  };

  const handleUpdateRoom = (newRoom: Room) => {
    setCurrentRoom(newRoom);
    roomSync.saveRoomToLocal(newRoom);
  };

  const handleJoinRoom = (roomId: string) => {
    const cleanId = roomId.trim().toUpperCase();
    const existing = roomSync.getLocalRoom(cleanId);
    if (existing) {
      setCurrentRoom(existing);
    } else {
      const label = UI_TRANSLATIONS[uiLang]?.roomLabel || 'Room';
      const newRoom: Room = {
        ...currentRoom,
        id: cleanId,
        name: `${label} ${cleanId}`,
      };
      setCurrentRoom(newRoom);
      roomSync.saveRoomToLocal(newRoom);
    }
    setCurrentView('listener');
  };

  const handleOpenProjector = (roomId: string) => {
    const cleanId = roomId.trim().toUpperCase();
    setCurrentRoom(prev => ({ ...prev, id: cleanId }));
    setCurrentView('projector');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Hide header and footer when in pure Projector / OBS view */}
      {currentView !== 'projector' && (
        <Header
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          uiLang={uiLang}
          onLangChange={handleLangChange}
          onGoLiveClick={handleGoLive}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'home' && (
          <HomeView
            uiLang={uiLang}
            onNavigate={(view) => setCurrentView(view)}
            onJoinRoom={handleJoinRoom}
            onStartRoom={handleGoLive}
          />
        )}

        {currentView === 'studio' && (
          <SpeakerStudioView
            currentRoom={currentRoom}
            uiLang={uiLang}
            onOpenProjector={handleOpenProjector}
            onUpdateRoom={handleUpdateRoom}
            onLeaveStudio={() => setCurrentView('home')}
          />
        )}

        {currentView === 'listener' && (
          <ListenerView
            roomId={currentRoom.id}
            uiLang={uiLang}
            onLeaveRoom={() => setCurrentView('home')}
          />
        )}

        {currentView === 'projector' && (
          <ProjectorView
            roomId={currentRoom.id}
            uiLang={uiLang}
            onBack={() => setCurrentView('studio')}
          />
        )}

        {currentView === 'direct-mic' && (
          <DirectMicView uiLang={uiLang} />
        )}

        {currentView === 'guide' && (
          <DeviceGuideView
            uiLang={uiLang}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}
      </main>

      {currentView !== 'projector' && (
        <Footer
          uiLang={uiLang}
          onNavigate={(view) => setCurrentView(view)}
        />
      )}

    </div>
  );
}
