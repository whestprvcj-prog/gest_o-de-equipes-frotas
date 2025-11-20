import React, { useState, useEffect } from 'react';
import { Calendar, Users } from 'lucide-react';
import { TeamMember, Fleet, TimeOffEntry } from './types';
import TeamManagement from './components/TeamManagement';

// Chaves para o LocalStorage
const STORAGE_KEYS = {
  MEMBERS: 'edf_team_members',
  FLEETS: 'edf_fleets',
  TIMEOFFS: 'edf_timeoffs'
};

const App: React.FC = () => {
  // --- Initialization with LocalStorage ---
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar membros", e);
      return [];
    }
  });

  const [fleets, setFleets] = useState<Fleet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLEETS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar frotas", e);
      return [];
    }
  });

  const [timeOffs, setTimeOffs] = useState<TimeOffEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMEOFFS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar folgas", e);
      return [];
    }
  });

  // --- Persist Data Changes ---

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(teamMembers));
  }, [teamMembers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FLEETS, JSON.stringify(fleets));
  }, [fleets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TIMEOFFS, JSON.stringify(timeOffs));
  }, [timeOffs]);

  // --- Team Handlers ---
  const handleAddMember = (member: Omit<TeamMember, 'id'>) => {
    const newMember: TeamMember = {
      ...member,
      id: Math.random().toString(36).substr(2, 9)
    };
    setTeamMembers(prev => [...prev, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    // Also remove associated time offs
    setTimeOffs(prev => prev.filter(t => t.memberId !== id));
    // Note: We are keeping fleet history even if member is deleted for record integrity, 
    // or you could filter fleets here too.
  };

  const handleAddFleet = (fleet: Omit<Fleet, 'id'>) => {
    const newFleet: Fleet = {
      ...fleet,
      id: Math.random().toString(36).substr(2, 9)
    };
    setFleets(prev => [...prev, newFleet]);
  };

  const handleRemoveFleet = (id: string) => {
    setFleets(prev => prev.filter(f => f.id !== id));
  };

  // --- Time Off Handlers ---
  const handleAddTimeOff = (entry: Omit<TimeOffEntry, 'id'>) => {
    // Remove existing entry for this member on this specific day (or globally if rule implies 1 day off/week)
    // Assuming we want to prevent duplicates for same member+day
    const filtered = timeOffs.filter(t => !(t.memberId === entry.memberId && t.dayOfWeek === entry.dayOfWeek));
    
    const newEntry: TimeOffEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9)
    };
    setTimeOffs([...filtered, newEntry]);
  };

  const handleRemoveTimeOff = (id: string) => {
    setTimeOffs(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 mb-6">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Users className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl text-slate-800">Estrutura Diária de Frotas</h1>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 space-y-6">
        <TeamManagement 
          members={teamMembers} 
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          fleets={fleets}
          onAddFleet={handleAddFleet}
          onRemoveFleet={handleRemoveFleet}
          timeOffs={timeOffs}
          onAddTimeOff={handleAddTimeOff}
          onRemoveTimeOff={handleRemoveTimeOff}
        />
      </main>
    </div>
  );
};

export default App;