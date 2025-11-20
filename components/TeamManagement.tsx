import React, { useState } from 'react';
import { UserPlus, Trash2, Users, Truck, Package, HardHat, LayoutGrid, Printer, CalendarOff, CalendarCheck, Calendar } from 'lucide-react';
import { TeamMember, TeamRole, Fleet, TimeOffEntry, DayOfWeek } from '../types';

interface TeamManagementProps {
  members: TeamMember[];
  onAddMember: (member: Omit<TeamMember, 'id'>) => void;
  onRemoveMember: (id: string) => void;
  fleets: Fleet[];
  onAddFleet: (fleet: Omit<Fleet, 'id'>) => void;
  onRemoveFleet: (id: string) => void;
  timeOffs: TimeOffEntry[];
  onAddTimeOff: (entry: Omit<TimeOffEntry, 'id'>) => void;
  onRemoveTimeOff: (id: string) => void;
}

const ROLE_CONFIG = {
  'Motorista': {
    label: 'Equipe de Motoristas',
    icon: Truck,
    types: ['Motorista', 'Motorista I', 'Motorista Granel'],
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    borderColor: 'border-blue-100'
  },
  'Auxiliar': {
    label: 'Equipe de Auxiliares',
    icon: Package,
    types: ['Auxiliar de Distribuição'],
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    borderColor: 'border-emerald-100'
  },
  'Operador': {
    label: 'Equipe de Operadores',
    icon: HardHat,
    types: ['Operador Granel'],
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    borderColor: 'border-amber-100'
  }
};

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
];

const getDayOfWeekFromDate = (dateString: string): DayOfWeek => {
  // Create date ensuring local time mapping
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  const map: Record<number, DayOfWeek> = {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado'
  };
  return map[date.getDay()];
};

