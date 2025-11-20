import React, { useState } from 'react';
import { Calendar, Users } from 'lucide-react';
import { TeamMember, Fleet, TimeOffEntry } from './types';
import TeamManagement from './components/TeamManagement';

const App: React.FC = () => {
  // Team State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOffEntry[]>([]);

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
    // Also remove associated time offs and fleet assignments if necessary
    setTimeOffs(prev => prev.filter(t => t.memberId !== id));
    // Logic for fleet removal could be added here if strict referential integrity is desired
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
    // Remove existing entry for this member to ensure only one day off per week (optional rule, but common)
    const filtered = timeOffs.filter(t => t.memberId !== entry.memberId);
    
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
            <h1 className="font-bold text-xl text-slate-800">Gestão de Equipes</h1>
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