const TeamManagement: React.FC<TeamManagementProps> = ({ 
  members, 
  onAddMember, 
  onRemoveMember,
  fleets,
  onAddFleet,
  onRemoveFleet,
  timeOffs,
  onAddTimeOff,
  onRemoveTimeOff
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'fleets' | 'timeoff'>('members');
  
  // Members Form State
  const [memberName, setMemberName] = useState('');
  const [role, setRole] = useState<TeamRole>('Motorista');
  const [subRole, setSubRole] = useState<string>(ROLE_CONFIG['Motorista'].types[0]);

  // Fleet Form State
  const [fleetDate, setFleetDate] = useState(new Date().toISOString().split('T')[0]);
  const [fleetName, setFleetName] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedAssistantId, setSelectedAssistantId] = useState('');

  // Time Off Form State
  const [timeOffMemberId, setTimeOffMemberId] = useState('');
  const [timeOffDay, setTimeOffDay] = useState<DayOfWeek>('Segunda-feira');

  // Handlers for Member
  const handleRoleChange = (newRole: TeamRole) => {
    setRole(newRole);
    setSubRole(ROLE_CONFIG[newRole].types[0]);
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberName.trim()) {
      onAddMember({ name: memberName, role, subRole });
      setMemberName('');
    }
  };

  // Calculate assigned members FOR THE SELECTED DATE
  const assignedMemberIdsForDate = new Set<string>();
  fleets.forEach(f => {
    if (f.date === fleetDate) {
      if (f.driverId) assignedMemberIdsForDate.add(f.driverId);
      if (f.assistantId) assignedMemberIdsForDate.add(f.assistantId);
    }
  });

  // Helper to check if member is off on the selected date
  const isOffOnSelectedDate = (memberId: string) => {
    const dayOfWeek = getDayOfWeekFromDate(fleetDate);
    return timeOffs.some(t => t.memberId === memberId && t.dayOfWeek === dayOfWeek);
  };

  // Handlers for Fleet
  const handleFleetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fleetName.trim() && selectedDriverId && fleetDate) {
      const dayOfWeek = getDayOfWeekFromDate(fleetDate);
      const dateFormatted = new Date(fleetDate + 'T00:00:00').toLocaleDateString('pt-BR');

      // Validation: Check if Driver is on Time Off
      const driverIsOff = isOffOnSelectedDate(selectedDriverId);
      if (driverIsOff) {
        const driver = members.find(m => m.id === selectedDriverId);
        const confirmed = window.confirm(
          `Motorista ${driver?.name} está de folga no dia ${dateFormatted} (${dayOfWeek}).\n\nConfirma o colaborador para a Montagem de Frota?`
        );
        if (!confirmed) return;
      }

      // Validation: Check if Assistant is on Time Off
      if (selectedAssistantId) {
        const assistantIsOff = isOffOnSelectedDate(selectedAssistantId);
        if (assistantIsOff) {
          const assistant = members.find(m => m.id === selectedAssistantId);
          const confirmed = window.confirm(
             `Auxiliar ${assistant?.name} está de folga no dia ${dateFormatted} (${dayOfWeek}).\n\nConfirma o colaborador para a Montagem de Frota?`
          );
          if (!confirmed) return;
        }
      }

      onAddFleet({
        name: fleetName,
        driverId: selectedDriverId,
        assistantId: selectedAssistantId || undefined,
        date: fleetDate
      });
      setFleetName('');
      setSelectedDriverId('');
      setSelectedAssistantId('');
    }
  };

  // Handlers for Time Off
  const handleTimeOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeOffMemberId && timeOffDay) {
      onAddTimeOff({
        memberId: timeOffMemberId,
        dayOfWeek: timeOffDay
      });
      setTimeOffMemberId('');
    }
  };

  // Handle Print / PDF Generation
  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) {
        alert("Por favor, permita popups para imprimir.");
        return;
    }

    const isFleetTab = activeTab === 'fleets';
    const title = isFleetTab ? 'Escala de Frotas' : 'Escala de Folgas Semanais';

    printWindow.document.write('<html><head><title>' + title + ' - RotaFácil</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 800px; mx-auto; color: #1e293b; }
        h1 { font-size: 24px; margin-bottom: 8px; color: #0f172a; }
        .header { margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
        .meta { font-size: 14px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 24px; }
        th { text-align: left; padding: 12px 16px; background-color: #f8fafc; font-weight: 600; font-size: 14px; color: #475569; border-bottom: 2px solid #e2e8f0; }
        td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        tr:last-child td { border-bottom: none; }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .tag-motorista { background: #eff6ff; color: #2563eb; }
        .tag-auxiliar { background: #ecfdf5; color: #059669; }
        .group-title { font-size: 18px; font-weight: 700; color: #334155; margin-top: 24px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; }
        .empty { text-align: center; padding: 40px; color: #94a3b8; font-style: italic; }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    
    printWindow.document.write('<div class="header">');
    printWindow.document.write(`<h1>${title}</h1>`);
    printWindow.document.write(`<div class="meta">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>`);
    printWindow.document.write('</div>');

    if (isFleetTab) {
        // Group by date
        const uniqueDates = Array.from(new Set(fleets.map(f => f.date))).sort() as string[];
        
        if (uniqueDates.length > 0) {
            uniqueDates.forEach(date => {
                const dateFleets = fleets.filter(f => f.date === date);
                const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
                const dayOfWeek = getDayOfWeekFromDate(date);

                printWindow.document.write(`<div class="group-title">Rota para o dia ${dateFormatted} (${dayOfWeek})</div>`);
                printWindow.document.write('<table>');
                printWindow.document.write('<thead><tr><th>Frota</th><th>Motorista Responsável</th><th>Auxiliar</th></tr></thead>');
                printWindow.document.write('<tbody>');
                dateFleets.forEach(f => {
                    const driver = members.find(m => m.id === f.driverId);
                    const assistant = members.find(m => m.id === f.assistantId);
                    printWindow.document.write(`<tr><td><strong>${f.name}</strong></td><td>${driver ? driver.name : 'N/A'}</td><td>${assistant ? assistant.name : '-'}</td></tr>`);
                });
                printWindow.document.write('</tbody></table>');
            });
        } else {
            printWindow.document.write('<div class="empty">Nenhuma frota configurada.</div>');
        }
    } else {
        // Print Time Off Schedule
        let hasEntries = false;
        DAYS_OF_WEEK.forEach(day => {
            const entries = timeOffs.filter(t => t.dayOfWeek === day);
            if (entries.length > 0) {
                hasEntries = true;
                printWindow.document.write(`<div class="group-title">${day}</div>`);
                printWindow.document.write('<table><thead><tr><th>Colaborador</th><th>Função</th></tr></thead><tbody>');
                entries.forEach(entry => {
                    const member = members.find(m => m.id === entry.memberId);
                    if (member) {
                         const tagClass = member.role === 'Motorista' ? 'tag-motorista' : 'tag-auxiliar';
                         printWindow.document.write(`<tr><td>${member.name}</td><td><span class="tag ${tagClass}">${member.role}</span></td></tr>`);
                    }
                });
                printWindow.document.write('</tbody></table>');
            }
        });
        
        if (!hasEntries) {
             printWindow.document.write('<div class="empty">Nenhuma folga agendada.</div>');
        }
    }
    
    printWindow.document.write('<script>window.onload = () => { window.print(); window.close(); }</script>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
  };

  // Filter lists (Available only if not in a fleet ON THE SELECTED DATE)
  const availableDrivers = members.filter(m => m.role === 'Motorista' && !assignedMemberIdsForDate.has(m.id));
  const availableAssistants = members.filter(m => m.role === 'Auxiliar' && !assignedMemberIdsForDate.has(m.id));
  
  const totalDrivers = members.filter(m => m.role === 'Motorista').length;
  const totalAssistants = members.filter(m => m.role === 'Auxiliar').length;

  // Group fleets for list display
  const sortedUniqueDates = Array.from(new Set(fleets.map(f => f.date))).sort() as string[];

  return (
    <div className="space-y-6 pb-6">
      
      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'members' 
              ? 'bg-slate-100 text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Cadastro de Colaboradores
        </button>
        <button
          onClick={() => setActiveTab('fleets')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'fleets' 
              ? 'bg-slate-100 text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Montagem de Frotas
        </button>
        <button
          onClick={() => setActiveTab('timeoff')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'timeoff' 
              ? 'bg-slate-100 text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Escala de Folgas
        </button>
      </div>

      {activeTab === 'members' && (
        <>
          {/* --- MEMBERS TAB --- */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              Novo Colaborador
            </h2>
            <form onSubmit={handleMemberSubmit} className="space-y-5">
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Categoria</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.keys(ROLE_CONFIG) as TeamRole[]).map((r) => {
                     const Config = ROLE_CONFIG[r];
                     const Icon = Config.icon;
                     const isSelected = role === r;
                     return (
                       <button
                         key={r}
                         type="button"
                         onClick={() => handleRoleChange(r)}
                         className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border transition-all
                           ${isSelected 
                             ? `${Config.bg} ${Config.color} ${Config.borderColor} ring-1 ring-offset-1 ring-indigo-100` 
                             : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}
                         `}
                       >
                         <Icon className="w-4 h-4" />
                         {r}
                       </button>
                     )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Função Específica</label>
                   <div className="relative">
                     <select
                       value={subRole}
                       onChange={(e) => setSubRole(e.target.value)}
                       className="w-full appearance-none px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-sm text-slate-700 shadow-sm"
                     >
                       {ROLE_CONFIG[role].types.map(t => (
                         <option key={t} value={t}>{t}</option>
                       ))}
                     </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                     </div>
                   </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nome do Colaborador</label>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm shadow-sm"
                    placeholder="Ex: Carlos Silva"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!memberName.trim()}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg transform active:scale-[0.99]"
              >
                Cadastrar Colaborador
              </button>
            </form>
          </section>

          {/* List Section */}
          <div className="space-y-4">
            {(Object.keys(ROLE_CONFIG) as TeamRole[]).map((r) => {
               const groupMembers = members.filter(m => m.role === r);
               if (groupMembers.length === 0) return null;
               
               const Config = ROLE_CONFIG[r];
               const Icon = Config.icon;

               return (
                 <section key={r} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className={`px-4 py-3 border-b border-slate-100 flex items-center gap-2 ${Config.bg} ${Config.color}`}>
                      <Icon className="w-4 h-4" />
                      <h3 className="font-semibold text-sm">{Config.label}</h3>
                      <span className="ml-auto text-xs font-bold bg-white/60 px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                        {groupMembers.length}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {groupMembers.map(m => {
                        // Check global assignment status (is assigned in ANY fleet? or just show no indication if not date selected?)
                        // For the members list, it's cleaner to show if they are in a fleet on the "current working date" or similar.
                        // But since fleet dates vary, we can remove the "Alocado" indicator from the general members list 
                        // or make it smart. For simplicity, let's remove the "Alocado" badge here as it's context-dependent on date.
                        return (
                          <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center relative ${Config.bg} ${Config.color}`}>
                                <span className="text-xs font-bold">{m.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
                                  {m.name}
                                </div>
                                <div className="text-xs text-slate-500">{m.subRole}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => onRemoveMember(m.id)}
                              className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Remover membro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                 </section>
               );
            })}
            
            {members.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                 <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                 <p className="text-slate-500 text-sm font-medium">Nenhuma equipe formada.</p>
                 <p className="text-slate-400 text-xs mt-1">Cadastre motoristas e auxiliares acima.</p>
              </div>
            )}
          </div>
        </>
      )}
      
      {activeTab === 'fleets' && (
        <>
          {/* --- FLEETS TAB --- */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
               <LayoutGrid className="w-5 h-5 text-indigo-500" />
               Nova Estrutura de Frota
             </h2>
             
             {totalDrivers === 0 ? (
                <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg border border-amber-100">
                  Você precisa cadastrar <strong>Motoristas</strong> na aba "Colaboradores" antes de montar uma frota.
                </div>
             ) : (
               <form onSubmit={handleFleetSubmit} className="space-y-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Data da Rota</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <Calendar className="h-4 w-4 text-slate-400" />
                        </div>
                        <input 
                            type="date"
                            required
                            value={fleetDate}
                            onChange={(e) => setFleetDate(e.target.value)}
                            className="w-full pl-10 px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                        Dia da semana: <span className="font-medium text-slate-600">{getDayOfWeekFromDate(fleetDate)}</span>
                    </p>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Identificação da Frota</label>
                    <input
                      type="text"
                      value={fleetName}
                      onChange={(e) => setFleetName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                      placeholder="Ex: Frota 113"
                    />
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">
                          Motorista Responsável
                          {availableDrivers.length === 0 && totalDrivers > 0 && (
                            <span className="text-amber-600 ml-1 text-[10px] font-normal">(Todos alocados nesta data)</span>
                          )}
                       </label>
                       <select
                          value={selectedDriverId}
                          onChange={(e) => setSelectedDriverId(e.target.value)}
                          disabled={availableDrivers.length === 0}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm disabled:bg-slate-50 disabled:text-slate-400"
                       >
                         <option value="">
                           {availableDrivers.length === 0 ? 'Nenhum motorista disponível' : 'Selecione...'}
                         </option>
                         {availableDrivers.map(d => (
                           <option key={d.id} value={d.id}>
                             {d.name} {isOffOnSelectedDate(d.id) ? '(Folga)' : ''}
                           </option>
                         ))}
                       </select>
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">
                          Auxiliar (Opcional)
                          {availableAssistants.length === 0 && totalAssistants > 0 && (
                            <span className="text-amber-600 ml-1 text-[10px] font-normal">(Todos alocados nesta data)</span>
                          )}
                       </label>
                       <select
                          value={selectedAssistantId}
                          onChange={(e) => setSelectedAssistantId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={availableAssistants.length === 0}
                       >
                         <option value="">
                           {totalAssistants === 0 
                             ? 'Nenhum auxiliar cadastrado' 
                             : availableAssistants.length === 0 
                               ? 'Nenhum auxiliar disponível' 
                               : 'Selecione...'}
                         </option>
                         {availableAssistants.map(a => (
                           <option key={a.id} value={a.id}>
                             {a.name} {isOffOnSelectedDate(a.id) ? '(Folga)' : ''}
                           </option>
                         ))}
                       </select>
                    </div>
                 </div>

                 <button
                    type="submit"
                    disabled={!fleetName.trim() || !selectedDriverId || !fleetDate}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg"
                 >
                    Criar Estrutura de Frota
                 </button>
               </form>
             )}
          </section>

          <div className="grid grid-cols-1 gap-4">
             {(fleets.length > 0) && (
                <div className="flex items-center justify-between pt-2">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                        Frotas Configuradas
                    </h3>
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-100 transition-all text-xs font-medium shadow-sm"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir Escala
                    </button>
                </div>
             )}

             {sortedUniqueDates.map(date => {
                 const dateFleets = fleets.filter(f => f.date === date);
                 const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
                 const dayOfWeek = getDayOfWeekFromDate(date);

                 return (
                    <div key={date} className="space-y-3">
                        <div className="flex items-center gap-2 py-2 border-b border-slate-200 mt-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <h4 className="font-bold text-slate-700 text-sm">Rota para dia {dateFormatted} <span className="font-normal text-slate-500">({dayOfWeek})</span></h4>
                        </div>
                        
                        {dateFleets.map(fleet => {
                            const driver = members.find(m => m.id === fleet.driverId);
                            const assistant = members.find(m => m.id === fleet.assistantId);
                            
                            return (
                                <div key={fleet.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group">
                                    <div className="flex items-center gap-3 mb-3 border-b border-slate-50 pb-3">
                                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-slate-800">{fleet.name}</h3>
                                    <button 
                                        onClick={() => onRemoveFleet(fleet.id)}
                                        className="ml-auto text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-400 text-xs w-16 uppercase font-semibold tracking-wider">Motorista:</span>
                                        {driver ? (
                                            <span className="text-slate-700 font-medium">{driver.name}</span>
                                        ) : (
                                            <span className="text-red-400 italic">Não encontrado</span>
                                        )}
                                    </div>
                                    {assistant && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400 text-xs w-16 uppercase font-semibold tracking-wider">Auxiliar:</span>
                                            {assistant ? (
                                            <span className="text-slate-700">{assistant.name}</span>
                                            ) : (
                                            <span className="text-red-400 italic">Não encontrado</span>
                                            )}
                                        </div>
                                    )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 );
             })}

             {fleets.length === 0 && totalDrivers > 0 && (
               <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                 <p className="text-slate-400 text-sm">Nenhuma frota montada ainda.</p>
               </div>
             )}
          </div>
        </>
      )}

      {activeTab === 'timeoff' && (
        <>
          {/* --- TIME OFF TAB --- */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
               <CalendarOff className="w-5 h-5 text-indigo-500" />
               Definir Folga Semanal
            </h2>

            {members.length === 0 ? (
               <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg border border-amber-100">
                 Cadastre colaboradores para definir a escala de folgas.
               </div>
            ) : (
              <form onSubmit={handleTimeOffSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Colaborador</label>
                      <select
                        value={timeOffMemberId}
                        onChange={(e) => setTimeOffMemberId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                      >
                        <option value="">Selecione o colaborador...</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Dia da Semana</label>
                      <select
                        value={timeOffDay}
                        onChange={(e) => setTimeOffDay(e.target.value as DayOfWeek)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                      >
                        {DAYS_OF_WEEK.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                   </div>
                </div>
                <button
                   type="submit"
                   disabled={!timeOffMemberId}
                   className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg"
                >
                   Agendar Folga
                </button>
              </form>
            )}
          </section>
          
          <div className="space-y-4">
             {timeOffs.length > 0 && (
                 <div className="flex items-center justify-between pt-2">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                        Cronograma Semanal
                    </h3>
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-100 transition-all text-xs font-medium shadow-sm"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir
                    </button>
                </div>
             )}
             
             {DAYS_OF_WEEK.map(day => {
                const dayEntries = timeOffs.filter(t => t.dayOfWeek === day);
                if (dayEntries.length === 0) return null;

                return (
                  <div key={day} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                     <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                        <h4 className="font-semibold text-sm text-slate-700">{day}</h4>
                        <span className="text-xs font-medium bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">{dayEntries.length} folgas</span>
                     </div>
                     <div className="divide-y divide-slate-50">
                        {dayEntries.map(entry => {
                           const member = members.find(m => m.id === entry.memberId);
                           if (!member) return null;
                           return (
                             <div key={entry.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                      member.role === 'Motorista' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                                   }`}>
                                      {member.name.charAt(0)}
                                   </div>
                                   <div>
                                      <div className="text-sm font-medium text-slate-800">{member.name}</div>
                                      <div className="text-xs text-slate-500">{member.role}</div>
                                   </div>
                                </div>
                                <button
                                  onClick={() => onRemoveTimeOff(entry.id)}
                                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                           );
                        })}
                     </div>
                  </div>
                );
             })}

             {timeOffs.length === 0 && members.length > 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                   <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                   <p className="text-slate-500 text-sm font-medium">Nenhuma folga agendada.</p>
                </div>
             )}
          </div>
        </>
      )}
    </div>
  );
};

export default TeamManagement;